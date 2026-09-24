// Общие куски GLSL. Все материалы сцены делят одни и те же юниформы
// (один объект на всех — обновляется раз за кадр в main.js).

export const UNIFORMS = /* glsl */ `
uniform float uTime;
uniform vec3 uTankMin;
uniform vec3 uTankMax;
uniform float uWaterY;
uniform vec3 uAbsorb;
uniform vec3 uScatter;
uniform vec3 uLampColor;
uniform vec3 uLampEmit;
uniform float uLampY;
uniform vec2 uLampHalf;
uniform vec3 uAmbTop;
uniform vec3 uAmbBottom;
uniform sampler2D tCaustics;
uniform float uCausticPlane;
uniform sampler2D tFishShadow;
uniform vec4 uTankXZ;
uniform float uMurk;
uniform float uNight;
uniform float uWet;
uniform vec3 uSpotPos;
uniform vec3 uSpotDir;
uniform vec3 uSpotColor;
uniform vec2 uSpotCone;
uniform vec3 uGlowColor;
uniform vec3 uRoomAmb;
uniform vec3 uLampRoom;
`

export const NOISE = /* glsl */ `
uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float hashI2(ivec2 i) {
  uvec2 q = uvec2(i + 65536);
  return float(pcg(q.x + pcg(q.y))) * (1.0 / 4294967295.0);
}
float hashI3(ivec3 i) {
  uvec3 q = uvec3(i + 65536);
  return float(pcg(q.x + pcg(q.y + pcg(q.z)))) * (1.0 / 4294967295.0);
}
vec2 hashI2v(ivec2 i) {
  uvec2 q = uvec2(i + 65536);
  uint a = pcg(q.x + pcg(q.y));
  uint b = pcg(a ^ 0x9E3779B9u);
  return vec2(float(a), float(b)) * (1.0 / 4294967295.0);
}
float vnoise(vec2 p) {
  vec2 f = fract(p);
  ivec2 i = ivec2(floor(p));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hashI2(i), hashI2(i + ivec2(1, 0)), u.x),
             mix(hashI2(i + ivec2(0, 1)), hashI2(i + ivec2(1, 1)), u.x), u.y);
}
float vnoise3(vec3 p) {
  vec3 f = fract(p);
  ivec3 i = ivec3(floor(p));
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hashI3(i), hashI3(i + ivec3(1, 0, 0)), u.x),
                mix(hashI3(i + ivec3(0, 1, 0)), hashI3(i + ivec3(1, 1, 0)), u.x), u.y);
  float b = mix(mix(hashI3(i + ivec3(0, 0, 1)), hashI3(i + ivec3(1, 0, 1)), u.x),
                mix(hashI3(i + ivec3(0, 1, 1)), hashI3(i + ivec3(1, 1, 1)), u.x), u.y);
  return mix(a, b, u.z);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s / 0.9375;
}
float fbm3(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise3(p); p = p * 2.07 + 11.3; a *= 0.5; }
  return s / 0.9375;
}
// ячеистый шум: x = F1, y = F2, z = случайное число ячейки
vec3 voronoi(vec2 p) {
  ivec2 ip = ivec2(floor(p));
  vec2 fp = fract(p);
  float f1 = 8.0, f2 = 8.0, id = 0.0;
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    ivec2 c = ivec2(i, j);
    vec2 o = hashI2v(ip + c);
    vec2 d = vec2(c) + o - fp;
    float dd = dot(d, d);
    if (dd < f1) { f2 = f1; f1 = dd; id = hashI2(ip + c + 911); }
    else if (dd < f2) { f2 = dd; }
  }
  return vec3(sqrt(f1), sqrt(f2), id);
}
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
`

