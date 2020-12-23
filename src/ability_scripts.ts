import { auraEffect, spellEffect } from "./ability.js";
import { statTypes } from "./stats.js";


/*** Warrior abilites */
export class Slash {
    // Placeholder values per rank
    private static _baseDamage:Array<number> = [0, 41, 59, 77, 95, 113];
    private static _bonusdamage:Array<number> = [0, 30, 35, 40, 45, 50]; // % Based on min/max damage
    private static _manaCost:Array<number> = [0, 2, 3, 4, 5, 6]

    public static getEffect(rank:number):spellEffect {
        let effect:spellEffect = {
            damageBase: this._baseDamage[rank],
            damageBonus: this._bonusdamage[rank],
            applyAura: false,
            cooldown: 0,
            castTime: 0,
            hasGlobal: true,
            manaCost: this._manaCost[rank]
        }

        return effect;
    }
}

export class CrescentSwipe {
    // Placeholder values per rank
    private static _baseDamage:Array<number> = [0, 58.5, 67, 75.5, 84, 92.5];
    private static _bonusdamage:Array<number> = [0, 30, 40, 50, 60, 70]; // % Based on min/max damage
    private static _manaCost:Array<number> = [0, 4, 6, 8, 10, 12]

    /**
     * @param rank - Skill rank 
     * @param clRank  - If has centrifugalLaceration rank then apply
     */
    public static getEffect(rank:number, clRank:number):spellEffect {
        let effect:spellEffect = {
            damageBase: this._baseDamage[rank],
            damageBonus: this._bonusdamage[rank],
            applyAura: clRank > 0 ? true : false,
            cooldown: 6000,
            castTime: 0,
            hasGlobal: true,
            manaCost: this._manaCost[rank],
            ignoreAura: true
        }

        if (clRank > 0)
        {
            //effect.auraEffect = centrifugalLaceration(clRank);
            /** Centrifugal */
        }

        return effect;
    }
}

export class UnholyWarcry {
    // Placeholder Values
    private static _mindamageBonus:number = 3; 
    private static _maxdamageBonus:number = 4; // we multiply by rank
    private static _duration:number = 300000;
    private static _manaCost:Array<number> = [0, 8, 16, 24, 32];
    private static _coolown:number = 150000

    public static getEffect(rank:number):spellEffect {
        let bonusStats:statTypes = {
            manaregen: 0,
            defense: 0,
            block: 0,
            mindamage: this._mindamageBonus * rank,
            maxdamage: this._maxdamageBonus * rank,
            critical: 0,
            haste: 0
        };

        let aura:auraEffect = {
            bonusStats: bonusStats,
            hasDamageEffect: false,
            duration: this._duration
        }

        let effect:spellEffect = {
            damageBase: 0,
            damageBonus: 0,
            applyAura: true,
            auraEffect: aura,
            cooldown: this._coolown,
            castTime: 0,
            hasGlobal: true,
            manaCost: this._manaCost[rank]
        }

        return effect;
    }
}

/*** Mage abilites */
export class ChillingRadiance {
    // Placeholder Values
    private static _baseDamage:Array<number> = [0, 25, 40, 55, 70, 85];
    private static _bonusDamage:Array<number> = [0, 15, 20, 25, 30, 35]; // % Based on min/max damage
    private static _duration:Array<number> = [0, 6000, 6500, 7000, 7500, 8000];
    private static _cooldown:number = 25000;

    private static _manaCost:Array<number> = [0, 4, 8, 12, 16, 20];

    public static getEffect(rank:number):spellEffect {
        let aura:auraEffect = {
            hasDamageEffect: true,
            damageEffect: {
                baseDamage: this._baseDamage[rank],
                bonusDamage: this._bonusDamage[rank],
                tickIndex: 1 // every 1sec
            },
            duration: this._duration[rank]
        }

        let effect:spellEffect = {
            damageBase: 0,
            damageBonus: 0,
            applyAura: true,
            auraEffect: aura,
            cooldown: this._cooldown,
            castTime: 0,
            hasGlobal: true,
            manaCost: this._manaCost[rank]
        }

        return effect;
    }
}

export class IceBolt {
    // Placeholder values per rank
    private static _baseDamage:Array<number> = [0, 43, 62, 81, 100, 119];
    private static _bonusdamage:Array<number> = [0, 50, 55, 60, 65, 70]; // % Based on min/max damage
    private static _manaCost:Array<number> = [0, 3, 5, 7, 9, 11];
    private static _castTime:number = 1500;

    public static getEffect(rank:number, isInstant:boolean):spellEffect {
        let effect:spellEffect = {
            damageBase: this._baseDamage[rank],
            damageBonus: this._bonusdamage[rank],
            applyAura: false,
            cooldown: 0,
            castTime: isInstant ? 0 : this._castTime,
            hasGlobal: true,
            manaCost: this._manaCost[rank]
        }

        return effect;
    }
}

export class IcicleOrb {
    // Placeholder values per rank
    private static _baseDamage:Array<number> = [0, 63.5, 91.5, 119.5, 147.5, 175.5];
    private static _bonusdamage:Array<number> = [0, 60, 75, 90, 105, 120]; // % Based on min/max damage
    private static _manaCost:Array<number> = [0, 10, 15, 20, 25, 30];
    private static _castTime:number = 1500;
    private static _cooldown:number = 15000;

    public static getEffect(rank:number):spellEffect {
        let effect:spellEffect = {
            damageBase: this._baseDamage[rank],
            damageBonus: this._bonusdamage[rank],
            applyAura: false,
            cooldown: this._cooldown,
            castTime: this._castTime,
            hasGlobal: true,
            manaCost: this._manaCost[rank]
        }

        return effect;
    }
}
