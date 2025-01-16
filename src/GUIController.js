import * as dat from 'dat.gui';
import * as THREE from "three";

export class GUIController {
    constructor(lSystemGenerator, treeBuilder, initialParams, scene) {
        this.gui = new dat.GUI();
        this.lSystemGenerator = lSystemGenerator;
        this.treeBuilder = treeBuilder;
        this.scene = scene;

        this.presets = {
            "Default": {
                axiom: 'fffffA',
                ruleA: '^fB+^^B+vvB<<<<B',
                ruleB: '[^^ff--A]',
                ruleC: '',
                ruleD: '',
            },
            "Preset 1": {
                axiom: 'fA',
                ruleA: 'f[^Bl]>>[^Bl]>>A',
                ruleB: 'f[-Bl]B',
                ruleC: '',
                ruleD: '',
            },
            "Preset 2": {
                axiom: 'B',
                ruleA: 'f[^B][-B]B',
                ruleB: 'f[+B]F',
                ruleC: '',
                ruleD: '',
            },
            "Preset 3": {
                axiom: 'AB',
                ruleA: 'f[+B]A',
                ruleB: 'f[-A]B',
                ruleC: '',
                ruleD: '',
            }
        };

        this.params = {
            // Tree geometry parameters
            startRadius: initialParams.startRadius || 1,
            radiusReduction: initialParams.radiusReduction || 0.8,
            branchLength: initialParams.branchLength || 1.0,
            angle: initialParams.angle || 10,

            // L-System parameters
            axiom: 'fffffA',
            iterations: 6,

            // Production rules
            ruleA: '^fB+^^B+vvB<<<<B',
            ruleB: '[^^ff--A]',
            ruleC: '',
            ruleD: '',

            // Animation settings
            animated: false,
            animationDelay: 200, // milliseconds between iterations

            // Auto-update control
            autoUpdate: false,

            // Selected preset
            preset: "Default",

            // Functions
            regenerate: () => this.regenerateTree(),
            removeTree: () => this.removeTree(),
            logMeshCount: () => this.logMeshCount(),
        };

        this.setupGUI();

        // Initial tree render
        this.regenerateTree();
    }

    setupGUI() {
        // Settings folder
        const settingsFolder = this.gui.addFolder('Settings');
        settingsFolder.add(this.params, 'autoUpdate').name('Auto Update');
        settingsFolder.add(this.params, 'animated').name('Animated Growth');
        settingsFolder.add(this.params, 'animationDelay', 100, 2000).name('Animation Delay (ms)');
        settingsFolder.open();

        // Tree Parameters folder
        const treeFolder = this.gui.addFolder('Tree Parameters');
        treeFolder.add(this.params, 'startRadius', 0.1, 2).onChange(() => this.handleParamChange());
        treeFolder.add(this.params, 'radiusReduction', 0.1, 1).onChange(() => this.handleParamChange());
        treeFolder.add(this.params, 'branchLength', 0.1, 2).onChange(() => this.handleParamChange());
        treeFolder.add(this.params, 'angle', 1, 90).onChange(() => this.handleParamChange());
        treeFolder.open();

        // L-System Parameters folder
        const lSystemFolder = this.gui.addFolder('L-System Parameters');
        lSystemFolder.add(this.params, 'axiom').onChange(() => this.handleParamChange());
        lSystemFolder.add(this.params, 'iterations', 1, 10, 1).onChange(() => this.handleParamChange());
        lSystemFolder.open();

        // Production Rules folder
        const rulesFolder = this.gui.addFolder('Production Rules');
        rulesFolder.add(this.params, 'ruleA').name('A →').onChange(() => this.handleParamChange());
        rulesFolder.add(this.params, 'ruleB').name('B →').onChange(() => this.handleParamChange());
        rulesFolder.add(this.params, 'ruleC').name('C →').onChange(() => this.handleParamChange());
        rulesFolder.add(this.params, 'ruleD').name('D →').onChange(() => this.handleParamChange());
        rulesFolder.open();

        // Presets folder
        const presetOptions = Object.keys(this.presets);
        this.gui.add(this.params, 'preset', presetOptions).name('Preset').onChange(() => this.applyPreset());

        // Add regenerate button
        this.gui.add(this.params, 'regenerate').name('Re-Render Tree');

        // Add remove tree button
        this.gui.add(this.params, 'removeTree').name('Delete Tree');

        // Add button to log the number of meshes
        this.gui.add(this.params, 'logMeshCount').name("Log Mesh Count");
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

    handleParamChange() {
        if (this.params.autoUpdate) {
            this.updateTree();
        }
    }

    async updateTree() {
        this.treeBuilder.clear();
        this.lSystemGenerator.clearRules();
        this.lSystemGenerator.addRule('A', this.params.ruleA);
        this.lSystemGenerator.addRule('B', this.params.ruleB);
        this.lSystemGenerator.addRule('C', this.params.ruleC);
        this.lSystemGenerator.addRule('D', this.params.ruleD);

        if (this.params.animated) {
            let currentAxiom = this.params.axiom;

            for (let i = 0; i <= this.params.iterations; i++) {
                const treeParams = {
                    startRadius: this.params.startRadius,
                    radiusReduction: this.params.radiusReduction,
                    branchLength: this.params.branchLength,
                    angle: this.params.angle,
                };

                this.treeBuilder.buildTree(currentAxiom, treeParams);

                if (i < this.params.iterations) {
                    currentAxiom = this.lSystemGenerator.generate(currentAxiom, 1);
                    await new Promise(resolve => setTimeout(resolve, this.params.animationDelay));
                }
            }
        } else {
            const lSystemString = this.lSystemGenerator.generate(
                this.params.axiom,
                this.params.iterations
            );

            const treeParams = {
                startRadius: this.params.startRadius,
                radiusReduction: this.params.radiusReduction,
                branchLength: this.params.branchLength,
                angle: this.params.angle,
            };

            this.treeBuilder.buildTree(lSystemString, treeParams);
        }
    }

    regenerateTree() {
        this.updateTree();
    }

    removeTree() {
        this.treeBuilder.clear();
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
}