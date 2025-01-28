import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LSystemGenerator } from "./src/LSystemGenerator.js";
import { TreeBuilder } from "./src/TreeBuilder.js";
import { GUIController } from "./src/GUIController.js";
import { createNoise3D } from "simplex-noise";
import Stats from "three/examples/jsm/libs/stats.module.js";

// Noise 
const noise3D = createNoise3D();

// --- General Setup ---

// Stats Display
var stats = new Stats(); 
stats.showPanel(0); 
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
    angle: 10,
    position : new THREE.Vector3(0,0,0)
};


// GUI Controller was disabled for the performance measurement 
// with multiple Trees
//const gui = new GUIController(lSystemGenerator, treeBuilder, treeParams, scene);

// --- 

// L-System-String Definition
lSystemGenerator.addRule('A', '^fB+^^B+vvB<<<<B');
lSystemGenerator.addRule('B', '[^^ff--A]');
const lSystemString = lSystemGenerator.generate('fffffA', 6); 

const treeMesh = treeBuilder.buildTree(lSystemString, treeParams)
scene.add(treeMesh);

let gridPositions = generateGridPositions(2);

gridPositions.forEach((pos) => {
    createCopiesOfMesh(treeMesh, scene, pos)
})

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


// Function to log the number of meshes
function logMeshCount() {
    let meshCount = 0;

    scene.traverse(function (obj) {
        if (obj instanceof THREE.Mesh) {
            meshCount++;
        }
    });

    return meshCount;
}

// Animation loop
const clock = new THREE.Clock();
let time = 0.0;
function animate() {
    stats.begin();
    time += clock.getDelta();
    let noise = noise3D(time, 0, 0); 
    //console.log(noise)
    treeBuilder.shaderMaterial.uniforms.noiseValue.value = noise;
    treeBuilder.shaderMaterial.uniforms.time.value = time;
    controls.update();
    renderer.render(scene, camera);

    //requestAnimationFrame(animate);
    setTimeout(animate, 0);

    stats.end();
}

function createCopiesOfMesh(mesh, scene, position) {

    const clone = mesh.clone();
    
    clone.position.set(position.x, position.y, position.z);

    scene.add(clone);
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