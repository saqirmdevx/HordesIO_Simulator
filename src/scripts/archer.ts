import Ability, { spellEffect, abilityList, abilityData } from "../ability.js";
import Player from "../player.js";
import Enemy, { EnemyListShuffle } from "../enemy.js";

import Aura, { auraEffect } from "../aura.js";
import Simulation from "../simulation.js"

/** Archer Abilites */
export class SwiftShot extends Ability {
    private _baseDamage:number = 5;
    private _bonusdamage:Array<number> = [0, 56, 84, 112, 140, 168]; // % Based on min/max damage
    private _manaCost:Array<number> = [0, 2, 3, 4, 5, 6];
    private _castTime:number = 1500;

    public static aura:abilityList = abilityList.ARCHER_SWIFT_SHOT_INSTANT;
    public static auraDuration:number = 8000;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Swift Shot ${abilityData.rank}`;

        this.manaCost = this._manaCost[this.rank];

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare():spellEffect {
        let castTime:number = this._castTime;
        let swiftshotAura:Aura|undefined = this.owner.getAuraById(SwiftShot.aura);

        if (swiftshotAura) {
            swiftshotAura.removeStack();
            castTime = 0;
        }

        let effect:spellEffect = {
            baseDamage: this._baseDamage,
            bonusDamage: this._bonusdamage[this.rank],
            cooldown: 0,
            castTime: castTime
        }
        return effect;
    }

    protected onCasted(effect:spellEffect, timeElsaped:number):void {
        let mod = 1.0;
        if (this.owner.hasAura(abilityList.ARCHER_SWIFT_SHOT_INSTANT))
            mod = 1.5;

        super.onCasted(effect, timeElsaped, {damageMod: mod});
    }
}

export class PreciseShot extends Ability { 
    private _baseDamage:number = 5;
    private _bonusdamage:Array<number> = [0, 106, 152, 198, 244, 290]; // % Based on min/max damage
    private _manaCost:Array<number> = [0, 5, 8, 11, 14, 17];
    private _castTime:number = 1700;
    private _cooldown:number = 6000;

    public static aura:abilityList = abilityList.ARCHER_PRECISE_SHOT_INSTANT;
    public static auraDuration:number = 6000;

    private _serpentArrows:Ability|undefined;
    private _poisonArrows:Ability|undefined;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Precise Shot ${abilityData.rank}`;

        this.manaCost = this._manaCost[this.rank];
        this.applyAuraId = SwiftShot.aura;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }

    public prepare():spellEffect {
        let castTime:number = this._castTime;
        let preciseShotAura:Aura|undefined = this.owner.getAuraById(PreciseShot.aura);
        this._serpentArrows = this._serpentArrows ?? this.owner.getAbility(abilityList.ARCHER_SERPENT_ARROWS);
        this._poisonArrows = this._poisonArrows ?? this.owner.getAbility(abilityList.ARCHER_POISON_ARROWS);

        if (preciseShotAura) {
            preciseShotAura.expire();
            castTime = 0;
        }

        if (this._serpentArrows) {
            this.isAoe = true;
            this.maxTargets = SerpentArrows.jumps[this._serpentArrows.rank];
        }

        let effect:spellEffect = {
            baseDamage: this._baseDamage,
            bonusDamage: this._bonusdamage[this.rank],
            cooldown: this._cooldown,
            castTime: castTime
        }
        return effect;
    }

    protected onCasted(effect:spellEffect, timeElsaped:number):void {
        let auraEffect:auraEffect = {
            id: SwiftShot.aura,
            name: "Swift Shot - Instant",
            hasDamageEffect: false,
            duration: SwiftShot.auraDuration,
            rank: 1,
            isStackable: true,
            maxStacks: 5,
            applyStacks: 2
        }

        this.owner.applyAura(auraEffect);

        if (effect.baseDamage > 0 || effect.bonusDamage > 0) {
            /** First target takes full damage, all others takes reduced damage */
            this.doEffect(Enemy.list[0], effect, timeElsaped);

            if (this.isAoe && this._serpentArrows && Simulation.targets > 1) {
                let targets:number = Simulation.targets > this.maxTargets ? this.maxTargets : Simulation.targets;
                let enemyList = new EnemyListShuffle(Enemy.list, targets, false);

                let target = enemyList.next();
                /** We iterate over other targets if there are more */
                while (target) {
                    this.doEffect(target, effect, timeElsaped, {damageMod: SerpentArrows.bonusDamage[this._serpentArrows.rank]});
                    target = enemyList.next();
                }
            }
        }
    }

    protected onImpact(target:Enemy, damage:number, effect:spellEffect, timeElsaped:number):number|void {
        /** Apply poison arrows */
        if (!this._poisonArrows)
            return;

        let poisonAura:auraEffect = {
            id: PoisonArrows.aura,
            name: "Poison Arrows - Debuff",
            hasDamageEffect: true,
            damageEffect: {
                baseDamage: 3,
                bonusDamage: PoisonArrows.bonusDamage[this._poisonArrows.rank] * damage,
                tickIndex: 1.5, // every 1.5sec
                triggeredDamage: true
            },
            duration: PoisonArrows.duration,
            rank: this._poisonArrows.rank,
            isStackable: true,
            maxStacks: 3
        }

        target.applyAura(poisonAura, this.owner);
    }
}

