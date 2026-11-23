import * as THREE from 'three'
import { Sky } from 'three/addons/objects/Sky.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js'
import './style.css'

document.querySelector('#app').innerHTML = `
  <div id="world" aria-label="First-person ocean simulation"></div>
  <div class="vignette"></div>
  <header class="topbar">
    <div class="brand"><span class="brand-mark">≈</span><span>aquafulness<small>YOUR MOMENT OF CALM</small></span></div>
    <div class="top-right"><span class="live-dot"></span> LIVE SIMULATION <span class="divider"></span><span id="clock">00:00</span></div>
  </header>
  <main class="intro">
    <div class="eyebrow"><span></span> THE OPEN WATER</div>
    <h1>Find your<br /><em>flow.</em></h1>
    <p>Take a breath, let go, and move<br class="desktop-only" /> with the rhythm of the ocean.</p>
    <div class="conditions"><div><span class="condition-icon">☀</span><span><b id="weather-label">Clear skies</b><small>WEATHER</small></span></div><div><span class="condition-icon">≈</span><span><b id="water-label">Gentle</b><small>WATER</small></span></div></div>
  </main>
  <div class="horizon-label"><span></span> A LITTLE SPACE TO JUST BE <span></span></div>
  <section class="control-deck" aria-label="Swimming controls">
    <div class="deck-heading"><span>YOUR CONTROLS</span><span class="deck-line"></span><span>MOVE AT YOUR OWN PACE</span></div>
    <div class="sticks">
      <div class="stick-group"><div class="stick" data-stick="move" role="application" aria-label="Move joystick" tabindex="0"><span class="cross horizontal"></span><span class="cross vertical"></span><span class="stick-knob"><span>✥</span></span></div><div class="stick-caption"><b>MOVE</b><small>WASD / drag</small></div></div>
      <div class="stick-group small-stick"><div class="stick" data-stick="wave" role="application" aria-label="Wave direction joystick" tabindex="0"><span class="cross horizontal"></span><span class="cross vertical"></span><span class="stick-knob"><span>≈</span></span></div><div class="stick-caption"><b>WAVES</b><small>direction</small></div></div>
      <div class="stick-group small-stick"><div class="stick" data-stick="current" role="application" aria-label="Current direction joystick" tabindex="0"><span class="cross horizontal"></span><span class="cross vertical"></span><span class="stick-knob"><span>↝</span></span></div><div class="stick-caption"><b>CURRENT</b><small>direction</small></div></div>
      <div class="stick-group"><div class="stick" data-stick="look" role="application" aria-label="Look joystick" tabindex="0"><span class="cross horizontal"></span><span class="cross vertical"></span><span class="stick-knob"><span>⌾</span></span></div><div class="stick-caption"><b>LOOK</b><small>arrows / drag</small></div></div>
    </div>
  </section>
  <div class="bottom-bar">
    <div class="bottom-note"><span class="sound-icon">◌</span> MADE FOR A QUIETER MOMENT</div>
    <button id="settings-toggle" class="settings-toggle" aria-expanded="false" aria-controls="settings"><span>☷</span> CUSTOMIZE YOUR EXPERIENCE <span class="chevron">⌃</span></button>
    <div class="bottom-note right-note">TAKE YOUR TIME <span>✳</span></div>
  </div>
  <section id="settings" class="settings" hidden aria-label="Environment settings">
    <div class="settings-top"><div><div class="eyebrow">MAKE IT YOURS</div><h2>Set the scene<span>.</span></h2></div><button id="settings-close" class="close" aria-label="Close settings">×</button></div>
    <div class="tabs" role="tablist" aria-label="Settings categories">
      <button role="tab" aria-selected="true" data-tab="weather">Weather & wind</button><button role="tab" aria-selected="false" data-tab="water">Water & depth</button>
    </div>
    <div class="settings-content" id="weather-panel" role="tabpanel">
      <label>Weather <select id="weather"><option value="clear">Clear skies</option><option value="cloudy">Cloudy</option><option value="sunset">Golden hour</option></select></label>
      <label>Wind strength <output id="wind-value">35%</output><input id="wind" type="range" min="0" max="100" value="35" /></label>
      <label>Wave height <output id="height-value">45%</output><input id="height" type="range" min="0" max="100" value="45" /></label>
    </div>
    <div class="settings-content" id="water-panel" role="tabpanel" hidden>
      <label>Water color <input id="color" type="color" value="#23677e" /></label>
      <label>Ocean floor <select id="bottom"><option value="sand">Warm sand</option><option value="rock">Deep rock</option><option value="none">Open ocean</option></select></label>
      <label>Depth <output id="depth-value">12 m</output><input id="depth" type="range" min="2" max="40" value="12" /></label>
    </div>
    <p class="settings-hint">Changes happen in real time. Make this moment yours.</p>
  </section>
`

