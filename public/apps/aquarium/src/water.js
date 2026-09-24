// Вода: волновое уравнение на GPU (высота + скорость в текстуре),
// каустики из преломления света через эту поверхность и сама поверхность.
import THREE from './three.js'
import { INNER, WATER_MAX, POUR } from './config.js'
import { UNIFORMS, NOISE, WATER, ENV } from './glsl.js'

const SIM_W = 256
const SIM_H = Math.round(SIM_W * INNER.sz / INNER.sx)   // ≈104, квадратные ячейки
const CAU_W = 512
const CAU_H = Math.round(CAU_W * INNER.sz / INNER.sx)
const MAX_DROPS = 16
export const HEIGHT_SCALE = 0.0032                       // метров на единицу высоты симуляции

const QUAD_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

class Pass {
  constructor(fragmentShader, uniforms) {
    this.material = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader, uniforms, depthTest: false, depthWrite: false })
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material)
    this.mesh.frustumCulled = false
    this.scene = new THREE.Scene()
    this.scene.add(this.mesh)
  }
  render(renderer, target, camera) {
    renderer.setRenderTarget(target)
    renderer.render(this.scene, camera)
  }
}

function simTarget() {
  return new THREE.WebGLRenderTarget(SIM_W, SIM_H, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  })
}

export class Water {
  constructor(renderer, shared) {
    this.renderer = renderer
    this.shared = shared
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.targets = [simTarget(), simTarget()]
    this.current = 0
    this.drops = []
    this.acc = 0
    this.time = 0

    const texel = new THREE.Vector2(1 / SIM_W, 1 / SIM_H)
    const cell = INNER.sx / SIM_W

    this.updatePass = new Pass(/* glsl */ `
      uniform sampler2D tState; uniform vec2 uTexel; uniform float uDamping;
      varying vec2 vUv;
      void main() {
        vec4 info = texture2D(tState, vUv);
        vec2 dx = vec2(uTexel.x, 0.0), dy = vec2(0.0, uTexel.y);
        float avg = (texture2D(tState, vUv - dx).r + texture2D(tState, vUv + dx).r
                   + texture2D(tState, vUv - dy).r + texture2D(tState, vUv + dy).r) * 0.25;
        info.g += (avg - info.r) * 2.0;
        info.g *= uDamping;
        info.r += info.g;
        info.r *= 0.9992;
        gl_FragColor = info;
      }`, { tState: { value: null }, uTexel: { value: texel }, uDamping: { value: 0.996 } })

    this.dropPass = new Pass(/* glsl */ `
      uniform sampler2D tState; uniform vec4 uDrops[${MAX_DROPS}]; uniform int uCount;
      uniform vec2 uMin; uniform vec2 uSize;
      varying vec2 vUv;
      void main() {
        vec4 info = texture2D(tState, vUv);
        vec2 xz = uMin + vUv * uSize;
        for (int i = 0; i < ${MAX_DROPS}; i++) {
          if (i >= uCount) break;
          vec4 d = uDrops[i];
          float r = length(xz - d.xy) / d.z;
          float k = max(0.0, 1.0 - r);
          info.r += (0.5 - cos(k * 3.14159265) * 0.5) * d.w;
        }
        gl_FragColor = info;
      }`, {
      tState: { value: null },
      uDrops: { value: Array.from({ length: MAX_DROPS }, () => new THREE.Vector4()) },
      uCount: { value: 0 },
      uMin: { value: new THREE.Vector2(INNER.x0, INNER.z0) },
      uSize: { value: new THREE.Vector2(INNER.sx, INNER.sz) },
    })

    this.normalPass = new Pass(/* glsl */ `
      uniform sampler2D tState; uniform vec2 uTexel; uniform float uSlope;
      varying vec2 vUv;
      void main() {
        vec4 info = texture2D(tState, vUv);
        vec2 dx = vec2(uTexel.x, 0.0), dy = vec2(0.0, uTexel.y);
        float hl = texture2D(tState, vUv - dx).r, hr = texture2D(tState, vUv + dx).r;
        float hd = texture2D(tState, vUv - dy).r, hu = texture2D(tState, vUv + dy).r;
        vec3 n = normalize(vec3((hl - hr) * uSlope, 1.0, (hd - hu) * uSlope));
        info.ba = n.xz;
        gl_FragColor = info;
      }`, { tState: { value: null }, uTexel: { value: texel }, uSlope: { value: HEIGHT_SCALE / (2 * cell) } })

    // пустое начальное состояние
    const clearTo = new THREE.Color(0, 0, 0)
    for (const t of this.targets) {
      renderer.setRenderTarget(t)
      renderer.setClearColor(clearTo, 0)
      renderer.clear()
    }
    renderer.setRenderTarget(null)

    this._buildCaustics()
    this._buildSurface()
    this._buildStream()
  }

