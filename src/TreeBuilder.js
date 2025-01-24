// TreeBuilder.js
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export class TreeBuilder {
    constructor(scene) {
        this.scene = scene;
        this.treeGroup = new THREE.Group();
        this.combineMeshes = true;
        this.finalTreeMesh = undefined;

        //this.branchMaterial = new THREE.MeshNormalMaterial();
        this.branchMaterial = new THREE.MeshPhongMaterial({
            color: 'white', 
            wireframe: true
        })

        this.leafMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a27,
            roughness: 0.7,
            metalness: 0.1
        });
    }

    clear() {

        console.log("Clear");

        if(this.combineMeshes && this.finalTreeMesh != undefined){
            this.finalTreeMesh.geometry.dispose();
            this.finalTreeMesh.material.dispose();
            this.scene.remove(this.finalTreeMesh)
            this.finalTreeMesh = undefined;
        } else {
            while (this.treeGroup.children.length > 0) {
                const object = this.treeGroup.children[0];
                object.geometry.dispose();
                object.material.dispose();
                this.treeGroup.remove(object);
            }
        }
    }

    buildTree(lSystem, params) {

        console.log(lSystem)
        console.log(params)

        this.clear();

        const state = {
            position: new THREE.Vector3(0, 0, 0),
            orientation: new THREE.Matrix3(),
            radius: params.startRadius,
            stateStack: []
        };

        state.orientation.set(
            1, 0, 0, // H
            0, 1, 0, // L
            0, 0, 1  // U
        );

        for (let char of lSystem) {
            switch (char) {
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
                        state.position.copy(savedState.position);
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
            let geometry = this.combineGeometriesIntoOne();
            return geometry;
            // this.finalTreeMesh = mesh;
            // this.scene.add(mesh);
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

        const branch = new THREE.Mesh(geometry, this.branchMaterial);

        // Transformation der Position
        const direction = new THREE.Vector3(0, height / 2, 0)
            .applyMatrix3(state.orientation);

        branch.position.copy(state.position.clone().add(direction));

        // Rotation des Branches
        const quaternion = new THREE.Quaternion();
        quaternion.setFromRotationMatrix(new THREE.Matrix4().setFromMatrix3(state.orientation));
        branch.quaternion.copy(quaternion);

        this.treeGroup.add(branch);

        // Update der Turtle-Position
        state.position.add(new THREE.Vector3(0, height, 0).applyMatrix3(state.orientation));
        state.radius *= params.radiusReduction;
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

    combineGeometriesIntoOne(){
        this.treeGroup.updateMatrixWorld(true);
        let geometries = [];
        this.treeGroup.children.forEach((child) => {
            if (child.isMesh) {
                const geometry = child.geometry.clone();
                geometry.applyMatrix4(child.matrixWorld);
                geometries.push(geometry);
            }
        });
        let mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, true);
        return mergedGeometry;
    }

    combineMeshesIntoOne() {
        this.treeGroup.updateMatrixWorld(true);
        let geometries = [];

        this.treeGroup.children.forEach((child) => {
            if (child.isMesh) {
                const geometry = child.geometry.clone();
                geometry.applyMatrix4(child.matrixWorld);
                geometries.push(geometry);
            }
        });

        let mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, true);

        let combinedTreeMesh = new THREE.Mesh(mergedGeometry, this.branchMaterial);

        return combinedTreeMesh;
    }
}