// Градиентный шум (как у Перлина) со случайными единичными градиентами:
// гладкий, без «кубиков» value-шума. gnoised3 возвращает (значение, градиент).
export const GNOISE = /* glsl */ `
vec3 ghash(ivec3 i) {
  uvec3 q = uvec3(i + 65536);
  uint h = pcg(q.x + pcg(q.y + pcg(q.z)));
  uint h2 = pcg(h ^ 0x68E31DA4u);
  float a = float(h & 0xFFFFu) * (6.2831853 / 65535.0);
  float z = float(h2 & 0xFFFFu) * (2.0 / 65535.0) - 1.0;
  float r = sqrt(max(1.0 - z * z, 0.0));
  return vec3(r * cos(a), z, r * sin(a));
}
vec4 gnoised3(vec3 x) {
  ivec3 i = ivec3(floor(x));
  vec3 f = fract(x);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec3 ga = ghash(i), gb = ghash(i + ivec3(1, 0, 0)), gc = ghash(i + ivec3(0, 1, 0)), gd = ghash(i + ivec3(1, 1, 0));
  vec3 ge = ghash(i + ivec3(0, 0, 1)), gf = ghash(i + ivec3(1, 0, 1)), gg = ghash(i + ivec3(0, 1, 1)), gh = ghash(i + ivec3(1, 1, 1));
  float va = dot(ga, f), vb = dot(gb, f - vec3(1, 0, 0)), vc = dot(gc, f - vec3(0, 1, 0)), vd = dot(gd, f - vec3(1, 1, 0));
  float ve = dot(ge, f - vec3(0, 0, 1)), vf = dot(gf, f - vec3(1, 0, 1)), vg = dot(gg, f - vec3(0, 1, 1)), vh = dot(gh, f - vec3(1, 1, 1));
  float k1 = vb - va, k2 = vc - va, k3 = ve - va;
  float k4 = va - vb - vc + vd, k5 = va - vc - ve + vg, k6 = va - vb - ve + vf;
  float k7 = -va + vb + vc - vd + ve - vf - vg + vh;
  float v = va + u.x * k1 + u.y * k2 + u.z * k3 + u.x * u.y * k4 + u.y * u.z * k5 + u.z * u.x * k6 + u.x * u.y * u.z * k7;
  vec3 d = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.z * (ge - ga)
         + u.x * u.y * (ga - gb - gc + gd) + u.y * u.z * (ga - gc - ge + gg) + u.z * u.x * (ga - gb - ge + gf)
         + u.x * u.y * u.z * (-ga + gb + gc - gd + ge - gf - gg + gh)
         + du * (vec3(k1, k2, k3) + u.yzx * vec3(k4, k5, k6) + u.zxy * vec3(k6, k4, k5) + u.yzx * u.zxy * k7);
  return vec4(v, d);
}
float gnoise3(vec3 x) {
  ivec3 i = ivec3(floor(x));
  vec3 f = fract(x);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float va = dot(ghash(i), f);
  float vb = dot(ghash(i + ivec3(1, 0, 0)), f - vec3(1, 0, 0));
  float vc = dot(ghash(i + ivec3(0, 1, 0)), f - vec3(0, 1, 0));
  float vd = dot(ghash(i + ivec3(1, 1, 0)), f - vec3(1, 1, 0));
  float ve = dot(ghash(i + ivec3(0, 0, 1)), f - vec3(0, 0, 1));
  float vf = dot(ghash(i + ivec3(1, 0, 1)), f - vec3(1, 0, 1));
  float vg = dot(ghash(i + ivec3(0, 1, 1)), f - vec3(0, 1, 1));
  float vh = dot(ghash(i + ivec3(1, 1, 1)), f - vec3(1, 1, 1));
  return mix(mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y), mix(mix(ve, vf, u.x), mix(vg, vh, u.x), u.y), u.z);
}
`

