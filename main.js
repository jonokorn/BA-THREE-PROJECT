import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LSystemGenerator } from "./src/LSystemGenerator.js";
import { TreeBuilder } from "./src/TreeBuilder.js";
import { GUIController } from "./src/GUIController.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { createWebSocketModuleRunnerTransport } from "vite/module-runner";

// --- General Setup ---

// Stats Display 
var stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(10, 15, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,10,0);

// --- Geometry Setup ---
// Ground Plane
const groundGeometry = new THREE.PlaneGeometry(10, 10);
const groundMaterial = new THREE.MeshBasicMaterial({
    color: 0x808080,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.2
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
//scene.add(ground);

// --- Light Setup ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// --- L-System Setup ---
const lSystemGenerator = new LSystemGenerator();
const treeBuilder = new TreeBuilder(scene);

// Initial tree parameters
const treeParams = {
    startRadius: 1,
    radiusReduction: 0.8,
    branchLength: 1.0,
    angle: 10
};


// --- 

lSystemGenerator.addRule('A', '^fB+^^B+vvB<<<<B');
lSystemGenerator.addRule('B', '[^^ff--A]');
const lSystemString = lSystemGenerator.generate('fffffA', 6); 
const material = new THREE.MeshPhongMaterial({color:'white',wireframe:true});

let orientationMat = new THREE.Matrix3()

orientationMat.set(
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
);

const baseGeometry = treeBuilder.buildTree(lSystemString, {
    startRadius: 1,
    radiusReduction: 0.8,
    branchLength: 1.0,
    angle: 10,
    orientation: orientationMat
})

orientationMat.set(
    1, 0, 0,
    0, 0.95, 0.1,
    0, -0.1, 0.95 
);

const targetGeometry = treeBuilder.buildTree(lSystemString, {
    startRadius: 1,
    radiusReduction: 0.8,
    branchLength: 1.0,
    angle: 12,
    orientation: orientationMat
})

orientationMat.set(
    1, 0, 0,
    0, 1.05, 0.1,
    0, 0.1, 1.05
);

const targetGeometry2 = treeBuilder.buildTree(lSystemString, {
    startRadius: 1,
    radiusReduction: 0.8,
    branchLength: 1.0,
    angle: 10,
    orientation: orientationMat
})



console.log(baseGeometry)
console.log(targetGeometry)
// Get vertices from both geometries
const basePositions = baseGeometry.attributes.position.array;
const targetPositions = targetGeometry.attributes.position.array;
const targetPositions2 = targetGeometry2.attributes.position.array;


// Create a morphable geometry
const morphGeometry = new THREE.BufferGeometry();
morphGeometry.setAttribute('position', new THREE.Float32BufferAttribute(basePositions, 3));

morphGeometry.setIndex(baseGeometry.index);

morphGeometry.morphAttributes.position = [
    new THREE.Float32BufferAttribute(targetPositions, 3)
];

morphGeometry.morphAttributes.position.push(
    new THREE.Float32BufferAttribute(targetPositions2, 3)
);

const mesh = new THREE.Mesh(morphGeometry, material); 
scene.add(mesh)

const morphKF = new THREE.NumberKeyframeTrack(
    '.morphTargetInfluences[0]', // The property to animate
    [0, 1], // Keyframe times (in seconds)
    [0, 1]  // Values for morph influence (0 = base geometry, 1 = target geometry)
);

const morphKF2 = new THREE.NumberKeyframeTrack(
    '.morphTargetInfluences[1]', // Index 1 for the second morph target
    [1, 2], // Keyframe times (in seconds)
    [0, 1]  // Values for morph influence (0 = base geometry, 1 = second target geometry)
);


const clip = new THREE.AnimationClip('morph', 2, [morphKF, morphKF2]);

// Setup the animation mixer
const mixer = new THREE.AnimationMixer(mesh);
const action = mixer.clipAction(clip);

// Configure the action
action.setLoop(THREE.LoopPingPong); // Makes the animation go back and forth
action.clampWhenFinished = true;
action.play();



console.log(baseGeometry)







// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let meshCount = 0;

scene.traverse(function (obj) {
    if (obj instanceof THREE.Mesh) {
        meshCount++;
    }
});
console.log("Meshes in the scene: " + meshCount);

// Animation loop
const clock = new THREE.Clock();
function animate() {
    stats.begin();
    const delta = clock.getDelta();
    mixer.update(delta);
    controls.update();
    renderer.render(scene, camera);
    
    //requestAnimationFrame(animate); // Capped at 60
    setTimeout(animate, 0); // Uncapped
    stats.end();
}

animate();