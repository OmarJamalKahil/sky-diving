import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as dat from "lil-gui";
import {
  calculateAccelrate,
  calculateAirForce,
  calculateGravityForce,
  calculateK,
  calculateTotalForce,
  calculateVelocity,
  parachutePosition,
  stepSemiImplicit,
} from "./physics.ts";

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
let soldier_mixer = null,
  helicopter_mixer = null;

const group = new THREE.Group();
const soldierWidth = 0.01,
  soldierHight = 0.01;
let actualParachuteWidth = 0.3,
  actualParachuteHight = 0.3;
let parachuteWidth = 0.3,
  parachuteHight = 0.3;

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
gltfLoader.load(
  "/mh_6_little_bird_helicopter_animated_gltf/scene.gltf",
  (gltf) => {
    helicopter_model = gltf.scene;
    helicopter_model.position.set(2, -3, 0);
    helicopter_model.scale.set(0.005, 0.005, 0.005);
    scene.add(helicopter_model);

    helicopter_mixer = new THREE.AnimationMixer(gltf.scene);
    helicopter_mixer.clipAction(gltf.animations[0]).play();

    modelLoaded();
  }
);

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
  gui
    .add(parachuteControl, "visible")
    .name("Toggle Parachute")
    .onChange((value) => {
      h0 = group.position.y;
      if (!parachute_model) return;
      parachute_model.visible = value;
      parachuteWidth = parachuteHight = value ? 3 : 0;
    });

  const scaleControl = { scale: parachuteWidth };

  gui
    .add(scaleControl, "scale", 0.3, 2, 0.01)
    .name("Scale X&Z")
    .onChange((value) => {
      parachuteWidth = value * 10;
      parachuteHight = value * 10;

      actualParachuteWidth = value * 2;
      actualParachuteHight = value * 2;
      if (parachute_model) {
        parachute_model.scale.set(
          actualParachuteWidth,
          parachute_model.scale.y,
          actualParachuteHight
        );

        console.log(`parachuteWidth = ${parachuteWidth}`);
        console.log(`parachuteHight = ${parachuteHight}`);
      }
    });

  const start = { start: false };

  gui
    .add(start, "start")
    .name("start")
    .onChange((value) => {
      if (value) tick();
    });
}

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
 * Animation Loop
 */
const m = 80;

var i = 0;
// إعدادات الكاميرا القابلة للتعديل
const cameraSettings = {
  sideOffset: 6, // المسافة الجانبية عن الجسم
  heightOffset: 0, // ارتفاع الكاميرا فوق الجسم
};

// إضافة GUI
gui.add(cameraSettings, "sideOffset", 1, 20, 0.1).name("Camera Side Offset");
gui
  .add(cameraSettings, "heightOffset", -5, 10, 0.1)
  .name("Camera Height Offset");

// group.position.y = 100;

// // داخل tick loop
// function tick() {
//   const elapsedTime = clock.getElapsedTime();
//   const deltaTime = elapsedTime - previousTime;
//   previousTime = elapsedTime;

//   if (i == 0) {
//     console.log(`this is start Time ${clock.startTime}`);
//     i++;
//   }

//   controls.update();

//   // حركة المظلة والجسم كما لديك
//   const A = parachuteControl.visible
//     ? parachuteWidth * parachuteHight * 2
//     : 0.7;

//   // console.log(`this is A = ${A}`);

//   const Cd = parachuteControl.visible ? 2.2 : 1;
//   const k = calculateK(Cd, A);

//   //console.log(`this is k = ${k}`);

//   const y = parachutePosition(elapsedTime, m, k);
//   const v = calculateVelocity(elapsedTime, m, k); //
//   const Fr = calculateAirForce(k, v);
//   const Fg = calculateGravityForce(m);
//   const a = calculateAccelrate(m, k, v);
//   const F = calculateTotalForce(Fg, Fr);

//   let h = group.position.y;
//   if (h > -500) {
//     console.log(`\n
//       this is y = ${y}\n
//       this is h = ${h}\n
//       this is velocity = ${v}\n
//       this is Fr = ${Fr}\n
//       this is Accelrate = ${a}\n
//       this is Total Force = ${F}\n
//       this is A = ${A}\n
//       this is k = ${k}\n`);
//     h -= v * deltaTime; // نقص بقدر السرعة × الزمن

