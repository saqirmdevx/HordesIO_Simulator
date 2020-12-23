import { Aura } from "./ability.js";
import Main from "./main.js";
import Player from "./player.js"
import { __updateTime } from "./placeholders.js"

export default class simulation {
    private static _isActive = false;
    private static _isStopped = false;
    public static playerList:Array<Player> = [];

    public static start(simulators:number):void {
        if (this._isActive) {
            // stop simulation
            this._isStopped = !this._isStopped;
            Main.vue.combatLog = this._isStopped ? "Combat is stopped\n"+ Main.vue.combatLog :
                                 "Continue combat\n"+ Main.vue.combatLog;
            return;
        }

        this._isActive = true;

        // reset combatlog
        Main.vue.combatLog = "";

        // reset damage counters
        Main.vue.damage.highest = 0;
        Main.vue.damage.lowest = 0;
        Main.vue.damage.average = 0;
        Main.vue.dps.highest = 0;
        Main.vue.dps.lowest = 0;
        Main.vue.dps.average = 0;

        // create players based on simulation
        if (simulators > 0 && simulators < 1000)
            for (let i = 0; i < simulators; i++)
                this.playerList[i] = new Player(i);

        Main.vue.combatLog = "Simulation starts";

        // run the loop
        this._loop();
    }

    public static tick = 0;
    public static timeElsaped = 0;
    private static _loop():void {
        if (this._isStopped) {
            setTimeout(() => this._loop(), __updateTime);
            return;
        }

        // Locked timestep
        let diff = __updateTime * 3;

        /** Call doUpdate for each player */
        this.playerList.forEach((player) => {
            player.doUpdate(diff, this.tick);
        });

        /** After 60 sec ends the simulation **/
        if (this.timeElsaped > 60000) {
            this._done();
            return;
        }
        if (this.tick % 5 == 0)
            this._updateDamage();

        this.tick++;
        this.timeElsaped += diff;

        setTimeout(() => this._loop(), __updateTime);
    }

    private static _done():void {
        Main.vue.combatLog = "Simulation ends..\n" + Main.vue.combatLog;
        this._updateDamage();

        // remove all players from list
        this.playerList.splice(0, this.playerList.length);

        this.timeElsaped = 0;
        this.tick = 0;
        this._isActive = false;
    }

    private static _updateDamage():void {
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

            damage.dpsHighest = Math.max(Math.floor(player.damageDone / (this.timeElsaped / 1000)), damage.dpsHighest);
            if (damage.dpsLowest == 0)
                damage.dpsLowest = Math.floor(player.damageDone / (this.timeElsaped / 1000));
            else
                damage.dpsLowest = Math.min(Math.floor(player.damageDone / (this.timeElsaped / 1000)), damage.dpsLowest);
        });

        // Update visible value of DPS/Damage on the page 
        Main.vue.damage.highest = damage.highest;
        Main.vue.damage.lowest = damage.lowest;
        Main.vue.damage.average = Math.floor(damage.total / this.playerList.length);

        Main.vue.dps.highest = damage.dpsHighest;
        Main.vue.dps.lowest = damage.dpsLowest;
        Main.vue.dps.average = Math.floor((damage.total / this.playerList.length) / (this.timeElsaped / 1000));

        Main.vue.activeAuras.splice(0, Main.vue.activeAuras.length);

        /** Update auras !move to another function later **/
        this.playerList[0]._activeAuras.forEach((aura:Aura, index:number) => {
            Main.vue.activeAuras[index] = {id: aura.id, duration: Math.floor(aura.duration / 1000)}
        });
    }
}