  get texture() { return this.targets[this.current].texture }

  addDrop(x, z, radius, strength) {
    if (this.drops.length > 96) return
    this.drops.push(x, z, radius, strength)
  }

  _swap(pass) {
    const src = this.targets[this.current]
    const dst = this.targets[1 - this.current]
    pass.material.uniforms.tState.value = src.texture
    pass.render(this.renderer, dst, this.camera)
    this.current = 1 - this.current
  }

  // фиксированный шаг 60 Гц: волны ведут себя одинаково на любом FPS
  step(dt, ctx) {
    this.time += dt
    this.acc = Math.min(this.acc + dt, 0.1)
    const stepDt = 1 / 60
    let steps = 0
    while (this.acc >= stepDt && steps < 3) {
      this.acc -= stepDt
      steps++
      this._agitate(ctx)
      this._flushDrops()
      this._swap(this.updatePass)
    }
    if (steps > 0) this._swap(this.normalPass)
  }

  // поток фильтра и струя при наливе постоянно «тревожат» поверхность
  _agitate(ctx) {
    const r = Math.random
    const flow = ctx.flow
    if (flow > 0.01 && ctx.hasWater) {
      for (let i = 0; i < 3; i++) {
        this.addDrop(0.47 - r() * 0.12, -0.19 + r() * 0.12, 0.012 + r() * 0.02, (r() - 0.5) * 0.09 * flow)
      }
      for (let i = 0; i < 5; i++) {
        this.addDrop(INNER.x0 + r() * INNER.sx, INNER.z0 + r() * INNER.sz, 0.008 + r() * 0.018, (r() - 0.5) * 0.028 * flow)
      }
    } else if (ctx.hasWater && r() < 0.08) {
      // даже стоячая вода чуть дышит
      this.addDrop(INNER.x0 + r() * INNER.sx, INNER.z0 + r() * INNER.sz, 0.02 + r() * 0.03, (r() - 0.5) * 0.004)
    }
    if (ctx.pouring > 0.01 && ctx.hasWater) {
      for (let i = 0; i < 4; i++) {
        const a = r() * Math.PI * 2, d = r() * 0.02
        this.addDrop(POUR.x + Math.cos(a) * d, POUR.z + Math.sin(a) * d, 0.01 + r() * 0.025, -(0.1 + r() * 0.25) * ctx.pouring)
      }
    }
    if (ctx.draining && ctx.hasWater && r() < 0.5) {
      this.addDrop(-0.5 + (r() - 0.5) * 0.03, -0.19 + (r() - 0.5) * 0.03, 0.03, -0.03)
    }
  }

  _flushDrops() {
    const u = this.dropPass.material.uniforms
    while (this.drops.length) {
      const n = Math.min(MAX_DROPS, this.drops.length / 4)
      for (let i = 0; i < n; i++) {
        u.uDrops.value[i].set(this.drops[i * 4], this.drops[i * 4 + 1], this.drops[i * 4 + 2], this.drops[i * 4 + 3])
      }
      u.uCount.value = n
      this.drops.splice(0, n * 4)
      this._swap(this.dropPass)
    }
  }

  // ---------- каустики ----------
  _buildCaustics() {
    this.causticTarget = new THREE.WebGLRenderTarget(CAU_W, CAU_H, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      generateMipmaps: true,
      depthBuffer: false,
      stencilBuffer: false,
    })

    const nx = 220, nz = Math.round(nx * INNER.sz / INNER.sx)
    const pad = 0.04
    const pos = new Float32Array((nx + 1) * (nz + 1) * 3)
    let k = 0
    for (let j = 0; j <= nz; j++) {
      for (let i = 0; i <= nx; i++) {
        pos[k++] = -pad + (1 + 2 * pad) * (i / nx)
        pos[k++] = -pad + (1 + 2 * pad) * (j / nz)
        pos[k++] = 0
      }
    }
    const idx = []
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1
        idx.push(a, b, d, a, d, c)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setIndex(idx)

