// Ландшафт: грунт (песок + аквасойл, срез у стекла), камни ивагуми, ковёр ситняга, валлиснерия.
import THREE from './three.js'
import { INNER, TANK } from './config.js'
import { UNIFORMS, NOISE, GNOISE, WATER } from './glsl.js'
import { sandHeight, sandMask, ROCK_SHAPES, rockField } from './terrain.js'
import { mulberry32, fbm3, ridged3, clamp, smoothstep } from './noise.js'

// ---------------------------------------------------------------- грунт
function buildSubstrate(S, u) {
  const nx = 236, nz = Math.round(nx * INNER.sz / INNER.sx)
  const verts = (nx + 1) * (nz + 1)
  const pos = new Float32Array(verts * 3)
  const nrm = new Float32Array(verts * 3)
  const sand = new Float32Array(verts)
  const ao = new Float32Array(verts)
  const e = 0.002
  let k = 0
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = INNER.x0 + (i / nx) * INNER.sx
      const z = INNER.z0 + (j / nz) * INNER.sz
      const y = sandHeight(x, z)
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z
      const hx = sandHeight(x + e, z) - sandHeight(x - e, z)
      const hz = sandHeight(x, z + e) - sandHeight(x, z - e)
      const n = new THREE.Vector3(-hx, 2 * e, -hz).normalize()
      nrm[k * 3] = n.x; nrm[k * 3 + 1] = n.y; nrm[k * 3 + 2] = n.z
      sand[k] = sandMask(x, z)
      // окклюзия у камней (грунт темнеет у подножия)
      const f = rockField(x, y + 0.004, z)
      ao[k] = clamp(0.35 + 0.65 * smoothstep(0.95, 1.5, f.d), 0, 1)
      k++
    }
  }
  const idx = []
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  }
  const top = new THREE.BufferGeometry()
  top.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  top.setAttribute('normal', new THREE.BufferAttribute(nrm, 3))
  top.setAttribute('aSand', new THREE.BufferAttribute(sand, 1))
  top.setAttribute('aAO', new THREE.BufferAttribute(ao, 1))
  top.setAttribute('aSkirt', new THREE.BufferAttribute(new Float32Array(verts), 1))
  top.setIndex(idx)

  // срез грунта, прижатый к стёклам: видно слои сквозь переднее стекло
  const sp = [], sn = [], ss = [], sa = [], sk = [], si = []
  const addWall = (pts, normal) => {
    const base = sp.length / 3
    for (const [x, z] of pts) {
      const h = sandHeight(x, z)
      sp.push(x, INNER.y0, z, x, h, z)
      sn.push(...normal, ...normal)
      const m = sandMask(x, z)
      ss.push(m, m)
      sa.push(1, 1)
      sk.push(1, 1)
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3
      si.push(a, c, b, b, c, d)
    }
  }
  const N = 300
  const inset = 0.0006
  const along = (x0, z0, x1, z1) => Array.from({ length: N + 1 }, (_, i) => [x0 + (x1 - x0) * (i / N), z0 + (z1 - z0) * (i / N)])
  // порядок точек задаёт обход треугольников: лицевая сторона смотрит наружу, к стеклу
  addWall(along(INNER.x0, INNER.z1 - inset, INNER.x1, INNER.z1 - inset), [0, 0, 1])
  addWall(along(INNER.x0 + inset, INNER.z0, INNER.x0 + inset, INNER.z1), [-1, 0, 0])
  addWall(along(INNER.x1 - inset, INNER.z1, INNER.x1 - inset, INNER.z0), [1, 0, 0])
  const skirt = new THREE.BufferGeometry()
  skirt.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
  skirt.setAttribute('normal', new THREE.Float32BufferAttribute(sn, 3))
  skirt.setAttribute('aSand', new THREE.Float32BufferAttribute(ss, 1))
  skirt.setAttribute('aAO', new THREE.Float32BufferAttribute(sa, 1))
  skirt.setAttribute('aSkirt', new THREE.Float32BufferAttribute(sk, 1))
  skirt.setIndex(si)

  const material = new THREE.ShaderMaterial({
    uniforms: { ...S, ...u },
    vertexShader: /* glsl */ `
      attribute float aSand; attribute float aAO; attribute float aSkirt;
      uniform float uFill; uniform vec3 uTankMin;
      varying vec3 vWorld; varying vec3 vN; varying float vSand; varying float vAO; varying float vSkirt;
      void main() {
        vec3 p = position;
        p.y = mix(uTankMin.y - 0.001, p.y, uFill);
        vWorld = p; vN = normalize(mix(vec3(0.0, 1.0, 0.0), normal, uFill)); vSand = aSand; vAO = aAO; vSkirt = aSkirt;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      ${UNIFORMS}
      ${NOISE}
      ${WATER}
      uniform float uAlgae;
      varying vec3 vWorld; varying vec3 vN; varying float vSand; varying float vAO; varying float vSkirt;
      void main() {
        vec3 p = vWorld;
        vec3 V = normalize(cameraPosition - p);
        vec3 N = normalize(vN);
        float dist = length(cameraPosition - p);
        float detail = 1.0 - smoothstep(1.2, 3.5, dist);
        vec3 albedo; float spec = 0.08, gloss = 30.0, ao = vAO;
        float edgeN = fbm(p.xz * 40.0) - 0.5;
        float sandW = smoothstep(0.35, 0.65, vSand + edgeN * 0.35);
        if (vSkirt < 0.5) {
          // светлый речной песок: зёрна и редкая тёмная галька
          vec3 g = voronoi(p.xz * 760.0);
          vec3 sandCol = vec3(0.2, 0.178, 0.142) * (0.9 + 0.2 * (g.z - 0.5) * detail) * (0.94 + 0.12 * fbm(p.xz * 30.0));
          sandCol = mix(sandCol, vec3(0.055, 0.05, 0.045), step(0.965, g.z) * 0.5 * detail);
          vec3 pb = voronoi(p.xz * 58.0 + 7.0);
          float pr = 0.16 + 0.22 * fract(pb.z * 13.1);
          float peb = smoothstep(pr, pr - 0.05, pb.x) * step(0.93, pb.z);
          sandCol = mix(sandCol, vec3(0.085, 0.08, 0.075) * (0.6 + fract(pb.z * 7.7) * 0.8), peb * 0.85);
          // аквасойл: тёмные гранулы
          vec3 s = voronoi(p.xz * 260.0 + 3.0);
          vec3 soilCol = vec3(0.022, 0.017, 0.013) * (0.6 + 0.8 * s.z);
          soilCol *= mix(1.0, 0.45 + 0.9 * smoothstep(0.55, 0.0, s.x), detail);
          albedo = mix(soilCol, sandCol, sandW);
          // слой водорослей на грунте при застое
          albedo = mix(albedo, vec3(0.03, 0.05, 0.015), uAlgae * 0.35 * smoothstep(0.4, 0.8, fbm(p.xz * 12.0)));
          // песчаная рябь даёт мелкие блики
          N = normalize(N + vec3(g.x - 0.35, 0.0, s.x - 0.35) * 0.18 * detail);
        } else {
          // срез: крупные гранулы у дна, сверху тонкий слой песка
          float h = p.y - uTankMin.y;
          vec3 g = voronoi(vec2(p.x + p.z, p.y) * 210.0);
          vec3 soil = vec3(0.02, 0.016, 0.012) * (0.5 + g.z) * (0.4 + 1.2 * smoothstep(0.6, 0.1, g.x));
          vec3 g2 = voronoi(vec2(p.x + p.z, p.y) * 520.0);
          vec3 sandC = vec3(0.2, 0.175, 0.14) * (0.8 + 0.4 * g2.z);
          float layer = smoothstep(0.02, 0.028, h + (fbm(vec2(p.x + p.z, 0.0) * 30.0) - 0.5) * 0.012);
          albedo = mix(mix(soil, sandC * 0.9, layer * 0.25), sandC, vSand * layer);
          spec = 0.02;
          ao = 0.55;
          albedo *= 0.8 + 0.2 * step(0.2, g.x);
        }
        // мокрый грунт над водой темнее и блестит
        float above = step(uWaterY, p.y);
        float wet = mix(1.0, uWet, above);
        albedo *= mix(1.0, 0.62, wet);
        spec = mix(spec, 0.45, wet * 0.7);
        gloss = mix(gloss, 70.0, wet);
        vec3 col = shadeInterior(p, V, albedo, N, ao, spec, gloss, 0.0);
        if (vSkirt > 0.5) col = albedo * (uAmbTop * 0.5 + uLampColor * 0.04) * ao;
        col = applyWater(col, p);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const group = new THREE.Group()
  group.add(new THREE.Mesh(top, material))
  group.add(new THREE.Mesh(skirt, material))
  return group
}

// ---------------------------------------------------------------- камни
function icosphere(detail) {
  const t = (1 + Math.sqrt(5)) / 2
  let verts = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
    .map(v => { const l = Math.hypot(...v); return v.map(c => c / l) })
  let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
  for (let d = 0; d < detail; d++) {
    const cache = new Map()
    const mid = (a, b) => {
      const key = a < b ? a * 1e6 + b : b * 1e6 + a
      if (cache.has(key)) return cache.get(key)
      const va = verts[a], vb = verts[b]
      const m = [(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2]
      const l = Math.hypot(...m)
      verts.push(m.map(c => c / l))
      cache.set(key, verts.length - 1)
      return verts.length - 1
    }
    const next = []
    for (const [a, b, c] of faces) {
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a)
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca])
    }
    faces = next
  }
  return { verts, faces }
}

function buildRocks(S, u) {
  const spheres = { 5: icosphere(5), 6: icosphere(6) }
  const positions = [], aos = [], ids = [], indices = []
  let offset = 0
  for (const [ri, r] of ROCK_SHAPES.entries()) {
    // большим камням — плотнее сетка: рёбра и сколы читаются вблизи
    const { verts, faces } = spheres[r.rx > 0.08 ? 6 : 5]
    const rand = mulberry32(r.seed * 977)
    // выпуклый многогранник из случайных плоскостей → сколы и грани, как у камня
    const planes = []
    const np = 24 + Math.floor(rand() * 10)
    for (let i = 0; i < np; i++) {
      const th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1)
      planes.push([Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th), 0.8 + rand() * 0.32])
    }
    const seed = r.seed * 1.37
    for (const v of verts) {
      let acc = 0
      const kSoft = 44
      for (const [nx, ny, nz, d] of planes) {
        const dp = v[0] * nx + v[1] * ny + v[2] * nz
        const rr = dp > 0.05 ? d / dp : 3
        acc += Math.exp(-kSoft * rr)
      }
      let rad = Math.min(-Math.log(acc) / kSoft, 1.35)
      rad *= 1 + (fbm3(v[0] * 1.7 + seed, v[1] * 1.7, v[2] * 1.7 - seed, 3) - 0.5) * 0.1
      // гребни выветривания и узкие трещины
      const ridge = ridged3(v[0] * 3.4 + seed, v[1] * 5.5, v[2] * 3.4, 4)
      rad *= 1 - Math.pow(1 - ridge, 2) * 0.09
      const crack = ridged3(v[0] * 8 - seed, v[1] * 12, v[2] * 8 + seed, 3)
      rad *= 1 - Math.pow(1 - crack, 4) * 0.05
      // слоистость: горизонтальные бороздки
      rad *= 1 + Math.sin(v[1] * 26 + fbm3(v[0] * 3, v[1] * 3, v[2] * 3 + seed, 2) * 6) * 0.007
      let px = v[0] * rad, py = v[1] * rad, pz = v[2] * rad
      if (py < -0.62) py = -0.62 + (py + 0.62) * 0.12
      px *= r.rx; py *= r.ry; pz *= r.rz
      // наклон (lean) вокруг Z, затем поворот (yaw) вокруг Y
      const lx = r.cl * px - r.sl * py
      const ly = r.sl * px + r.cl * py
      const wx = r.cyw * lx + r.syw * pz
      const wz = -r.syw * lx + r.cyw * pz
      positions.push(r.cx + wx, r.cy + ly, r.cz + wz)
      ids.push(ri)
      aos.push(clamp(0.45 + (rad - 0.8) * 1.2, 0.3, 1) * clamp(0.55 + (v[1] + 0.62) * 0.9, 0.5, 1))
    }
    for (const [fa, fb, fc] of faces) indices.push(fa + offset, fb + offset, fc + offset)
    offset += verts.length
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('aAO', new THREE.Float32BufferAttribute(aos, 1))
  geo.setAttribute('aRock', new THREE.Float32BufferAttribute(ids, 1))
  geo.setIndex(indices)
  geo.computeVertexNormals()

  // кривизна поверхности: выпуклые рёбра стираются и светлеют, во впадинах копится тень
  const pos = geo.attributes.position.array, nrm = geo.attributes.normal.array
  const n = pos.length / 3
  const sum = new Float32Array(n * 3), cnt = new Float32Array(n), elen = new Float32Array(n)
  const link = (x, y) => {
    sum[x * 3] += pos[y * 3]; sum[x * 3 + 1] += pos[y * 3 + 1]; sum[x * 3 + 2] += pos[y * 3 + 2]
    cnt[x]++
    elen[x] += Math.hypot(pos[y * 3] - pos[x * 3], pos[y * 3 + 1] - pos[x * 3 + 1], pos[y * 3 + 2] - pos[x * 3 + 2])
  }
  for (let f = 0; f < indices.length; f += 3) {
    const i0 = indices[f], i1 = indices[f + 1], i2 = indices[f + 2]
    link(i0, i1); link(i1, i0); link(i1, i2); link(i2, i1); link(i2, i0); link(i0, i2)
  }
  const curv = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const k = cnt[i] || 1
    const lx = sum[i * 3] / k - pos[i * 3], ly = sum[i * 3 + 1] / k - pos[i * 3 + 1], lz = sum[i * 3 + 2] / k - pos[i * 3 + 2]
    const e = elen[i] / k || 1e-4
    curv[i] = clamp(-(lx * nrm[i * 3] + ly * nrm[i * 3 + 1] + lz * nrm[i * 3 + 2]) / e * 5, -1, 1)
  }
  // одно сглаживание по соседям — без «зерна»
  const cs = new Float32Array(n), cc = new Float32Array(n)
  for (let f = 0; f < indices.length; f += 3) {
    const t = [indices[f], indices[f + 1], indices[f + 2]]
    for (const x of t) for (const y of t) { cs[x] += curv[y]; cc[x]++ }
  }
  for (let i = 0; i < n; i++) curv[i] = cs[i] / (cc[i] || 1)
  geo.setAttribute('aCurv', new THREE.BufferAttribute(curv, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: { ...S, ...u },
    vertexShader: /* glsl */ `
      attribute float aAO; attribute float aRock; attribute float aCurv;
      uniform float uRockDrop[${ROCK_SHAPES.length}];
      varying vec3 vWorld; varying vec3 vN; varying float vAO; varying float vCurv;
      void main() {
        vec3 p = position;
        p.y += uRockDrop[int(aRock + 0.5)];
        vWorld = p; vN = normal; vAO = aAO; vCurv = aCurv;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      ${UNIFORMS}
      ${NOISE}
      ${GNOISE}
      ${WATER}
      uniform float uAlgae;
      varying vec3 vWorld; varying vec3 vN; varying float vAO; varying float vCurv;
      void main() {
        vec3 p = vWorld;
        vec3 V = normalize(cameraPosition - p);
        vec3 N = normalize(vN);
        float above = step(uWaterY, p.y);
        float wet = mix(1.0, uWet, above);
        // мелкий рельеф только там, где пиксель меньше его масштаба — без мерцания
        float pxs = length(fwidth(p));
        float fine = 1.0 - smoothstep(0.0006, 0.0024, pxs);
        float mid = 1.0 - smoothstep(0.0016, 0.006, pxs);
        // складки: градиент |шума| даёт острые гребни вместо мягких бугров
        vec4 n1 = gnoised3(p * 42.0);
        vec4 n2 = gnoised3(p * 120.0 + 7.3);
        vec4 n3 = gnoised3(p * 320.0 - 2.1);
        vec3 grad = sign(n1.x) * n1.yzw * (42.0 * 0.0011) * mid
                  + sign(n2.x) * n2.yzw * (120.0 * 0.00045) * fine
                  + n3.yzw * (320.0 * 0.00012) * fine;
        grad -= N * dot(grad, N);
        N = normalize(N + grad * mix(1.0, 0.5, wet));
        // сэйрю-сэки: сине-серый камень; сухой — заметно светлее
        float g1 = gnoise3(p * 4.5);
        float g2 = gnoise3(p * 17.0 + 3.1);
        float grain = gnoise3(p * 420.0) * fine;
        vec3 albedo = vec3(0.085, 0.092, 0.1) * (1.0 + 0.26 * g1 + 0.12 * g2 - 0.14 * abs(n1.x) + 0.12 * grain);
        float c = vCurv;
        albedo *= 1.0 + 0.5 * smoothstep(0.04, 0.55, c) - 0.42 * smoothstep(0.0, -0.5, c);
        vec3 q = p * vec3(7.0, 20.0, 7.0) + vec3(gnoise3(p * 3.0), gnoise3(p * 3.0 + 5.0), 0.0) * 1.6;
        float vein = smoothstep(0.03, 0.0, abs(gnoise3(q))) * smoothstep(0.08, 0.3, gnoise3(p * 2.4 + 9.0));
        albedo = mix(albedo, vec3(0.24, 0.245, 0.24), vein * 0.5 * mid);
        // на верхних гранях оседает ил, по ним же растёт мох
        albedo *= 1.0 + 0.1 * smoothstep(0.6, 1.0, N.y);
        float moss = smoothstep(0.62, 0.95, N.y) * smoothstep(0.1, 0.4, gnoise3(p * 14.0));
        albedo = mix(albedo, vec3(0.02, 0.045, 0.015), moss * (0.2 + uAlgae * 0.75));
        albedo *= mix(1.0, 0.62, wet);
        float ao = vAO * (0.72 + 0.28 * smoothstep(-0.6, 0.25, c));
        vec3 col = shadeInterior(p, V, albedo, N, ao, mix(0.012, 0.09, wet), mix(8.0, 26.0, wet), 0.0);
        col = applyWater(col, p);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  return new THREE.Mesh(geo, material)
}

// ---------------------------------------------------------------- растения
const PLANT_VS = /* glsl */ `
attribute vec4 aRoot;   // xyz корня, длина
attribute vec4 aBlade;  // направление наклона, наклон, фаза, ширина
attribute vec4 aExtra;  // оттенок, жёсткость, закрутка, 0
uniform float uTime; uniform float uFlow; uniform float uWaterY; uniform float uSway; uniform float uGrow;
uniform vec3 uTankMin; uniform vec3 uTankMax;
varying vec3 vWorld; varying vec3 vN; varying float vS; varying float vTint; varying float vSide; varying float vAir;

vec2 arc(float k, float len) {
  float a = k * len;
  if (abs(a) < 1e-3) return vec2(0.5 * k * len * len, len);
  return vec2((1.0 - cos(a)) / k, sin(a) / k);
}
void arcStep(inout vec2 P, inout float a, float k, float len) {
  vec2 q = arc(k, len);
  P += vec2(sin(a), cos(a)) * q.y + vec2(cos(a), -sin(a)) * q.x;
  a += k * len;
}

void main() {
  float s = position.y;
  float grow = clamp(uGrow * 2.2 - fract(aBlade.z * 7.13) * 1.2, 0.0, 1.0);
  float L = aRoot.w * max(grow * grow * (3.0 - 2.0 * grow), 0.0001);
  float sigma = s * L;
  vec3 root = aRoot.xyz;
  vec2 lean = vec2(cos(aBlade.x), sin(aBlade.x)) * aBlade.y;
  vec2 flow = vec2(1.0, 0.18) * uFlow * (0.55 + 0.25 * sin(uTime * 0.6 + root.x * 4.0 + root.z * 3.0));
  float sw = sin(uTime * 1.3 + aBlade.z + root.x * 7.0) * 0.6 + sin(uTime * 2.9 + aBlade.z * 2.3 + root.z * 9.0) * 0.3;
  vec2 sway = vec2(sw, sw * 0.7 * cos(aBlade.z * 3.0)) * (0.1 + 0.45 * uFlow) * uSway;
  vec2 bendV = lean + (flow * 0.6 + sway) / aExtra.y;
  float bend = length(bendV);
  vec2 bdir = bend > 1e-4 ? bendV / bend : vec2(cos(aBlade.x), sin(aBlade.x));

  vec2 P = vec2(0.0);
  float ang = 0.0;
  float lateral = 0.0;
#ifdef RIBBON
  // валлиснерия: всплывает к поверхности, у поверхности плавно ложится горизонтально
  // и стелется к середине (не дальше стенки); без воды мягко опадает на грунт
  float d = uWaterY - root.y;
  float rise = clamp(d - 0.035, 0.0, L);
  float k1 = bend / max(rise, 0.05) * 0.8;
  float r1 = rise * 0.42;
  arcStep(P, ang, k1 * 1.6, min(sigma, r1));
  if (sigma > r1) arcStep(P, ang, -k1 * 0.45, min(sigma, rise) - r1);
  float a1 = k1 * 1.6 * r1 - k1 * 0.45 * (rise - r1);
  float rb = 0.026;
  float rem = max(L - rise, 0.0);
  float sB = min(rb * max(1.5708 - a1, 0.0), rem);
  if (sigma > rise) arcStep(P, ang, 1.0 / rb, min(sigma - rise, sB));
  if (sigma > rise + sB) {
    vec2 ds = mix(vec2(1e-4), bdir, greaterThan(abs(bdir), vec2(1e-4)));
    vec2 t1 = (uTankMin.xz + 0.015 - root.xz) / ds;
    vec2 t2 = (uTankMax.xz - 0.015 - root.xz) / ds;
    vec2 tw = max(t1, t2);
    float wall = min(tw.x, tw.y);
    float room = clamp(min(0.1, wall - P.x), 0.0, 0.1);
    float air = smoothstep(0.03, -0.005, d);
    arcStep(P, ang, air * 2.5 / max(L, 0.1), min(sigma - rise - sB, room));
  }
  lateral = sin(sigma * 9.0 - uTime * (0.9 + uFlow) + aBlade.z * 6.0) * 0.008 * s * (0.3 + uFlow) * uSway;
  vAir = step(uWaterY, root.y + P.y);
#else
  // ситняг: под водой гнётся течением, над водой никнет
  float sub = clamp(uWaterY - root.y, 0.0, L);
  float k1 = bend / L;
  float k2 = min(2.3 / max(L - sub, 0.004), 160.0) + k1;
  arcStep(P, ang, k1, min(sigma, sub));
  if (sigma > sub) arcStep(P, ang, k2, sigma - sub);
  vAir = step(sub, sigma - 0.0001);
#endif
  vec3 d3 = vec3(bdir.x, 0.0, bdir.y);
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 side = normalize(cross(up, d3));
  vec3 tangent = normalize(d3 * sin(ang) + up * cos(ang));
  float tw = aExtra.z * s;
  vec3 sideT = side * cos(tw) + cross(tangent, side) * sin(tw);
  float width = aBlade.w * (1.0 - s * 0.8);
  vec3 wp = root + d3 * P.x + up * P.y + side * lateral + sideT * position.x * width;
  vWorld = wp;
  vN = normalize(cross(sideT, tangent));
  vS = s;
  vTint = aExtra.x;
  vSide = position.x;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`

const PLANT_FS = /* glsl */ `
${UNIFORMS}
${NOISE}
${WATER}
uniform vec3 uBase; uniform vec3 uTip; uniform float uTrans;
varying vec3 vWorld; varying vec3 vN; varying float vS; varying float vTint; varying float vSide; varying float vAir;
void main() {
  vec3 p = vWorld;
  vec3 V = normalize(cameraPosition - p);
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 albedo = mix(uBase, uTip, smoothstep(0.0, 1.0, vS)) * (0.75 + 0.5 * vTint);
#ifdef RIBBON
  albedo *= 0.9 + 0.1 * cos(vSide * 18.0);
#endif
  // высохшие листья над водой желтеют и темнеют
  float dry = vAir * (1.0 - uWet);
  albedo = mix(albedo, albedo * vec3(0.8, 0.7, 0.35), dry * 0.7);
  float ao = mix(0.3, 1.0, smoothstep(0.0, 0.5, vS));
  vec3 col = shadeInterior(p, V, albedo, N, ao, 0.35, 40.0, uTrans);
  col = applyWater(col, p);
  gl_FragColor = vec4(col, 1.0);
}
`

function bladeGeometry(segments) {
  const pos = []
  const idx = []
  for (let i = 0; i <= segments; i++) {
    const s = i / segments
    pos.push(-0.5, s, 0, 0.5, s, 0)
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const g = new THREE.InstancedBufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  return g
}

function plantMaterial(S, u, defines, base, tip, trans) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...S, ...u,
      uBase: { value: new THREE.Color(base) },
      uTip: { value: new THREE.Color(tip) },
      uTrans: { value: trans },
    },
    defines,
    vertexShader: PLANT_VS,
    fragmentShader: PLANT_FS,
    side: THREE.DoubleSide,
  })
}