const $ = (selector) => document.querySelector(selector)
const settings = { wind: 0.35, height: 0.45, depth: 12, weather: 'clear', wave: new THREE.Vector2(0.8, 0.6), current: new THREE.Vector2(0, 0) }
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
$('#world').appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x9abdc7, 0.003)
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1200)
camera.position.set(0, 1, 0)

const sky = new Sky()
sky.scale.setScalar(450000)
const skyUniforms = sky.material.uniforms
skyUniforms.turbidity.value = 2.2
skyUniforms.rayleigh.value = 1.7
skyUniforms.mieCoefficient.value = 0.004
skyUniforms.mieDirectionalG.value = 0.82
const environmentScene = new THREE.Scene()
environmentScene.add(sky)
const backdropUniforms = {
  topColor: { value: new THREE.Color('#527d98') }, horizonColor: { value: new THREE.Color('#b6c8ce') },
  sunColor: { value: new THREE.Color('#fff0d3') }, sunDirection: { value: new THREE.Vector3() },
  cloudiness: { value: 0.22 }
}
const skyBackdrop = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: backdropUniforms,
  vertexShader: `varying vec3 vDirection; void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    varying vec3 vDirection; uniform vec3 topColor, horizonColor, sunColor, sunDirection; uniform float cloudiness;
    float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y); }
    void main() {
      vec3 direction = normalize(vDirection); float elevation = max(direction.y, 0.0);
      vec3 color = mix(horizonColor, topColor, smoothstep(0.0, .8, elevation));
      vec2 cloudUv = direction.xz * 3.0 / (elevation + .3);
      float clouds = smoothstep(.58, .85, noise(cloudUv) * .7 + noise(cloudUv * 2.3) * .3 + cloudiness * .25);
      color = mix(color, vec3(.91,.93,.92), clouds * .3 * smoothstep(.02,.2,elevation));
      float sunDot = max(dot(direction, normalize(sunDirection)), 0.0);
      color += sunColor * (pow(sunDot, 450.0) * .7 + pow(sunDot, 8.0) * .12);
      gl_FragColor = vec4(color, 1.0);
    }`
}))
scene.add(skyBackdrop)

const pmremGenerator = new THREE.PMREMGenerator(renderer)
let environmentTarget
const sunPosition = new THREE.Vector3()
function updateEnvironment() {
  const elevation = settings.weather === 'sunset' ? 8 : settings.weather === 'cloudy' ? 22 : 38
  const inclination = THREE.MathUtils.degToRad(elevation)
  const azimuth = THREE.MathUtils.degToRad(110)
  sunPosition.setFromSphericalCoords(1, Math.PI / 2 - inclination, azimuth)
  skyUniforms.sunPosition.value.copy(sunPosition)
  skyUniforms.turbidity.value = settings.weather === 'cloudy' ? 10 : 2.2
  skyUniforms.rayleigh.value = settings.weather === 'sunset' ? 2.8 : 1.7
  skyUniforms.mieCoefficient.value = settings.weather === 'cloudy' ? 0.012 : 0.004
  backdropUniforms.sunDirection.value.copy(sunPosition)
  const nextTarget = pmremGenerator.fromScene(environmentScene)
  if (environmentTarget) environmentTarget.dispose()
  environmentTarget = nextTarget
  scene.environment = environmentTarget.texture
  scene.environmentIntensity = 0.8
}
updateEnvironment()

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.08, 0.45, 0.95))
composer.addPass(new SMAAPass(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio()))

