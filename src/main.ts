declare var Vue:any;

import Stats from "./stats.js";
import { Ranks } from "./ability.js";

import Simulation from "./simulation.js"

interface VueData  {
    stats: { mana: number, manaregen: number, defense: number, block: number, mindamage: number, maxdamage: number, critical: number, haste: number},
    skillPoints: number,
    simulators: number,
    targets: number,
    combatLog: string,
    debugText: boolean,
    damage: { 
        highest: number,
        lowest: number,
        average: number,
    },
    dps: {
        highest: number,
        lowest: number,
        average: number
    },
    loading: boolean,
    activeAuras: Array<Object>
}

class Main {
    public vue:VueData;

    constructor() {
        /** Vue Data */
        this.vue = new Vue({
            el: "#app",
            data: {
                stats: { mana: 0, manaregen: 0, defense: 0, block: 0, mindamage: 0, maxdamage: 0, critical: 0, haste: 0},
                skillPoints: 0,
                simulators: 1,
                targets: 1,
                combatLog: "",
                debugText: true,
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
                loading: false,
                activeAuras: [],
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
                    if (val > 500) 
                        this.vue.simulators = 500;
                    if (val < 1)
                        this.vue.simulators = 1;
                },
                targets: (val:number):void => { 
                    if (val > 20) 
                        this.vue.targets = 20;
                    if (val < 1)
                        this.vue.targets = 1;
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
        
        Ranks.set(element.dataset.id, value);
        this.vue.skillPoints = Ranks.spentPoints();
    }

    public updateStats(stat:any):void {
        if (!stat.target)
            return;
    
        let element:any = stat.target;
        let value:number = element.value;

        // min damage can be higher than
        if (Number(this.vue.stats.mindamage) > Number(this.vue.stats.maxdamage))
            this.vue.stats.mindamage = this.vue.stats.maxdamage;

        Stats.set(element.name, Number(value));
    }

    public startSimulation():void {
        Simulation.start(this.vue.simulators);
    }

    public addCombatLog(text:string, time:number):void {
        this.vue.combatLog = `[${time}ms] - ${text}\n` + this.vue.combatLog;
    }

    public resetCombatLog(text?:string):void {
        this.vue.combatLog = text ? text : "";
    }
}

export default new Main();