import Ability, { spellEffect, abilityList, abilityData } from "../ability.js";
import Player from "../player.js";

import { auraEffect } from "../aura.js";
import * as AuraScripts from "../aura_scripts.js";

/*** Warrior abilites */
export class Slash extends Ability {
    // Placeholder values per rank
    private _baseDamage:number = 5;
    private _bonusdamage:Array<number> = [0, 72, 108, 144, 180, 216]; // % Based on min/max damage
    private _manaCost:Array<number> = [0, 2, 3, 4, 5, 6];

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Slash ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public getEffect(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: this._baseDamage,
            bonusDamage: this._bonusdamage[rank],
            cooldown: 0,
            castTime: 0
        }

        this.manaCost = this._manaCost[rank];
        return effect;
    }
}

export class CrescentSwipe extends Ability {
    // Placeholder values per rank
    private _baseDamage:number = 0;
    private _bonusdamage:Array<number> = [0, 117, 134, 151, 168, 185]; // % Based on min/max damage
    private _manaCost:Array<number> = [0, 4, 6, 8, 10, 12];
    private _cooldown:number = 6000;

    private _applyAura:abilityList = abilityList.WAR_CENTRIFUGAL_LACERATION_AURA;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Crescent Swipe ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);

        this.isAoe = true;
    }

    public getEffect(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: this._baseDamage,
            bonusDamage: this._bonusdamage[rank],
            cooldown: this._cooldown,
            castTime: 0,
        }

        this.manaCost = this._manaCost[rank];
        return effect;
    }

    public onImpact(effect:spellEffect, timeElsaped:number):void {
        let centrifugalLaceration:Ability|undefined = this.owner.getAbility(abilityList.WAR_CENTRIFUGAL_LACERATION);
        if (centrifugalLaceration) {
            this.ignoreAura = true;
            this.applyAuraId = this._applyAura; // only for condition

            let auraEffect:auraEffect = {
                id: this._applyAura,
                name: "Centrifugal Laceration",
                hasDamageEffect: true,
                damageEffect: {
                    baseDamage: 0,
                    bonusDamage: this._bonusdamage[this.rank] * CentrifugalLaceration.bonusDamage[centrifugalLaceration.rank],
                    tickIndex: 1.5, // every 1.5sec
                    isAoe: true,
                },
                duration: CentrifugalLaceration.duration,
                rank: centrifugalLaceration.rank,
                isStackable: true,
                maxStacks: 3
            }

            this.applyAura(auraEffect);
        }

        if (effect.baseDamage > 0 || effect.bonusDamage > 0)
            this.dealDamage(effect, timeElsaped);
    }
}

export class CentrifugalLaceration extends Ability {
    // Placeholder values per rank
    public static bonusDamage:Array<number> = [0, 0.125, 0.157, 0.189, 0.221, 0.253]; // % Based on min/max damage
    public static duration:number = 10000;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Centrifugal Laceration ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }
}

export class ArmorReinforcement extends Ability {
    // Placeholder values per rank
    public _applyAura:abilityList = abilityList.WAR_ARMOR_REINFORCEMENT_AURA;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Armor Reinforcement ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);

        /*let auraEffect:auraEffect = {
            id: this._applyAura,
            bonusStats: {
                manaregen:0,
                block:0,
                mindamage: 0,
                maxdamage: 0,
                critical:0,
                haste:0,
                attackSpeed: 0,
            },
            hasDamageEffect: false,
            duration: -1,
            rank: this.rank
        }
    
        this.applyAura(auraEffect);*/
    }
}

export class UnholyWarcry extends Ability {
    // Placeholder Values
    private _minbonusDamage:number = 3; 
    private _maxbonusDamage:number = 4; // we multiply by rank
    private _duration:number = 300000;
    private _manaCost:Array<number> = [0, 8, 16, 24, 32];
    private _cooldown:number = 150000;
    protected maxRank:number = 4;

    private _applyAura:abilityList = abilityList.WAR_UNHOLYWARCRY_AURA;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Unholy Warcry ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public getEffect(rank:number):spellEffect {
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
        let auraEffect:auraEffect = {
            id: this._applyAura,
            name: "Unholy Warcry",
            bonusStats: {
                manaregen:0,
                block:0,
                mindamage: this._minbonusDamage * this.rank,
                maxdamage: this._maxbonusDamage * this.rank,
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

export class Taunt extends Ability {
    /** !!!! ->This ability has no effect at the current simulation  */
    private _manaCost:Array<number> = [0, 4, 8, 12, 16, 20];
    private _cooldown:number = 15000;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Taunt ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public getEffect(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0,
        }

        this.manaCost = this._manaCost[rank];
        return effect;
    }
}

export class Charge extends Ability {
    /** !!!! ->This ability has no effect at the current simulation  */
    private _manaCost:Array<number> = [0, 12];
    private _cooldown:number = 15000;
    protected maxRank:number = 1;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Charge ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public getEffect(rank:number):spellEffect {
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

export class CrusadersCourage extends Ability {
    // Placeholder Values
    //private _duration:number = 300000;
    private _manaCost:Array<number> = [0, 8, 16, 24, 32, 40];
    private _cooldown:number = 150000;

    private _applyAura:abilityList = abilityList.WAR_CRUSADERS_COURAGE_AURA;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `CrusadersCourage ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public getEffect(rank:number):spellEffect {
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
        /*let auraEffect:auraEffect = {
            id: this._applyAura,
            bonusStats: {
                manaregen:0,
                block:0,
                mindamage: 0,
                maxdamage: 0,
                critical:0,
                haste:0,
                attackSpeed: 0,
            },
            hasDamageEffect: false,
            duration: this._duration,
            rank: this.rank
        }

        this.applyAura(auraEffect);*/
    }
}

export class Bulwark extends Ability {
    // Placeholder Values
    private _bonusBlock:Array<number> = [0, 0.34, 0.38, 0.42, 0.46, 0.50];
    private _duration:number = 9000;
    private _manaCost:Array<number> = [0, 8, 13, 18, 23, 28];
    private _cooldown:number = 30000;

    private _applyAura:abilityList = abilityList.WAR_BULWARK_AURA_BLOCK;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Bulwark ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public getEffect(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0
        }

        this.manaCost = this._manaCost[rank];
        this.hasGlobal = false;
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
            name: "Bulwark",
            bonusStats: {
                manaregen:0,
                block: this._bonusBlock[this.rank],
                mindamage: 0,
                maxdamage: 0,
                critical:0,
                haste:0,
                attackSpeed: 0,
            },
            hasDamageEffect: false,
            duration: this._duration,
            rank: this.rank,
            script: AuraScripts.WarBulwark
        }

        this.applyAura(auraEffect);
    }
}

export class ColossalReconstruction extends Ability {
    /** !!!! ->This ability has no effect at the current simulation  */
    private _manaCost:Array<number> = [0, 8, 16, 24, 32, 40];
    private _cooldown:number = 25000;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Colossal Reconstruction ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public getEffect(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0
        }

        this.manaCost = this._manaCost[rank];
        this.hasGlobal = false;
        return effect;
    }
}

export class Tempering extends Ability {
    /** !!!! ->This ability has no effect at the current simulation  */
    private _manaCost:Array<number> = [0, 8];
    private _cooldown:number = 30000;
    protected maxRank:number = 1;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Tempering ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public getEffect(rank:number):spellEffect {
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