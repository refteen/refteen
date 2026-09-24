// Частицы: пузырьки (фильтр, фотосинтез, струя), взвесь в толще, корм, облачка песка.
import THREE from './three.js'
import { INNER, FILTER, POUR } from './config.js'
import { UNIFORMS, NOISE, WATER } from './glsl.js'
import { sandHeight, flowAt } from './terrain.js'
import { mulberry32, clamp } from './noise.js'

const MAX_BUBBLES = 520
const MAX_FOOD = 64
const MAX_PUFFS = 160
const DUST = 900

const _flow = [0, 0, 0]

const BILLBOARD_VS = /* glsl */ `
attribute vec4 aP;       // xyz, радиус
attribute vec4 aC;       // доп. параметры
uniform float uPixel;
varying vec2 vQ; varying vec3 vWorld; varying float vReal; varying vec4 vC;
void main() {
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float dist = length(cameraPosition - aP.xyz);
  float r = max(aP.w, dist * uPixel * 0.85);
  vec3 p = aP.xyz + (right * position.x + up * position.y) * r;
  vQ = position.xy;
  vWorld = aP.xyz;
  vReal = aP.w / r;
  vC = aC;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`

export class Particles {
  constructor(S, pearlSpots) {
    this.S = S
    this.rand = mulberry32(99)
    this.group = new THREE.Group()
    this.pearlSpots = pearlSpots
    this.pixel = { value: 0.001 }
    this.popEvents = []
    this.landEvents = []

    // ---------- пузырьки ----------
    this.bubbles = []
    const quad = new THREE.PlaneGeometry(2, 2)
    const bGeo = new THREE.InstancedBufferGeometry()
    bGeo.index = quad.index
    bGeo.setAttribute('position', quad.attributes.position)
    this.bP = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BUBBLES * 4), 4).setUsage(THREE.DynamicDrawUsage)
    this.bC = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BUBBLES * 4), 4).setUsage(THREE.DynamicDrawUsage)
    bGeo.setAttribute('aP', this.bP)
    bGeo.setAttribute('aC', this.bC)
    bGeo.instanceCount = 0
    this.bGeo = bGeo
    const bMat = new THREE.ShaderMaterial({
      uniforms: { ...S, uPixel: this.pixel },
      vertexShader: BILLBOARD_VS,
      fragmentShader: /* glsl */ `
        ${UNIFORMS}
        ${NOISE}
        ${WATER}
        varying vec2 vQ; varying vec3 vWorld; varying float vReal; varying vec4 vC;
        void main() {
          float d = length(vQ);
          if (d > 1.0) discard;
          float rim = smoothstep(0.5, 0.97, d) * (1.0 - smoothstep(0.97, 1.0, d) * 0.6);
          float hl = smoothstep(0.42, 0.0, length(vQ - vec2(-0.33, 0.38)));
          float depth = max(uWaterY - vWorld.y, 0.0);
          vec3 Tl = exp(-uAbsorb * depth);
          vec3 light = uLampColor * Tl * 0.022 + uAmbTop * 1.2;
          float tiny = 1.0 - vReal;
          vec3 col = light * (rim * 0.5 + hl * 1.1) * (1.0 + tiny * 0.6);
          float a = clamp(rim * 0.6 + hl * 0.9, 0.0, 1.0) * mix(1.0, 0.55, tiny);
          col = applyWater(col, vWorld);
          gl_FragColor = vec4(col * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    })
    this.bMesh = new THREE.Mesh(bGeo, bMat)
    this.bMesh.frustumCulled = false
    this.bMesh.renderOrder = 2
    this.group.add(this.bMesh)

    // ---------- облачка песка ----------
    this.puffs = []
    const pGeo = new THREE.InstancedBufferGeometry()
    pGeo.index = quad.index
    pGeo.setAttribute('position', quad.attributes.position)
    this.pP = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PUFFS * 4), 4).setUsage(THREE.DynamicDrawUsage)
    this.pC = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PUFFS * 4), 4).setUsage(THREE.DynamicDrawUsage)
    pGeo.setAttribute('aP', this.pP)
    pGeo.setAttribute('aC', this.pC)
    pGeo.instanceCount = 0
    this.pGeo = pGeo
    const pMat = new THREE.ShaderMaterial({
      uniforms: { ...S, uPixel: this.pixel },
      vertexShader: BILLBOARD_VS,
      fragmentShader: /* glsl */ `
        ${UNIFORMS}
        ${NOISE}
        ${WATER}
        varying vec2 vQ; varying vec3 vWorld; varying float vReal; varying vec4 vC;
        void main() {
          float d = length(vQ);
          if (d > 1.0) discard;
          float a = (1.0 - smoothstep(0.1, 1.0, d)) * vC.x;
          vec3 light = uLampColor * 0.02 + uAmbTop * 1.2;
          vec3 col = vec3(0.2, 0.17, 0.13) * light;
          col = applyWater(col, vWorld);
          gl_FragColor = vec4(col * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    })
    this.pMesh = new THREE.Mesh(pGeo, pMat)
    this.pMesh.frustumCulled = false
    this.pMesh.renderOrder = 1
    this.group.add(this.pMesh)

    // ---------- взвесь ----------
    const dPos = new Float32Array(DUST * 3)
    const dSeed = new Float32Array(DUST * 4)
    const r = this.rand
    for (let i = 0; i < DUST; i++) {
      dPos[i * 3] = 0
      dSeed[i * 4] = INNER.x0 + r() * INNER.sx
      dSeed[i * 4 + 1] = 0.06 + r() * 0.47
      dSeed[i * 4 + 2] = INNER.z0 + r() * INNER.sz
      dSeed[i * 4 + 3] = r()
    }
    const dGeo = new THREE.BufferGeometry()
    dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3))
    dGeo.setAttribute('aDust', new THREE.BufferAttribute(dSeed, 4))
    this.drift = { value: new THREE.Vector3() }
    this.pointScale = { value: 300 }
    const dMat = new THREE.ShaderMaterial({
      uniforms: { ...S, uDrift: this.drift, uPointScale: this.pointScale },
      vertexShader: /* glsl */ `
        ${UNIFORMS}
        ${NOISE}
        ${WATER}
        attribute vec4 aDust;
        uniform vec3 uDrift; uniform float uPointScale;
        varying float vA; varying vec3 vCol;
        void main() {
          float s = aDust.w;
          vec3 p = aDust.xyz + uDrift * (0.55 + s * 0.9);
          p += vec3(sin(uTime * 0.31 + s * 40.0), sin(uTime * 0.23 + s * 17.0) * 0.6, cos(uTime * 0.27 + s * 29.0)) * 0.005;
          vec3 lo = uTankMin + vec3(0.004, 0.045, 0.004);
          vec3 size = vec3(uTankMax.x - uTankMin.x - 0.008, 0.49, uTankMax.z - uTankMin.z - 0.008);
          p = lo + mod(p - lo, size);
          float vis = step(p.y, uWaterY - 0.003);
          vec3 c = textureLod(tCaustics, tankUV(p.xz), 2.5).rgb;
          float depth = max(uWaterY - p.y, 0.0);
          vec3 Tl = exp(-uAbsorb * depth);
          vCol = uLampColor * Tl * 0.0035 * (0.4 + c) + uAmbTop * 0.35;
          vA = vis * (0.25 + 0.75 * s) * (0.35 + uMurk * 1.8);
          vec4 mv = viewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(uPointScale / -mv.z * (0.5 + s * 0.8), 1.0, 3.2);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA; varying vec3 vCol;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = vA * (1.0 - smoothstep(0.15, 0.5, d));
          gl_FragColor = vec4(vCol * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    })
    this.dust = new THREE.Points(dGeo, dMat)
    this.dust.frustumCulled = false
    this.dust.renderOrder = 1
    this.group.add(this.dust)

    // ---------- корм ----------
    this.food = []
    const fGeo = new THREE.PlaneGeometry(1, 1, 1, 1)
    const fMat = new THREE.ShaderMaterial({
      uniforms: { ...S },
      vertexShader: /* glsl */ `
        attribute vec3 aFood;  // оттенок, сид, 0
        varying vec3 vWorld; varying vec3 vN; varying vec2 vUv; varying vec3 vFood;
        void main() {
          mat4 m = modelMatrix * instanceMatrix;
          vec4 wp = m * vec4(position, 1.0);
          vWorld = wp.xyz; vN = normalize(mat3(m) * vec3(0.0, 0.0, 1.0)); vUv = uv; vFood = aFood;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        #define NO_FISH_SHADOW
        ${UNIFORMS}
        ${NOISE}
        ${WATER}
        varying vec3 vWorld; varying vec3 vN; varying vec2 vUv; varying vec3 vFood;
        void main() {
          vec2 q = vUv - 0.5;
          float edge = 0.33 + 0.14 * (vnoise(q * 9.0 + vFood.y * 50.0) - 0.5) * 2.0;
          float a = smoothstep(edge, edge - 0.06, length(q * vec2(1.0, 1.3)));
          if (a < 0.02) discard;
          vec3 cols[4];
          cols[0] = vec3(0.55, 0.12, 0.04);
          cols[1] = vec3(0.6, 0.32, 0.05);
          cols[2] = vec3(0.2, 0.3, 0.06);
          cols[3] = vec3(0.5, 0.42, 0.12);
          vec3 albedo = cols[int(vFood.x * 3.99)] * (0.8 + 0.4 * vnoise(vUv * 20.0 + vFood.y * 9.0));
          vec3 N = normalize(vN);
          if (!gl_FrontFacing) N = -N;
          vec3 V = normalize(cameraPosition - vWorld);
          vec3 col = shadeInterior(vWorld, V, albedo, N, 1.0, 0.2, 20.0, 0.6);
          col = applyWater(col, vWorld);
          gl_FragColor = vec4(col, a);
        }`,
      side: THREE.DoubleSide,
      alphaToCoverage: true,
    })
    this.fAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FOOD * 3), 3)
    fGeo.setAttribute('aFood', this.fAttr)
    this.fMesh = new THREE.InstancedMesh(fGeo, fMat, MAX_FOOD)
    this.fMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.fMesh.count = 0
    this.fMesh.frustumCulled = false
    this.group.add(this.fMesh)
    this._fm = new THREE.Matrix4()
    this._fq = new THREE.Quaternion()
    this._fe = new THREE.Euler()
    this._fs = new THREE.Vector3()
    this._fp = new THREE.Vector3()
  }

  setPixelSize(worldPerPixelAtUnit, pointScale) {
    this.pixel.value = worldPerPixelAtUnit
    this.pointScale.value = pointScale
  }

  spawnBubble(x, y, z, r, vx = 0, vy = 0, vz = 0, kind = 0) {
    if (this.bubbles.length >= MAX_BUBBLES) return
    this.bubbles.push({ x, y, z, r, vx, vy, vz, ph: this.rand() * 6.28, kind })
  }

  puff(x, y, z, n = 6, spread = 0.012) {
    const r = this.rand
    for (let i = 0; i < n && this.puffs.length < MAX_PUFFS; i++) {
      this.puffs.push({
        x: x + (r() - 0.5) * spread, y: y + r() * 0.004, z: z + (r() - 0.5) * spread,
        vx: (r() - 0.5) * 0.03, vy: 0.01 + r() * 0.03, vz: (r() - 0.5) * 0.03,
        r: 0.003 + r() * 0.005, life: 0, max: 1.2 + r() * 1.6,
      })
    }
  }

  feed(x, z) {
    const r = this.rand
    const cx = x ?? (INNER.x0 + 0.15 + r() * (INNER.sx - 0.3))
    const cz = z ?? (INNER.z0 + 0.12 + r() * (INNER.sz - 0.22))
    const n = 10 + Math.floor(r() * 6)
    for (let i = 0; i < n && this.food.length < MAX_FOOD; i++) {
      this.food.push({
        x: cx + (r() - 0.5) * 0.07, y: 0.62 + r() * 0.05, z: cz + (r() - 0.5) * 0.05,
        vy: -0.4, float: 1.5 + r() * 2.5, onSurface: false, alive: true,
        rx: r() * 6.28, ry: r() * 6.28, rz: r() * 6.28, spin: (r() - 0.5) * 3, size: 0.004 + r() * 0.003,
        tint: r(), seed: r(), age: 0, landed: false, splashed: false,
      })
    }
    return { x: cx, z: cz }
  }

  update(dt, env) {
    const r = this.rand
    this.popEvents.length = 0
    this.landEvents.length = 0
    const wy = env.waterY
    const hasWater = env.hasWater

    // --- источники пузырьков ---
    if (hasWater && env.flow > 0.02 && wy > FILTER.outflow.y + 0.005) {
      const rate = 34 * env.flow
      let n = rate * dt
      while (n > 0) {
        if (r() < n) {
          const o = FILTER.outflow
          this.spawnBubble(o.x - 0.07, o.y + (r() - 0.5) * 0.01, o.z + 0.016 + (r() - 0.5) * 0.012,
            0.0003 + r() * 0.0009, -0.16 - r() * 0.1, (r() - 0.5) * 0.03, 0.03 + r() * 0.05, 0)
        }
        n -= 1
      }
    }
    // фотосинтез: кислородные пузырьки на траве только под светом
    if (hasWater && env.light > 0.3 && this.pearlSpots.length) {
      let n = 7 * env.light * dt
      while (n > 0) {
        if (r() < n) {
          const s = this.pearlSpots[Math.floor(r() * this.pearlSpots.length)]
          if (s[1] < wy - 0.01) this.spawnBubble(s[0], s[1], s[2], 0.00025 + r() * 0.0005, 0, 0.01, 0, 1)
        }
        n -= 1
      }
    }
    // струя при наливе вбивает в воду облако пузырей
    if (env.pouring > 0.05 && hasWater) {
      let n = 90 * env.pouring * dt
      while (n > 0) {
        if (r() < n) {
          const a = r() * 6.28, d = r() * 0.03
          this.spawnBubble(POUR.x + Math.cos(a) * d, wy - r() * Math.min(0.12, wy - 0.05), POUR.z + Math.sin(a) * d,
            0.0005 + r() * 0.0022, (r() - 0.5) * 0.12, -0.25 - r() * 0.2, (r() - 0.5) * 0.12, 2)
        }
        n -= 1
      }
    }

    // --- пузырьки ---
    const bp = this.bP.array
    let k = 0
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]
      const vt = Math.min(0.24, 115 * b.r)
      b.vy += (vt - b.vy) * Math.min(1, dt * (b.kind === 2 ? 3 : 6))
      b.vx *= Math.exp(-dt * 2.5)
      b.vz *= Math.exp(-dt * 2.5)
      if (env.flow > 0.01) {
        flowAt(b.x, b.y, b.z, _flow)
        b.x += _flow[0] * 0.035 * env.flow * dt
        b.z += _flow[2] * 0.035 * env.flow * dt
      }
      b.ph += dt * (8 + b.r * 4000)
      const wob = b.r > 0.0012 ? 0.012 : 0.003
      b.x += (b.vx + Math.sin(b.ph) * wob) * dt
      b.y += b.vy * dt
      b.z += (b.vz + Math.cos(b.ph * 0.8) * wob * 0.6) * dt
      b.x = clamp(b.x, INNER.x0 + 0.003, INNER.x1 - 0.003)
      b.z = clamp(b.z, INNER.z0 + 0.003, INNER.z1 - 0.003)
      if (b.y >= wy - 0.001 || !hasWater) {
        if (hasWater) this.popEvents.push(b)
        this.bubbles.splice(i, 1)
        continue
      }
    }
    for (const b of this.bubbles) {
      bp[k * 4] = b.x
      bp[k * 4 + 1] = b.y
      bp[k * 4 + 2] = b.z
      bp[k * 4 + 3] = b.r
      k++
    }
    this.bGeo.instanceCount = k
    this.bP.needsUpdate = true

    // --- облачка песка ---
    const pp = this.pP.array, pc = this.pC.array
    k = 0
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i]
      p.life += dt
      if (p.life > p.max) { this.puffs.splice(i, 1); continue }
      p.vx *= Math.exp(-dt * 2); p.vz *= Math.exp(-dt * 2); p.vy = p.vy * Math.exp(-dt * 2) - dt * 0.004
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt
      p.r += dt * 0.006
    }
    for (const p of this.puffs) {
      pp[k * 4] = p.x; pp[k * 4 + 1] = p.y; pp[k * 4 + 2] = p.z; pp[k * 4 + 3] = p.r
      const t = p.life / p.max
      pc[k * 4] = (1 - t) * Math.min(1, p.life * 8) * 0.35
      k++
    }
    this.pGeo.instanceCount = k
    this.pP.needsUpdate = true
    this.pC.needsUpdate = true

    // --- взвесь дрейфует по течению ---
    const d = this.drift.value
    d.x -= 0.012 * env.flow * dt
    d.y += (-0.0015 * (1 - env.flow) + 0.0006 * env.flow) * dt
    d.z += 0.0025 * env.flow * dt

    // --- корм ---
    let n = 0
    for (let i = this.food.length - 1; i >= 0; i--) {
      const f = this.food[i]
      f.age += dt
      if (!f.alive || f.age > 70) { this.food.splice(i, 1); continue }
      const floor = sandHeight(f.x, f.z) + 0.001
      if (!hasWater || f.y > wy + 0.001) {
        // падает в воздухе
        f.vy -= 9.8 * dt * 0.4
        f.vy = Math.max(f.vy, -1.2)
        f.y += f.vy * dt
        if (hasWater && f.y <= wy) {
          f.y = wy
          f.onSurface = true
          f.vy = 0
          if (!f.splashed) { f.splashed = true; this.landEvents.push(f) }
        }
      } else if (f.onSurface) {
        f.y = wy + 0.0005
        f.float -= dt
        if (env.flow > 0.01) {
          flowAt(f.x, f.y, f.z, _flow)
          f.x += _flow[0] * 0.02 * env.flow * dt
          f.z += _flow[2] * 0.02 * env.flow * dt
        }
        if (f.float <= 0) { f.onSurface = false; f.vy = -0.004 }
      } else {
        f.vy += (-0.012 - f.vy) * Math.min(1, dt * 2)
        f.y += f.vy * dt
        f.x += Math.sin(f.age * 2.1 + f.seed * 20) * 0.004 * dt
        f.z += Math.cos(f.age * 1.7 + f.seed * 13) * 0.004 * dt
        f.rx += f.spin * dt
        f.rz += f.spin * 0.7 * dt
      }
      if (f.y < floor) { f.y = floor; f.vy = 0; f.onSurface = false; f.landed = true }
      f.x = clamp(f.x, INNER.x0 + 0.004, INNER.x1 - 0.004)
      f.z = clamp(f.z, INNER.z0 + 0.004, INNER.z1 - 0.004)
    }
    for (const f of this.food) {
      if (n >= MAX_FOOD) break
      this._fe.set(f.onSurface || f.landed ? Math.PI / 2 : f.rx, f.ry, f.onSurface || f.landed ? 0 : f.rz)
      this._fq.setFromEuler(this._fe)
      this._fs.setScalar(f.size)
      this._fp.set(f.x, f.y, f.z)
      this._fm.compose(this._fp, this._fq, this._fs)
      this.fMesh.setMatrixAt(n, this._fm)
      this.fAttr.array[n * 3] = f.tint
      this.fAttr.array[n * 3 + 1] = f.seed
      n++
    }
    this.fMesh.count = n
    this.fMesh.instanceMatrix.needsUpdate = true
    this.fAttr.needsUpdate = true
  }
}
