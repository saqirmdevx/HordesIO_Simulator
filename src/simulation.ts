import Main from "./main.js";
import Player from "./player.js";
import APLData from "./apl_script.js";
import Enemy from "./enemy.js";

export default class Simulation {
    private static _isActive = false;
    public static playerList:Array<Player> = [];

    public static mitigation:number;
    public static targets:number;
    public static debug:boolean;
    //public static simulators:number;
    public static slowMotion:boolean;

    public static startTime:number;

    public static start(result:APLData):void {
        if (this._isActive)
            return;

        this._isActive = true;

        this.mitigation = result.mitigation > 0 ? result.mitigation : 0;
        this.targets = result.targets > 1 ? result.targets : 1;
        this.debug = result.debug ? result.debug : false;
        Main.vue.debug = result.debug ? result.debug : false;
        this.slowMotion = result.slowMotion ? result.slowMotion : false;

        if (!this.slowMotion)
            Main.vue.loading = true;

        Main.resetCombatLog(`[Mana: ${result.mana}, Mana Regen: ${result.stats.manaregen}, Block: ${result.stats.block}, Min damage: ${result.stats.mindamage}, Max damage: ${result.stats.maxdamage}, Haste: ${result.stats.haste}, Critical: ${result.stats.critical}]`);
        Main.addCombatLog(`Simulators: ${result.simulators}`, -1, true);
        Main.addCombatLog(`Targets: ${result.targets}`, -1, true);
        Main.addCombatLog(`Damage Mitigation: ${result.mitigation*100}%`, -1, true);
        Main.addCombatLog(`Slow motion: ${result.slowMotion}`, -1, true);
        Main.addCombatLog(`Simulation Time: ${result.simulationTime / 1000}s`, -1, true);
        Main.addCombatLog("Simulation starts");
        if (this.debug)
            Main.addCombatLog(`---------------------------------------`);

        // reset damage counters
        Main.resetVueData();

        // create players based on simulation
        if (result.simulators > 0)
            for (let i = 0; i < result.simulators; i++)
                this.playerList[i] = new Player(i, result.stats, result.mana, result.abilityList, result.abilityQueue, result.autoAttack);

        if (result.targets > 0)
            for (let i = 0; i < result.targets; i++)
                Enemy.list[i] = new Enemy(i, this.mitigation);

        this.startTime = Date.now();

        // Locked timestep
        let chunk:number = result.slowMotion ? 1 : 100;
        let updateTime:number = 100;
        let timeElsaped:number = 0;

        this._simulation(updateTime, timeElsaped, chunk, result.simulationTime, (resultTime:number) => {
            this._done(resultTime);
        });
    }

    private static _updateDmgTimmer:number = 1000;
    private static _simulation(updateTime:number, timeElsaped:number, chunk:number, simulationTime:number, callback:CallableFunction):void {
        let itr:number = 0;
        let [players, targets] = [this.playerList.length, Enemy.list.length]

        while (itr < chunk)
        {
            itr++;
            for (let i = 0; i < players; i++)
                this.playerList[i].doUpdate(updateTime, timeElsaped);

            for (let i = 0; i < targets; i++)
                Enemy.list[i].doUpdate(updateTime, timeElsaped);

            timeElsaped += updateTime;
            if (timeElsaped >= simulationTime) {
                callback(timeElsaped);
                return;
            }
        }
        /** Throttle slowmode Layout update */
        if (this.slowMotion && this.debug) {
            if (this._updateDmgTimmer <= updateTime){
                this._updateDamage(timeElsaped);
                this._updateDmgTimmer = 1000;
            }
            else
                this._updateDmgTimmer -= updateTime;
        }

        setTimeout(() => { this._simulation(updateTime, timeElsaped, (this.slowMotion ? chunk : chunk + 100), simulationTime, callback) }, (this.slowMotion ? 100 : 0));
    }

    private static _done(timeElsaped:number):void {
        Main.addCombatLog(`---------------------------------------`);
        Main.addCombatLog(`Simulation ends in ${Date.now() - this.startTime}ms\n`, timeElsaped);
        this._updateDamage(timeElsaped);

        // remove all players from list
        this.playerList.splice(0, this.playerList.length);
        Enemy.list.splice(0, Enemy.list.length);

        this._isActive = false;
        Main.vue.loading = false;
        if (!this.slowMotion) {
            Main.vue.combatLog = Main.combatLog;
            Main.combatLog = "";
        }
    }

    private static _updateDamage(timeElsaped:number):void {
        let damage:any = {
            highest: 0,
            lowest: 0,
            total: 0,
            dpsHighest: 0,
            dpsLowest: 0
        }

        this.playerList.forEach((player) => {
            damage.total += player.damageDone;
            damage.highest = Math.max(damage.highest, player.damageDone);

            if (damage.lowest == 0)
                damage.lowest = player.damageDone;
            else
                damage.lowest = Math.min(damage.lowest, player.damageDone);

            damage.dpsHighest = Math.max(Math.floor(player.damageDone / (timeElsaped / 1000)), damage.dpsHighest);
            if (damage.dpsLowest == 0)
                damage.dpsLowest = Math.floor(player.damageDone / (timeElsaped / 1000));
            else
                damage.dpsLowest = Math.min(Math.floor(player.damageDone / (timeElsaped / 1000)), damage.dpsLowest);
        });

        // Update visible value of DPS/Damage on the page 
        Main.vue.damage.highest = damage.highest;
        Main.vue.damage.lowest = damage.lowest;
        Main.vue.damage.average = Math.floor(damage.total / this.playerList.length);

        Main.vue.dps.highest = damage.dpsHighest;
        Main.vue.dps.lowest = damage.dpsLowest;
        Main.vue.dps.average = Math.floor((damage.total / this.playerList.length) / (timeElsaped / 1000));

        /** Update auras !move to another function later **/
        if (Simulation.debug)
            this.playerList[0]._activeAuras.forEach((aura:any, index:number) => {
                Main.vue.activeAuras[index] = {id: aura.id, name: aura.name, duration: Math.floor(aura.duration / 1000), stacks: aura.getStacks(), maxDuration: Math.floor(aura.maxDuration/1000)}
            });
    }
}