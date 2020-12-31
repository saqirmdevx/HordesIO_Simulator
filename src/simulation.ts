import Main from "./main.js";
import Player from "./player.js"

export default class Simulation {
    private static _isActive = false;
    public static playerList:Array<Player> = [];

    public static startTime:number;

    public static start(simulators:number):void {
        if (this._isActive)
            return;

        this._isActive = true;
        Main.vue.loading = true;

        Main.resetCombatLog("Simulation starts");

        // reset damage counters
        Main.vue.damage.highest = 0;
        Main.vue.damage.lowest = 0;
        Main.vue.damage.average = 0;
        Main.vue.dps.highest = 0;
        Main.vue.dps.lowest = 0;
        Main.vue.dps.average = 0;

        // create players based on simulation
        if (simulators > 0 && simulators <= 500)
            for (let i = 0; i < simulators; i++)
                this.playerList[i] = new Player(i);

        this.startTime = Date.now();

        // Locked timestep
        let chunk:number = 1;
        let updateTime:number = 100;
        let timeElsaped:number = 0;

        this._simulation(updateTime, timeElsaped, chunk, (resultTime:number) => {
            this._done(resultTime);
        });
    }

    private static _simulation(updateTime:number, timeElsaped:number, chunk:number, callback:CallableFunction):void {
        let itr:number = 0;
        while (itr < chunk)
        {
            itr++;
            for (let i = 0; i < this.playerList.length; i++)
                this.playerList[i].doUpdate(updateTime, timeElsaped);

            timeElsaped += updateTime;
            if (timeElsaped >= 300000) {
                callback(timeElsaped);
                return;
            }
        }

        this._updateDamage(timeElsaped);
        setTimeout(() => { this._simulation(updateTime, timeElsaped, chunk+0, callback) }, 50);
    }

    private static _done(timeElsaped:number):void {
        Main.addCombatLog(`Simulation ends in ${Date.now() - this.startTime}ms\n`, timeElsaped);
        this._updateDamage(timeElsaped);

        // remove all players from list
        this.playerList.splice(0, this.playerList.length);

        this._isActive = false;
        Main.vue.loading = false;
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
        this.playerList[0]._activeAuras.forEach((aura:any, index:number) => {
            Main.vue.activeAuras[index] = {id: aura.id, duration: Math.floor(aura.duration / 1000), stacks: aura.getStacks()}
        });
    }
}