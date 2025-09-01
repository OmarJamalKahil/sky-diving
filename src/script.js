import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as dat from "lil-gui";
import { calculateK, newPosition } from "./physics.ts";

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
 * Parameters , Models , Groups And Mixers
 */
let soldier_model, soldier_model_first, helicopter_model, parachute_model;
let soldier_mixer = null,
soldier_mixer_Standing = null,
  soldier_mixer_First = null,
  helicopter_mixer = null;

const start = { start: false };

const groupFirst = new THREE.Group();
const helicopterGroup = new THREE.Group();
const group = new THREE.Group();

let actualParachuteWidth = 0.3,
  actualParachuteHight = 0.3;
let parachuteWidthForCalculations = 0.3,
  parachuteHightForCalculations = 0.3;
const parachuteVisiblty = { visible: false };

const clock = new THREE.Clock();

let startHeight = { value: 100 };

var helicopter_Speed = { helicopter_Speed: 0.1 };

/**
 * Cursor
 */
const cursor = { x: 0, y: 0 };
window.addEventListener("mousemove", (e) => {
  cursor.x = e.clientX / window.innerWidth - 0.5;
  cursor.y = e.clientY / window.innerHeight - 0.5;
});

/**
 * Models Loading Tracker
 */
let modelsLoaded = 0;
const totalModels = 4; // soldier + helicopter + parachute
function modelLoaded() {
  modelsLoaded++;
  if (modelsLoaded === totalModels) {
    gui
      .add(start, "start")
      .name("Start")
      .onChange((value) => {
        groupFirst.clear();
        scene.remove(groupFirst);
        scene.add(group);

        if (!helicopter_Direction) {
          z = helicopterGroup.position.z - 3;

          group.rotateY(Math.PI);

        } else {
          z = helicopterGroup.position.z + 3;
        }
        x = helicopterGroup.position.x;
        y = helicopterGroup.position.y + 3;

        const Vhx = helicopter_Direction
          ? helicopter_Speed.helicopter_Speed * 10
          : -helicopter_Speed.helicopter_Speed * 10;
        vx = Vhx + wind_Velocity.wind_Velocity_On_X_Axis;
        vy = Vjump.y + wind_Velocity.wind_Velocity_On_Y_Axis;
        vz = Vjump.z + wind_Velocity.wind_Velocity_On_Z_Axis;
        start.start = value;
      });

    BuildGuiControls();
  }
}

/**
 * Loaders
 */
const gltfLoader = new GLTFLoader();

/**
 * Load Soldier
 */
gltfLoader.load("/low_poly_soldier_free_gltf/scene.gltf", (gltf) => {
  soldier_model = gltf.scene;
  soldier_model.scale.set(0.01, 0.01, 0.01);
  group.add(soldier_model);

  soldier_mixer = new THREE.AnimationMixer(gltf.scene);
  soldier_mixer_Standing = new THREE.AnimationMixer(gltf.scene);

  soldier_mixer.clipAction(gltf.animations[1]).play();
  soldier_mixer_Standing.clipAction(gltf.animations[0]).play();


  modelLoaded();
});

/**
 * Load Soldier On Helicopter
 */
