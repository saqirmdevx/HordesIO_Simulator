import {abilityList } from "./ability.js"
import Main from "./main.js";
import { Placeholders, __calcHasteBonus } from "./placeholders.js";
import Player from "./player.js";
import { statTypes } from "./stats.js";

export interface auraEffect {
    id: abilityList,
    bonusStats?: statTypes,
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
    public owner:Player;
    public rank:number = 1;
    protected _effect:auraEffect = {     
        id: 0,
        hasDamageEffect: false,
        duration: 0,
        rank: 1
    };

    public tickTime:number = 1000;
    protected _stacks:number = 1;
    protected _isStackable:boolean = false;
    protected _maxStacks:number = 1;

    public toRemove:boolean = false;

    constructor(effect:auraEffect, owner:Player) {
        this.id = effect.id;
        this.owner = owner;
        this._isStackable = effect.isStackable ? effect.isStackable : false;
        this._stacks = effect.applyStacks ? effect.applyStacks : 1;
        this._maxStacks = effect.maxStacks ? effect.maxStacks : 1;

        if (effect.damageEffect)
            this.tickTime = __calcHasteBonus(effect.damageEffect.tickIndex * 1000, (this.owner.baseStats.haste + this.owner.bonusStats.haste))

        this.onApply(effect);
    }

    public doUpdate(diff:number, timeElsaped:number):void {
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
        this.tickTime = __calcHasteBonus(damageEffect.tickIndex * 1000, (this.owner.baseStats.haste + this.owner.bonusStats.haste))

        let critChance:number = this.owner.baseStats.critical + this.owner.bonusStats.critical + critModifier;

        if (damageEffect.isAoe) {
            let maxTargets = damageEffect.maxTargets ? damageEffect.maxTargets : 20;
            let targets:number = Main.vue.targets > maxTargets ? maxTargets : Main.vue.targets;
            for (let i = 0; i < targets; i++) {
                if (Math.random() * 100 < critChance)
                    modifier *= this.onCrit();

                this.owner.dealDamage(baseDamage, bonusDamage, modifier, timeElsaped, true);
            }
            return;
        }


        if (Math.random() * 100 < critChance)
            modifier *= this.onCrit();

        this.owner.dealDamage(baseDamage, bonusDamage, modifier, timeElsaped, true);
    }

    /** If aura exists we apply aura and refresh uration */
    public reapply(effect:auraEffect) {
        // reset Stats
        this.onReset();

        this.onApply(effect);

        if (this._isStackable)
            if (this._stacks < this._maxStacks)
                this._stacks += (effect.applyStacks ? effect.applyStacks : 1);
    }

    protected onApply(effect:auraEffect):void {
        // refresh duration
        this.duration = effect.duration;

        // update Effect
        this._effect = effect;

        this.rank = effect.rank;

        // update player stats
        if (effect.bonusStats)
            for (const stat in effect.bonusStats)
                this.owner.bonusStats[stat] += effect.bonusStats[stat];
    }

    protected onReset():void {
        // reset bonus stats
        if (this._effect.bonusStats)
            for (const stat in this._effect.bonusStats)
                this.owner.bonusStats[stat] -= this._effect.bonusStats[stat];
    }

    public onExpire():void {
        this.onRemove();
    }

    public onRemove():void {
        this.toRemove = true;
        this.onReset;
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

    public onCrit():number {
        return Placeholders.CRITICAL_DAMAGE;
    }
}