import Player from "./player.js";
import Simulation from "./simulation.js";
import Main from "./main.js";
import Aura, { auraEffect } from "./aura.js";

import { Placeholders, __calcHasteBonus, __random } from "./placeholders.js";

export enum abilityList {
    WAR_SLASH = 0,
    WAR_CRESCENTSWIPE = 1,
    WAR_UNHOLYWARCRY = 2,
    WAR_UNHOLYWARCRY_AURA = 1001,

    WAR_CENTRIFUGAL_LACERATION = 3,
    WAR_CENTRIFUGAL_LACERATION_AURA = 1002,

    WAR_ARMOR_REINFORCEMENT = 4,
    WAR_ARMOR_REINFORCEMENT_AURA = 1003,

    WAR_TAUNT = 5,
    WAR_CHARGE = 6,
    WAR_CRUSADERS_COURAGE = 7,
    WAR_CRUSADERS_COURAGE_AURA = 1004,

    WAR_BULWARK = 8,
    WAR_BULWARK_AURA_BLOCK = 1005,
    WAR_BULWARK_AURA_DAMAGE = 1006,

    WAR_COLOSSAL_RECONSTRUCTION = 9,
    WAR_TEMPERING = 10,

    /*** Mage abilites */
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

    MAGE_ARCTIC_AURA = 24,
    MAGE_ARCTIC_AURA_AURA = 2006,

    MAGE_HYPOTHERMIC_FRENZY = 25,
    MAGE_HYPOTHERMIC_FRENZY_AURA = 2007,

    MAGE_ICE_SHIELD = 26,
    MAGE_ICE_SHIELD_AURA = 2008, //Unused

    MAGE_TELEPORT = 27,

    /** default abilites */
    MANA_POTION = 5001,
    MANA_POTION_AURA = 5002,
}

/** This is used as input data */
export interface abilityData {
    id:abilityList,
    rank:number,
    condition: {
        mana?: {
            negated:boolean,
            value:number
        },
        aura?:Array<any>,
        cooldown?:abilityList
    }
}

export interface spellEffect {
    baseDamage: number,
    bonusDamage: number,
    cooldown:number,
    castTime:number,
    canCrit?:boolean
}

export default abstract class Ability {
    public id:number;
    public rank:number;

    public owner:Player;

    public name:string = "undefined"; // Ability Name just for debuging

    public cooldown:number = 0;
    public hasGlobal:boolean = true;

    public isAoe:boolean = false;
    public maxTargets:number = 20;

    public applyAuraId:number = 0;
    public ignoreAura:boolean = false;

    public manaCost:number = 0;

    private _storeEffect: spellEffect|null = null;

    private _conditions:any;

    protected maxRank:number = 5;

    constructor(abilityData:abilityData, owner:Player) {
        this.id = abilityData.id;
        this.rank = abilityData.rank;
        this.owner = owner;

        this._conditions = abilityData.condition;
    }

    public getEffect(rank:number):spellEffect|undefined { return; }

    public cast(timeElsaped:number):void {
        let effect:spellEffect|undefined = this.getEffect(this.rank);
        if (!effect)
            return;

        if (this.hasGlobal)
            this.owner.globalCooldown = Placeholders.GLOBAL_COOLDOWN;

        if (this.owner.id == 0 && Simulation.debug)
            if (effect.castTime > 0)
                Main.addCombatLog(`Cast: [${this.name}]`, timeElsaped);
        
        if (effect.castTime > 0) {
            this.owner.castTime = __calcHasteBonus(effect.castTime, this.owner.hasteStat); // add haste formular
            this._storeEffect = effect;
            return;
        }
        this._done(effect, timeElsaped);
    }

    /** When cast is done */
    private _done(effect: spellEffect|undefined, timeElsaped:number):void {
        if (!effect)
            return;

        if (effect.cooldown > 0)
            this.cooldown = __calcHasteBonus(effect.cooldown, this.owner.hasteStat);

        if (this.manaCost)
            this.owner.mana -= this.manaCost;

        if (this.owner.id == 0 && Simulation.debug && !effect.baseDamage && !effect.bonusDamage)
            Main.addCombatLog(`Casted ${this.name}`, timeElsaped);

        this.onImpact(effect, timeElsaped);

        this._storeEffect = null;
    }

    public doUpdate(diff:number, timeElsaped:number):void {
        if (this.cooldown > 0)
            this.cooldown -= diff;
        
        if (this.owner.castTime <= 0 && this._storeEffect)
            this._done(this._storeEffect, timeElsaped);
    }

    public dealDamage(effect:spellEffect, timeElsaped:number, modifier:number = 1, critModifier:number = 0):void {
        let baseDamage:number = effect.baseDamage;
        let bonusDamage:number = effect.bonusDamage;

        let critChance:number = this.owner.criticalStat + critModifier;

        /** If ability is AOE then deal damage multiple times */
        if (this.isAoe) {
            let targets:number = Simulation.targets > this.maxTargets ? this.maxTargets : Simulation.targets;
            for (let i = 0; i < targets; i++) {
                if (Math.random() < critChance)
                    modifier *= this.onCrit();

                this.owner.dealDamage(baseDamage, bonusDamage, modifier, {timeElsaped: timeElsaped, name: this.name});
            }
            return;
        }

        if (Math.random() < critChance)
            modifier *= this.onCrit();

        this.owner.dealDamage(baseDamage, bonusDamage, modifier, {timeElsaped: timeElsaped, name: this.name});
    }

    public reduceCoolown(time:number):void {
        this.cooldown = time > 0 ? this.cooldown - time : 0;
    }

    public onCooldown():boolean {
        return this.cooldown > 0;
    }

    /** for customScripts if condition is passed it can cast */
    public castCondition():boolean {
        let result:boolean = true;
        if (Object.keys(this._conditions).length > 0) {
            if (this._conditions.mana) 
                result = this._conditions.mana.negated ? this.owner.getManaPercentage() < this._conditions.mana.value : this.owner.getManaPercentage() > this._conditions.mana.value;
        
            if (this._conditions.aura) {
                this._conditions.aura.forEach((condition:any) => {
                    if (!condition.negated)
                        result = false;
                    else
                        result = true;

                    if (this.owner.hasAura(condition.value))
                        result = !result;
                })
            }

            if (this._conditions.cooldown) {
                let ability:Ability|undefined = this.owner.getAbility(this._conditions.cooldown.value);
                if (ability) 
                    result = this._conditions.cooldown.negated ? !ability.onCooldown() : ability.onCooldown();
            }

        }
        return result;
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