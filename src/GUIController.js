import * as dat from 'dat.gui';
import * as THREE from "three";
import lSystemPresets from './data/LSystemPresets';

export class GUIController {
    constructor(lSystemGenerator, treeBuilder, scene) {

        this.gui              = new dat.GUI();
        this.lSystemGenerator = lSystemGenerator;
        this.treeBuilder      = treeBuilder;
        this.scene            = scene;
        this.presets          = lSystemPresets;

        this.params = {

            // Tree geometry parameters
            startRadius    : 1,
            radiusReduction: 0.8,
            branchLength   : 1.0,
            angle          : 10,

            // L-System parameters
            axiom     : 'fffffA',
            iterations: 6,

            // Production rules
            ruleA: '^fB+^^B+vvB<<<<B',
            ruleB: '[^^ff--A]',
            ruleC: '',
            ruleD: '',

            // Selected preset
            preset: "Default",

            // Functions
            logMeshCount: () => this.logMeshCount(),
            removeAllObjectsFromScene: () => this.removeAllObjectsFromScene(),
        };

        this.setupGUI();

    }

    setupGUI() {
        // Settings folder
        const settingsFolder = this.gui.addFolder('Settings');
        //settingsFolder.open();

        // Tree Parameters folder
        const treeFolder = this.gui.addFolder('Tree Parameters');
        treeFolder.add(this.params, 'startRadius', 0.1, 2);
        treeFolder.add(this.params, 'radiusReduction', 0.1, 1);
        treeFolder.add(this.params, 'branchLength', 0.1, 2);
        treeFolder.add(this.params, 'angle', 1, 90);
        //treeFolder.open();

        // L-System Parameters folder
        const lSystemFolder = this.gui.addFolder('L-System Parameters');
        lSystemFolder.add(this.params, 'axiom');
        lSystemFolder.add(this.params, 'iterations', 1, 10, 1);
        //lSystemFolder.open();

        // Production Rules folder
        const rulesFolder = this.gui.addFolder('Production Rules');
        rulesFolder.add(this.params, 'ruleA').name('A →');
        rulesFolder.add(this.params, 'ruleB').name('B →');
        rulesFolder.add(this.params, 'ruleC').name('C →');
        rulesFolder.add(this.params, 'ruleD').name('D →');
        //rulesFolder.open();

        // Presets folder
        const presetOptions = Object.keys(this.presets);
        this.gui.add(this.params, 'preset', presetOptions).name('Preset').onChange(() => this.applyPreset());

        // Add button to log the number of meshes
        this.gui.add(this.params, 'logMeshCount').name("Log Mesh Count");

        // Add button to remove all objects from scene
        this.gui.add(this.params, 'removeAllObjectsFromScene').name("Clear Scene");
    }

    applyPreset() {
        const selectedPreset = this.presets[this.params.preset];
        if (selectedPreset) {
            this.params.axiom = selectedPreset.axiom;
            this.params.ruleA = selectedPreset.ruleA;
            this.params.ruleB = selectedPreset.ruleB;
            this.params.ruleC = selectedPreset.ruleC;
            this.params.ruleD = selectedPreset.ruleD;
            this.handleParamChange();
        }

        this.gui.updateDisplay();
    }

    logMeshCount() {
        let meshCount = 0;

        this.scene.traverse(function (obj) {
            if (obj instanceof THREE.Mesh) {
                meshCount++;
            }
        });
        console.log("Meshes in the scene: " + meshCount);
    }

    removeAllObjectsFromScene() {
        this.treeBuilder.removeAllObjectsFromScene()
    }
}