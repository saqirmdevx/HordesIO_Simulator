import Ability, { spellEffect, abilityList, abilityData } from "../ability.js";
import Player from "../player.js";

import { auraEffect } from "../aura.js";
import Simulation from "../simulation.js";
import Enemy, { EnemyListShuffle } from "../enemy.js";

import * as AuraScripts from "../aura_scripts.js";

/*** Shaman abilites */
export class Decay extends Ability {
    // Placeholder values per rank
    private _baseDamage:number = 5;
    private _bonusdamage:Array<number> = [0, 16, 29, 42, 55, 68]; // % Based on min/max damage

    private _baseDamageDot:number = 1;
    private _bonusDamageDot:Array<number> = [0, 18, 26, 34, 42, 50];

    private _baseDamageJump:number = 3;
    private _bonusDamageJump:Array<number> = [0, 40, 59, 77, 95, 113];
    private _manaCost:Array<number> = [0, 6, 11, 16, 21, 26];
    private _cooldown:number = 3000;
    private _duration:number = 8000;
    
    public static applyAura:abilityList = abilityList.SHAMAN_DECAY;
    private _plaguespreader:Ability|undefined;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Decay ${abilityData.rank}`;

        this.manaCost = this._manaCost[this.rank];
        this.applyAuraId = Decay.applyAura;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }


    public prepare():spellEffect {
        this._plaguespreader = this._plaguespreader ?? this.owner.getAbility(abilityList.SHAMAN_PLAGUESPREADER);

        let effect:spellEffect = {
            baseDamage: this._baseDamage,
            bonusDamage: this._bonusdamage[this.rank],
            cooldown: this._cooldown,
            castTime: 0,
        }
        return effect;
    }

    protected onCasted(effect:spellEffect, timeElsaped:number):void {
        /** Apply plaguespreder aura if it is on */
        if (this._plaguespreader) {
            let plaguespreaderBuff:auraEffect = {
                id: Plaguespreader.aura,
                name: "Plaguespreader",
                hasDamageEffect: false,
                bonusStats: {
                    manaregen:0,
                    block:0,
                    mindamage: 0,
                    maxdamage: 0,
                    critical:0,
                    haste: Plaguespreader.bonusHaste[this._plaguespreader.rank],
                    attackSpeed: 0,
                },

                duration: Plaguespreader.duration,
                rank: this._plaguespreader.rank,
                isStackable: true,
                maxStacks: 5,
                applyStacks: 1
            }

            this.owner.applyAura(plaguespreaderBuff)
        }

        if (effect.baseDamage > 0 || effect.bonusDamage > 0) {
            /** Calculate jumps between targets, One target can be hitted only once*/
            if (Simulation.targets > 1 && this._plaguespreader) {
                if (Enemy.list[0].hasAura(Decay.applyAura, this.owner)) {
                    let targets:number = Simulation.targets > Plaguespreader.decayJumps[this._plaguespreader.rank] ? Plaguespreader.decayJumps[this._plaguespreader.rank] : Simulation.targets;
                    let enemyList = new EnemyListShuffle(Enemy.list, targets, false);
                    let target = enemyList.next();
                    /** Spreaded damage is doubled */
                    let {...spreadEff } = {...effect}
                    spreadEff.baseDamage = this._baseDamageJump;
                    spreadEff.bonusDamage = this._bonusDamageJump[this.rank];
                    /** We iterate over other targets if there are more */
                    while (target) {
                        if (!target.hasAura(Decay.applyAura, this.owner)) {
                            this.doEffect(target, spreadEff, timeElsaped, {name: "Spreaded decay" });
                            break;
                        }
                        this.doEffect(target, spreadEff, timeElsaped, {name: "Spreaded decay" });
                        target = enemyList.next();
                    }
                }
            }
            this.doEffect(Enemy.list[0], effect, timeElsaped);
        }
    }

    protected onImpact(target:Enemy):number|void {
        let decayAura:auraEffect = {
            id: Decay.applyAura,
            name: "Decay - Debuff",
            hasDamageEffect: true,
            damageEffect: {
                baseDamage: this._baseDamageDot,
                bonusDamage: this._bonusDamageDot[this.rank],
                tickIndex: 1.5, // every 1.5sec
            },
            duration: this._duration,
            rank: this.rank,
        }

        target.applyAura(decayAura, this.owner);
        return;
    }
}

export class Plaguespreader extends Ability {
    // Placeholder values per rank
    public static bonusHaste:Array<number> = [0, 0.03, 0.05, 0.07, 0.09, 0.11]; // % Based on min/max damage
    public static decayJumps:Array<number> = [0, 3, 5, 7, 9, 11] 
    public static duration:number = 5000;

    public static aura:abilityList = abilityList.SHAMAN_PLAGUESPREADER;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Plaguespreader ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }
}

export class SoulHarvest extends Ability {
    // Placeholder values per rank
    private _baseDamage:number = 4;
    private _bonusdamage:Array<number> = [0, 50, 80, 110, 140, 170]; // % Based on min/max damage
    private _manaCost:Array<number> = [0, 4, 7, 10, 13, 16];

    private _manaReturn:Array<number> = [0, 1, 3, 4, 5, 7];

    private _cooldown:number = 8000;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Soul Harvest ${abilityData.rank}`;

