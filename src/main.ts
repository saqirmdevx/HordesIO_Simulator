declare var Vue:any;

import Stats from "./stats.js";
import { Ranks } from "./ability.js";

import Simulation from "./simulation.js"

class Main {
    public vue:any;

    constructor() {
        this.initVue();
    }

    private initVue(): any {
        this.vue = new Vue({
            el: "#app",
            data: {
                stats: { mana: 0, manaregen: 0, defense: 0, block: 0, mindamage: 0, maxdamage: 0, critical: 0, haste: 0},
                skillPoints: 0,
                simulators: 1,
                combatLog: "",
                damage: { 
                    highest: 0,
                    lowest: 0,
                    average: 0,
                },
                dps: {
                    highest: 0,
                    lowest: 0,
                    average: 0
                },
                activeAuras: []
            },
            created: function() {
                /** Initialize stats values based on stats in our script (pre-made for future caching) */
                this.stats.mana = Stats.mana;
                this.stats.manaregen = Stats.type.manaregen;
                this.stats.defense = Stats.type.defense;
                this.stats.block = Stats.type.block;
                this.stats.mindamage = Stats.type.mindamage;
                this.stats.maxdamage = Stats.type.maxdamage;
                this.stats.haste = Stats.type.haste;
                this.stats.critical = Stats.type.critical;
            },
            methods: { 
                updateSkillPoints: (ability:any) => this.updateSkillPoint(ability),
                updateStats: (stat:any) => this.updateStats(stat),
                startSimulation: () => this.startSimulation(),
            },
            watch: {
                /** Limit is between 1 - 1000 */
                simulators: (val:number):void => { 
                    if (val > 1000) 
                        this.vue.simulators = 999;
                    if (val < 1)
                        this.vue.simulators = 1;
                }
            }
        });
    }

    /**
     * update SkillPoints calculator
     * @param output - Element with output data
     * @param id - Ability ID
     */
    public updateSkillPoint(ability:any):void {
        if (!ability.target)
            return;

        let element:any = ability.target;
        let value:number = element.value;
        let output:HTMLOutputElement = element.nextElementSibling;

        output.value = String(value); // Need change value to string since output is plain text not value type

        Ranks.set(element.dataset.id, element.value);
        this.vue.skillPoints = Ranks.spentPoints();
    }

    public updateStats(stat:any):void {
        if (!stat.target)
            return;
    
        let element:any = stat.target;
        let value:number = element.value;

        Stats.set(element.name, Number(value));
    }

    public startSimulation():void {
        Simulation.start(this.vue.simulators);
    }
}

export default new Main();