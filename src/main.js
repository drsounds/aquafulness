import * as THREE from 'three'
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
      <label>Water color <input id="color" type="color" value="#197b80" /></label>
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
$('#world').appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0xa6c9c4, 0.006)
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1200)
camera.position.set(0, 1, 0)

const skyUniforms = { topColor: { value: new THREE.Color('#729da6') }, horizonColor: { value: new THREE.Color('#d5ddd1') }, sunColor: { value: new THREE.Color('#fff5d5') }, cloudiness: { value: 0.22 } }
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: skyUniforms,
  vertexShader: `varying vec3 vWorld; void main() { vWorld = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    varying vec3 vWorld; uniform vec3 topColor, horizonColor, sunColor; uniform float cloudiness;
    float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y); }
    void main() {
      vec3 d = normalize(vWorld); float h = max(d.y, 0.0);
      vec3 col = mix(horizonColor, topColor, smoothstep(0.0, .8, h));
      vec2 cloudUV = d.xz * 3.0 / (h + .3);
      float clouds = smoothstep(.58, .85, noise(cloudUV) * .7 + noise(cloudUV * 2.3) * .3 + cloudiness * .25);
      col = mix(col, vec3(.91,.91,.85), clouds * .35 * smoothstep(.02,.2,h));
      float sun = pow(max(dot(d, normalize(vec3(-.36,.24,-.9))),0.0), 450.0);
      float glow = pow(max(dot(d, normalize(vec3(-.36,.24,-.9))),0.0), 8.0);
      col += sunColor * (sun * .7 + glow * .13);
      gl_FragColor = vec4(col, 1.0);
    }`
}))
scene.add(sky)

const waterUniforms = {
  time: { value: 0 }, amplitude: { value: settings.height }, wind: { value: settings.wind },
  direction: { value: settings.wave }, waterColor: { value: new THREE.Color('#197b80') },
  fogColor: { value: scene.fog.color }, depth: { value: settings.depth }
}
const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900, 200, 200), new THREE.ShaderMaterial({
  uniforms: waterUniforms, transparent: true,
  vertexShader: `
    uniform float time, amplitude, wind; uniform vec2 direction; varying vec3 vWorld; varying float vHeight;
    float waves(vec2 p) {
      vec2 d = normalize(direction); vec2 side = vec2(-d.y,d.x);
      return amplitude * (sin(dot(p,d)*.11-time*(.65+wind))*.85 + sin(dot(p,normalize(d+side*.65))*.23-time*1.1)*.32 + sin(dot(p,side)*.38+time*.7)*.12);
    }
    void main() { vec4 world = modelMatrix * vec4(position,1.0); world.y += waves(world.xz); vHeight = world.y; vWorld = world.xyz; gl_Position = projectionMatrix * viewMatrix * world; }`,
  fragmentShader: `
    uniform vec3 waterColor, fogColor; uniform float depth, time, wind; varying vec3 vWorld; varying float vHeight;
    void main() {
      vec3 n = normalize(cross(dFdy(vWorld), dFdx(vWorld))); if (n.y < 0.0) n = -n;
      n = normalize(n + vec3(cos(vWorld.x*.8+time*.9)*.055 + cos(vWorld.x*1.7+vWorld.z*.6-time)*.025, 0.0, sin(vWorld.z*.9-time*.8)*.055 + cos(vWorld.z*1.5-vWorld.x*.4+time)*.025) * (0.25 + wind));
      vec3 viewDir = normalize(cameraPosition-vWorld); float fresnel = pow(1.0-max(dot(viewDir,n),0.0),3.0);
      vec3 sun = normalize(vec3(-.36,.24,-.9)); float shine = pow(max(dot(reflect(-sun,n),viewDir),0.0),80.0);
      float ripples = sin(vWorld.x*.7+time)*sin(vWorld.z*.8-time*.7)*.025;
      vec3 col = mix(waterColor * (.75 + vHeight*.08 + ripples), vec3(.67,.79,.75), .24 + fresnel*.55);
      col += vec3(1.0,.95,.79)*shine*(.4+wind*.4);
      float fog = 1.0-exp(-pow(length(cameraPosition-vWorld)*.006,2.0)); col = mix(col,fogColor,fog);
      gl_FragColor = vec4(col, mix(.72,.96,clamp(depth/30.0,0.0,1.0)));
    }`
}))
water.rotation.x = -Math.PI / 2
scene.add(water)
const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: '#b5a680' }))
floor.rotation.x = -Math.PI / 2
floor.position.y = -settings.depth
scene.add(floor)

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
    clear: ['#729da6', '#d5ddd1', '#fff5d5', .22, 'Clear skies'],
    cloudy: ['#71878c', '#b6c4c0', '#e1e6e2', .85, 'Overcast'],
    sunset: ['#8c8798', '#e6bca0', '#ffd49a', .32, 'Golden hour']
  }
  const [top, horizon, sun, clouds, label] = presets[settings.weather]
  skyUniforms.topColor.value.set(top); skyUniforms.horizonColor.value.set(horizon); skyUniforms.sunColor.value.set(sun); skyUniforms.cloudiness.value = clouds
  scene.fog.color.set(horizon); $('#weather-label').textContent = label
})
$('#wind').addEventListener('input', event => { settings.wind = event.target.value / 100; waterUniforms.wind.value = settings.wind; $('#wind-value').textContent = `${event.target.value}%` })
$('#height').addEventListener('input', event => { settings.height = event.target.value / 100; waterUniforms.amplitude.value = settings.height; $('#height-value').textContent = `${event.target.value}%`; $('#water-label').textContent = settings.height < .25 ? 'Calm' : settings.height < .65 ? 'Gentle' : 'Rolling' })
$('#color').addEventListener('input', event => waterUniforms.waterColor.value.set(event.target.value))
$('#depth').addEventListener('input', event => { settings.depth = Number(event.target.value); floor.position.y = -settings.depth; waterUniforms.depth.value = settings.depth; $('#depth-value').textContent = `${settings.depth} m` })
$('#bottom').addEventListener('change', event => { floor.visible = event.target.value !== 'none'; floor.material.color.set(event.target.value === 'rock' ? '#526c68' : '#b5a680') })

function waveHeight(x, z, t) {
  const d = settings.wave
  const sideX = -d.y, sideZ = d.x
  const diagonal = new THREE.Vector2(d.x + sideX * .65, d.y + sideZ * .65).normalize()
  return settings.height * (Math.sin((x*d.x + z*d.y)*.11-t*(.65+settings.wind))*.85 + Math.sin((x*diagonal.x + z*diagonal.y)*.23-t*1.1)*.32 + Math.sin((x*sideX + z*sideZ)*.38+t*.7)*.12)
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
  waterUniforms.time.value = elapsed
  water.position.x = floor.position.x = sky.position.x = camera.position.x
  water.position.z = floor.position.z = sky.position.z = camera.position.z
  $('#clock').textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); renderer.setSize(window.innerWidth, window.innerHeight) })
requestAnimationFrame(animate)