function buildGrass(S, u, quality) {
  const rand = mulberry32(4242)
  const roots = [], blades = [], extras = []
  const tufts = Math.round(1150 * quality)
  let placed = 0, tries = 0
  const tips = []
  while (placed < tufts && tries < tufts * 30) {
    tries++
    const x = INNER.x0 + 0.01 + rand() * (INNER.sx - 0.02)
    const z = INNER.z0 + 0.01 + rand() * (INNER.sz - 0.02)
    const m = sandMask(x, z)
    if (m > 0.35 + rand() * 0.2) continue
    const f = rockField(x, sandHeight(x, z) + 0.004, z)
    if (f.d < 1.06) continue
    placed++
    const n = 7 + Math.floor(rand() * 9)
    // ближе к задней стенке трава выше — перспектива глубже
    const back = 1 - (z - INNER.z0) / INNER.sz
    const hBase = 0.011 + 0.015 * back + rand() * 0.007
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * 0.009
      const bx = x + Math.cos(a) * rr, bz = z + Math.sin(a) * rr
      const y = sandHeight(bx, bz) - 0.001
      const L = hBase * (0.65 + rand() * 0.55)
      roots.push(bx, y, bz, L)
      blades.push(rand() * Math.PI * 2, 0.15 + rand() * 0.45, rand() * 6.283, 0.0011 + rand() * 0.0006)
      extras.push(rand(), 0.8 + rand() * 0.6, (rand() - 0.5) * 2, 0)
      if (rand() < 0.08) tips.push([bx, y + L * 0.9, bz])
    }
  }
  const geo = bladeGeometry(4)
  geo.setAttribute('aRoot', new THREE.InstancedBufferAttribute(new Float32Array(roots), 4))
  geo.setAttribute('aBlade', new THREE.InstancedBufferAttribute(new Float32Array(blades), 4))
  geo.setAttribute('aExtra', new THREE.InstancedBufferAttribute(new Float32Array(extras), 4))
  geo.instanceCount = roots.length / 4
  const mat = plantMaterial(S, u, {}, '#18300f', '#5c8a2b', 0.35)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  return { mesh, tips, count: geo.instanceCount }
}