const waterUniforms = {
  time: { value: 0 }, amplitude: { value: settings.height }, wind: { value: settings.wind },
  direction: { value: settings.wave }, waterColor: { value: new THREE.Color('#23677e') },
  fogColor: { value: scene.fog.color }, depth: { value: settings.depth },
  simulation: { value: null }, simulationTexel: { value: new THREE.Vector2(1 / 256, 1 / 256) },
  skyTop: { value: new THREE.Color('#527d98') }, skyHorizon: { value: new THREE.Color('#9db7c2') },
  sunColor: { value: new THREE.Color('#fff0d3') }, sunDirection: { value: sunPosition.clone() }
}
const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900, 220, 220), new THREE.ShaderMaterial({
  uniforms: waterUniforms, transparent: true,
  vertexShader: `
    uniform float time, amplitude, wind; uniform vec2 direction; uniform sampler2D simulation;
    varying vec3 vWorld; varying float vHeight; varying vec2 vUv;
    float waves(vec2 p) {
      vec2 d = normalize(direction); vec2 side = vec2(-d.y,d.x);
      return amplitude * (
        sin(dot(p,d)*.09-time*(.58+wind))*.75 +
        sin(dot(p,normalize(d+side*.7))*.19-time*.83)*.3 +
        sin(dot(p,side)*.31+time*.63)*.12 +
        sin(dot(p,normalize(d-side*.42))*.47-time*1.37)*.045 +
        sin(dot(p,normalize(side+d*.28))*.82+time*.91)*.018
      );
    }
    void main() {
      vUv = uv;
      vec4 world = modelMatrix * vec4(position,1.0);
      world.y += waves(world.xz) + texture2D(simulation, uv).r * 1.8;
      vHeight = world.y; vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }`,
  fragmentShader: `
    uniform vec3 waterColor, fogColor, skyTop, skyHorizon, sunColor, sunDirection;
    uniform float depth, time, wind, amplitude; uniform sampler2D simulation; uniform vec2 simulationTexel;
    varying vec3 vWorld; varying float vHeight; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y); }
    vec3 skyRadiance(vec3 direction) {
      float elevation = max(direction.y, 0.0);
      vec3 sky = mix(skyHorizon, skyTop, smoothstep(0.0, 0.8, elevation));
      float sunGlow = pow(max(dot(direction, normalize(sunDirection)), 0.0), 12.0);
      return sky + sunColor * sunGlow * 0.22;
    }
    void main() {
      vec3 n = normalize(cross(dFdy(vWorld), dFdx(vWorld))); if (n.y < 0.0) n = -n;
      float detail = noise(vWorld.xz*.72 + vec2(time*.035,-time*.025)) - .5;
      float simDx = texture2D(simulation, vUv + vec2(simulationTexel.x, 0.0)).r - texture2D(simulation, vUv - vec2(simulationTexel.x, 0.0)).r;
      float simDz = texture2D(simulation, vUv + vec2(0.0, simulationTexel.y)).r - texture2D(simulation, vUv - vec2(0.0, simulationTexel.y)).r;
      n = normalize(n + vec3(
        cos(vWorld.x*.8+time*.9)*.045 + cos(vWorld.x*1.7+vWorld.z*.6-time)*.022 + detail*.13,
        0.0,
        sin(vWorld.z*.9-time*.8)*.045 + cos(vWorld.z*1.5-vWorld.x*.4+time)*.022 - detail*.13
      ) * (0.25 + wind) + vec3(simDx * 2.2, 0.0, simDz * 2.2));
      vec3 viewDir = normalize(cameraPosition-vWorld); float fresnel = pow(1.0-max(dot(viewDir,n),0.0),3.0);
      fresnel = .02 + .98 * pow(1.0 - max(dot(viewDir,n),0.0), 5.0);
      vec3 sun = normalize(sunDirection); float specular = max(dot(reflect(-sun,n),viewDir),0.0);
      float shine = pow(specular,96.0);
      float broadShine = pow(specular,18.0);
      float ripples = sin(vWorld.x*.7+time)*sin(vWorld.z*.8-time*.7)*.018 + detail*.025;
      float foam = smoothstep(amplitude*.72, amplitude*1.15, vHeight) * smoothstep(.58,.88,amplitude);
      foam *= smoothstep(.32,.68,noise(vWorld.xz*.24 + vec2(time*.08,-time*.05)));
      vec3 deepColor = waterColor * vec3(.36,.66,.82);
      vec3 refracted = deepColor * (1.0 + vHeight*.08 + ripples);
      vec3 reflected = skyRadiance(reflect(-viewDir,n));
      vec3 col = mix(refracted, reflected, fresnel);
      col += sunColor * (shine*(.55+wind*.35) + broadShine*.09);
      col = mix(col, vec3(.78,.86,.84), foam*.3);
      float fog = 1.0-exp(-pow(length(cameraPosition-vWorld)*.003,2.0)); col = mix(col,fogColor,fog);
      gl_FragColor = vec4(col, mix(.76,.97,clamp(depth/30.0,0.0,1.0)));
    }`
}))
water.rotation.x = -Math.PI / 2
scene.add(water)