    const makeMat = (ior, channel) => new THREE.ShaderMaterial({
      uniforms: {
        tWater: { value: null },
        uLight: { value: new THREE.Vector3(-0.035, -1, -0.05).normalize() },
        uIor: { value: ior },
        uDepth: { value: 0.4 },
        uMin: { value: new THREE.Vector2(INNER.x0, INNER.z0) },
        uSize: { value: new THREE.Vector2(INNER.sx, INNER.sz) },
        uChannel: { value: channel },
        uGain: { value: 1 },
      },
      vertexShader: /* glsl */ `
        uniform sampler2D tWater; uniform vec3 uLight; uniform float uIor; uniform float uDepth;
        uniform vec2 uMin; uniform vec2 uSize;
        varying vec3 vOld; varying vec3 vNew;
        void main() {
          vec2 uv = position.xy;
          vec4 info = texture2D(tWater, clamp(uv, 0.0, 1.0));
          vec3 N = normalize(vec3(info.b, sqrt(max(1.0 - dot(info.ba, info.ba), 0.0)), info.a));
          vec3 P = vec3(uMin.x + uv.x * uSize.x, 0.0, uMin.y + uv.y * uSize.y);
          vec3 rf = refract(uLight, vec3(0.0, 1.0, 0.0), 1.0 / uIor);
          vec3 r = refract(uLight, N, 1.0 / uIor);
          vOld = P + rf * (uDepth / -rf.y);
          vNew = P + r * (uDepth / -r.y);
          vec2 cuv = (vNew.xz - uMin) / uSize;
          gl_Position = vec4(cuv * 2.0 - 1.0, 0.0, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uChannel; uniform float uGain;
        varying vec3 vOld; varying vec3 vNew;
        void main() {
          float oldA = length(cross(dFdx(vOld), dFdy(vOld)));
          float newA = length(cross(dFdx(vNew), dFdy(vNew)));
          float I = oldA / max(newA, 1e-12);
          gl_FragColor = vec4(uChannel * min(I, 24.0) * uGain, 1.0);
        }`,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    // лёгкая дисперсия: у красного и синего чуть разный коэффициент преломления
    this.causticMats = [
      makeMat(1.329, new THREE.Vector3(1, 0, 0)),
      makeMat(1.3335, new THREE.Vector3(0, 1, 0)),
      makeMat(1.339, new THREE.Vector3(0, 0, 1)),
    ]
    this.causticScene = new THREE.Scene()
    this.causticMeshes = this.causticMats.map(m => {
      const mesh = new THREE.Mesh(geo, m)
      mesh.frustumCulled = false
      this.causticScene.add(mesh)
      return mesh
    })
  }

  renderCaustics(depth) {
    const r = this.renderer
    for (const m of this.causticMats) {
      m.uniforms.tWater.value = this.texture
      m.uniforms.uDepth.value = Math.max(depth, 0.02)
    }
    r.setRenderTarget(this.causticTarget)
    r.setClearColor(0x000000, 0)
    r.clear()
    r.render(this.causticScene, this.camera)
    r.setRenderTarget(null)
  }

  // ---------- поверхность ----------
  _buildSurface() {
    const geo = new THREE.PlaneGeometry(1, 1, 180, Math.round(180 * INNER.sz / INNER.sx))
    geo.rotateX(-Math.PI / 2)                // плоскость XZ, uv (0..1) по баку
    const s = this.shared
    this.surfaceMaterial = new THREE.ShaderMaterial({
      uniforms: { ...s, tWater: { value: null }, uHeightScale: { value: HEIGHT_SCALE } },
      vertexShader: /* glsl */ `
        uniform sampler2D tWater; uniform float uHeightScale; uniform float uWaterY;
        uniform vec3 uTankMin; uniform vec3 uTankMax;
        varying vec3 vWorld; varying vec2 vUv;
        void main() {
          vUv = vec2(uv.x, 1.0 - uv.y);
          vec4 info = texture2D(tWater, vUv);
          vec3 p = vec3(mix(uTankMin.x, uTankMax.x, vUv.x), uWaterY + info.r * uHeightScale, mix(uTankMin.z, uTankMax.z, vUv.y));
          vWorld = p;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        ${UNIFORMS}
        uniform sampler2D tWater;
        ${NOISE}
        ${WATER}
        ${ENV}
        varying vec3 vWorld; varying vec2 vUv;
        void main() {
          if (uWaterY < uTankMin.y + 0.003) discard;
          vec4 info = texture2D(tWater, vUv);
          vec3 N = normalize(vec3(info.b, sqrt(max(1.0 - dot(info.ba, info.ba), 0.0)), info.a));
          vec3 V = normalize(cameraPosition - vWorld);
          vec3 col; float alpha;
          if (V.y > 0.0) {
            float ci = clamp(dot(N, V), 0.0, 1.0);
            float F = 0.02 + 0.98 * pow(1.0 - ci, 5.0);
            vec3 R = reflect(-V, N);
            col = envRadiance(vWorld, R) * F;
            // тонкая плёнка при застое воды
            float film = uMurk * smoothstep(0.35, 0.9, uMurk) * (0.4 + 0.6 * fbm(vWorld.xz * 18.0 + uTime * 0.02));
            col += vec3(0.05, 0.06, 0.03) * film * (0.2 + length(uLampColor) * 0.05);
            alpha = clamp(F + film * 0.3 + 0.04, 0.0, 1.0);
          } else {
            vec3 Nb = -N;
            float ci = clamp(dot(Nb, V), 0.0, 1.0);
            float si = sqrt(1.0 - ci * ci);
            float st = 1.333 * si;
            float tir = smoothstep(0.93, 1.0, st);
            vec3 through = vec3(0.0);
            if (st < 1.0) {
              vec3 T = refract(-V, Nb, 1.333);
              through = envRadiance(vWorld, T);
            }
            float F0 = 0.02 + 0.98 * pow(1.0 - ci, 5.0);
            float F = mix(F0, 1.0, tir);
            // зеркало полного внутреннего отражения: «серебряная» изнанка поверхности
            float ripple = 0.5 + 0.5 * clamp(N.x * 7.0 + N.z * 5.0, -1.0, 1.0);
            vec3 mirror = scatterAt(vWorld) * (1.9 + 0.5 * ripple) + uLampColor * (0.01 + 0.012 * pow(ripple, 4.0));
            col = mix(through, mirror, F);
            alpha = mix(0.25, 0.9, F);
            col = applyWater(col, vWorld);
            col *= alpha;
          }
          gl_FragColor = vec4(col, alpha);
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    })
    this.surface = new THREE.Mesh(geo, this.surfaceMaterial)
    this.surface.frustumCulled = false
    this.surface.renderOrder = 3
  }

  // ---------- струя при наполнении ----------
  _buildStream() {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 20, 40, true)
    geo.translate(0, -0.5, 0)                 // верх в 0, низ в -1
    const s = this.shared
    this.streamMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...s,
        uTop: { value: 1.6 },
        uBottom: { value: WATER_MAX },
        uRadius: { value: 0.016 },
        uAmount: { value: 0 },
      },
      vertexShader: /* glsl */ `
        uniform float uTop; uniform float uBottom; uniform float uRadius; uniform float uTime; uniform float uAmount;
        varying vec3 vWorld; varying vec3 vN; varying float vT;
        void main() {
          float t = -position.y;                       // 0 сверху … 1 снизу
          float y = mix(uTop, uBottom, t);
          float fall = max(uTop - y, 0.0);
          // струя сужается при падении и слегка «дышит»
          float r = uRadius * (1.0 / (1.0 + fall * 0.9)) * (0.88 + 0.12 * sin(y * 90.0 - uTime * 40.0)) * (0.35 + 0.65 * uAmount);
          vec2 wob = vec2(sin(y * 23.0 + uTime * 9.0), cos(y * 19.0 - uTime * 7.0)) * 0.0012 * fall;
          vec3 p = vec3(${POUR.x.toFixed(3)} + position.x * r + wob.x, y, ${POUR.z.toFixed(3)} + position.z * r + wob.y);
          vWorld = p; vN = normalize(vec3(position.x, 0.0, position.z)); vT = t;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        ${UNIFORMS}
        ${NOISE}
        ${WATER}
        ${ENV}
        uniform float uAmount;
        varying vec3 vWorld; varying vec3 vN; varying float vT;
        void main() {
          vec3 V = normalize(cameraPosition - vWorld);
          vec3 N = normalize(vN);
          float ci = abs(dot(N, V));
          float F = 0.03 + 0.97 * pow(1.0 - ci, 4.0);
          vec3 R = reflect(-V, N);
          float streak = fbm(vec2(atan(N.z, N.x) * 3.0, vWorld.y * 60.0 + uTime * 55.0));
          // вода в струе прозрачная: светятся края (френель) и бегущие блики
          vec3 col = envRadiance(vWorld, R) * F * 2.2 + uLampEmit * 0.008 * pow(streak, 3.0) * (0.3 + F);
          col += (uAmbTop * 1.5 + vec3(0.004, 0.005, 0.006)) * (0.2 + streak * 0.8);
          float alpha = clamp(F * 0.75 + 0.06 + pow(streak, 2.0) * 0.18, 0.0, 1.0) * uAmount;
          col = applyWater(col, vWorld) * uAmount;
          gl_FragColor = vec4(col, alpha);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    })
    this.stream = new THREE.Mesh(geo, this.streamMaterial)
    this.stream.frustumCulled = false
    this.stream.renderOrder = 4
    this.stream.visible = false
  }

  sync() {
    this.surfaceMaterial.uniforms.tWater.value = this.texture
  }
}

export { SIM_W, SIM_H }
