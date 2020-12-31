import Ability, { spellEffect, abilityPrior, abilityList } from "../ability.js";
import Player from "../player.js";

import { auraEffect } from "../aura.js";

/*** Warrior abilites */
export class Slash extends Ability {
    // Placeholder values per rank
    private _baseDamage:number = 5;
    private _bonusdamage:Array<number> = [0, 72, 108, 144, 180, 216]; // % Based on min/max damage
    private _manaCost:Array<number> = [0, 2, 3, 4, 5, 6];

    constructor(id:number, rank:number, owner:Player) {
        super(id, rank, owner);

        this.priority = abilityPrior.LOW_PRIORITY;
        this.name = `Slash ${rank}`;
    }

    public getEffect(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: this._baseDamage,
            bonusDamage: this._bonusdamage[rank],
            cooldown: 0,
            castTime: 0,
            hasGlobal: true,
            manaCost: this._manaCost[rank]
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

    private _applyAura:abilityList = abilityList.WAR_CENTRIFUGAL_LACERATION_AURA;

    constructor(id:number, rank:number, owner:Player) {
        super(id, rank, owner);

        this.priority = abilityPrior.HIGH_PRIORITY;
        this.name = `Crescent Swipe ${rank}`;

        this.isAoe = true;
    }

    public getEffect(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: this._baseDamage,
            bonusDamage: this._bonusdamage[rank],
            cooldown: this._cooldown,
            castTime: 0,
            hasGlobal: true,
            manaCost: this._manaCost[rank],
        }
        return effect;
    }

    public onImpact(effect:spellEffect, timeElsaped:number):void {
        let centrifugalLaceration:Ability|undefined = this.owner.getAbility(abilityList.WAR_CENTRIFUGAL_LACERATION);
        if (centrifugalLaceration) {
            this.ignoreAura = true;
            this.applyAuraId = this._applyAura; // only for condition

            let auraEffect:auraEffect = {
                id: this._applyAura,
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

    constructor(id:number, rank:number, owner:Player) {
        super(id, rank, owner);

        this.priority = abilityPrior.PASSIVE;
        this.name = `CentrifugalLaceration ${rank}`;
    }
}

export class UnholyWarcry extends Ability {
    // Placeholder Values
    private _minbonusDamage:number = 3; 
    private _maxbonusDamage:number = 4; // we multiply by rank
    private _duration:number = 300000;
    private _manaCost:Array<number> = [0, 8, 16, 24, 32];
    private _cooldown:number = 150000;

    private _applyAura:abilityList = abilityList.WAR_UNHOLYWARCRY_AURA;

    constructor(id:number, rank:number, owner:Player) {
        super(id, rank, owner);

        this.priority = abilityPrior.BUFFS;
        this.name = `Unholy Warcry ${rank}`;
    }

    public getEffect(rank:number):spellEffect {
        let effect:spellEffect = {
            baseDamage: 0,
            bonusDamage: 0,
            cooldown: this._cooldown,
            castTime: 0,
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
                mindamage: this._minbonusDamage * this.rank,
                maxdamage: this._maxbonusDamage * this.rank,
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