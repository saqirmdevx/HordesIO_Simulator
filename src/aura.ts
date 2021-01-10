import {abilityList } from "./ability.js"
import Main from "./main.js";
import { Placeholders, __calcHasteBonus } from "./placeholders.js";
import Player from "./player.js";
import { statTypes } from "./stats.js";

export interface auraEffect {
    id: abilityList,
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
    public owner:Player;
    public rank:number = 1;
    protected _effect:auraEffect = {     
        id: 0,
        hasDamageEffect: false,
        duration: 0,
        rank: 1
    };

    public tickTime:number = 0;

    protected _stacks:number = 1;
    protected _isStackable:boolean = false;
    protected _maxStacks:number = 1;

    public toRemove:boolean = false;
    public isPassive:boolean = false; /** passive auras */

    public bonusStats:statTypes = {
        manaregen: 0,
        defense: 0,
        block: 0,
        mindamage: 0,
        maxdamage: 0,
        critical: 0,
        haste: 0 
    };

    constructor(effect:auraEffect, owner:Player) {
        this.id = effect.id;
        this.owner = owner;
        this._isStackable = effect.isStackable ? effect.isStackable : false;
        this._maxStacks = effect.maxStacks ? effect.maxStacks : 1;
        this._stacks = effect.applyStacks ? effect.applyStacks : 1;

        if (effect.damageEffect)
            this.tickTime = __calcHasteBonus(effect.damageEffect.tickIndex * 1000, (this.owner.baseStats.haste + this.owner.bonusStats.haste))

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
        this.tickTime = __calcHasteBonus(damageEffect.tickIndex * 1000, (this.owner.baseStats.haste + this.owner.bonusStats.haste))

        let critChance:number = this.owner.baseStats.critical + this.owner.bonusStats.critical + critModifier;

        if (damageEffect.isAoe) {
            let maxTargets = damageEffect.maxTargets ? damageEffect.maxTargets : 20;
            let targets:number = Main.vue.targets > maxTargets ? maxTargets : Main.vue.targets;
            for (let i = 0; i < targets; i++) {
                let tempMod = modifier;
                if (Math.random() < critChance)
                    tempMod *= this.onCrit();

                this.owner.dealDamage(baseDamage, bonusDamage, tempMod, timeElsaped, true);
            }
            return;
        }


        if (Math.random() < critChance)
            modifier *= this.onCrit();

        this.owner.dealDamage(baseDamage, bonusDamage, modifier, timeElsaped, true);
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
        if (this.duration == -1) {
            this.isPassive = true;
        }

        // Stacks cant be higher than limit
        if (this._stacks > this._maxStacks)
            this._stacks = this._maxStacks;

        if (effect.bonusStats) {
            this.bonusStats = {
                manaregen: effect.bonusStats.manaregen,
                defense: effect.bonusStats.defense,
                block: effect.bonusStats.block,
                mindamage: effect.bonusStats.mindamage,
                maxdamage: effect.bonusStats.maxdamage,
                critical: effect.bonusStats.critical,
                haste: effect.bonusStats.haste 
            }
        }
        if (effect.bonusStatsPercentage) {
            this.bonusStats = {
                manaregen: this.bonusStats.manaregen + (this.owner.baseStats.manaregen + this.owner.bonusStats.manaregen) * effect.bonusStatsPercentage.manaregen,
                defense: this.bonusStats.defense + (this.owner.baseStats.defense + this.owner.bonusStats.defense) * effect.bonusStatsPercentage.defense,
                block: this.bonusStats.block + (this.owner.baseStats.block + this.owner.bonusStats.block) * effect.bonusStatsPercentage.block,
                mindamage: this.bonusStats.mindamage + (this.owner.baseStats.mindamage + this.owner.bonusStats.mindamage) * effect.bonusStatsPercentage.mindamage,
                maxdamage: this.bonusStats.maxdamage + (this.owner.baseStats.maxdamage + this.owner.bonusStats.maxdamage) * effect.bonusStatsPercentage.maxdamage,
                critical: this.bonusStats.critical + (this.owner.baseStats.critical + this.owner.bonusStats.critical) * effect.bonusStatsPercentage.critical,
                haste: this.bonusStats.haste + (this.owner.baseStats.haste + this.owner.bonusStats.haste) * effect.bonusStatsPercentage.haste 
            }
        }

        // update Effect
        this._effect = effect;
        this.rank = effect.rank;

        // update player stats
        if (effect.bonusStats || effect.bonusStatsPercentage)
            this.owner.bonusStats = {
                manaregen: this.owner.bonusStats.manaregen + this.bonusStats.manaregen,
                defense: this.owner.bonusStats.defense + this.bonusStats.defense,
                block: this.owner.bonusStats.block + this.bonusStats.block,
                mindamage: this.owner.bonusStats.mindamage + this.bonusStats.mindamage,
                maxdamage: this.owner.bonusStats.maxdamage + this.bonusStats.maxdamage,
                critical: this.owner.bonusStats.critical + this.bonusStats.critical,
                haste: this.owner.bonusStats.haste + this.bonusStats.haste,
            }
    }

    protected onReset():void {
        // reset bonus stats
        if (this._effect.bonusStats || this._effect.bonusStatsPercentage)
            this.owner.bonusStats = {
                manaregen: this.owner.bonusStats.manaregen - this.bonusStats.manaregen,
                defense: this.owner.bonusStats.defense - this.bonusStats.defense,
                block: this.owner.bonusStats.block - this.bonusStats.block,
                mindamage: this.owner.bonusStats.mindamage - this.bonusStats.mindamage,
                maxdamage: this.owner.bonusStats.maxdamage - this.bonusStats.maxdamage,
                critical: this.owner.bonusStats.critical - this.bonusStats.critical,
                haste: this.owner.bonusStats.haste - this.bonusStats.haste,
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