        this.manaCost = this._manaCost[this.rank];

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }


    public prepare():spellEffect {
        let effect:spellEffect = {
            baseDamage: this._baseDamage,
            bonusDamage: this._bonusdamage[this.rank],
            cooldown: this._cooldown,
            castTime: 0,
        }
        return effect;
    }

    protected onCasted(effect:spellEffect, timeElsaped:number):void {
        /** Apply plaguespreder aura if it is on */
        if (effect.baseDamage > 0 || effect.bonusDamage > 0) {
            /** Calculate jumps between targets, One target can be hitted only once*/
            let targets = Enemy.list;
            for (const target of targets)
                if (target.hasAura(Decay.applyAura, this.owner))
                    this.doEffect(target, effect, timeElsaped);
        }
    }

    protected onImpact(target:Enemy):number|void {
        this.owner.regenerateMana(this._manaReturn[this.rank]);
        return;
    }
}

export class CanineHowl extends Ability {
    // Placeholder Values
    private _bonusHaste:Array<number> = [0, 0.16, 0.22, 0.28, 0.34, 0.40]; 
    private _duration:number = 15000;
    private _cooldown:number = 60000;

    private _manaCost:Array<number> = [0, 4, 7, 10, 13, 16];

    private _applyAura:abilityList = abilityList.SHAMAN_CANINE_HOWL;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Canine Howl ${abilityData.rank}`;

        this.applyAuraId = this._applyAura; // only for condition
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

    /**
     * OnImpact is called when ability is casted succesfuly (Done) this is how we apply auras 
     * @param effect - unused here
     * @param timeElsaped - unused here
     */
    public onCasted():void {
        let auraEffect:auraEffect = {
            id: this._applyAura,
            name: "Canine Howl",
            bonusStats: {
                manaregen:0,
                block:0,
                mindamage: 0,
                maxdamage: 0,
                critical:0,
                haste: this._bonusHaste[this.rank],
                attackSpeed: 0,
            },
            hasDamageEffect: false,
            duration: this._duration,
            rank: this.rank
        }

        this.owner.applyAura(auraEffect);
    }
}

export class MimirsWell extends Ability {
    // Placeholder Values
    private _duration:number = 15000;
    private _cooldown:number = 120000;

    private _applyAura:abilityList = abilityList.SHAMAN_MIMIRS_WELL;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Mimir's well ${abilityData.rank}`;

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
            name: "Mimir's well",
            hasDamageEffect: false,
            duration: this._duration,
            rank: this.rank,
            script: AuraScripts.MimirsWell
        }

        this.owner.applyAura(auraEffect);
    }
}

export class SpiritAnimal extends Ability {
    // Placeholder Values
    private _manaCost:Array<number> = [0, 10, 12, 14, 16, 18];

    private _duration:Array<number> = [0, 10000, 15000, 20000, 25000, 30000];
    private _cooldown:number = 30000;

    private _applyAura:abilityList = abilityList.SHAMAN_SPIRIT_ANIMAL;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `SpiritAnimal ${abilityData.rank}`;

        this.applyAuraId = this._applyAura; // only for condition
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

    /**
     * OnImpact is called when ability is casted succesfuly (Done) this is how we apply auras 
     * @param effect - unused here
     * @param timeElsaped - unused here
     */
    public onCasted():void {
        let auraEffect:auraEffect = {
            id: this._applyAura,
            name: "Spirit animal",
            hasDamageEffect: false,
            duration: this._duration[this.rank],
            rank: this.rank
        }

        this.owner.applyAura(auraEffect);
        return;
    }
}