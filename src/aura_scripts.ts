import Aura, { auraEffect } from "./aura.js";
import Player from "./player.js";
import { abilityList } from "./ability.js";
import Simulation from "./simulation.js";
import { __random } from "./placeholders.js";

export class MageIceboltInstant extends Aura {
    constructor(effect:auraEffect, owner:Player) {
        super(effect, owner);
    }

    public onExpire():void {
        // Reset duration and apply next stack
        this.duration = 8000;
        this._stacks += this._stacks < this._maxStacks ? 1 : 0;
    }

    // this ability can have 0 stacks where this effect is not working
    public removeStack():void {
        if (this._stacks > 0)
            this._stacks -= 1;
    }
}

export class WarBulwark extends Aura {
    private _bonusDamage:Array<number> = [0, 0.04, 0.06, 0.08, 0.1, 0.12];
    private _duration:number = 8000;

    private _applyAura:abilityList = abilityList.WAR_BULWARK_AURA_DAMAGE;

    constructor(effect:auraEffect, owner:Player) {
        super(effect, owner);
    }

    // Apply interval
    private _applyInterval = 1000; // We simulate attack speed of enemies + targets 
    public doUpdate(diff:number, timeElsaped:number) {
        // Call baseclass doUpdate
        super.doUpdate(diff, timeElsaped);

        this._applyInterval -= diff
        if (this._applyInterval <= 0) {
            this._applyInterval = 1000;

            let applyStacks:number = 0;

            // count how much stack we apply (based on the block %)
            for (let i = 0; i < Simulation.targets; i++)
                if (Math.random() < (this.owner.blockStat))
                    applyStacks++;

            if (applyStacks > 0) {
                let bulwarkDamageAura:Aura|undefined = this.owner.getAuraById(this._applyAura);
                let stacks:number = bulwarkDamageAura && bulwarkDamageAura.getStacks() > 0 ? bulwarkDamageAura.getStacks() : 1;
        
                // apply Damage stack buff 
                let auraEffect:auraEffect = {
                    id: this._applyAura,
                    name: "Bulwark - Damage",
                    bonusStatsPercentage:  {
                        manaregen:0,
                        block: 0,
                        mindamage: this._bonusDamage[this.rank] * stacks, /** 0 Base damage we give only % */
                        maxdamage: this._bonusDamage[this.rank] * stacks, /** 0 Base damage we give only % */
                        critical:0,
                        haste:0,
                        attackSpeed:0
                    },
                    hasDamageEffect: false,
                    duration: this._duration,
                    rank: this.rank,
                    isStackable: true,
                    maxStacks: 8,
                    applyStacks: applyStacks
                }
                this.applyAura(auraEffect);
            }
        }
    }
}

export class ManaPotion extends Aura {
    private _manaRegen:Array<number> = [0, 100, 200, 300];

    constructor(effect:auraEffect, owner:Player) {
        super(effect, owner);
    }

    private _tickTime:number = 500;
    public doUpdate(diff:number, timeElsaped:number):void {
        super.doUpdate(diff, timeElsaped);

        this._tickTime -= diff;
        if (this._tickTime <= 0) {
            this.owner.regenerateMana(this._manaRegen[this.rank] / 30);
            this._tickTime = 500;
        }
    }
}