// Вода: поглощение/рассеяние по длине пути в объёме, каустики, тени рыб.
export const WATER = /* glsl */ `
vec2 tankUV(vec2 xz) { return (xz - uTankXZ.xy) * uTankXZ.zw; }

float waterPath(vec3 ro, vec3 p) {
  if (uWaterY <= uTankMin.y + 0.0005) return 0.0;
  vec3 d = p - ro;
  float L = length(d);
  vec3 rd = d / max(L, 1e-5);
  vec3 rs = mix(rd, vec3(1e-6), lessThan(abs(rd), vec3(1e-6)));
  vec3 inv = 1.0 / rs;
  vec3 bmax = vec3(uTankMax.x, uWaterY, uTankMax.z);
  vec3 t0 = (uTankMin - ro) * inv;
  vec3 t1 = (bmax - ro) * inv;
  vec3 tn3 = min(t0, t1), tf3 = max(t0, t1);
  float tn = max(max(tn3.x, tn3.y), max(tn3.z, 0.0));
  float tf = min(min(tf3.x, tf3.y), min(tf3.z, L));
  return max(tf - tn, 0.0);
}

vec3 scatterAt(vec3 p) {
  float depth = max(uWaterY - p.y, 0.0);
  return uScatter * (0.62 + 0.38 * exp(-4.0 * depth));
}

vec3 applyWater(vec3 col, vec3 p) {
  float d = waterPath(cameraPosition, p);
  vec3 T = exp(-uAbsorb * d);
  return col * T + scatterAt(p) * (1.0 - T);
}

vec3 lampDir(vec3 p) {
  vec3 c = vec3(clamp(p.x, -uLampHalf.x, uLampHalf.x), uLampY - 0.011, clamp(p.z, -uLampHalf.y, uLampHalf.y));
  return normalize(c - p);
}

vec3 causticAt(vec3 p, float depth, vec3 N) {
  // луч от поверхности почти вертикален — сдвигаем точку к плоскости расчёта
  vec2 xz = p.xz + vec2(0.035, 0.05) * (uCausticPlane - p.y);
  float focus = clamp(depth / max(uWaterY - uCausticPlane, 0.05), 0.0, 1.6);
  float steep = 1.0 - smoothstep(0.15, 0.85, abs(N.y));
  float lod = mix(4.0, 0.6, smoothstep(0.0, 0.9, focus)) + max(focus - 1.0, 0.0) * 2.5 + steep * 2.2;
  vec3 c = textureLod(tCaustics, tankUV(xz), lod).rgb;
  return mix(vec3(1.0), c, smoothstep(0.0, 0.25, focus) * (1.0 - steep * 0.6));
}

float fishShadowAt(vec3 p) {
  vec2 xz = p.xz + vec2(0.02, 0.03);
  return texture2D(tFishShadow, tankUV(xz)).r;
}

// Освещение внутри аквариума: лампа (с поглощением в толще), каустики,
// тени рыб, рассеянный водой свет.
vec3 shadeInterior(vec3 p, vec3 V, vec3 albedo, vec3 N, float ao, float spec, float gloss, float trans) {
  float depth = uWaterY - p.y;
  float sub = smoothstep(-0.001, 0.004, depth);
  vec3 L = lampDir(p);
  float ndl = max(dot(N, L), 0.0);
  vec3 Tl = mix(vec3(1.0), exp(-uAbsorb * max(depth, 0.0) / max(L.y, 0.35)), sub);
  vec3 caus = mix(vec3(1.0), causticAt(p, max(depth, 0.0), N), sub);
#ifdef NO_FISH_SHADOW
  float sh = 1.0;
#else
  float sh = 1.0 - 0.6 * fishShadowAt(p);
#endif
  vec3 direct = uLampColor * Tl * caus * sh;
  vec3 diff = direct * (ndl + trans * max(-dot(N, L), 0.0));
  vec3 amb = mix(uAmbBottom, uAmbTop, N.y * 0.5 + 0.5) * mix(0.45, 1.0, sub);
  // свет прожектора зала проходит сквозь переднее стекло
  vec3 Ls = uSpotPos - p;
  float ds2 = dot(Ls, Ls);
  Ls *= inversesqrt(ds2);
  float cone = smoothstep(uSpotCone.x, uSpotCone.y, dot(-Ls, uSpotDir));
  vec3 spot = uSpotColor * (cone * 0.22 / ds2) * mix(vec3(1.0), exp(-uAbsorb * max(depth, 0.0) / max(Ls.y, 0.3)), sub);
  vec3 col = albedo * (diff + amb * ao + spot * max(dot(N, Ls), 0.0));
  vec3 H = normalize(L + V);
  float sp = pow(max(dot(N, H), 0.0), gloss) * spec * (gloss + 8.0) * 0.04;
  col += direct * sp * ndl;
  return col;
}
`