gltfLoader.load("/low_poly_soldier_free_gltf/scene.gltf", (gltf) => {
  soldier_model_first = gltf.scene;
  soldier_model_first.scale.set(0.01, 0.01, 0.01);
  groupFirst.add(soldier_model_first);

  soldier_mixer_First = new THREE.AnimationMixer(gltf.scene);
  soldier_mixer_First.clipAction(gltf.animations[0]).play();

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

/**
 * Load Helicopter
 */
gltfLoader.load(
  "/mh_6_little_bird_helicopter_animated_gltf/scene.gltf",
  (gltf) => {
    helicopter_model = gltf.scene;
    helicopter_model.position.set(0, 0, 0);
    helicopter_model.scale.set(0.025, 0.025, 0.025);
    helicopter_model.rotateY(Math.PI * 0.5);
    group.position.set(0, 0, 0);
    helicopterGroup.add(helicopter_model);

    helicopter_mixer = new THREE.AnimationMixer(gltf.scene);
    helicopter_mixer.clipAction(gltf.animations[0]).play();

    modelLoaded();
  }
);

/**
 * GUI
 */
const gui = new dat.GUI();

function BuildGuiControls() {
  // slider لاختيار الارتفاع من 50 إلى 500
  gui
    .add(startHeight, "value", 50, 500, 10)
    .name("Start Height")
    .onChange((value) => {
      y = startHeight.value;
    });

  gui.add(cameraSettings, "sideOffset", 1, 20, 0.1).name("Camera Side Offset");
  gui
    .add(cameraSettings, "heightOffset", -5, 10, 0.1)
    .name("Camera Height Offset");

  gui
    .add(cameraOptions, "active", [
      "camera1",
      "camera2",
      "camera3",
      "camera4",
      "freeCamera",
    ])
    .name("Active Camera")
    .onChange((value) => {
      if (value === "camera1") {
        activeCamera = camera1;
      } else if (value === "camera2") {
        activeCamera = camera2;
      } else if (value === "camera3") {
        activeCamera = camera3;
      } else if (value === "camera4") {
        activeCamera = camera4;
      } else activeCamera = freeCamera;
      controls1.target.copy(group.position);
      controls2.target.copy(group.position);
      controls3.target.copy(group.position);
      controls4.target.copy(helicopterGroup.position);
    });

  gui
    .add(wind_Velocity, "wind_Velocity_On_X_Axis", -5, 5, 0.1)
    .name("Wind on X Diraction");
  gui
    .add(wind_Velocity, "wind_Velocity_On_Y_Axis", -5, 5, 0.1)
    .name("Wind on Y Diraction");
  gui
    .add(wind_Velocity, "wind_Velocity_On_Z_Axis", -5, 5, 0.1)
    .name("Wind on Z Diraction");

  gui
    .add(helicopter_Speed, "helicopter_Speed", 0.1, 0.6, 0.01)
    .name("helicopter_Speed");

  // GUI Toggle Parachute
  gui
    .add(parachuteVisiblty, "visible")
    .name("Toggle Parachute")
    .onChange((value) => {
      if (!parachute_model) return;
      parachute_model.visible = value;
      parachuteWidthForCalculations = parachuteHightForCalculations = value
        ? 3
        : 0;
    });

  const scaleControl = { scale: parachuteWidthForCalculations };

  gui
    .add(scaleControl, "scale", 0.3, 2, 0.01)
    .name("parachute size")
    .onChange((value) => {
      parachuteWidthForCalculations = value * 10;
      parachuteHightForCalculations = value * 10;

      actualParachuteWidth = value * 2;
      actualParachuteHight = value * 2;
      if (parachute_model) {
        parachute_model.scale.set(
          actualParachuteWidth,
          parachute_model.scale.y,
          actualParachuteHight
        );
      }
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

// إعدادات الكاميرا القابلة للتعديل
const cameraSettings = {
  sideOffset: 6, // المسافة الجانبية عن الجسم
  heightOffset: 0, // ارتفاع الكاميرا فوق الجسم
};

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
camera2.position.set(0, -250, 0); // تحت الجندي

const camera3 = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera3.position.set(0, -510, 10); // تحت الجندي

const camera4 = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera4.position.set(0, startHeight.value + 3, 10); // تحت الجندي

// Camera free movement
const freeCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
freeCamera.position.set(0, startHeight.value, 50); // نقطة البداية
// متغيرات التحكم
const moveSpeed = 0.5;
const turnSpeed = 0.005;
const keysPressed = {};
let pitch = 0; // زاوية للأعلى/أسفل
let yaw = 0; // زاوية لليسار/اليمين

// الاستماع لضغطات المفاتيح
window.addEventListener("keydown", (e) => {
  keysPressed[e.key.toLowerCase()] = true;
});
window.addEventListener("keyup", (e) => {
  keysPressed[e.key.toLowerCase()] = false;
});

// تحكم بالماوس لتغيير الاتجاه
let isPointerLocked = false;
canvas.addEventListener("click", () => {
  canvas.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  isPointerLocked = document.pointerLockElement === canvas;
});

document.addEventListener("mousemove", (e) => {
  if (!isPointerLocked) return;
  yaw -= e.movementX * turnSpeed;
  pitch -= e.movementY * turnSpeed;
  pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); // منع الدوران الكامل للأعلى/أسفل
});

function updateFreeCamera() {
  const direction = new THREE.Vector3();
  direction.x = Math.cos(pitch) * Math.sin(yaw);
  direction.y = Math.sin(pitch);
  direction.z = Math.cos(pitch) * Math.cos(yaw);
  direction.normalize();

  // حركة الكاميرا
  const forward = new THREE.Vector3(direction.x, 0, direction.z).normalize();
  const right = new THREE.Vector3()
    .crossVectors(forward, new THREE.Vector3(0, 1, 0))
    .normalize();

  if (keysPressed["w"] || keysPressed["arrowup"])
    freeCamera.position.add(forward.clone().multiplyScalar(moveSpeed));
  if (keysPressed["s"] || keysPressed["arrowdown"])
    freeCamera.position.add(forward.clone().multiplyScalar(-moveSpeed));
  if (keysPressed["a"] || keysPressed["arrowleft"])
    freeCamera.position.add(right.clone().multiplyScalar(-moveSpeed));
  if (keysPressed["d"] || keysPressed["arrowright"])
    freeCamera.position.add(right.clone().multiplyScalar(moveSpeed));
  if (keysPressed[" "]) freeCamera.position.y += moveSpeed; // space للصعود
  if (keysPressed["shift"]) freeCamera.position.y -= moveSpeed; // shift للنزول

  freeCamera.lookAt(freeCamera.position.clone().add(direction));
}

let activeCamera = camera4;

const controls1 = new OrbitControls(camera1, canvas);
const controls2 = new OrbitControls(camera2, canvas);
const controls3 = new OrbitControls(camera3, canvas);
const controls4 = new OrbitControls(camera4, canvas);

const cameraOptions = { active: "camera4" };

/**
 * Window Resize
 */
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera1.aspect = w / h;
  camera1.updateProjectionMatrix();

  camera2.aspect = w / h;
  camera2.updateProjectionMatrix();

  camera3.aspect = w / h;
  camera3.updateProjectionMatrix();

  camera4.aspect = w / h;
  camera4.updateProjectionMatrix();

  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

scene.add(groupFirst);
groupFirst.position.set(-0.5, 2.15, 2.5);
helicopterGroup.add(groupFirst);
scene.add(helicopterGroup);

let helicopterStep = 0;
let helicopter_Direction = true;

const wind_Velocity = {
  wind_Velocity_On_X_Axis: 0,
  wind_Velocity_On_Y_Axis: 0,
  wind_Velocity_On_Z_Axis: 0,
};

const Soldier_Mass = 80;

let vx = 0;
let vy = 0;
let vz = 0;

let x = 0;
let y = startHeight.value;
let z = 0;

let ax = 0;
let ay = 0;
let az = 0;

const Vjump = { x: 0, y: -1, z: 1 };

function tick() {
  if (activeCamera === freeCamera) {
    updateFreeCamera();
  } else if (activeCamera === camera1) {
    controls1.update();
  } else if (activeCamera === camera2) {
    controls2.update();
  } else if (activeCamera === camera3) {
    controls3.update();
  }
  const deltaTime = Math.min(clock.getDelta(), 0.05);

  if (start.start) {
      if (soldier_mixer) soldier_mixer.update(deltaTime);

    animateHelicopter();

    const A = parachuteVisiblty.visible
      ? parachuteWidthForCalculations * parachuteHightForCalculations * 2
      : 0.7;
    const Cd = parachuteVisiblty.visible ? 2.2 : 1;
    const k = calculateK(Cd, A);

    const result = newPosition(
      x,
      y,
      z,
      vx,
      vy,
      vz,
      Soldier_Mass,
      k,
      deltaTime,
      wind_Velocity.wind_Velocity_On_X_Axis * 2,
      wind_Velocity.wind_Velocity_On_Y_Axis * 2,
      wind_Velocity.wind_Velocity_On_Z_Axis * 2
    );

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
    camera4.lookAt(group.position);

    if (activeCamera === camera1) {
      const targetX = group.position.x;
      const targetY = group.position.y + cameraSettings.heightOffset;
      const targetZ = group.position.z + cameraSettings.sideOffset;

      camera1.position.x += targetX - camera1.position.x;
      camera1.position.y += targetY - camera1.position.y;
      camera1.position.z += targetZ - camera1.position.z;
      camera1.lookAt(group.position);
    }

    if (activeCamera === camera2) {
      camera2.lookAt(group.position);
    }
    if (activeCamera === camera3) {
      camera3.lookAt(group.position);
    }

    if (y > -500) {
      const pointGeometry = new THREE.BufferGeometry();
      const pointMaterial = new THREE.PointsMaterial({
        color: 0xff0000,
        size: 0.5,
      });

      const vertices = new Float32Array([x, y, z - 1]);
      pointGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(vertices, 3)
      );

      const point = new THREE.Points(pointGeometry, pointMaterial);
      scene.add(point);

      console.log(`
        this is pos x = ${x}
        this is pos y = ${y}
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
    } else {
      y = -500;
      vy = 0;
      vx = 0;
      vz = 0;
      wind_Velocity.wind_Velocity_On_X_Axis = 0;
      wind_Velocity.wind_Velocity_On_Y_Axis = 0;
      wind_Velocity.wind_Velocity_On_Z_Axis = 0;

      // soldier_mixer = null;
      soldier_mixer_Standing.update(deltaTime);
      group.position.set(x, y, z);
    }
  } else {
    if (activeCamera === camera4) {
      controls4.update();
      camera4.lookAt(helicopterGroup.position);
    }

    if (helicopter_Direction) {
      helicopterGroup.position.set(helicopterStep, y, 0);
      helicopterStep += helicopter_Speed.helicopter_Speed;
      Vjump.z = 1;
      if (helicopterStep >= 50) {
        camera4.position.set(0, y + 3, -10);

        helicopter_Direction = false;
        helicopterGroup.rotation.y += Math.PI;
      }
    } else {
      Vjump.z = -1;
      helicopterGroup.position.set(helicopterStep, y, 0);

      helicopterStep -= helicopter_Speed.helicopter_Speed;
      if (helicopterStep <= -50) {
        camera4.position.set(0, y + 3, 10);

        helicopter_Direction = true;
        helicopterGroup.rotation.y += Math.PI;
      }
    }
  }
  if (soldier_mixer_First) soldier_mixer_First.update(deltaTime);

  if (helicopter_mixer) helicopter_mixer.update(deltaTime);
  renderer.render(scene, activeCamera);

  window.requestAnimationFrame(tick);
}
tick();

function animateHelicopter() {
  if (helicopter_Direction) {
    helicopterGroup.position.set(helicopterStep, startHeight.value, 0);
    helicopterStep += helicopter_Speed.helicopter_Speed;
    if (helicopterStep >= 50) {
      helicopter_Direction = false;
      helicopterGroup.rotation.y += Math.PI;
    }
  } else {
    helicopterGroup.position.set(helicopterStep, startHeight.value, 0);

    helicopterStep -= helicopter_Speed.helicopter_Speed;
    if (helicopterStep <= -50) {
      helicopter_Direction = true;
      helicopterGroup.rotation.y += Math.PI;
    }
  }
}