const simulationSize = 256
const simulationTargets = [0, 1].map(() => new THREE.WebGLRenderTarget(simulationSize, simulationSize, {
  format: THREE.RGBAFormat, type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  depthBuffer: false, stencilBuffer: false, generateMipmaps: false
}))
const previousTarget = renderer.getRenderTarget()
const previousClearColor = renderer.getClearColor(new THREE.Color())
const previousClearAlpha = renderer.getClearAlpha()
renderer.setClearColor(0x000000, 0)
simulationTargets.forEach(target => {
  renderer.setRenderTarget(target)
  renderer.clear(true, false, false)
})
renderer.setRenderTarget(previousTarget)
renderer.setClearColor(previousClearColor, previousClearAlpha)
const simulationUniforms = {
  state: { value: null }, texel: { value: 1 / simulationSize }, delta: { value: 1 / 60 },
  impulse: { value: new THREE.Vector3(-10, -10, 0) }
}
const simulationScene = new THREE.Scene()
const simulationCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
simulationScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: simulationUniforms,
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    uniform sampler2D state; uniform float texel, delta; uniform vec3 impulse; varying vec2 vUv;
    void main() {
      vec2 uv = clamp(vUv, vec2(texel), vec2(1.0 - texel));
      vec2 value = texture2D(state, uv).rg;
      float left = texture2D(state, uv - vec2(texel, 0.0)).r;
      float right = texture2D(state, uv + vec2(texel, 0.0)).r;
      float down = texture2D(state, uv - vec2(0.0, texel)).r;
      float up = texture2D(state, uv + vec2(0.0, texel)).r;
      float laplacian = left + right + down + up - 4.0 * value.r;
      float velocity = (value.g + laplacian * 0.22) * 0.992;
      float drop = exp(-dot((uv - impulse.xy) * vec2(90.0, 90.0), (uv - impulse.xy) * vec2(90.0, 90.0)));
      velocity += drop * impulse.z;
      float height = clamp(value.r + velocity * (delta * 60.0), -0.5, 0.5);
      gl_FragColor = vec4(height, velocity, 0.0, 1.0);
    }`
})))
let simulationIndex = 0
waterUniforms.simulation.value = simulationTargets[simulationIndex].texture
waterUniforms.simulationTexel.value.set(1 / simulationSize, 1 / simulationSize)
const queuedImpulse = new THREE.Vector3(-10, -10, 0)
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let lastPointerImpulse = 0
function queueRipple(event) {
  const now = performance.now()
  if (now - lastPointerImpulse < 70) return
  lastPointerImpulse = now
  const bounds = renderer.domElement.getBoundingClientRect()
  pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1)
  raycaster.setFromCamera(pointer, camera)
  const hit = raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3())
  if (!hit) return
  const local = water.worldToLocal(hit)
  queuedImpulse.set(local.x / 900 + 0.5, local.y / 900 + 0.5, event.type === 'pointerdown' ? 0.2 : 0.08)
}
renderer.domElement.addEventListener('pointerdown', queueRipple)
renderer.domElement.addEventListener('pointermove', queueRipple)
let nextRaindrop = 1
function stepSimulation(delta) {
  simulationUniforms.state.value = simulationTargets[simulationIndex].texture
  simulationUniforms.delta.value = delta
  simulationUniforms.impulse.value.copy(queuedImpulse)
  queuedImpulse.z = 0
  const destination = 1 - simulationIndex
  const previousTarget = renderer.getRenderTarget()
  renderer.setRenderTarget(simulationTargets[destination])
  renderer.render(simulationScene, simulationCamera)
  renderer.setRenderTarget(previousTarget)
  simulationIndex = destination
  waterUniforms.simulation.value = simulationTargets[simulationIndex].texture
}

const floorUniforms = { time: { value: 0 }, depth: { value: settings.depth }, rock: { value: 0 }, sandColor: { value: new THREE.Color('#b5a680') }, fogColor: { value: scene.fog.color } }
const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.ShaderMaterial({
  uniforms: floorUniforms,
  vertexShader: `
    varying vec3 vWorld;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }`,
  fragmentShader: `
    uniform float time, depth, rock; uniform vec3 sandColor, fogColor; varying vec3 vWorld;
    float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y); }
    void main() {
      vec2 p = vWorld.xz;
      float grain = noise(p*1.8)*.42 + noise(p*8.0)*.2 + noise(p*34.0)*.08;
      float ripples = sin(p.x*.8 + sin(p.y*.35)*2.0)*.5 + .5;
      float caustics = pow(max(0.0, sin(p.x*.24 + time*.8)*sin(p.y*.29-time*.62)), 7.0);
      vec3 sand = sandColor * (.72 + grain*.58 + ripples*.08);
      vec3 stone = mix(vec3(.12,.2,.19), vec3(.34,.4,.34), grain + ripples*.12);
      vec3 col = mix(sand + caustics*vec3(.17,.22,.16), stone, rock);
      col *= exp(-depth*.012);
      float fog = 1.0-exp(-pow(length(cameraPosition-vWorld)*.004,2.0));
      col = mix(col, fogColor, fog*.8);
      gl_FragColor = vec4(col, 1.0);
    }`
}))
floor.rotation.x = -Math.PI / 2
floor.position.y = -settings.depth
scene.add(floor)

const beachPositions = []
const beachIndices = []
const beachSegments = 150
const beachRows = 76
for (let row = 0; row <= beachRows; row++) {
  const z = -210 - row / beachRows * 500
  for (let column = 0; column <= beachSegments; column++) {
    const x = -650 + column / beachSegments * 1300
    const shoreline = Math.sin(x * .007 + z * .016) * 1.2 + Math.sin(x * .021 - z * .009) * .35
    const dune = Math.max(0, -z - 215) * .08
    const ridge = Math.sin(x * .009 + z * .014) * Math.max(0, -z - 235) * .003
    beachPositions.push(x, -1.8 + dune + shoreline + ridge, z)
  }
}
for (let row = 0; row < beachRows; row++) {
  for (let column = 0; column < beachSegments; column++) {
    const a = row * (beachSegments + 1) + column
    const b = a + beachSegments + 1
    beachIndices.push(a, b, a + 1, b, b + 1, a + 1)
  }
}
const beachGeometry = new THREE.BufferGeometry()
beachGeometry.setAttribute('position', new THREE.Float32BufferAttribute(beachPositions, 3))
beachGeometry.setIndex(beachIndices)
beachGeometry.computeVertexNormals()
const beach = new THREE.Mesh(beachGeometry, new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: `
    varying vec3 vWorld;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }`,
  fragmentShader: `
    varying vec3 vWorld;
    float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y); }
    void main() {
      float grain = noise(vWorld.xz*.14)*.55 + noise(vWorld.xz*1.8)*.2 + noise(vWorld.xz*12.0)*.08;
      float dune = smoothstep(0.0, 7.0, vWorld.y);
      vec3 wetSand = vec3(.34,.37,.31);
      vec3 drySand = vec3(.72,.65,.49) * (.78 + grain*.42);
      vec3 duneGrass = vec3(.43,.48,.36) * (.78 + grain*.3);
      vec3 col = mix(wetSand, drySand, smoothstep(-1.0,1.8,vWorld.y));
      col = mix(col, duneGrass, dune*.36);
      gl_FragColor = vec4(col, 1.0);
    }`
}))
scene.add(beach)

const sticks = Object.fromEntries(['move', 'look', 'wave', 'current'].map(name => [name, new THREE.Vector2()]))
document.querySelectorAll('.stick').forEach(element => {
  const name = element.dataset.stick
  const knob = element.querySelector('.stick-knob')
  const update = event => {
    const rect = element.getBoundingClientRect()
    const x = (event.clientX - rect.left - rect.width / 2) / (rect.width * .35)
    const y = (event.clientY - rect.top - rect.height / 2) / (rect.height * .35)
    sticks[name].set(x, y).clampLength(0, 1)
    knob.style.transform = `translate(${sticks[name].x * 35}%, ${sticks[name].y * 35}%)`
    if (name === 'wave' && sticks[name].length() > .1) settings.wave.set(sticks[name].x, sticks[name].y).normalize()
    if (name === 'current') settings.current.copy(sticks[name])
  }
  element.addEventListener('pointerdown', event => { event.preventDefault(); element.setPointerCapture(event.pointerId); update(event) })
  element.addEventListener('pointermove', event => { if (element.hasPointerCapture(event.pointerId)) update(event) })
  const release = () => { sticks[name].set(0, 0); knob.style.transform = ''; if (name === 'current') settings.current.set(0, 0) }
  element.addEventListener('pointerup', release)
  element.addEventListener('pointercancel', release)
  element.addEventListener('lostpointercapture', release)
})

const keys = new Set()
window.addEventListener('keydown', event => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) return
  if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(event.key.toLowerCase())) event.preventDefault()
  keys.add(event.key.toLowerCase())
})
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()))
window.addEventListener('blur', () => keys.clear())

function showSettings(show) { $('#settings').hidden = !show; $('#settings-toggle').setAttribute('aria-expanded', String(show)) }
$('#settings-toggle').addEventListener('click', () => showSettings($('#settings').hidden))
$('#settings-close').addEventListener('click', () => showSettings(false))
document.querySelectorAll('[data-tab]').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach(item => item.setAttribute('aria-selected', String(item === tab)))
  $('#weather-panel').hidden = tab.dataset.tab !== 'weather'
  $('#water-panel').hidden = tab.dataset.tab !== 'water'
}))
$('#weather').addEventListener('change', event => {
  settings.weather = event.target.value
  const presets = {
    clear: ['#527d98', '#9db7c2', '#fff0d3', 'Clear skies'],
    cloudy: ['#5d7686', '#9aabb3', '#d9e0e3', 'Overcast'],
    sunset: ['#8c8798', '#e6bca0', '#ffd49a', 'Golden hour']
  }
  const [top, horizon, sun, label] = presets[settings.weather]
  backdropUniforms.topColor.value.set(top)
  backdropUniforms.horizonColor.value.set(horizon)
  backdropUniforms.sunColor.value.set(sun)
  backdropUniforms.cloudiness.value = settings.weather === 'cloudy' ? .85 : settings.weather === 'sunset' ? .32 : .22
  waterUniforms.skyTop.value.set(top)
  waterUniforms.skyHorizon.value.set(horizon)
  waterUniforms.sunColor.value.set(sun)
  updateEnvironment()
  waterUniforms.sunDirection.value.copy(sunPosition)
  scene.fog.color.set(horizon)
  $('#weather-label').textContent = label
})
$('#wind').addEventListener('input', event => { settings.wind = event.target.value / 100; waterUniforms.wind.value = settings.wind; $('#wind-value').textContent = `${event.target.value}%` })
$('#height').addEventListener('input', event => { settings.height = event.target.value / 100; waterUniforms.amplitude.value = settings.height; $('#height-value').textContent = `${event.target.value}%`; $('#water-label').textContent = settings.height < .25 ? 'Calm' : settings.height < .65 ? 'Gentle' : 'Rolling' })
$('#color').addEventListener('input', event => waterUniforms.waterColor.value.set(event.target.value))
$('#depth').addEventListener('input', event => { settings.depth = Number(event.target.value); floor.position.y = -settings.depth; waterUniforms.depth.value = settings.depth; floorUniforms.depth.value = settings.depth; $('#depth-value').textContent = `${settings.depth} m` })
$('#bottom').addEventListener('change', event => { floor.visible = event.target.value !== 'none'; floorUniforms.rock.value = Number(event.target.value === 'rock') })

function waveHeight(x, z, t) {
  const d = settings.wave
  const sideX = -d.y, sideZ = d.x
  const diagonal = new THREE.Vector2(d.x + sideX * .65, d.y + sideZ * .65).normalize()
  const shortDiagonal = new THREE.Vector2(d.x - sideX * .42, d.y - sideZ * .42).normalize()
  const crossDiagonal = new THREE.Vector2(sideX + d.x * .28, sideZ + d.y * .28).normalize()
  return settings.height * (
    Math.sin((x*d.x + z*d.y)*.09-t*(.58+settings.wind))*.75 +
    Math.sin((x*diagonal.x + z*diagonal.y)*.19-t*.83)*.3 +
    Math.sin((x*sideX + z*sideZ)*.31+t*.63)*.12 +
    Math.sin((x*shortDiagonal.x + z*shortDiagonal.y)*.47-t*1.37)*.045 +
    Math.sin((x*crossDiagonal.x + z*crossDiagonal.y)*.82+t*.91)*.018
  )
}
let yaw = 0, pitch = 0, previous = performance.now(), elapsed = 0
const velocity = new THREE.Vector2()
function animate(now) {
  const dt = Math.min((now - previous) / 1000, .05); previous = now; elapsed += dt
  const moveX = sticks.move.x + Number(keys.has('d')) - Number(keys.has('a'))
  const moveY = sticks.move.y + Number(keys.has('s')) - Number(keys.has('w'))
  const lookX = sticks.look.x + Number(keys.has('arrowright')) - Number(keys.has('arrowleft'))
  const lookY = sticks.look.y + Number(keys.has('arrowdown')) - Number(keys.has('arrowup'))
  yaw -= lookX * dt * 1.2; pitch = THREE.MathUtils.clamp(pitch - lookY * dt, -1.05, 1.05)
  const targetX = (Math.cos(yaw)*moveX + Math.sin(yaw)*moveY) * 2.2 + settings.current.x * 1.2
  const targetZ = (-Math.sin(yaw)*moveX + Math.cos(yaw)*moveY) * 2.2 + settings.current.y * 1.2
  velocity.lerp(new THREE.Vector2(targetX, targetZ), 1 - Math.exp(-dt * 2))
  camera.position.x += velocity.x * dt; camera.position.z += velocity.y * dt
  const surface = waveHeight(camera.position.x, camera.position.z, elapsed)
  camera.position.y += (surface + .68 - camera.position.y) * (1 - Math.exp(-dt * 2))
  const slopeX = waveHeight(camera.position.x + .5, camera.position.z, elapsed) - surface
  const slopeZ = waveHeight(camera.position.x, camera.position.z + .5, elapsed) - surface
  camera.rotation.order = 'YXZ'; camera.rotation.set(pitch + slopeZ*.08, yaw, -slopeX*.12)
  waterUniforms.time.value = floorUniforms.time.value = elapsed
  water.position.x = floor.position.x = skyBackdrop.position.x = camera.position.x
  water.position.z = floor.position.z = skyBackdrop.position.z = camera.position.z
  if (elapsed >= nextRaindrop && queuedImpulse.z === 0) {
    queuedImpulse.set(Math.random() * .9 + .05, Math.random() * .9 + .05, .035)
    nextRaindrop = elapsed + 1.2 + Math.random() * 2.4
  }
  stepSimulation(Math.max(dt, 1 / 120))
  $('#clock').textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`
  composer.render()
  requestAnimationFrame(animate)
}
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})
requestAnimationFrame(animate)