export class Dash extends Ability {
    private _manaCost:number = 6;
    private _cooldown:number = 10000;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Dash ${abilityData.rank}`;

        this.maxRank = 1;
        this.triggerGlobal = false;
        this.manaCost = this._manaCost;
        this.applyAuraId = PreciseShot.aura;

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

        let auraEffect:auraEffect = {
            id: PreciseShot.aura,
            name: "Precise Shot - Instant",
            hasDamageEffect: false,
            duration: PreciseShot.auraDuration,
            rank: 1
        }

        this.owner.applyAura(auraEffect);
        let preciseShot:Ability|undefined = this.owner.getAbility(abilityList.ARCHER_PRECISE_SHOT);
        preciseShot?.resetCooldown();
        return effect;
    }

    public onCasted(effect:spellEffect, timeElsaped:number):void { return; }
}

export class SerpentArrows extends Ability {
    public static jumps:Array<number> = [0, 3, 4, 5, 6, 7];
    public static bonusDamage:Array<number> = [0, 0.245, 0.37, 0.495, 0.62, 0.745];

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Serpent Arrows ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }
}

export class PoisonArrows extends Ability {
    public static bonusDamage:Array<number> = [0, 0.030, 0.055, 0.080, 0.105, 0.130];
    public static duration:number = 10000;

    public static aura:abilityList = abilityList.ARCHER_POISON_ARROWS;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Poison Arrows ${abilityData.rank}`;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);
    }
}

export class Invigorate extends Ability {
    private _cooldown:number = 50000;
    private _duration:number = 17000;
    private _bonusDamage:Array<number> = [0, 0.09, 0.18, 0.27, 0.36, 0.45];
    private _manaRegen:Array<number> = [0, 0.08, 0.13, 0.18, 0.23, 0.28];

    private _applyAura:abilityList = abilityList.ARCHER_INVIGORATE;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Invigorate ${abilityData.rank}`;

        this.triggerGlobal = false;
        this.applyAuraId = this._applyAura;

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

        let auraEffect:auraEffect = {
            id: this._applyAura,
            name: "Invigorate",
            hasDamageEffect: false,
            duration: this._duration,
            rank: this.rank,
            bonusStatsPercentage:  {
                manaregen:0,
                block: 0,
                mindamage: this._bonusDamage[this.rank], /** 0 Base damage we give only % */
                maxdamage: this._bonusDamage[this.rank], /** 0 Base damage we give only % */
                critical:0,
                haste:0,
                attackSpeed: 0,
            },
        }
        this.owner.applyAura(auraEffect);
        return effect;
    }

    protected onCasted():void {
        // Regenerate mana when casted succesfuly
        this.owner.regenerateManaPercentage(this._manaRegen[this.rank]);
    }
}

export class Pathfinding extends Ability {
    private _cooldown:number = 100000;
    private _manaCost:Array<number> = [0, 12, 19, 26, 33, 40]
    //private _duration:number = 10000;

    private _applyAura:abilityList = abilityList.ARCHER_PATHFINDING;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Pathfinding ${abilityData.rank}`;

        this.maxRank = 4;
        this.manaCost = this._manaCost[this.rank];
        this.applyAuraId = this._applyAura

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

export class CranialPunctures extends Ability {
    private _bonusCritical:Array<number> = [0, 0.04, 0.08, 0.12, 0.16, 0.20];

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Cranial Punctures ${abilityData.rank}`;
        this.maxRank = 4;

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} rank is out of bound`);

        let auraEffect:auraEffect = {
            id: this.id,
            name: this.name,
            bonusStats: {
                manaregen:0,
                block:0,
                mindamage: 0,
                maxdamage: 0,
                critical:this._bonusCritical[this.rank],
                haste:0,
                attackSpeed: 0,
            },
            hasDamageEffect: false,
            duration: -1,
            rank: this.rank
        }
    
        this.owner.applyAura(auraEffect);
    }
}

export class TemporalDilatation extends Ability {
    private _bonusHaste:Array<number> = [0, 0.03, 0.06, 0.09, 0.12, 0.15];
    private _duration:number = 300000;
    private _manaCost:Array<number> = [0, 10, 15, 20, 25, 30];
    private _cooldown:number = 120000

    private _applyAura:abilityList = abilityList.ARCHER_TEMPORAL_DILATATION;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Temporal Dilatation ${abilityData.rank}`;
        this.maxRank = 4;

        this.manaCost = this._manaCost[this.rank];
        this.applyAuraId = this._applyAura; // only for condition

        if (this.rank > this.maxRank || this.rank < 0)
            throw new Error(`APL DATA Error - ${this.name} - Rank is not in range`);
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
            name: "Temporal Dilatation",
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