// HDR-конвейер: сцена в float-буфер с MSAA → объёмный свет в толще воды
// (марш луча по каустикам) → bloom → тональная компрессия, виньетка, зерно.
import THREE from './three.js'
import { UNIFORMS, NOISE, WATER } from './glsl.js'

const VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

function rt(w, h, opts = {}) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    ...opts,
  })
}

class FSQuad {
  constructor(material) {
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    this.mesh.frustumCulled = false
    this.scene = new THREE.Scene()
    this.scene.add(this.mesh)
  }
  set material(m) { this.mesh.material = m }
  render(renderer, target, camera) {
    renderer.setRenderTarget(target)
    renderer.render(this.scene, camera)
  }
}

export class Post {
  constructor(renderer, shared, { samples = 4 } = {}) {
    this.renderer = renderer
    this.shared = shared
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.samples = samples
    this.width = 1
    this.height = 1
    this.frame = 0

    this.depthTexture = new THREE.DepthTexture(1, 1)
    this.depthTexture.type = THREE.UnsignedIntType
    this.sceneRT = rt(1, 1, { depthBuffer: true, samples, depthTexture: this.depthTexture })
    this.volRT = rt(1, 1)
    this.bloomRT = []
    for (let i = 0; i < 6; i++) this.bloomRT.push(rt(1, 1))

    this.quad = new FSQuad(null)

    // --- объёмный свет ---
    this.volMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        tDepth: { value: this.depthTexture },
        uInvProj: { value: new THREE.Matrix4() },
        uCamWorld: { value: new THREE.Matrix4() },
        uCamPos: { value: new THREE.Vector3() },
        uStrength: { value: 1 },
        uSteps: { value: 22 },
      },
      vertexShader: VS,
      fragmentShader: /* glsl */ `
        ${UNIFORMS}
        ${NOISE}
        ${WATER}
        uniform sampler2D tDepth; uniform mat4 uInvProj; uniform mat4 uCamWorld; uniform vec3 uCamPos;
        uniform float uStrength; uniform int uSteps;
        varying vec2 vUv;
        void main() {
          if (uWaterY <= uTankMin.y + 0.002 || uStrength <= 0.0) { gl_FragColor = vec4(0.0); return; }
          float depth = texture2D(tDepth, vUv).r;
          vec4 vp = uInvProj * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
          vp /= vp.w;
          float sceneDist = length(vp.xyz);
          vec3 rd = normalize((uCamWorld * vec4(normalize(vp.xyz), 0.0)).xyz);
          vec3 ro = uCamPos;
          vec3 rs = mix(rd, vec3(1e-6), lessThan(abs(rd), vec3(1e-6)));
          vec3 inv = 1.0 / rs;
          vec3 bmax = vec3(uTankMax.x, uWaterY, uTankMax.z);
          vec3 t0 = (uTankMin - ro) * inv, t1 = (bmax - ro) * inv;
          vec3 a = min(t0, t1), b = max(t0, t1);
          float tn = max(max(a.x, a.y), max(a.z, 0.0));
          float tf = min(min(b.x, b.y), min(b.z, sceneDist));
          if (tf <= tn) { gl_FragColor = vec4(0.0); return; }
          float jit = ign(gl_FragCoord.xy);
          float dt = (tf - tn) / float(uSteps);
          vec3 acc = vec3(0.0);
          float planeD = max(uWaterY - uCausticPlane, 0.05);
          for (int i = 0; i < 40; i++) {
            if (i >= uSteps) break;
            float t = tn + (float(i) + jit) * dt;
            vec3 p = ro + rd * t;
            float d = max(uWaterY - p.y, 0.0);
            vec2 xz = p.xz + vec2(0.035, 0.05) * (uCausticPlane - p.y);
            float focus = clamp(d / planeD, 0.0, 1.6);
            float lod = mix(4.5, 1.2, smoothstep(0.0, 0.9, focus)) + max(focus - 1.0, 0.0) * 2.0;
            vec3 c = textureLod(tCaustics, tankUV(xz), lod).rgb;
            vec3 shaft = max(c - 0.6, 0.0) * 1.3 + 0.08;
            acc += shaft * exp(-uAbsorb * (d * 1.2 + (t - tn)));
          }
          float g = 0.55;
          float ct = rd.y;
          float phase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * ct, 1.5);
          vec3 col = acc * dt * phase * uLampColor * uStrength;
          gl_FragColor = vec4(col, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    })

    // --- bloom ---
    this.prefilter = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 2.6 }, uKnee: { value: 1.2 } },
      vertexShader: VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold; uniform float uKnee;
        varying vec2 vUv;
        vec3 thr(vec3 c) {
          float br = max(c.r, max(c.g, c.b));
          float rq = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
          rq = rq * rq / (4.0 * uKnee + 1e-5);
          return c * max(rq, br - uThreshold) / max(br, 1e-5);
        }
        void main() {
          vec3 c = texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb
                 + texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb
                 + texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb
                 + texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
          c *= 0.25;
          if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
          gl_FragColor = vec4(min(thr(c), vec3(24.0)), 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    })
    this.down = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } },
      vertexShader: VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
          c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
          c += texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb;
          c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
          c += texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
          gl_FragColor = vec4(c / 8.0, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    })
    this.up = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uWeight: { value: 1 } },
      vertexShader: VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uWeight; varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tSrc, vUv + uTexel * vec2(-2.0, 0.0)).rgb;
          c += texture2D(tSrc, vUv + uTexel * vec2(2.0, 0.0)).rgb;
          c += texture2D(tSrc, vUv + uTexel * vec2(0.0, -2.0)).rgb;
          c += texture2D(tSrc, vUv + uTexel * vec2(0.0, 2.0)).rgb;
          c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb * 2.0;
          c += texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb * 2.0;
          c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb * 2.0;
          c += texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb * 2.0;
          gl_FragColor = vec4(c / 12.0 * uWeight, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
    })

    // --- финальная сборка ---
    this.composite = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: this.sceneRT.texture },
        tVol: { value: this.volRT.texture },
        tBloom: { value: this.bloomRT[0].texture },
        uVolTexel: { value: new THREE.Vector2() },
        uExposure: { value: 1 },
        uBloom: { value: 0.08 },
        uTime: { value: 0 },
        uFade: { value: 1 },
        uVignette: { value: 1 },
      },
      vertexShader: VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D tScene; uniform sampler2D tVol; uniform sampler2D tBloom;
        uniform vec2 uVolTexel; uniform float uExposure; uniform float uBloom; uniform float uTime;
        uniform float uFade; uniform float uVignette;
        varying vec2 vUv;
        vec3 rrtOdt(vec3 v) {
          vec3 a = v * (v + 0.0245786) - 0.000090537;
          vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
          return a / b;
        }
        vec3 aces(vec3 c) {
          const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
          const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
          return clamp(outM * rrtOdt(inM * c), 0.0, 1.0);
        }
        vec3 toSRGB(vec3 c) {
          return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
        }
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec3 hdr = texture2D(tScene, vUv).rgb;
          if (any(isnan(hdr)) || any(isinf(hdr))) hdr = vec3(0.0);
          vec3 vol = texture2D(tVol, vUv).rgb * 0.4;
          vol += texture2D(tVol, vUv + uVolTexel * vec2(1.5, 0.5)).rgb * 0.15;
          vol += texture2D(tVol, vUv + uVolTexel * vec2(-1.5, -0.5)).rgb * 0.15;
          vol += texture2D(tVol, vUv + uVolTexel * vec2(0.5, -1.5)).rgb * 0.15;
          vol += texture2D(tVol, vUv + uVolTexel * vec2(-0.5, 1.5)).rgb * 0.15;
          hdr += vol;
          hdr += texture2D(tBloom, vUv).rgb * uBloom;
          vec3 col = aces(hdr * uExposure);
          vec2 q = vUv - 0.5;
          float vig = 1.0 - dot(q, q) * 1.05 * uVignette;
          col *= clamp(vig, 0.0, 1.0);
          col = toSRGB(col) * uFade;
          float n = hash(vUv * 1024.0 + fract(uTime * 7.13) * 91.7) - 0.5;
          col += n * 0.018;
          col += (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
          gl_FragColor = vec4(col, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    })
  }

  setSize(width, height) {
    width = Math.max(2, Math.round(width))
    height = Math.max(2, Math.round(height))
    if (width === this.width && height === this.height) return
    this.width = width
    this.height = height
    this.sceneRT.setSize(width, height)
    const vw = Math.max(2, width >> 1), vh = Math.max(2, height >> 1)
    this.volRT.setSize(vw, vh)
    this.composite.uniforms.uVolTexel.value.set(1 / vw, 1 / vh)
    let w = width, h = height
    for (const t of this.bloomRT) {
      w = Math.max(2, w >> 1)
      h = Math.max(2, h >> 1)
      t.setSize(w, h)
    }
  }

  render(scene, camera, opts) {
    const r = this.renderer
    this.frame++

    // 1. сцена
    r.setRenderTarget(this.sceneRT)
    r.setClearColor(0x000000, 1)
    r.clear(true, true, false)
    r.render(scene, camera)

    // 2. объёмный свет (половинное разрешение)
    const vm = this.volMaterial.uniforms
    vm.uInvProj.value.copy(camera.projectionMatrixInverse)
    vm.uCamWorld.value.copy(camera.matrixWorld)
    vm.uCamPos.value.setFromMatrixPosition(camera.matrixWorld)
    vm.uStrength.value = opts.volumetric
    vm.uSteps.value = opts.volSteps
    this.quad.material = this.volMaterial
    this.quad.render(r, this.volRT, this.camera)

    // 3. bloom
    const b = this.bloomRT
    this.prefilter.uniforms.tSrc.value = this.sceneRT.texture
    this.prefilter.uniforms.uTexel.value.set(0.5 / this.width, 0.5 / this.height)
    this.quad.material = this.prefilter
    this.quad.render(r, b[0], this.camera)
    this.quad.material = this.down
    for (let i = 1; i < b.length; i++) {
      this.down.uniforms.tSrc.value = b[i - 1].texture
      this.down.uniforms.uTexel.value.set(0.5 / b[i - 1].width, 0.5 / b[i - 1].height)
      this.quad.render(r, b[i], this.camera)
    }
    this.quad.material = this.up
    const autoClear = r.autoClear
    r.autoClear = false
    for (let i = b.length - 2; i >= 0; i--) {
      this.up.uniforms.tSrc.value = b[i + 1].texture
      this.up.uniforms.uTexel.value.set(0.5 / b[i + 1].width, 0.5 / b[i + 1].height)
      this.up.uniforms.uWeight.value = 0.85
      this.quad.render(r, b[i], this.camera)
    }
    r.autoClear = autoClear

    // 4. на экран
    const cu = this.composite.uniforms
    cu.uExposure.value = opts.exposure
    cu.uBloom.value = opts.bloom
    cu.uTime.value = opts.time
    cu.uFade.value = opts.fade
    this.quad.material = this.composite
    this.quad.render(r, null, this.camera)
  }
}