//     group.position.y = h;
//   } else {
//     console.log(Math.sqrt((m * 9.81) / k));
//     console.log(`this is the final time ${clock.oldTime - clock.startTime}`);
//     return;
//   }

//   // تتبع الجسم بسلاسة من الجانب
//   const targetX = group.position.x;
//   const targetY = group.position.y + cameraSettings.heightOffset;
//   const targetZ = group.position.z + cameraSettings.sideOffset;

//   camera.position.x += targetX - camera.position.x;
//   camera.position.y += targetY - camera.position.y;
//   camera.position.z += targetZ - camera.position.z;

//   camera.lookAt(group.position);

//   // تحديث الحركات
//   if (soldier_mixer) soldier_mixer.update(deltaTime);
//   if (helicopter_mixer) helicopter_mixer.update(deltaTime);

//   renderer.render(scene, camera);
//   window.requestAnimationFrame(tick);
// }

//group.position.y = 100;



// الكاميرا الأولى (الرئيسية)
const camera1 = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera1.position.set(0, 1, 10);

// الكاميرا الثانية (تحت الجندي)
const camera2 = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera2.position.set(0, -500, 0); // تحت الجندي

// الكاميرا الحالية
let activeCamera = camera1;

const controls1 = new OrbitControls(camera1, canvas);
const controls2 = new OrbitControls(camera2, canvas);

const cameraOptions = { active: "camera1" };

// تحكم dat.GUI
// ====== تحكم بسيط لتبديل الـ controls بناءً على الكاميرا النشطة ======
gui
  .add(cameraOptions, "active", ["camera1", "camera2"])
  .name("Active Camera")
  .onChange((value) => {
    if (value === "camera1") {
      activeCamera = camera1;
    } else {
      activeCamera = camera2;
    }
    // optional: sync controls target to current group position
    controls1.target.copy(group.position);
    controls2.target.copy(group.position);
  });

/**
 * Window Resize
 */
// ====== تعديل resize ليحدث كلا الكاميرتين ======
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera1.aspect = w / h;
  camera1.updateProjectionMatrix();

  camera2.aspect = w / h;
  camera2.updateProjectionMatrix();

  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// function tick() {
//   const elapsedTime = clock.getElapsedTime();
//   let deltaTime = elapsedTime - previousTime;
//   previousTime = elapsedTime;

//   // safety clamp (تجنّب dt كبير جداً)
//   deltaTime = Math.min(deltaTime, 0.05);

//   if (i == 0) {
//     console.log(`this is start Time ${clock.startTime}`);
//     i++;
//   }

//   controls1.update();

//   const A = parachuteControl.visible
//     ? parachuteWidth * parachuteHight * 2
//     : 0.7;
//   const Cd = parachuteControl.visible ? 2.2 : 1;
//   const k = calculateK(Cd, A);

//   // استدعاء التكامل: *مرّر deltaTime* وليس elapsedTime
//   const result = stepSemiImplicit(
//     x, y, z,
//     vx, vy, vz,
//     m, k,
//     deltaTime, // <-- **هنا dt الصحيح**
//     windVx, windVy, windVz
//   );

//   // فك القيم بالاسم نفسه
//   x = result.x;
//   y = result.y;
//   z = result.z;
//   vx = result.vx;
//   vy = result.vy;
//   vz = result.vz;

//   // حدّد موقع المجموعة مباشرة من y (لا تطرح مرة أخرى)
//   group.position.x = x;
//   group.position.y = y;
//   group.position.z = z;

//   // لو تريد قيم Fr, a للـ logging: احسبها من السرعات الحالية
//   const vrel = Math.hypot(vx - windVx, vy - windVy, vz - windVz);
//   const Fr_mag = k * vrel * vrel; // magnitude = k * v^2  (k = 0.5 rho Cd A)
//   const Fg = m * 9.81;
//   const ay = ( -Fg * 1 + (-k * vrel * (vy - windVy)) ) / m; // أو استخرج من forcesAndAcceleration3DWithWind

//   if(y < -500){
//     return;
//   }
//   console.log(`
//     this is pos y = ${y}
//     this is velocity vy = ${vy}
//     this is speed = ${vrel}
//     this is Fr_mag = ${Fr_mag}
//     this is A = ${A}
//     this is k = ${k}
//   `);

