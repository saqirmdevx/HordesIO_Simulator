import Player from "./player.js";
import Main from "./main.js";
import Aura, { auraEffect } from "./aura.js";

import { Placeholders, __calcHasteBonus } from "./placeholders.js";

export enum abilityList {
    WAR_SLASH = 0,
    WAR_CRESCENTSWIPE = 1,
    WAR_UNHOLYWARCRY = 2,
    WAR_UNHOLYWARCRY_AURA = 1001,

    WAR_CENTRIFUGAL_LACERATION = 3,
    WAR_CENTRIFUGAL_LACERATION_AURA = 1002,

    MAGE_ICEBOLT = 20,
    //**Icebolt auras */
    MAGE_ICEBOLT_STACK = 2001,
    MAGE_ICEBOLT_FREEZE = 2002,
    MAGE_ICEBOLT_INSTANT = 2003,

    MAGE_ICICLEORB = 21,
    MAGE_CHILLINGRADIANCE = 22,
    MAGE_CHILLINGRADIANCE_AURA = 2004,

    MAGE_ENCHANT = 23,
    MAGE_ENCHANT_AURA = 2005,
}

export enum abilityPrior {
    LOW_PRIORITY,
    MEDIUM_PRIORITY,
    HIGH_PRIORITY,
    BUFFS,
    PASSIVE
}

export interface spellEffect {
    baseDamage: number,
    bonusDamage: number,
    cooldown:number,
    castTime:number,
    hasGlobal:boolean,
    manaCost:number,
    canCrit?:boolean
}

export default abstract class Ability {
    public id:number;
    public rank:number;

    public owner:Player;

    public name:string = "undefined"; // Ability Name just for debuging

    public cooldown:number = 0;
    public castTime:number = 0;

    public isAoe:boolean = false;
    public maxTargets:number = 20;

    public applyAuraId:number = 0;
    public ignoreAura:boolean = false;

    private _storeEffect: spellEffect|undefined;

    // Default
    public priority:abilityPrior = abilityPrior.LOW_PRIORITY;

    constructor(id:number, rank:number, owner:Player) {
        this.id = id;
        this.rank = rank;
        this.owner = owner;
    }

    public getEffect(rank:number):spellEffect|undefined { return; }

    public cast(timeElsaped:number):void {
        let effect:spellEffect|undefined = this.getEffect(this.rank);
        if (!effect)
            return;

        if (effect.hasGlobal)
            this.owner.globalCooldown = Placeholders.GLOBAL_COOLDOWN;

        if (this.owner.id == 0 && Main.vue.debugText)
            if (effect.castTime > 0)
                Main.addCombatLog(` cast: [${this.name}]`, timeElsaped);
        
        if (effect.castTime > 0) {
            this.castTime = __calcHasteBonus(effect.castTime, this.owner.baseStats.haste + this.owner.bonusStats.haste); // add haste formular
            this.owner.isCasting = true;
            this._storeEffect = effect;
            return;
        }
        this._done(effect, timeElsaped);
    }

    /** When cast is done */
    private _done(effect: spellEffect|undefined, timeElsaped:number):void {
        if (!effect)
            return;

        if (effect.cooldown)
            this.cooldown = __calcHasteBonus(effect.cooldown, this.owner.baseStats.haste + this.owner.bonusStats.haste);

        if (effect.manaCost > 0)
            this.owner.mana = 0;

        if (this.owner.id == 0 && Main.vue.debugText)
            Main.addCombatLog(` cast done: [${this.name}]`, timeElsaped);

        this.onImpact(effect, timeElsaped);

        this._storeEffect = undefined;

        this.owner.isCasting = false;
    }

    public doUpdate(diff:number, timeElsaped:number):void {
        if (this.cooldown > 0)
            this.cooldown -= diff;
        
        if (this.castTime > 0)
            this.castTime -= diff;
        
        if (this.owner.isCasting && this.castTime <= 0 && this._storeEffect)
            this._done(this._storeEffect, timeElsaped);
    }

    public dealDamage(effect:spellEffect, timeElsaped:number, modifier:number = 1, critModifier:number = 0):void {
        let baseDamage:number = effect.baseDamage;
        let bonusDamage:number = effect.bonusDamage;

        let critChance:number = this.owner.baseStats.critical + this.owner.bonusStats.critical + critModifier;

        /** If ability is AOE then deal damage multiple times */
        if (this.isAoe) {
            let targets:number = Main.vue.targets > this.maxTargets ? this.maxTargets : Main.vue.targets;
            for (let i = 0; i < targets; i++) {
                if (Math.random() * 100 < critChance)
                    modifier *= this.onCrit();

                this.owner.dealDamage(baseDamage, bonusDamage, modifier, timeElsaped);
            }
            return;
        }

        if (Math.random() * 100 < critChance)
            modifier *= this.onCrit();
    
        this.owner.dealDamage(baseDamage, bonusDamage, modifier, timeElsaped);
    }

    /*** Hooks */
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

    public onImpact(effect:spellEffect, timeElsaped:number):void {
        if (effect.baseDamage > 0 || effect.bonusDamage > 0)
            this.dealDamage(effect, timeElsaped);
    }
}

export class Ranks {
    /** Abilites **/
    public static list:Map<abilityList, number> = new Map();

    public static set(ability:abilityList, value:number):void {
        if (value == 0) {
            if (this.has(ability))
                this.list.delete(ability);
            return;
        }
        this.list.set(ability, Number(value));
    }

    public static get(ability:abilityList):abilityList | undefined {
        if (this.has(ability))
            return this.list.get(ability);
        else
            return 0;
    }

    public static has(ability:abilityList):boolean {
        if (this.list.has(ability))
            return true;
        return false;
    }

    public static spentPoints():number {
        let spentPoints:number = 0;
        this.list.forEach((ranks) => {
            spentPoints += Number(ranks);
        });

        return spentPoints;
    }
}