import Ability, { spellEffect, abilityPrior, abilityList } from "../ability.js";
import Player from "../player.js";

import Aura, { auraEffect } from "../aura.js";
import * as AuraScripts from "../aura_scripts.js";

// /*** Mage abilites */
export class ChillingRadiance extends Ability {
    // Placeholder Values
    private _baseDamage:number = 0
    private _bonusDamage:Array<number> = [0, 40, 70, 100, 130, 160]; // % Based on min/max damage
    private _duration:Array<number> = [0, 6000, 6500, 7000, 7500, 8000];
    private _cooldown:number = 25000;

    private _manaCost:Array<number> = [0, 4, 8, 12, 16, 20];

    private _applyAura:abilityList = abilityList.MAGE_CHILLINGRADIANCE_AURA;

    constructor(id:number, rank:number, owner:Player) {
        super(id, rank, owner);

        this.priority = abilityPrior.HIGH_PRIORITY;
        this.name = `Chilling Radiance ${rank}`;
    }

    public getEffect(rank:number):spellEffect {

        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0,
            hasGlobal: true,
            manaCost: this._manaCost[rank]
        }
        this.ignoreAura = false;
        this.applyAuraId = this._applyAura; // only for condition
        return effect;
    }

    /**
     * OnImpact is called when ability is casted succesfuly (Done) this is how we apply auras 
     * @param effect - unused here
     * @param timeElsaped - unused here
     */
    public onImpact():void {
        // start with 3 stacks of instabolt
        let auraEffect:auraEffect = {
            id: this._applyAura,
            hasDamageEffect: true,
            damageEffect: {
                baseDamage: this._baseDamage,
                bonusDamage: this._bonusDamage[this.rank],
                tickIndex: 1, // every 1sec
                isAoe: true,
            },
            duration: this._duration[this.rank],
            rank: this.rank
        }
        this.applyAura(auraEffect);
    }
}

export class IceBolt extends Ability {
    // Placeholder values per rank
    private _baseDamage:number = 5;
    private _bonusdamage:Array<number> = [0, 76, 114, 152, 190, 228]; // % Based on min/max damage
    private _manaCost:Array<number> = [0, 3, 5, 7, 9, 11];
    private _castTime:number = 1500;

    private _iceboltSlow:abilityList = abilityList.MAGE_ICEBOLT_STACK;
    private _iceboltFreeze:abilityList = abilityList.MAGE_ICEBOLT_FREEZE;
    private _iceboltInstant:abilityList = abilityList.MAGE_ICEBOLT_INSTANT;
    private _chillingRadiance:abilityList = abilityList.MAGE_CHILLINGRADIANCE_AURA;

    constructor(id:number, rank:number, owner:Player) {
        super(id, rank, owner);

        this.priority = abilityPrior.LOW_PRIORITY;
        this.name = `Ice bolt ${rank}`;

        // start with 3 stacks of instabolt
        let auraEffect:auraEffect = {
            id: this._iceboltInstant,
            hasDamageEffect: false,
            duration: 8000,
            isStackable: true,
            applyStacks: 3,
            maxStacks: 3,
            rank: this.rank,
            script: AuraScripts.MageIceboltInstant
        }
        this.applyAura(auraEffect);
    }

    public getEffect(rank:number):spellEffect {
        let castTime:number = this._castTime;
        let iceboltInstant:Aura|undefined = this.owner.getAuraById(this._iceboltInstant);

        if (iceboltInstant && iceboltInstant.getStacks() > 0) {
            iceboltInstant.removeStack();
            castTime = 0;
        }

        let effect:spellEffect = {
            baseDamage: this._baseDamage,
            bonusDamage: this._bonusdamage[rank],
            cooldown: 0,
            castTime: castTime,
            hasGlobal: true,
            manaCost: this._manaCost[rank]
        }

        return effect;
    }