//   // تحديث الكاميرا، الميكسر، والرندر
//   const targetX = group.position.x;
//   const targetY = group.position.y + cameraSettings.heightOffset;
//   const targetZ = group.position.z + cameraSettings.sideOffset;

//   camera1.position.x += targetX - camera1.position.x;
//   camera1.position.y += targetY - camera1.position.y;
//   camera1.position.z += targetZ - camera1.position.z;
//   camera1.lookAt(group.position);

//   // إذا الكاميرا الثانية، تخليها تطالع الجندي
// if (activeCamera === camera2) {
//   camera2.lookAt(group.position);
// }
// renderer.render(scene, activeCamera);

//   if (soldier_mixer) soldier_mixer.update(deltaTime);
//   if (helicopter_mixer) helicopter_mixer.update(deltaTime);

//   // renderer.render(scene, camera1);
//   window.requestAnimationFrame(tick);
// }

// ====== داخل tick: حدّث فقط الـ controls الخاصة بالكاميرا النشطة ======

let vx = 0;
let vy = 0;
let vz = 0;

let windVx = 2.5;
let windVy = 0;
let windVz = 1;

let x = 0;
let y = 100;
let z = 0;

let ax = 0;
let ay = 0; 
let az = 0;

function tick() {
  // delta time من getDelta أسهل
  const deltaTime = Math.min(clock.getDelta(), 0.05);

  // حدث فقط الـ control المرتبط بالكاميرا النشطة
  if (activeCamera === camera1) {
    controls1.update();
  } else {
    controls2.update();
  }

  const A = parachuteControl.visible
    ? parachuteWidth * parachuteHight * 2
    : 0.7;
  const Cd = parachuteControl.visible ? 2.2 : 1;
  const k = calculateK(Cd, A);

  // استدعاء التكامل: *مرّر deltaTime* وليس elapsedTime
  const result = stepSemiImplicit(
    x,
    y,
    z,
    vx,
    vy,
    vz,
    m,
    k,
    deltaTime, // <-- **هنا dt الصحيح**
    windVx,
    windVy,
    windVz
  );

  // // ... حسابات الفيزياء كما لديك ...
  // const result = stepSemiImplicit(
  //   x, y, z,
  //   vx, vy, vz,
  //   m, k,
  //   deltaTime,
  //   windVx, windVy, windVz
  // );

  x = result.x;
  y = result.y;
  z = result.z;
  vx = result.vx;
  vy = result.vy;
  vz = result.vz;
  ax = result.ax;
  ay = result.ay;
  az = result.az;


  group.position.set(x, y, z);

  // حرك camera1 فقط اذا هي النشطة (أو إنك تريد smoothing لها فقط عندما نشطة)
  if (activeCamera === camera1) {
    const targetX = group.position.x;
    const targetY = group.position.y + cameraSettings.heightOffset;
    const targetZ = group.position.z + cameraSettings.sideOffset;

    camera1.position.x += targetX - camera1.position.x;
    camera1.position.y += targetY - camera1.position.y;
    camera1.position.z += targetZ - camera1.position.z;
    camera1.lookAt(group.position);
  }

  // الكاميرا الثانية دائماً تنظر إلى الجندي عندما تكون نشطة
  if (activeCamera === camera2) {
    camera2.lookAt(group.position);
  }

  // إيقاف الحلقة عند y < -500 (اختياري) — إن أردت أن تتوقف الرسوم عند الهبوط فأضف لوجيك للتعامل
  if (y < -500) {
    // يمكنك هنا إظهار رسالة أو إعادة تعيين الحالة بدلاً من return لإيقاف الرسوم.
    return;
  }
  console.log(`
    this is pos y = ${y}
    this is pos x = ${x}
    this is pos z = ${z}
    this is velocity vy = ${vy}
    this is velocity vx = ${vx}
    this is velocity vz = ${vz}
    this is A = ${A}
    this is k = ${k}
    this is accelration x = ${ax}
    this is accelration y = ${ay}
    this is accelration z = ${az}
    `);

  renderer.render(scene, activeCamera);

  if (soldier_mixer) soldier_mixer.update(deltaTime);
  if (helicopter_mixer) helicopter_mixer.update(deltaTime);

  window.requestAnimationFrame(tick);
}
