// Зал, тумба, стекло, светильник, трубки фильтра, табличка.
import THREE from './three.js'
import { TANK, INNER, LAMP, PLINTH, FILTER } from './config.js'
import { UNIFORMS, NOISE, WATER, ROOM, ENV } from './glsl.js'

const FLOOR_Y = -PLINTH.h - 0.006

const WORLD_VS = /* glsl */ `
varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const PREMUL = {
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
}

export function buildTank(S) {
  const group = new THREE.Group()
  const u = {
    uAlgae: { value: 0 },
    uDry: { value: 0 },
    uWetTop: { value: 0 },
    uTaps: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, -10, 0, -100)) },
    uWallCaustic: { value: 0 },
    uMoonLeds: { value: 0 },
    uSignal: { value: 0 },
  }

  // ---------- зал ----------
  const roomMat = new THREE.ShaderMaterial({
    uniforms: { ...S, ...u, uKind: { value: 0 } },
    vertexShader: WORLD_VS,
    fragmentShader: /* glsl */ `
      ${UNIFORMS}
      ${NOISE}
      ${WATER}
      ${ROOM}
      uniform float uKind; uniform float uWallCaustic;
      varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
      void main() {
        vec3 p = vWorld;
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - p);
        vec3 albedo; float spec = 0.0, gloss = 8.0, ao = 1.0;
        if (uKind < 0.5) {
          // тёмный полированный пол: без мелкого узора, только мягкая неоднородность
          albedo = vec3(0.011, 0.011, 0.012) * (0.94 + 0.12 * vnoise(p.xz * 1.3));
          spec = 0.35; gloss = 28.0;
          // контактная тень у тумбы
          vec2 q = abs(p.xz) - vec2(${(PLINTH.w / 2).toFixed(3)}, ${(PLINTH.d / 2).toFixed(3)});
          float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
          ao = mix(0.2, 1.0, smoothstep(0.0, 0.45, dist));
        } else {
          // стена: ровная матовая, как в музейном зале
          albedo = vec3(0.017, 0.018, 0.021);
          spec = 0.0; gloss = 4.0;
          ao = mix(0.6, 1.0, smoothstep(${FLOOR_Y.toFixed(3)}, ${(FLOOR_Y + 0.6).toFixed(3)}, p.y));
        }
        vec3 col = shadeRoom(p, V, albedo, N, ao, spec, gloss);
        if (uKind > 0.5) {
          // мягкий отсвет воды на стене за аквариумом — без узора, только дыхание света
          float m = exp(-pow(p.x / 1.1, 2.0)) * smoothstep(-0.2, 0.5, p.y) * exp(-pow(max(p.y - 0.5, 0.0) / 0.9, 2.0));
          float breathe = 0.9 + 0.1 * sin(uTime * 0.7) * sin(uTime * 0.43 + 1.3);
          col += albedo * uGlowColor * 6.0 * uWallCaustic * m * breathe;
        }
        col = applyWater(col, p);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const floorMat = roomMat
  const wallMat = roomMat.clone()
  wallMat.uniforms = { ...S, ...u, uKind: { value: 1 } }

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = FLOOR_Y
  group.add(floor)

  const wallGeo = new THREE.PlaneGeometry(40, 10)
  const back = new THREE.Mesh(wallGeo, wallMat)
  back.position.set(0, FLOOR_Y + 5, -2.4)
  group.add(back)
  const left = new THREE.Mesh(wallGeo, wallMat)
  left.rotation.y = Math.PI / 2
  left.position.set(-5, FLOOR_Y + 5, 0)
  group.add(left)
  const right = new THREE.Mesh(wallGeo, wallMat)
  right.rotation.y = -Math.PI / 2
  right.position.set(5, FLOOR_Y + 5, 0)
  group.add(right)

  // ---------- тумба ----------
  const plinthMat = new THREE.ShaderMaterial({
    uniforms: { ...S, uHalf: { value: new THREE.Vector3(PLINTH.w / 2, PLINTH.h / 2, PLINTH.d / 2) }, uCenter: { value: new THREE.Vector3(0, -PLINTH.h / 2 - 0.006, 0) } },
    vertexShader: WORLD_VS,
    fragmentShader: /* glsl */ `
      ${UNIFORMS}
      ${NOISE}
      ${WATER}
      ${ROOM}
      uniform vec3 uHalf; uniform vec3 uCenter;
      varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
      void main() {
        vec3 p = vWorld;
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - p);
        vec3 lp = abs(p - uCenter) - uHalf;
        // «фаска»: у рёбер нормаль чуть скруглена — ловит свет
        vec3 e = smoothstep(-0.006, 0.0, lp);
        float edge = max(max(min(e.x, e.y), min(e.y, e.z)), min(e.x, e.z));
        vec3 albedo = vec3(0.62, 0.61, 0.58) * (0.97 + 0.03 * vnoise(p.xy * 40.0 + p.z * 30.0));
        float top = step(0.5, N.y);
        // под аквариумом верх тумбы в тени и чуть темнее у стекла
        vec2 q = abs(p.xz) - vec2(${(TANK.w / 2).toFixed(3)}, ${(TANK.d / 2).toFixed(3)});
        float dTank = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
        float ao = mix(1.0, mix(0.15, 1.0, smoothstep(0.0, 0.05, dTank)), top);
        ao *= mix(0.55, 1.0, smoothstep(-0.9, -0.6, p.y - uCenter.y - uHalf.y + 0.9));
        vec3 col = shadeRoom(p, V, albedo, N, ao, 0.08, 12.0);
        col += albedo * uSpotColor * 0.002 * edge;
        col = applyWater(col, p);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(PLINTH.w, PLINTH.h, PLINTH.d), plinthMat)
  plinth.position.set(0, -PLINTH.h / 2 - 0.006, 0)
  group.add(plinth)

  // тонкий чёрный коврик под аквариумом
  const darkMat = new THREE.ShaderMaterial({
    uniforms: { ...S, uAlbedo: { value: new THREE.Color(0.012, 0.012, 0.013) }, uSpec: { value: 0.4 }, uGloss: { value: 40 } },
    vertexShader: WORLD_VS,
    fragmentShader: /* glsl */ `
      ${UNIFORMS}
      ${NOISE}
      ${WATER}
      ${ROOM}
      uniform vec3 uAlbedo; uniform float uSpec; uniform float uGloss;
      varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 col = shadeRoom(vWorld, V, uAlbedo, N, 1.0, uSpec, uGloss);
        col = applyWater(col, vWorld);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const mat = new THREE.Mesh(new THREE.BoxGeometry(TANK.w + 0.006, 0.006, TANK.d + 0.006), darkMat)
  mat.position.set(0, -0.003, 0)
  group.add(mat)

  // ---------- табличка «не стучите по стеклу» ----------
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const signTex = new THREE.CanvasTexture(canvas)
  signTex.colorSpace = THREE.SRGBColorSpace
  signTex.anisotropy = 4
  const signMat = new THREE.ShaderMaterial({
    uniforms: { ...S, tSign: { value: signTex } },
    vertexShader: WORLD_VS,
    fragmentShader: /* glsl */ `
      ${UNIFORMS}
      ${NOISE}
      ${WATER}
      ${ROOM}
      uniform sampler2D tSign;
      varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 albedo = texture2D(tSign, vUv).rgb;
        vec3 col = shadeRoom(vWorld, V, albedo, N, 1.0, 0.25, 60.0);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const signGeo = new THREE.BoxGeometry(0.3, 0.075, 0.004)
  const sign = new THREE.Mesh(signGeo, [darkMat, darkMat, darkMat, darkMat, signMat, darkMat])
  sign.position.set(0.36, -0.085, PLINTH.d / 2 + 0.002)
  group.add(sign)

  let signText = null
  function drawSign(ru, en) {
    signText = [ru, en]
    const g = canvas.getContext('2d')
    g.fillStyle = '#16171a'
    g.fillRect(0, 0, canvas.width, canvas.height)
    g.strokeStyle = 'rgba(255,255,255,0.12)'
    g.lineWidth = 3
    g.strokeRect(14, 14, canvas.width - 28, canvas.height - 28)
    g.fillStyle = '#e8e4da'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const fit = (text, size, weight, y, spacing) => {
      let s = size
      g.font = `${weight} ${s}px Raleway, 'Helvetica Neue', Arial, sans-serif`
      if ('letterSpacing' in g) g.letterSpacing = spacing + 'px'
      while (g.measureText(text).width > canvas.width - 120 && s > 20) {
        s -= 2
        g.font = `${weight} ${s}px Raleway, 'Helvetica Neue', Arial, sans-serif`
      }
      g.fillText(text, canvas.width / 2, y)
    }
    fit(ru, 58, 600, 108, 7)
    g.fillStyle = 'rgba(232,228,218,0.6)'
    fit(en, 34, 500, 178, 6)
    signTex.needsUpdate = true
  }
  drawSign('ПОЖАЛУЙСТА, НЕ СТУЧИТЕ ПО СТЕКЛУ', 'PLEASE DO NOT TAP ON THE GLASS')
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => signText && drawSign(signText[0], signText[1]))
  }

  // ---------- стекло ----------
  const glassMat = new THREE.ShaderMaterial({
    uniforms: { ...S, ...u },
    vertexShader: /* glsl */ `
      attribute float aEdge; attribute float aInner;
      varying vec3 vWorld; varying vec3 vN; varying float vEdge; varying float vInner;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vEdge = aEdge; vInner = aInner;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${UNIFORMS}
      ${NOISE}
      ${WATER}
      ${ENV}
      uniform float uAlgae; uniform float uDry; uniform float uWetTop; uniform vec4 uTaps[4];
      varying vec3 vWorld; varying vec3 vN; varying float vEdge; varying float vInner;
      void main() {
        vec3 p = vWorld;
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - p);
        float facing = dot(N, V);
        vec3 Nf = facing < 0.0 ? -N : N;
        float ci = clamp(abs(facing), 0.0, 1.0);
        vec3 R = reflect(-V, Nf);
        vec3 refl = envRadiance(p, R);
        vec3 col; float alpha;
        if (vEdge > 0.5) {
          // торец: толща стекла светится зелёным — главная линия силуэта
          vec3 tint = vec3(0.3, 0.62, 0.55);
          vec3 L = lampDir(p);
          float up = max(dot(Nf, L), 0.0);
          col = tint * (refl * 3.0 + uLampRoom * 0.0022 * (0.25 + up * 2.0) + uGlowColor * 0.05 + uSpotColor * 0.00006);
          alpha = 0.8;
        } else {
          float F = 0.04 + 0.96 * pow(1.0 - ci, 5.0);
          col = refl * F + vec3(0.0006, 0.0014, 0.0012) * (1.0 - ci);
          alpha = F + 0.015 + (1.0 - ci) * 0.05;
          if (vInner > 0.5) {
            // водоросли растут по внутренней стороне, гуще у дна и у поверхности
            float band = max(smoothstep(0.12, 0.02, p.y), smoothstep(uWaterY - 0.1, uWaterY - 0.01, p.y) * step(p.y, uWaterY));
            vec2 gp = vec2(p.x + p.z * 0.7, p.y);
            // «зелёные точки»: мелкие колонии по 1–3 мм
            vec3 sp = voronoi(gp * 380.0);
            float grow = uAlgae * (0.7 + 0.5 * band) * (0.6 + 0.8 * vnoise(gp * 6.0));
            float dots = smoothstep(0.34, 0.2, sp.x) * step(1.0 - grow * 0.9, sp.z);
            // тонкая плёнка
            float film = uAlgae * smoothstep(0.35, 0.8, fbm(gp * 9.0) + band * 0.25) * 0.5;
            float a = clamp(dots * 0.85 + film, 0.0, 1.0) * step(p.y, max(uWaterY, uWetTop) + 0.002);
            vec3 algaeCol = vec3(0.02, 0.04, 0.012) * (0.25 + length(uLampColor) * 0.08) + vec3(0.001, 0.002, 0.0006);
            col = mix(col, algaeCol * a, a * 0.8);
            alpha = mix(alpha, 0.75, a * 0.8);
            // мениск: тонкая яркая линия у поверхности
            float men = exp(-pow((p.y - uWaterY) / 0.0011, 2.0)) * step(uTankMin.y + 0.003, uWaterY);
            col += (uScatter * 6.0 + uLampColor * 0.01) * men;
            alpha += men * 0.35;
            // капли на стекле после слива
            if (uDry > 0.001 && p.y > uWaterY && p.y < uWetTop) {
              vec3 v = voronoi(vec2(p.x + p.z, p.y * 0.8) * 150.0);
              float r = 0.12 + 0.2 * fract(v.z * 17.3);
              float drop = smoothstep(r, r - 0.05, v.x) * step(0.72, v.z) * uDry;
              float rim = smoothstep(r - 0.06, r, v.x) * drop;
              col += (envRadiance(p, reflect(-V, normalize(Nf + vec3(0.0, 0.35, 0.0)))) * 3.0 + uLampRoom * 0.004) * rim;
              alpha = mix(alpha, 0.2, drop * 0.35);
            }
          }
          // след от стука: расходящееся кольцо
          for (int i = 0; i < 4; i++) {
            vec4 t = uTaps[i];
            float age = uTime - t.w;
            if (age < 0.0 || age > 0.7) continue;
            float d = length(p - t.xyz);
            float ring = exp(-pow((d - age * 0.35) / 0.006, 2.0)) * (1.0 - age / 0.7);
            col += vec3(0.02, 0.03, 0.035) * ring * (0.3 + length(uLampColor) * 0.05);
            alpha += ring * 0.08;
          }
        }
        col = applyWater(col, p);
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      }`,
    ...PREMUL,
    side: THREE.DoubleSide,
  })

  // каждое стекло — отдельный меш (правильная сортировка прозрачности)
  const panes = [
    { name: 'bottom', min: [-TANK.w / 2, 0, -TANK.d / 2], max: [TANK.w / 2, TANK.glass, TANK.d / 2], thin: 1, order: 5 },
    { name: 'back', min: [-TANK.w / 2, TANK.glass, -TANK.d / 2], max: [TANK.w / 2, TANK.h, -TANK.d / 2 + TANK.glass], thin: 2, order: 6 },
    { name: 'left', min: [-TANK.w / 2, TANK.glass, INNER.z0], max: [-TANK.w / 2 + TANK.glass, TANK.h, INNER.z1], thin: 0, order: 7 },
    { name: 'right', min: [TANK.w / 2 - TANK.glass, TANK.glass, INNER.z0], max: [TANK.w / 2, TANK.h, INNER.z1], thin: 0, order: 7 },
    { name: 'front', min: [-TANK.w / 2, TANK.glass, TANK.d / 2 - TANK.glass], max: [TANK.w / 2, TANK.h, TANK.d / 2], thin: 2, order: 8 },
  ]
  const glass = []
  for (const pn of panes) {
    const sx = pn.max[0] - pn.min[0], sy = pn.max[1] - pn.min[1], sz = pn.max[2] - pn.min[2]
    const geo = new THREE.BoxGeometry(sx, sy, sz)
    const n = geo.attributes.normal
    const edge = new Float32Array(n.count)
    const inner = new Float32Array(n.count)
    const cx = (pn.min[0] + pn.max[0]) / 2, cy = (pn.min[1] + pn.max[1]) / 2, cz = (pn.min[2] + pn.max[2]) / 2
    const toCenter = [0 - cx, 0.28 - cy, 0 - cz]
    for (let i = 0; i < n.count; i++) {
      const nv = [n.getX(i), n.getY(i), n.getZ(i)]
      const broad = Math.abs(nv[pn.thin]) > 0.5
      edge[i] = broad ? 0 : 1
      inner[i] = broad && nv[pn.thin] * toCenter[pn.thin] > 0 ? 1 : 0
    }
    geo.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1))
    geo.setAttribute('aInner', new THREE.BufferAttribute(inner, 1))
    const mesh = new THREE.Mesh(geo, glassMat)
    mesh.position.set(cx, cy, cz)
    mesh.renderOrder = pn.order
    mesh.userData.pane = pn.name
    group.add(mesh)
    glass.push(mesh)
  }

  // силикон по внутренним вертикальным углам и по дну
  const seamMat = darkMat
  const seam = 0.0035
  const seams = [
    [INNER.x0 + seam / 2, INNER.z0 + seam / 2], [INNER.x1 - seam / 2, INNER.z0 + seam / 2],
    [INNER.x0 + seam / 2, INNER.z1 - seam / 2], [INNER.x1 - seam / 2, INNER.z1 - seam / 2],
  ]
  const seamGroup = new THREE.Group()
  group.add(seamGroup)
  for (const [x, z] of seams) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(seam, TANK.h - TANK.glass, seam), seamMat)
    m.position.set(x, TANK.glass + (TANK.h - TANK.glass) / 2, z)
    seamGroup.add(m)
  }

  // ---------- фон: тёмная матовая плёнка на заднем стекле ----------
  const filmMat = new THREE.ShaderMaterial({
    uniforms: { ...S },
    vertexShader: WORLD_VS,
    fragmentShader: /* glsl */ `
      ${UNIFORMS}
      ${NOISE}
      ${WATER}
      varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
      void main() {
        vec3 p = vWorld;
        vec3 V = normalize(cameraPosition - p);
        float h = (p.y - uTankMin.y) / (uTankMax.y - uTankMin.y);
        vec3 albedo = mix(vec3(0.004, 0.006, 0.008), vec3(0.018, 0.03, 0.036), smoothstep(0.1, 1.0, h));
        vec3 col = shadeInterior(p, V, albedo, vec3(0.0, 0.0, 1.0), 1.0, 0.0, 8.0, 0.0);
        col = applyWater(col, p);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const film = new THREE.Mesh(new THREE.PlaneGeometry(INNER.sx, TANK.h - TANK.glass), filmMat)
  film.position.set(0, TANK.glass + (TANK.h - TANK.glass) / 2, INNER.z0 + 0.0004)
  group.add(film)

  // ---------- светильник ----------
  const lampBodyMat = darkMat.clone()
  lampBodyMat.uniforms = { ...S, uAlbedo: { value: new THREE.Color(0.02, 0.02, 0.022) }, uSpec: { value: 0.9 }, uGloss: { value: 70 } }
  const lamp = new THREE.Group()
  group.add(lamp)
  const lampBody = new THREE.Mesh(new THREE.BoxGeometry(LAMP.halfLen * 2 + 0.024, LAMP.thickness, LAMP.halfDepth * 2 + 0.024), lampBodyMat)
  lampBody.position.set(0, LAMP.y, 0)
  lamp.add(lampBody)

  const diffMat = new THREE.ShaderMaterial({
    uniforms: { ...S, ...u },
    vertexShader: WORLD_VS,
    fragmentShader: /* glsl */ `
      uniform vec3 uLampEmit; uniform float uMoonLeds; uniform vec2 uLampHalf;
      varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
      void main() {
        vec2 q = vWorld.xz / uLampHalf;
        // диоды просвечивают сквозь рассеиватель
        float led = 0.85 + 0.15 * pow(abs(sin(vWorld.x * 3.14159 * 60.0)), 8.0);
        vec3 col = uLampEmit * led * (1.0 - 0.25 * pow(abs(q.y), 3.0));
        // лунные диоды: редкие синие точки
        float moon = smoothstep(0.012, 0.0, length(vec2(mod(vWorld.x + 0.05, 0.1) - 0.05, vWorld.z))) * uMoonLeds;
        col += vec3(0.2, 0.45, 1.6) * moon;
        gl_FragColor = vec4(col + vec3(0.002), 1.0);
      }`,
  })
  const diffuser = new THREE.Mesh(new THREE.PlaneGeometry(LAMP.halfLen * 2, LAMP.halfDepth * 2), diffMat)
  diffuser.rotation.x = Math.PI / 2
  diffuser.position.set(0, LAMP.y - LAMP.thickness / 2 - 0.0005, 0)
  lamp.add(diffuser)

  const cableGeo = new THREE.CylinderGeometry(0.0009, 0.0009, 3.2, 6, 1, true)
  for (const x of [-0.44, 0.44]) {
    const c = new THREE.Mesh(cableGeo, lampBodyMat)
    c.position.set(x, LAMP.y + 1.6, 0)
    lamp.add(c)
  }

  // ---------- трубки фильтра (стеклянные «лили-пайпы») ----------
  const pipeMat = new THREE.ShaderMaterial({
    uniforms: { ...S, ...u },
    vertexShader: WORLD_VS,
    fragmentShader: /* glsl */ `
      ${UNIFORMS}
      ${NOISE}
      ${WATER}
      ${ENV}
      varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
      void main() {
        vec3 p = vWorld;
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - p);
        float ci = abs(dot(N, V));
        vec3 Nf = N * sign(dot(N, V));
        float F = 0.04 + 0.96 * pow(1.0 - ci, 4.0);
        vec3 R = reflect(-V, Nf);
        vec3 col = envRadiance(p, R) * F * 2.2;
        // блик лампы на стекле трубки
        vec3 L = lampDir(p);
        col += uLampRoom * 0.02 * pow(max(dot(R, L), 0.0), 60.0);
        // у краёв стенка трубки видна «в толщину» — тонкий зеленоватый ободок
        float rim = smoothstep(0.32, 0.0, ci);
        col += vec3(0.012, 0.03, 0.026) * rim * (0.25 + length(uLampRoom) * 0.02 + length(uAmbTop) * 3.0);
        float alpha = clamp(F * 0.9 + rim * 0.4 + 0.02, 0.0, 1.0);
        col = applyWater(col, p);
        gl_FragColor = vec4(col, alpha);
      }`,
    ...PREMUL,
    side: THREE.DoubleSide,
  })
  const r = 0.0075
  const intakeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(FILTER.intake.x, FILTER.intake.bottom, FILTER.intake.z),
    new THREE.Vector3(FILTER.intake.x, 0.5, FILTER.intake.z),
    new THREE.Vector3(FILTER.intake.x, 0.585, FILTER.intake.z - 0.02),
    new THREE.Vector3(FILTER.intake.x, 0.6, -TANK.d / 2 - 0.005),
    new THREE.Vector3(FILTER.intake.x, 0.575, -TANK.d / 2 - 0.035),
    new THREE.Vector3(FILTER.intake.x, 0.35, -TANK.d / 2 - 0.04),
    new THREE.Vector3(FILTER.intake.x, -0.02, -TANK.d / 2 - 0.045),
  ], false, 'catmullrom', 0.3)
  const o = FILTER.outflow
  const outCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(o.x, -0.02, -TANK.d / 2 - 0.045),
    new THREE.Vector3(o.x, 0.35, -TANK.d / 2 - 0.04),
    new THREE.Vector3(o.x, 0.575, -TANK.d / 2 - 0.035),
    new THREE.Vector3(o.x, 0.6, -TANK.d / 2 - 0.005),
    new THREE.Vector3(o.x, 0.585, o.z - 0.02),
    new THREE.Vector3(o.x, 0.53, o.z),
    new THREE.Vector3(o.x - 0.012, o.y + 0.006, o.z + 0.004),
    new THREE.Vector3(o.x - 0.045, o.y, o.z + 0.012),
  ], false, 'catmullrom', 0.3)
  const pipes = new THREE.Group()
  for (const curve of [intakeCurve, outCurve]) {
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, r, 16, false), pipeMat)
    tube.renderOrder = 4
    pipes.add(tube)
  }
  // раструб «лилии» на выходе и корзинка-сетка на заборе
  const lily = new THREE.Mesh(new THREE.CylinderGeometry(0.019, r, 0.03, 24, 1, true), pipeMat)
  lily.rotation.z = Math.PI / 2
  lily.position.set(o.x - 0.06, o.y, o.z + 0.016)
  lily.renderOrder = 4
  pipes.add(lily)
  const strainer = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.5, r * 1.5, 0.07, 18, 1, false), pipeMat)
  strainer.position.set(FILTER.intake.x, FILTER.intake.bottom + 0.03, FILTER.intake.z)
  strainer.renderOrder = 4
  pipes.add(strainer)
  group.add(pipes)

  // тёмные шланги за аквариумом (видны сбоку)
  const hoseMat = darkMat.clone()
  hoseMat.uniforms = { ...S, uAlbedo: { value: new THREE.Color(0.01, 0.016, 0.013) }, uSpec: { value: 0.6 }, uGloss: { value: 50 } }
  for (const x of [FILTER.intake.x, o.x]) {
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, -0.01, -TANK.d / 2 - 0.045),
      new THREE.Vector3(x, -0.3, -TANK.d / 2 - 0.05),
      new THREE.Vector3(x * 0.8, -0.8, -TANK.d / 2 - 0.2),
      new THREE.Vector3(x * 0.6, FLOOR_Y, -TANK.d / 2 - 0.5),
    ]), 40, 0.008, 10, false), hoseMat)
    pipes.add(hose)
  }

  function setTap(i, x, y, z, t) { u.uTaps.value[i % 4].set(x, y, z, t) }

  return {
    group, glass, uniforms: u, drawSign, setTap,
    parts: { plinth, mat, sign, glass, seams: seamGroup, film, lamp, pipes, floor, walls: [back, left, right] },
  }
}
