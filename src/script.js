import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as dat from "lil-gui";
import { calculateAccelrate, calculateAirForce, calculateGravityForce, calculateK, calculateTotalForce, calculateVelocity, parachutePosition } from './physics.ts';

/**
 * Scene
 */
const scene = new THREE.Scene();
const canvas = document.querySelector("canvas.webgl");

/**
 * Skybox
 */
const cubeTextureLoader = new THREE.CubeTextureLoader();
const enviromentMap = cubeTextureLoader.load([
  "./Standard-Cube-Map (3)/px.png",
  "./Standard-Cube-Map (3)/nx.png",
  "./Standard-Cube-Map (3)/py.png",
  "./Standard-Cube-Map (3)/ny.png",
  "./Standard-Cube-Map (3)/pz.png",
  "./Standard-Cube-Map (3)/nz.png",
]);
scene.environment = enviromentMap;
scene.background = enviromentMap;

/**
 * Loaders
 */
const gltfLoader = new GLTFLoader();

/**
 * Models & Mixers
 */
let soldier_model, helicopter_model, parachute_model;
let soldier_mixer = null, helicopter_mixer = null;

const group = new THREE.Group();
const soldierWidth = 0.01, soldierHight = 0.01;
let actualParachuteWidth = 0.3, actualParachuteHight = 0.3;
let parachuteWidth = 0.3, parachuteHight = 0.3;


/**
 * GUI
 */
const gui = new dat.GUI();
const parachuteControl = { visible: false };

/**
 * Cursor
 */
const cursor = { x: 0, y: 0 };
window.addEventListener("mousemove", (e) => {
  cursor.x = e.clientX / window.innerWidth - 0.5;
  cursor.y = e.clientY / window.innerHeight - 0.5;
});

/**
 * Clock
 */
const clock = new THREE.Clock();
let previousTime = 0;

/**
 * Models Loading Tracker
 */
let modelsLoaded = 0;
const totalModels = 3; // soldier + helicopter + parachute
function modelLoaded() {
  modelsLoaded++;
  if (modelsLoaded === totalModels) startSimulation();
}

/**
 * Load Soldier
 */
gltfLoader.load("/low_poly_soldier_free_gltf/scene.gltf", (gltf) => {
  soldier_model = gltf.scene;
  soldier_model.scale.set(soldierWidth, soldierHight, 0.01);
  group.add(soldier_model);

  soldier_mixer = new THREE.AnimationMixer(gltf.scene);
  soldier_mixer.clipAction(gltf.animations[1]).play();

  modelLoaded();
});

/**
 * Load Helicopter
 */
gltfLoader.load("/mh_6_little_bird_helicopter_animated_gltf/scene.gltf", (gltf) => {
  helicopter_model = gltf.scene;
  helicopter_model.position.set(2, -3, 0);
  helicopter_model.scale.set(0.005, 0.005, 0.005);
  scene.add(helicopter_model);

  helicopter_mixer = new THREE.AnimationMixer(gltf.scene);
  helicopter_mixer.clipAction(gltf.animations[0]).play();

  modelLoaded();
});

/**
 * Load Parachute
 */
gltfLoader.load("/parachute_gltf/scene.gltf", (gltf) => {
  parachute_model = gltf.scene;
  parachute_model.position.set(0, 1.3, -0.1);
  parachute_model.visible = false;
  parachute_model.scale.set(actualParachuteWidth, 0.2, actualParachuteHight);
  group.add(parachute_model);

  modelLoaded();
});

var h0 = 100;

/**
 * Start Simulation after all models are loaded
 */
function startSimulation() {
  scene.add(group);

  // GUI Toggle Parachute
  gui.add(parachuteControl, 'visible').name("Toggle Parachute").onChange((value) => {
    h0 = group.position.y;
    if (!parachute_model) return;
    parachute_model.visible = value;
    parachuteWidth = parachuteHight = value ? 3 : 0;
  });

  const scaleControl = { scale: parachuteWidth };

gui.add(scaleControl, 'scale', 0.3, 2, 0.01).name("Scale X&Z").onChange((value) => {
  parachuteWidth = value * 10;
  parachuteHight = value * 10;

  if (parachute_model) {
    parachute_model.scale.set(actualParachuteWidth,  parachute_model.scale.y , actualParachuteHight);

    console.log(`parachuteWidth = ${parachuteWidth}`);
    console.log(`parachuteHight = ${parachuteHight}`);
  }
});

const start = { start: false };

gui.add(start, 'start').name("start").onChange((value) => {
  if(value)
    tick();

});

}

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1, 10);
scene.add(camera);

/**
 * Controls
 */
const controls = new OrbitControls(camera, canvas);

/**
 * Lights
 */
scene.add(new THREE.AmbientLight(0xfffddd, 0.5));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 1, 2);
scene.add(directionalLight);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Window Resize
 */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/**
 * Animation Loop
 */
const m = 80;

var i = 0;
// إعدادات الكاميرا القابلة للتعديل
const cameraSettings = {
  sideOffset: 6,   // المسافة الجانبية عن الجسم
  heightOffset: 0, // ارتفاع الكاميرا فوق الجسم
};

// إضافة GUI
gui.add(cameraSettings, 'sideOffset', 1, 20, 0.1).name("Camera Side Offset");
gui.add(cameraSettings, 'heightOffset', -5, 10, 0.1).name("Camera Height Offset");

// داخل tick loop
function tick() {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousTime;
  previousTime = elapsedTime;

   if(i == 0){
    console.log(`this is start Time ${clock.startTime}`);
    i++;
  }

  controls.update();

  // حركة المظلة والجسم كما لديك
  const A = parachuteControl.visible ? parachuteWidth * parachuteHight * 2 : 0.7;

  // console.log(`this is A = ${A}`);

  const Cd = parachuteControl.visible ? 2.2 : 1;
  const k = calculateK(Cd, A);

  //console.log(`this is k = ${k}`);

  const y = parachutePosition(elapsedTime, m, k);
  const v = calculateVelocity(elapsedTime, m , k); //
  const Fr = calculateAirForce(k, v);
  const Fg = calculateGravityForce(m);
  const a = calculateAccelrate(m,k,v);
  const F = calculateTotalForce(Fg,Fr);

  const h = h0 - y;
  if (h > -500){  

    console.log(`\n
      this is velocity = ${v}\n
      this is Fr = ${Fr}\n
      this is Accelrate = ${a}\n
      this is Total Force = ${F}\n
      this is A = ${A}\n
      this is k = ${k}\n`);

    group.position.y = h;
  }else{
    console.log(Math.sqrt((m*9.81)/k));
    console.log(`this is the final time ${clock.oldTime-clock.startTime}`);
    return;
  }

  // تتبع الجسم بسلاسة من الجانب
  const targetX = group.position.x;
  const targetY = group.position.y + cameraSettings.heightOffset;
  const targetZ = group.position.z + cameraSettings.sideOffset;

  camera.position.x += (targetX - camera.position.x) ;
  camera.position.y += (targetY - camera.position.y) ;
  camera.position.z += (targetZ - camera.position.z);

  camera.lookAt(group.position);

  // تحديث الحركات
  if (soldier_mixer) soldier_mixer.update(deltaTime);
  if (helicopter_mixer) helicopter_mixer.update(deltaTime);

  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
}
 