function buildVallisneria(S, u, quality) {
  const rand = mulberry32(777)
  const roots = [], blades = [], extras = []
  const clumps = [
    { x: -0.52, z: -0.17, n: 26, r: 0.05 },
    { x: -0.42, z: -0.2, n: 18, r: 0.04 },
    { x: 0.45, z: -0.17, n: 24, r: 0.05 },
    { x: 0.54, z: -0.08, n: 14, r: 0.035 },
    { x: 0.12, z: -0.2, n: 12, r: 0.04 },
    { x: -0.02, z: -0.215, n: 8, r: 0.03 },
  ]
  for (const c of clumps) {
    const n = Math.round(c.n * (0.6 + 0.4 * quality))
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * c.r
      const x = clamp(c.x + Math.cos(a) * rr, INNER.x0 + 0.01, INNER.x1 - 0.01)
      const z = clamp(c.z + Math.sin(a) * rr, INNER.z0 + 0.008, INNER.z1 - 0.01)
      if (rockField(x, sandHeight(x, z) + 0.01, z).d < 1.05) continue
      const y = sandHeight(x, z) - 0.002
      const L = 0.16 + rand() * 0.3
      roots.push(x, y, z, L)
      // по поверхности стелются к середине аквариума и чуть вперёд
      const dir = (x > 0 ? Math.PI - 0.25 : 0.25) + (rand() - 0.5) * 1.1
      blades.push(dir, 0.18 + rand() * 0.5, rand() * 6.283, 0.0055 + rand() * 0.0045)
      extras.push(rand(), 1.4 + rand() * 0.8, (rand() - 0.5) * 7, 0)
    }
  }
  const geo = bladeGeometry(28)
  geo.setAttribute('aRoot', new THREE.InstancedBufferAttribute(new Float32Array(roots), 4))
  geo.setAttribute('aBlade', new THREE.InstancedBufferAttribute(new Float32Array(blades), 4))
  geo.setAttribute('aExtra', new THREE.InstancedBufferAttribute(new Float32Array(extras), 4))
  geo.instanceCount = roots.length / 4
  const mat = plantMaterial(S, u, { RIBBON: '' }, '#223f12', '#79a444', 0.55)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  return { mesh }
}

export function buildScape(S, quality = 1) {
  const u = {
    uAlgae: { value: 0 },
    uFlow: { value: 1 },
    uSway: { value: 1 },
    uFill: { value: 1 },
    uGrow: { value: 1 },
    uRockDrop: { value: new Array(ROCK_SHAPES.length).fill(0) },
  }
  const group = new THREE.Group()
  group.add(buildSubstrate(S, u))
  group.add(buildRocks(S, u))
  const grass = buildGrass(S, u, quality)
  group.add(grass.mesh)
  const vall = buildVallisneria(S, u, quality)
  group.add(vall.mesh)
  return { group, uniforms: u, pearlSpots: grass.tips, grassCount: grass.count }
}

export { TANK }
