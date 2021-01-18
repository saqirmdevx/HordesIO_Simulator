import {abilityList } from "./ability.js"
import Simulation from "./simulation.js";
import { Placeholders, __calcHasteBonus } from "./placeholders.js";
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
    isAoe?: boolean,
    maxTargets?: number,
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
            this.tickTime = __calcHasteBonus(effect.damageEffect.tickIndex * 1000, (this.owner.hasteStat))

        this.onApply(effect);
    }

    public doUpdate(diff:number, timeElsaped:number):void {
        if (this.isPassive) return;

        this.duration -= diff;

        if (this.duration <= 0)
            this.onExpire();

        if (this.tickTime > 0)
            this.tickTime -= diff;

        if (this.tickTime <= 0) {
            if (this._effect.damageEffect)
                this.dealDamage(this._effect.damageEffect, timeElsaped)
        }
    }

    public dealDamage(damageEffect:auraDamageEffect, timeElsaped:number, modifier:number = 1, critModifier:number = 0):void {
        let baseDamage:number = damageEffect.baseDamage * this._stacks;
        let bonusDamage:number = damageEffect.bonusDamage * this._stacks;
        // resetTick timer
        this.tickTime = Math.round(__calcHasteBonus(damageEffect.tickIndex * 10, this.owner.hasteStat)) * 100;

        let critChance:number = this.owner.criticalStat + this.owner.criticalStat + critModifier;

        if (damageEffect.isAoe) {
            let maxTargets = damageEffect.maxTargets ? damageEffect.maxTargets : 20;
            let targets:number = Simulation.targets > maxTargets ? maxTargets : Simulation.targets;
            for (let i = 0; i < targets; i++) {
                let tempMod = modifier;
                if (Math.random() < critChance)
                    tempMod *= this.onCrit();

                this.owner.dealDamage(baseDamage, bonusDamage, tempMod, {timeElsaped: timeElsaped, name: this.name}, true);
            }
            return;
        }

        if (Math.random() < critChance)
            modifier *= this.onCrit();

        this.owner.dealDamage(baseDamage, bonusDamage, modifier, {timeElsaped: timeElsaped, name: this.name}, true);
    }

    /** If aura exists we apply aura and refresh uration */
    public reapply(effect:auraEffect) {
        // reset Stats
        this.onReset();

        if (this._isStackable)
            if (this._stacks < this._maxStacks)
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

        // update Effect
        this._effect = effect;
        this.rank = effect.rank;
    }

    protected onReset():void {
        // reset bonus stats
        for (const stat in this.bonusStats) {
            if (this.bonusStats[stat] > 0)
                this.owner.removeBonusStat(stat, this.bonusStats[stat])

            if (this.bonusStatsPercentage[stat] > 0)
                this.owner.removeBonusStat(stat, this.bonusStatsPercentage[stat], true)
        }
    }

    public onExpire():void {
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
    public applyAura(effect:auraEffect):void {
        let findAura:Aura|undefined = this.owner.getAuraById(effect.id);
        if (findAura) {
            findAura.reapply(effect);
            return;
        }
        let aura:Aura;
        if (effect.script)
            aura = new effect.script(effect, this.owner);
        else
            aura = new Aura(effect, this.owner);

        this.owner.applyAura(aura);
    }

    public onCrit():number {
        return Placeholders.CRITICAL_DAMAGE;
    }
}