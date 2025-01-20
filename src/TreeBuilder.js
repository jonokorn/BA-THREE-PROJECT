import * as THREE from 'three';

export class TreeBuilder {
    constructor(scene) {
        this.scene = scene;

        this.treeGroup = new THREE.Group();
        this.scene.add(this.treeGroup);

        this.branchMaterial = new THREE.MeshNormalMaterial();

        this.leafMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a27,
            roughness: 0.7,
            metalness: 0.1
        });

        this.bones = [];
        this.animationClock = new THREE.Clock();
    }

    clear() {
        while (this.treeGroup.children.length > 0) {
            const object = this.treeGroup.children[0];

            if (object instanceof THREE.Mesh) {
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            }

            if (object instanceof THREE.SkeletonHelper) {
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            }

            this.treeGroup.remove(object);
        }
        this.bones = [];
    }

    buildTree(lSystem, params) {
        // Clear previous tree
        this.clear();

        const bones = [];
        const vertices = [];
        const indices = [];
        const skinIndices = [];
        const skinWeights = [];

        // Create the root bone
        const rootBone = new THREE.Bone();
        rootBone.position.set(0, 0, 0);
        bones.push(rootBone);

        // State to track tree-building
        const state = {
            position: new THREE.Vector3(0, 0, 0),
            orientation: new THREE.Matrix3(),
            radius: params.startRadius,
            stateStack: [],
            parentBone: rootBone
        };

        state.orientation.set(
            1, 0, 0, // H
            0, 1, 0, // L
            0, 0, 1  // U
        );

        let vertexOffset = 0;

        for (let char of lSystem) {
            switch (char) {
                case 'f':
                    const newBone = this.createBranch(
                        state,
                        params,
                        bones,
                        vertices,
                        indices,
                        skinIndices,
                        skinWeights,
                        vertexOffset
                    );
                    vertexOffset = vertices.length / 3;
                    state.parentBone = newBone;
                    break;

                case 'l':
                    this.createLeaf(state);
                    break;
                case '[':
                    state.stateStack.push({
                        position: state.position.clone(),
                        orientation: state.orientation.clone(),
                        radius: state.radius,
                        parentBone: state.parentBone
                    });
                    break;
                case ']':
                    if (state.stateStack.length > 0) {
                        const savedState = state.stateStack.pop();
                        state.position.copy(savedState.position);
                        state.orientation.copy(savedState.orientation);
                        state.radius = savedState.radius;
                        state.parentBone = savedState.parentBone;
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

        const geometry = this.createSkinnedGeometry(vertices, indices, skinIndices, skinWeights);
        const skinnedMesh = this.createSkinnedMesh(geometry, bones);
        this.treeGroup.add(skinnedMesh);
        this.bones = bones;
    }

    createBranch(state, params, bones, vertices, indices, skinIndices, skinWeights, vertexOffset) {
        
        const height = params.branchLength;
        const segments = 8; // Cylinder Segmente
        const baseRadius = state.radius;
        const topRadius = baseRadius * params.radiusReduction;

        const newBone = new THREE.Bone();
        const direction = new THREE.Vector3(0, height, 0).applyMatrix3(state.orientation);
        newBone.position.copy(direction);
        state.parentBone.add(newBone);
        bones.push(newBone);

        const baseCenter = state.position.clone();
        const topCenter = baseCenter.clone().add(direction);
        state.position.copy(topCenter);

        // Add vertices for the Cylinder
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;

            // Bottom
            const xBase = Math.cos(angle) * baseRadius;
            const zBase = Math.sin(angle) * baseRadius;
            const baseVertex = new THREE.Vector3(xBase, 0, zBase).applyMatrix3(state.orientation).add(baseCenter);
            vertices.push(baseVertex.x, baseVertex.y, baseVertex.z);

            // Top
            const xTop = Math.cos(angle) * topRadius;
            const zTop = Math.sin(angle) * topRadius;
            const topVertex = new THREE.Vector3(xTop, height, zTop).applyMatrix3(state.orientation).add(baseCenter);
            vertices.push(topVertex.x, topVertex.y, topVertex.z);
        }

        // Add indices for the faces of the cylinder
        for (let i = 0; i < segments; i++) {
            const baseIndex = vertexOffset + i * 2;
            const nextBaseIndex = vertexOffset + ((i + 1) % segments) * 2;
            indices.push(baseIndex, baseIndex + 1, nextBaseIndex + 1);
            indices.push(baseIndex, nextBaseIndex + 1, nextBaseIndex);
        }

        // Skin-Weights and Skin-Indices
        for (let i = 0; i <= segments; i++) {

            // All Vertices influenced only by the current Bone, other variations caused weird Artefacts
            skinIndices.push(bones.length - 2, bones.length - 1, 0, 0);
            skinWeights.push(0, 1.0, 0, 0);

            skinIndices.push(bones.length - 2, bones.length - 1, 0, 0);
            skinWeights.push(0, 1.0, 0, 0);
        }

        state.radius *= params.radiusReduction;

        return newBone;
    }

    createLeaf(state) {
        const leafGeometry = new THREE.SphereGeometry(0.3, 8, 8);
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

    createSkinnedGeometry(vertices, indices, skinIndices, skinWeights) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
        geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
        geometry.computeVertexNormals();
        return geometry;
    }

    createSkinnedMesh(geometry, bones) {
        const skeleton = new THREE.Skeleton(bones);
        const skinnedMesh = new THREE.SkinnedMesh(geometry, this.branchMaterial);

        // Bind Skeleton to Mesh 
        skinnedMesh.add(bones[0]);
        skinnedMesh.bind(skeleton);

        // Skeleton-Helper
        const skeletonHelper = new THREE.SkeletonHelper(skinnedMesh);
        this.treeGroup.add(skeletonHelper);
        skinnedMesh.visible = true; 

        return skinnedMesh;
    }

    showMesh() {
        this.treeGroup.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.visible = true;
            }
            if (object instanceof THREE.SkeletonHelper) {
                object.visible = false;
            }
        });
    }

    showSkeleton() {
        this.treeGroup.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.visible = false;
            }
            if (object instanceof THREE.SkeletonHelper) {
                object.visible = true;
            }
        });
    }

    animateTree(windDirection = new THREE.Vector3(1, 0, 0), windStrength = 1.0) {
        
        const time = this.animationClock.getElapsedTime();

        const sway = Math.sin(time * 0.5) * windStrength;

        this.bones.forEach((bone, index) => {
            if (index === 0) return;  // Skips the Root-Bone

            const branchProgress = index / this.bones.length;

            const swayAmplitude = sway * (1 + branchProgress);

            const swayDelay = index * 0.1;

            const swayX = windDirection.x * swayAmplitude * Math.sin(time + swayDelay);
            const swayZ = windDirection.z * swayAmplitude * Math.sin(time + swayDelay);

            bone.rotation.x = swayX;
            bone.rotation.z = swayZ;
        });
    }
}