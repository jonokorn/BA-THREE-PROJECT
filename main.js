import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LSystemGenerator } from "./src/LSystemGenerator.js";
import { TreeBuilder } from "./src/TreeBuilder.js";
import { GUIController } from "./src/GUIController.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import TreeAnimator from "./src/TreeAnimator.js";

// --- General Setup ---

// Clock
const clock = new THREE.Clock();

// Display Stats
let stats = new Stats();
stats.showPanel(0);
document.body.append(stats.dom);

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

// --- Light Setup ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// --- L-System-Generator
const lSystemGenerator = new LSystemGenerator();

// --- Tree-Builder
const treeBuilder = new TreeBuilder(scene);

// --- Tree-Animator
const treeAnimator = new TreeAnimator();

// --- 
lSystemGenerator.addRule('A', '^fB+^^B+vvB<<<<B');
lSystemGenerator.addRule('B', '[^^ff--A]');

const lSystemString = lSystemGenerator.generate('fffffA', 6); 

// ---

const skeletonArray = []

let gridPositions = generateGridPositions(1);

gridPositions.forEach((pos) => {

    let treeParams = {
        startRadius    : 1,
        radiusReduction: 0.8,
        branchLength   : 1.0,
        angle          : 10,
        position       : pos
    };
    let treeObj = treeBuilder.buildTree(lSystemString, treeParams);
    treeAnimator.skeletonArray.push(treeObj.skeleton);
    scene.add(treeObj.mesh)
})

const gui = new GUIController(lSystemGenerator, treeBuilder, scene);

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function logMeshCount() {
    let meshCount = 0;

    scene.traverse(function (obj) {
        if (obj instanceof THREE.Mesh) {
            meshCount++;
        }
    });

    return meshCount;
}

// --- Animation loop

const windDirection = new THREE.Vector3(1,0,0);
const windStrength  = 1.0;

function animate() {

    stats.begin();
    controls.update();
    const time = clock.getElapsedTime();
    treeAnimator.animateTrees(windDirection, windStrength, time);
    renderer.render(scene, camera);

    //requestAnimationFrame(animate); // Capped at 60 FPS
    setTimeout(animate, 0); // Uncapped

    stats.end();
}

function generateGridPositions(count, spacing = 5) {
    const positions = [];
    const gridSize = Math.ceil(Math.sqrt(count));
    const halfGridSize = gridSize / 2;
    
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        
        positions.push(new THREE.Vector3(
            (col - halfGridSize + 0.5) * spacing,
            0,
            (row - halfGridSize + 0.5) * spacing
        ));
    }
    return positions;
}

animate();