    public onImpact(effect:spellEffect, timeElsaped:number):void {
       let iceboltSlowAura:Aura|undefined = this.owner.getAuraById(this._iceboltSlow);
        if (iceboltSlowAura && iceboltSlowAura.getStacks() >= 4) {
            iceboltSlowAura.onRemove(); // Remove slow aura

            let auraEffect:auraEffect = {
                id: this._iceboltFreeze,
                hasDamageEffect: false,
                duration: 5000,
                rank: this.rank
            }
            // Apply freeze if target has 4 stacks
            this.applyAura(auraEffect);
        }
        else if (!this.owner.hasAura(this._iceboltFreeze)) { 
            let auraEffect:auraEffect = {
                id: this._iceboltSlow,
                hasDamageEffect: false,
                duration: 8000,
                isStackable: true,
                maxStacks: 5,
                rank: this.rank
            }
            this.applyAura(auraEffect);
        }

        if (effect.baseDamage > 0 || effect.bonusDamage > 0) {
            let dmgMod = 1.0;
            let critMod = 0;

            let chillingRadiance:Aura|undefined = this.owner.getAuraById(this._chillingRadiance)
            if (chillingRadiance)
                critMod = 1 + (3 * chillingRadiance.rank);

            if (this.owner.hasAura(this._iceboltFreeze))
                dmgMod = 1.5; //50% damage increase when target is frozen

            this.dealDamage(effect, timeElsaped, dmgMod, critMod); 
        }
    }
}

export class IcicleOrb extends Ability {
    // Placeholder values per rank
    private _baseDamage:number = 10;
    private _bonusdamage:Array<number> = [0, 98, 154, 210, 266, 322]; // % Based on min/max damage
    private _manaCost:Array<number> = [0, 10, 15, 20, 25, 30];
    private _castTime:number = 1500;
    private _cooldown:number = 15000;

    private _iceboltFreeze:abilityList = abilityList.MAGE_ICEBOLT_FREEZE;
    private _chillingRadiance:abilityList = abilityList.MAGE_CHILLINGRADIANCE_AURA;

    constructor(id:number, rank:number, owner:Player) {
        super(id, rank, owner);

        this.priority = abilityPrior.MEDIUM_PRIORITY;
        this.name = `Icicle Orb ${rank}`;

        this.isAoe = true;
    }

    public getEffect(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: this._baseDamage,
            bonusDamage: this._bonusdamage[rank],
            cooldown: this._cooldown,
            castTime: this._castTime,
            hasGlobal: true,
            manaCost: this._manaCost[rank]
        }

        return effect;
    }

    public onImpact(effect:spellEffect, timeElsaped:number):void {
        if (effect.baseDamage > 0 || effect.bonusDamage > 0) {
            let dmgMod = 1.0;
            let critMod = 0;

            let chillingRadiance:Aura|undefined = this.owner.getAuraById(this._chillingRadiance)
            if (chillingRadiance)
                critMod = 2 + (3 * chillingRadiance.rank);

            if (this.owner.hasAura(this._iceboltFreeze))
                dmgMod = 1.5; //50% damage increase when target is frozen

            this.dealDamage(effect, timeElsaped, dmgMod, critMod); 
        }
    }
}

export class Enchant extends Ability {
    // Placeholder Values
    private _minbonusDamage:Array<number> = [0, 3, 5, 6, 8]; 
    private _maxbonusDamage:Array<number> = [0, 6, 10, 13, 17]; // we multiply by rank
    private _duration:number = 300000;
    private _manaCost:Array<number> = [0, 5, 8, 11, 14];
    private _castTime:number = 1500;

    private _applyAura:abilityList = abilityList.MAGE_ENCHANT_AURA;

    constructor(id:number, rank:number, owner:Player) {
        super(id, rank, owner);

        this.priority = abilityPrior.BUFFS;
        this.name = `Enchant ${rank}`;
    }

    public getEffect(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: 0,
            castTime: this._castTime,
            hasGlobal: true,
            manaCost: this._manaCost[rank],
        }

        this.ignoreAura = false;
        this.applyAuraId = this._applyAura; // only for condition
        return effect;
    }

    /**
     * OnImpact is called when ability is casted succesfuly (Done) this is how we apply auras 
     * @param effect - unused here
     * @param timeElsaped - unused here
     */
    public onImpact():void {
        let auraEffect:auraEffect = {
            id: this._applyAura,
            bonusStats: {
                manaregen:0,
                defense:0,
                block:0,
                mindamage: this._minbonusDamage[this.rank],
                maxdamage: this._maxbonusDamage[this.rank],
                critical:0,
                haste:0
            },
            hasDamageEffect: false,
            duration: this._duration,
            rank: this.rank
        }

        this.applyAura(auraEffect);
    }
}