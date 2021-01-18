import Ability, { spellEffect, abilityList, abilityData } from "../ability.js";
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

    constructor(abilityData: abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Chilling Radiance ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare(rank:number):spellEffect {

        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0,
        }

        this.manaCost = this._manaCost[rank];
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
            name: "Chilling Radiance",
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

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Ice bolt ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);

        // start with 3 stacks of instabolt
        let auraEffect:auraEffect = {
            id: this._iceboltInstant,
            name: "Icebolt - Instant",
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

    public prepare(rank:number):spellEffect {
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
            castTime: castTime
        }

        this.manaCost = this._manaCost[rank];   
        return effect;
    }

    public onImpact(effect:spellEffect, timeElsaped:number):void {
        let iceboltSlowAura:Aura|undefined = this.owner.getAuraById(this._iceboltSlow);
        let icicleOrb:Ability|undefined = this.owner.getAbility(abilityList.MAGE_ICICLEORB);

        if (effect.baseDamage > 0 || effect.bonusDamage > 0) {
            let dmgMod = 1.0;
            let critMod = 0;

            if (icicleOrb)
                icicleOrb.reduceCoolown(500);

            let chillingRadiance:Aura|undefined = this.owner.getAuraById(this._chillingRadiance)
            if (chillingRadiance)
                critMod = 0.01 + (0.03 * chillingRadiance.rank);

            if (this.owner.hasAura(this._iceboltFreeze))
                dmgMod = 1.5; //50% damage increase when target is frozen

            this.dealDamage(effect, timeElsaped, dmgMod, critMod); 
        }

        if (iceboltSlowAura && iceboltSlowAura.getStacks() >= 4) {
            iceboltSlowAura.onRemove(); // Remove slow aura

            let auraEffect:auraEffect = {
                id: this._iceboltFreeze,
                name: "Icebolt Freeze",
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
                name: "Icebolt Slow",
                hasDamageEffect: false,
                duration: 8000,
                isStackable: true,
                maxStacks: 5,
                rank: this.rank
            }
            this.applyAura(auraEffect);
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

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Icicle Orb ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);

        this.isAoe = true;
    }

    public prepare(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: this._baseDamage,
            bonusDamage: this._bonusdamage[rank],
            cooldown: this._cooldown,
            castTime: this._castTime
        }

        this.manaCost = this._manaCost[rank];
        return effect;
    }

    public onImpact(effect:spellEffect, timeElsaped:number):void {
        if (effect.baseDamage > 0 || effect.bonusDamage > 0) {
            let dmgMod = 1.0;
            let critMod = 0;

            let chillingRadiance:Aura|undefined = this.owner.getAuraById(this._chillingRadiance)
            if (chillingRadiance)
                critMod = 0.02 + (0.03 * chillingRadiance.rank);

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
    protected maxRank:number = 4;

    private _applyAura:abilityList = abilityList.MAGE_ENCHANT_AURA;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Enchant ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} - Rank is not in range`);
    }

    public prepare(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: 0,
            castTime: this._castTime
        }

        this.manaCost = this._manaCost[rank];
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
            name: "Enchant",
            bonusStats: {
                manaregen:0,
                block:0,
                mindamage: this._minbonusDamage[this.rank],
                maxdamage: this._maxbonusDamage[this.rank],
                critical:0,
                haste:0,
                attackSpeed: 0,
            },
            hasDamageEffect: false,
            duration: this._duration,
            rank: this.rank
        }

        this.applyAura(auraEffect);
    }
}

export class ArcticAura extends Ability {
    // Placeholder Values
    private _bonusCritical:Array<number> = [0, 0.03, 0.06, 0.09, 0.12]; 
    private _duration:number = 300000;
    private _manaCost:Array<number> = [0, 15, 25, 35, 45];
    private _cooldown:number = 120000;
    protected _maxRank:number = 4;

    private _applyAura:abilityList = abilityList.MAGE_ARCTIC_AURA_AURA;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Arctic Aura ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0
        }

        this.manaCost = this._manaCost[rank];
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
            name: "Arctic Aura",
            bonusStats: {
                manaregen:0,
                block:0,
                mindamage: 0,
                maxdamage: 0,
                critical: this._bonusCritical[this.rank],
                haste:0,
                attackSpeed: 0,
            },
            hasDamageEffect: false,
            duration: this._duration,
            rank: this.rank
        }

        this.applyAura(auraEffect);
    }
}

export class HypothermicFrenzy extends Ability {
    // Placeholder Values
    private _bonusHaste:Array<number> = [0, 0.1, 0.17, 0.24, 0.31, 0.38]; 
    private _bonusDamage:Array<number> = [0, 0.09, 0.16, 0.22, 0.30, 0.37]; // we multiply by rank
    private _duration:number = 12000;
    private _cooldown:number = 45000;

    private _applyAura:abilityList = abilityList.MAGE_HYPOTHERMIC_FRENZY_AURA;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Hypothermic frenzy ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0
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
            name: "Hypothermic Frenzy",
            bonusStats: {
                manaregen:0,
                block:0,
                mindamage: 0,
                maxdamage: 0,
                critical:0,
                haste: this._bonusHaste[this.rank],
                attackSpeed: 0,
            },
            bonusStatsPercentage:  {
                manaregen:0,
                block: 0,
                mindamage: this._bonusDamage[this.rank], /** 0 Base damage we give only % */
                maxdamage: this._bonusDamage[this.rank], /** 0 Base damage we give only % */
                critical:0,
                haste:0,
                attackSpeed: 0,
            },
            hasDamageEffect: false,
            duration: this._duration,
            rank: this.rank
        }

        // reset cooldown on Icicle Orb
        let icicleOrb:Ability|undefined = this.owner.getAbility(abilityList.MAGE_ICICLEORB);
        if (icicleOrb)
            icicleOrb.reduceCoolown(-1);

        this.applyAura(auraEffect);
    }
}

export class IceShield extends Ability {
    /** !!! This ability has no effect !!! */
    // Placeholder Values
    //private _duration:number = 60000;
    private _manaCost:Array<number> = [0, 5, 10, 15, 20, 25];
    private _cooldown:number = 60000;

    private _applyAura:abilityList = abilityList.MAGE_ICE_SHIELD_AURA;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Ice Shield ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0
        }

        this.manaCost = this._manaCost[rank];
        this.ignoreAura = true;
        this.applyAuraId = this._applyAura; // only for condition
        return effect;
    }

    /**
     * OnImpact is called when ability is casted succesfuly (Done) this is how we apply auras 
     * @param effect - unused here
     * @param timeElsaped - unused here
     */
    public onImpact():void {
        /* let auraEffect:auraEffect = {
            id: this._applyAura,
            bonusStats: {
                manaregen:0,
                defense:0,
                block:0,
                mindamage: 0,
                maxdamage: 0,
                critical: 0,
                haste:0
            },
            hasDamageEffect: false,
            duration: this._duration,
            rank: this.rank
        } 

        this.applyAura(auraEffect); */
    }
}

export class Teleport extends Ability {
    /** !!! This ability has no effect !!! */
    // Placeholder Values
    private _manaCost:Array<number> = [0, 4];
    private _cooldown:number = 12000;
    protected maxRank:number = 1;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Teleport ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0
        }

        this.manaCost = this._manaCost[rank];
        return effect;
    }
}
