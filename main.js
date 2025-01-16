import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LSystemGenerator } from "./src/LSystemGenerator.js";
import { TreeBuilder } from "./src/TreeBuilder.js";
import { GUIController } from "./src/GUIController.js";

// --- General Setup ---
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
scene.add(ground);

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

// Create GUI controller with references to L-System generator and tree builder
const gui = new GUIController(lSystemGenerator, treeBuilder, treeParams, scene);

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    const windDirection = new THREE.Vector3(1, 0, 0);
    const windStrength = 0.05;
    treeBuilder.animateTree(windDirection, windStrength);
    renderer.render(scene, camera);
}

animate();