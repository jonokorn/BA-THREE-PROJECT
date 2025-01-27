// TreeBuilder.js
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export class TreeBuilder {
    constructor(scene) {
        this.scene = scene;
        this.treeGroup = new THREE.Group();
        this.combineMeshes = true;
        this.combinedTreeMesh = undefined;

        this.shaderMaterial = new THREE.ShaderMaterial({
            vertexShader: `

                #define PI 3.1415926535897932384626433832795; 

                uniform float time;
                uniform float speed;
                uniform float amplitude;
                uniform float baseThreshold;
                uniform float noiseValue;
                uniform bool useNoise;
                uniform bool moveCircular; // New uniform variable
        
                attribute float branchRadius;
                attribute float vertexYPosition;
        
                varying vec3 vNormal;
                varying vec3 vPosition;
        
                void main() {

                    // For the Fragment-Shader Normal-Coloring
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;


                    vec3 newPosition = position;
        
                    float swayFactor = vertexYPosition;
                    if (swayFactor < baseThreshold) {
                        swayFactor = 0.0;
                    }

                    // --- 

                    float swayX = 0.0;
                    float swayZ = 0.0; 
        
                    float adjustedTime = time * speed;
        
                    if (useNoise) {

                        float angle = adjustedTime + noiseValue * PI;
        
                        if (moveCircular) {
                            swayX = sin(angle) * amplitude * swayFactor;
                            swayZ = cos(angle) * amplitude * swayFactor;
                        } else {
                            swayX = sin(angle) * amplitude * swayFactor;
                        }
                    } else {
                        if (moveCircular) {
                            swayX = sin(adjustedTime) * amplitude * swayFactor;
                            swayZ = cos(adjustedTime) * amplitude * swayFactor;
                        } else {
                            swayX = sin(adjustedTime) * amplitude * swayFactor;
                        }
                    }
        
                    newPosition.x += swayX;
                    newPosition.z += swayZ;
        
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `,
        
            fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
        
            void main() {
                vec3 color = (vNormal + 1.0) * 0.5;
                gl_FragColor = vec4(color, 1.0);
            }
            `,
            side: THREE.FrontSide,
            uniforms: {
                time: { value: 0.0 },
                speed: { value: 1.0 },
                amplitude: { value: 0.025 },
                baseThreshold: { value: 0.0 },
                noiseValue: { value: 0.0 },
                useNoise: { value: true },
                moveCircular: { value: true }, 
            },
            vertexColors: true,
            wireframe: false,
        });
        
        this.leafMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a27,
            roughness: 0.7,
            metalness: 0.1
        });
    }

    clear() {
        if (this.combinedTreeMesh != undefined) {
            this.combinedTreeMesh.geometry.dispose();
            this.combinedTreeMesh.material.dispose();
            this.scene.remove(this.combinedTreeMesh);
            this.combinedTreeMesh = undefined;
        }
    }

    buildTree(lSystem, params) {
        this.clear();
        
        const state = {
            position: params.position,
            orientation: new THREE.Matrix3(),
            radius: params.startRadius,
            stateStack: []
        };

        // Initialize orientation
        state.orientation.set(
            1, 0, 0, // H
            0, 1, 0, // L
            0, 0, 1  // U
        );

        for (let char of lSystem) {
            switch(char) {
                case 'f':
                    this.createBranch(state, params);
                    break;
                case 'l':
                    this.createLeaf(state);
                    break;
                case '[':
                    state.stateStack.push({
                        position: state.position.clone(),
                        orientation: state.orientation.clone(),
                        radius: state.radius
                    });
                    break;
                case ']':
                    if (state.stateStack.length > 0) {
                        const savedState = state.stateStack.pop();
                        state.position = savedState.position;
                        state.orientation.copy(savedState.orientation);
                        state.radius = savedState.radius;
                    }
                    break;
                case '+':
                    this.rotate(state, params.angle, 'U');
                    break;
                case '-':
                    this.rotate(state, -params.angle, 'U');
                    break;
                case '^':
                    this.rotate(state, params.angle, 'L');
                    break;
                case 'v':
                    this.rotate(state, -params.angle, 'L');
                    break;
                case '<':
                    this.rotate(state, -params.angle, 'H');
                    break;
                case '>':
                    this.rotate(state, params.angle, 'H');
                    break;
            }
        }
        
        if (this.combineMeshes) {
            let mesh = this.combineMeshesIntoOne();
            this.combinedTreeMesh = mesh;
            //this.scene.add(mesh);
            return mesh;
        } else {
            this.scene.add(this.treeGroup);
        }
    }

    createBranch(state, params) {

        const height = params.branchLength;
        
        const geometry = new THREE.CylinderGeometry(
            state.radius * params.radiusReduction,
            state.radius,
            height,
            8
        );

        // Add branchRadius as a custom attribute to the vertices
        const branchRadius = new Float32Array(geometry.attributes.position.count);
        for (let i = 0; i < branchRadius.length; i++) {
            branchRadius[i] = state.radius; // Use the current radius of the branch
        }

        geometry.setAttribute(
            'branchRadius',
            new THREE.BufferAttribute(branchRadius, 1)
        );

        const branch = new THREE.Mesh(geometry, this.branchMaterial);
        
        const direction = new THREE.Vector3(0, height, 0).applyMatrix3(state.orientation);
        branch.position.copy(state.position).add(direction.clone().multiplyScalar(0.5));
        const up = new THREE.Vector3(0, 1, 0).applyMatrix3(state.orientation);
        
        branch.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            up
        );

        this.treeGroup.add(branch);
        state.position.add(direction);
        state.radius *= params.radiusReduction;
    }

    createLeaf(state) {
        const leafGeometry = new THREE.SphereGeometry(0.3, 8, 8);

        // Radius muss auch hier definiert werden, da alle Vertices die selbe Anzahl 
        // an Attributen haben müsse für die Kombinierung zu einem Mesh in combineMeshesIntoOne()
        const branchRadius = new Float32Array(leafGeometry.attributes.position.count);
        for (let i = 0; i < branchRadius.length; i++) {
            branchRadius[i] = state.radius; // Use the current radius of the branch
        }

        leafGeometry.setAttribute(
            'branchRadius',
            new THREE.BufferAttribute(branchRadius, 1)
        );

        const leaf = new THREE.Mesh(leafGeometry, this.leafMaterial);
        leaf.position.copy(state.position);
        this.treeGroup.add(leaf);
    }

    rotate(state, angle, axis) {
        const radians = THREE.MathUtils.degToRad(angle);
        let rotationMatrix;

        switch (axis) {
            case 'U':
                rotationMatrix = new THREE.Matrix3().set(
                    Math.cos(radians), Math.sin(radians), 0,
                    -Math.sin(radians), Math.cos(radians), 0,
                    0, 0, 1
                );
                break;
            case 'L':
                rotationMatrix = new THREE.Matrix3().set(
                    Math.cos(radians), 0, -Math.sin(radians),
                    0, 1, 0,
                    Math.sin(radians), 0, Math.cos(radians)
                );
                break;
            case 'H':
                rotationMatrix = new THREE.Matrix3().set(
                    1, 0, 0,
                    0, Math.cos(radians), -Math.sin(radians),
                    0, Math.sin(radians), Math.cos(radians)
                );
                break;
        }

        state.orientation.multiply(rotationMatrix);
    }

    combineMeshesIntoOne() {
        this.treeGroup.updateMatrixWorld(true);
        let geometries = []

        this.treeGroup.children.forEach(child => {
            if (child.isMesh) {
                const geometry = child.geometry.clone();
                geometry.applyMatrix4(child.matrixWorld);
                geometries.push(geometry);
            }
        });
        
        let mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, true);

        const vertexYPosition = [];
        for (let i = 0; i < mergedGeometry.attributes.position.count; i++) {
            const vertexY = mergedGeometry.attributes.position.getY(i);
            vertexYPosition.push(vertexY);
        }
        mergedGeometry.setAttribute('vertexYPosition', new THREE.BufferAttribute(new Float32Array(vertexYPosition), 1));

        return new THREE.Mesh(mergedGeometry, this.shaderMaterial);
    }
}