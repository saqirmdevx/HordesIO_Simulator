import {abilityList } from "./ability.js"
import Enemy from "./enemy.js";
import { __calcHasteBonus } from "./misc.js";
import Player, { statTypes } from "./player.js";

export interface auraEffect {
    id: abilityList,
    name: string,
    bonusStats?: statTypes,
    bonusStatsPercentage?: statTypes,
    damageEffect?: auraDamageEffect,
    hasDamageEffect: boolean,
    duration: number,
    isStackable?: boolean,
    applyStacks?: number,
    maxStacks?: number,
    script?: any,
    rank: number
}

export interface auraDamageEffect {
    baseDamage: number,
    bonusDamage: number,
    tickIndex: number,
    triggeredDamage?: boolean
}

export default class Aura {
    public id:number;
    public duration:number = 0;
    public maxDuration:number = 0;
    public owner:Player;
    public rank:number = 1;
    protected _effect:auraEffect = {     
        id: 0,
        name: "",
        hasDamageEffect: false,
        duration: 0,
        rank: 1
    };

    public name:string;

    public tickTime:number = 0;

    protected _stacks:number = 1;
    protected _isStackable:boolean = false;
    protected _maxStacks:number = 1;

    public toRemove:boolean = false;
    public isPassive:boolean = false; /** passive auras */

    public damageDeal:number = 0;

    public bonusStats:statTypes = {
        manaregen: 0,
        block: 0,
        mindamage: 0,
        maxdamage: 0,
        critical: 0,
        haste: 0,
        attackSpeed: 0
    };

    public bonusStatsPercentage:statTypes = {
        manaregen: 0,
        block: 0,
        mindamage: 0,
        maxdamage: 0,
        critical: 0,
        haste: 0,
        attackSpeed: 0
    };

    constructor(effect:auraEffect, owner:Player) {
        this.id = effect.id;
        this.owner = owner;
        this._isStackable = effect.isStackable ? effect.isStackable : false;
        this._maxStacks = effect.maxStacks ? effect.maxStacks : 1;
        this._stacks = effect.applyStacks ? effect.applyStacks : 1;
        this.name = effect.name;

        if (effect.damageEffect)
            this.tickTime = Math.round(__calcHasteBonus(effect.damageEffect.tickIndex * 10, this.owner.hasteStat)) * 100;

        this.onApply(effect);
    }

    public doUpdate(diff:number, timeElsaped:number, carrier?:Enemy):void {
        if (this.isPassive) return;

        this.duration -= diff;

        if (this.duration < diff)
            this.expire();

        if (this.tickTime > 0)
            this.tickTime -= diff;

        if (this.tickTime < diff) {
            if (this._effect.damageEffect && carrier)
                this.dealDamage(carrier, this._effect.damageEffect, timeElsaped)
        }
    }

    public dealDamage(carrier:Enemy, damageEffect:auraDamageEffect, timeElsaped:number, modifier:number = 1, critModifier:number = 0):void {
        // resetTick timer
        this.tickTime = Math.round(__calcHasteBonus(damageEffect.tickIndex * 10, this.owner.hasteStat)) * 100;

        let critChance:number = this.owner.criticalStat + critModifier;
        let isCrit:boolean = false;

        if (Math.random() < critChance) {
            this.onCrit();
            isCrit = true;
        }

        this.owner.dealDamage(carrier, this.damageDeal, {isCrit: isCrit, timeElsaped: timeElsaped, name: this.name}, modifier, true);
    }

    /** If aura exists we apply aura and refresh uration */
    public reapply(effect:auraEffect) {
        // reset Stats
        this.onReset();

        if (this._isStackable && this._stacks < this._maxStacks)
            this._stacks += (effect.applyStacks ? effect.applyStacks : 1);

        this.onApply(effect);
    }

    protected onApply(effect:auraEffect):void {
        // refresh duration
        this.duration = effect.duration > 0 ? effect.duration : -1;
        this.maxDuration = this.duration;

        if (this.duration == -1) 
            this.isPassive = true;

        // Stacks cant be higher than limit
        if (this._stacks > this._maxStacks)
            this._stacks = this._maxStacks;

        if (effect.bonusStats || effect.bonusStatsPercentage) {
            for (const stat in this.bonusStats) {
                if (effect.bonusStats ) {
                    this.bonusStats[stat] = effect.bonusStats[stat];
                    this.owner.addBonusStat(stat, effect.bonusStats[stat]);
                }

                if (effect.bonusStatsPercentage && effect.bonusStatsPercentage[stat] > 0) {
                    this.bonusStatsPercentage[stat] = effect.bonusStatsPercentage[stat];
                    this.owner.addBonusStat(stat, effect.bonusStatsPercentage[stat], true);
                }
            }
        }

        if (effect.damageEffect) {
            if (effect.damageEffect.triggeredDamage)
                this.damageDeal = effect.damageEffect.bonusDamage * this._stacks;
            else
                this.damageDeal = ((this.owner.mindamageStat + this.owner.maxdamageStat) / 2 * effect.damageEffect.bonusDamage / 100) * this._stacks;
        }

        // update Effect
        this._effect = effect;
        this.rank = effect.rank;
    }

    protected onReset():void {
        // reset bonus stats
        if (this._effect.bonusStats || this._effect.bonusStatsPercentage)
            for (const stat in this.bonusStats) {
                if (this.bonusStats[stat] > 0)
                    this.owner.removeBonusStat(stat, this.bonusStats[stat])

                if (this.bonusStatsPercentage[stat] > 0)
                    this.owner.removeBonusStat(stat, this.bonusStatsPercentage[stat], true)
            }
    }

    public expire():void {
        this.onRemove();
    }

    public onRemove():void {
        this.onReset();
        this.toRemove = true;
    }

    public removeStack():void {
        if (this._stacks > 1)
            this._stacks -= 1;
        else
            this.onRemove();
    }

    public getEffect():auraEffect {
        return this._effect;
    }

    public getStacks():number {
        return this._stacks;
    }

    /** Hooks */
    public applyAura(target:Enemy|Player, effect:auraEffect):void {
        target.applyAura(effect, this.owner);
    }

    public onCrit():void {
        return;
    }
}