import Ability, { spellEffect, abilityList, abilityData } from "../ability.js";
import Player from "../player.js";

import { auraEffect } from "../aura.js";
import * as AuraScripts from "../aura_scripts.js";
import Enemy from "../enemy.js";

/*** Warrior abilites */
export class Slash extends Ability {
    // Placeholder values per rank
    private _baseDamage:number = 5;
    private _bonusdamage:Array<number> = [0, 72, 108, 144, 180, 216]; // % Based on min/max damage
    private _manaCost:Array<number> = [0, 2, 3, 4, 5, 6];

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Slash ${abilityData.rank}`;

        this.manaCost = this._manaCost[this.rank];

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare():spellEffect {
        let effect:spellEffect = {
            baseDamage: this._baseDamage,
            bonusDamage: this._bonusdamage[this.rank],
            cooldown: 0,
            castTime: 0
        }
        return effect;
    }
}

export class CrescentSwipe extends Ability {
    // Placeholder values per rank
    private _baseDamage:number = 0;
    private _bonusdamage:Array<number> = [0, 117, 134, 151, 168, 185]; // % Based on min/max damage
    private _manaCost:Array<number> = [0, 4, 6, 8, 10, 12];
    private _cooldown:number = 6000;

    private _centrifugalLaceration:Ability|undefined;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Crescent Swipe ${abilityData.rank}`;

        this.manaCost = this._manaCost[this.rank];

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);

        this.isAoe = true;
    }

    public prepare():spellEffect {
        this._centrifugalLaceration = this._centrifugalLaceration ?? this.owner.getAbility(abilityList.WAR_CENTRIFUGAL_LACERATION);

        let effect:spellEffect = {
            baseDamage: this._baseDamage,
            bonusDamage: this._bonusdamage[this.rank],
            cooldown: this._cooldown,
            castTime: 0,
        }
        return effect;
    }

    protected onImpact(target:Enemy, damageDone:number, effect:spellEffect, timeElsaped:number):void {
        if (!damageDone)
            return;

        if (this._centrifugalLaceration) {
            let auraEffect:auraEffect = {
                id: CentrifugalLaceration.aura,
                name: "Centrifugal Laceration",
                hasDamageEffect: true,
                damageEffect: {
                    baseDamage: 0,
                    bonusDamage: Math.floor(damageDone * CentrifugalLaceration.bonusDamage[this._centrifugalLaceration.rank]),
                    tickIndex: 1.5, // every 1.5sec
                    triggeredDamage: true
                },
                duration: CentrifugalLaceration.duration,
                rank: this._centrifugalLaceration.rank,
                isStackable: true,
                maxStacks: 3
            }

            target.applyAura(auraEffect, this.owner);
        }
    }
}

export class CentrifugalLaceration extends Ability {
    // Placeholder values per rank
    public static bonusDamage:Array<number> = [0, 0.125, 0.157, 0.189, 0.221, 0.253]; // % Based on min/max damage
    public static duration:number = 10000;

    public static aura:abilityList = abilityList.WAR_CENTRIFUGAL_LACERATION_AURA;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Centrifugal Laceration ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }
}

export class ArmorReinforcement extends Ability {
    // Placeholder values per rank

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Armor Reinforcement ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
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

        this.manaCost = this._manaCost[this.rank];
        this.applyAuraId = this._applyAura; // only for condition

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare():spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0,
        }
        return effect;
    }

    /**
     * OnImpact is called when ability is casted succesfuly (Done) this is how we apply auras 
     * @param effect - unused here
     * @param timeElsaped - unused here
     */
    public onCasted():void {
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

        this.owner.applyAura(auraEffect);
    }
}

export class Taunt extends Ability {
    /** !!!! ->This ability has no effect at the current simulation  */
    private _manaCost:Array<number> = [0, 4, 8, 12, 16, 20];
    private _cooldown:number = 15000;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Taunt ${abilityData.rank}`;

        this.manaCost = this._manaCost[this.rank];

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare():spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0,
        }
        return effect;
    }

    public onCasted(effect:spellEffect, timeElsaped:number):void { return; }
}

export class Charge extends Ability {
    /** !!!! ->This ability has no effect at the current simulation  */
    private _manaCost:Array<number> = [0, 12];
    private _cooldown:number = 15000;
    protected maxRank:number = 1;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Charge ${abilityData.rank}`;

        this.manaCost = this._manaCost[this.rank];

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare():spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0
        }
        return effect;
    }

    public onCasted(effect:spellEffect, timeElsaped:number):void { return; }
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

        this.manaCost = this._manaCost[this.rank];
        this.applyAuraId = this._applyAura; // only for condition

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare():spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0
        }
        return effect;
    }

    /**
     * OnImpact is called when ability is casted succesfuly (Done) this is how we apply auras 
     * @param effect - unused here
     * @param timeElsaped - unused here
     */
    public onCasted():void {
       return;
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

        this.triggerGlobal = false;
        this.manaCost = this._manaCost[this.rank];
        this.applyAuraId = this._applyAura; // only for condition

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare():spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0
        }
        return effect;
    }

    /**
     * OnImpact is called when ability is casted succesfuly (Done) this is how we apply auras 
     * @param effect - unused here
     * @param timeElsaped - unused here
     */
    public onCasted():void {
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

        this.owner.applyAura(auraEffect);
    }
}

export class ColossalReconstruction extends Ability {
    /** !!!! ->This ability has no effect at the current simulation  */
    private _manaCost:Array<number> = [0, 8, 16, 24, 32, 40];
    private _cooldown:number = 25000;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Colossal Reconstruction ${abilityData.rank}`;

        this.triggerGlobal = false;
        this.manaCost = this._manaCost[this.rank];

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare():spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0
        }
        return effect;
    }

    public onCasted(effect:spellEffect, timeElsaped:number):void { return; }
}

export class Tempering extends Ability {
    /** !!!! ->This ability has no effect at the current simulation  */
    private _manaCost:Array<number> = [0, 8];
    private _cooldown:number = 30000;
    protected maxRank:number = 1;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Tempering ${abilityData.rank}`;

        this.manaCost = this._manaCost[this.rank];

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare():spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0
        }
        return effect;
    }

    public onCasted(effect:spellEffect, timeElsaped:number):void { return; }
}