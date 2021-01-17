declare var Vue:any;

import Simulation from "./simulation.js";
import APLData from "./apl_script.js";

interface VueData  {
    combatLog: string,
    debug: boolean,
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
    maxMana: number,
    mana: number,
    loading: boolean,
    activeAuras: Array<Object>
}

class Main {
    public vue:VueData;
    public result:any;
    public combatLog:string = "";

    constructor() {
        /** Vue Data */
        this.vue = new Vue({
            el: "#app",
            data: {
                combatLog: "",
                debug: false,
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
                mana: 0,
                maxMana: 0,
                activeAuras: [],
            },
            methods: { 
                readAPLFile: (event:any) => this.readAPLFile(event),
                downloadExample: (event:any) => this.downloadExample(event),
                startSimulation: () => {
                    if (this.result) 
                        this.startSimulation(this.result) 
                }
            }
        });
    }

    public readAPLFile(event:any):void {
        const fileList = event.target.files;
    
        for (const file of fileList) {
            if (file.size > 2000)
                return;

            let reader = new FileReader();
            reader.addEventListener('load', (event:any) => {
                this.result = new APLData(event.target.result);
                this.resetVueData();

                this.resetCombatLog(`[Mana: ${this.result.mana}, Mana Regen: ${this.result.stats.manaregen}, Block: ${this.result.stats.block}, Min damage: ${this.result.stats.mindamage}, Max damage: ${this.result.stats.maxdamage}, Haste: ${this.result.stats.haste}, Critical: ${this.result.stats.critical}]`);
                this.addCombatLog(`Simulators: ${this.result.simulators}`, -1, true);
                this.addCombatLog(`Targets: ${this.result.targets}`, -1, true);
                this.addCombatLog(`Damage Mitigation: ${this.result.mitigation*100}%`, -1, true);
                this.addCombatLog(`Slow motion: ${this.result.slowMotion}`, -1, true);
                this.addCombatLog(`Simulation Time: ${this.result.simulationTime / 1000}s`, -1, true);
            });
            reader.readAsText(file);
        }
    }

    public downloadExample(event:any) {
        fetch("https://raw.githubusercontent.com/Quentis/HordesIO_Simulator/master/mage.siml")
        .then(resp => resp.blob())
        .then(blob => {
            const url:string = URL.createObjectURL(blob);
            const customElem:HTMLAnchorElement = document.createElement('a');
            const btn:HTMLButtonElement = document.querySelector("#downloadExample") as HTMLButtonElement;

            customElem.style.display = 'none';
            customElem.href = url;
            customElem.download = 'test-mage.siml';
            document.body.appendChild(customElem);
            customElem.click();
            window.URL.revokeObjectURL(url);

            btn.style.display = "none";
          })
          .catch(() => { throw new Error("Something went wrong...") });
    }

    public resetVueData():void {
        this.vue.damage.highest = 0;
        this.vue.damage.lowest = 0;
        this.vue.damage.average = 0;
        this.vue.dps.highest = 0;
        this.vue.dps.lowest = 0;
        this.vue.dps.average = 0;
        this.vue.activeAuras.splice(0, this.vue.activeAuras.length);
    }

    public startSimulation(result:APLData):void {
        Simulation.start(result);
    }

    public addCombatLog(text:string, time:number = -1, showInstant:boolean = false):void {
        if (showInstant || Simulation.slowMotion) {
            if (time >= 0)
                this.vue.combatLog = `[${time}ms] - ${text}\n` + this.combatLog;
            else
                this.vue.combatLog = `${text}\n` + this.combatLog;
        }

        if (time >= 0)
            this.combatLog = `[${time}ms] - ${text}\n` + this.combatLog;
        else
            this.combatLog = `${text}\n` + this.combatLog;
    }

    public resetCombatLog(text?:string):void {
        this.vue.combatLog = text ? text : "";
        this.combatLog = text ? text : "";
    }
}

export default new Main();