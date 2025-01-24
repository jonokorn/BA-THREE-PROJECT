import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LSystemGenerator } from "./src/LSystemGenerator.js";
import { TreeBuilder } from "./src/TreeBuilder.js";
import { GUIController } from "./src/GUIController.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { createWebSocketModuleRunnerTransport } from "vite/module-runner";
import { fill } from "three/src/extras/TextureUtils.js";

// --- General Setup ---
let mixers = [];

// Stats Display 
var stats = new Stats();

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

const morphGeometry = treeBuilder.buildTree(lSystemString, {
    startRadius: 1,
    radiusReduction: 0.8,
    branchLength: 1.0,
    angle: treeParams.angle,
    position : new THREE.Vector3(0,0,0)
})

morphGeometry.morphAttributes.position = []
let keyFrames = [];

createTreeVariation(morphGeometry, keyFrames, treeParams.angle);

const mesh = new THREE.Mesh(morphGeometry, material); 
scene.add(mesh)

const clip = new THREE.AnimationClip('morph', -1, keyFrames);
const mixer = new THREE.AnimationMixer(mesh);
const action = mixer.clipAction(clip);

// Configure the action
action.setLoop(THREE.LoopPingPong); // Makes the animation go back and forth
action.clampWhenFinished = false;
action.play();

let gridPositions = generateGridPositions(10);

gridPositions.forEach((pos) => {
    createCopiesOfMesh(mesh, scene, pos, mixers, clip)
})
// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
const clock = new THREE.Clock();
function animate() {
    stats.begin();
    const delta = clock.getDelta();
    mixer.update(delta);
    controls.update();
    renderer.render(scene, camera);
    
    mixers.forEach((mixr) => {
        mixr.update(delta);
    })
    //requestAnimationFrame(animate); // Capped at 60
    setTimeout(animate, 0); // Uncapped
    stats.end();
}

function createTreeVariation(morphGeometry, keyFrames, angle){

    const amount = 1;

    for(let i = 0; i <= amount; i++ ){

        let  orientation = new THREE.Matrix3(); 
        
        orientation.set(
            1,0,0,
            0,1,0,
            0,0,1
        )

        const baseGeometry = treeBuilder.buildTree(lSystemString, {
            startRadius: 1,
            radiusReduction: 0.8,
            branchLength: 1.0,
            angle: angle + ((i + 3) / 10),
            orientation: orientation, 
            position: new THREE.Vector3(0,0,0)
        })

        const positions = baseGeometry.attributes.position.array;

        morphGeometry.morphAttributes.position.push(
            new THREE.Float32BufferAttribute(positions, 3)
        )

        const kft = new THREE.NumberKeyframeTrack(
            `.morphTargetInfluences[${i}]`,
            [i, i + 1],
            [0, 1]
        );

        keyFrames.push(kft);
    }

}

function createCopiesOfMesh(mesh, scene, position, mixers, clip) {

    const clone = mesh.clone();
    
    clone.position.set(position.x, position.y, position.z);

    scene.add(clone);

    const mixer = new THREE.AnimationMixer(clone);

    const action = mixer.clipAction(clip);

    action.setLoop(THREE.LoopPingPong);
    action.clampWhenFinished = false;
    action.play();  

    mixers.push(mixer);

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