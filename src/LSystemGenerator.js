// LSystemGenerator.js
export class LSystemGenerator {

    constructor() {
        this.rules = new Map();
    }

    addRule(from, to) {
        this.rules.set(from, to);
    }

    clearRules() {
        this.rules.clear();
    }

    generate (axiom, iterations) {

        if (iterations === 0) {
            return axiom;
        }

        let newAxiom = '';
        for (let char of axiom) {
            newAxiom += this.rules.get(char) || char;
        }

        return this.generate(newAxiom, iterations - 1);

    }

}