// Зал: прожектор, свечение аквариума как площадного источника, подвесная лампа.
export const ROOM = /* glsl */ `
vec3 shadeRoom(vec3 p, vec3 V, vec3 albedo, vec3 N, float ao, float spec, float gloss) {
  vec3 Ls = uSpotPos - p;
  float ds2 = dot(Ls, Ls);
  Ls *= inversesqrt(ds2);
  float cone = smoothstep(uSpotCone.x, uSpotCone.y, dot(-Ls, uSpotDir));
  vec3 spot = uSpotColor * cone / ds2;
  float ndl = max(dot(N, Ls), 0.0);
  vec3 H = normalize(Ls + V);
  vec3 col = spot * ndl * (albedo + pow(max(dot(N, H), 0.0), gloss) * spec * (gloss + 8.0) * 0.04);

  vec3 c = clamp(p, vec3(-0.6, 0.0, -0.25), vec3(0.6, 0.56, 0.25));
  vec3 Lg = c - p;
  float dg2 = dot(Lg, Lg) + 0.015;
  Lg *= inversesqrt(dg2);
  col += albedo * uGlowColor * max(dot(N, Lg) * 0.8 + 0.2, 0.0) * (0.05 / dg2);

  vec3 cl = vec3(clamp(p.x, -uLampHalf.x, uLampHalf.x), uLampY - 0.011, clamp(p.z, -uLampHalf.y, uLampHalf.y));
  vec3 Ll = cl - p;
  float dl2 = dot(Ll, Ll) + 0.01;
  Ll *= inversesqrt(dl2);
  // лампа светит только вниз
  col += albedo * uLampRoom * max(dot(N, Ll), 0.0) * max(Ll.y, 0.0) * (0.06 / dl2);

  col += albedo * uRoomAmb * ao;
  return col;
}
`

// Аналитическое окружение для отражений в стекле и на поверхности воды:
// тёмный зал, светящаяся лампа, прожектор, панель на потолке и дверной проём.
export const ENV = /* glsl */ `
float rectMask(vec2 d, vec2 half_, float soft) {
  vec2 q = abs(d) - half_;
  return 1.0 - smoothstep(-soft, soft, max(q.x, q.y));
}
vec3 envRadiance(vec3 p, vec3 R) {
  vec3 col = mix(vec3(0.0035, 0.0036, 0.0042), vec3(0.009, 0.0095, 0.011), smoothstep(-0.4, 0.7, R.y));
  if (R.y > 0.0005) {
    float t = (uLampY - 0.011 - p.y) / R.y;
    if (t > 0.0) {
      vec3 h = p + R * t;
      float body = rectMask(h.xz, uLampHalf + vec2(0.012, 0.012), 0.002);
      float diffuser = rectMask(h.xz, uLampHalf, 0.003);
      col = mix(col, vec3(0.004), body);
      col += uLampEmit * diffuser;
    }
    float tc = (3.2 - p.y) / R.y;
    vec3 hc = p + R * tc;
    col += vec3(0.05, 0.055, 0.065) * rectMask(hc.xz - vec2(0.0, 1.4), vec2(1.2, 0.5), 0.35);
  }
  if (R.x < -0.0005) {
    float t = (-4.0 - p.x) / R.x;
    vec3 h = p + R * t;
    col += vec3(0.07, 0.055, 0.04) * rectMask(h.zy - vec2(1.6, 0.25), vec2(0.55, 1.1), 0.08);
  }
  vec3 toSpot = normalize(uSpotPos - p);
  col += uSpotColor * 0.0009 * pow(max(dot(R, toSpot), 0.0), 3000.0);
  return col;
}
`
