import Player from "./player.js";
import Main from "./main.js"
import Simulation from "./simulation.js"

import { Placeholders, __calcHasteBonus } from "./placeholders.js";
import { statTypes } from "./stats.js";

import { UnholyWarcry, Slash, CrescentSwipe, ChillingRadiance, IceBolt, IcicleOrb } from "./ability_scripts.js";

export enum abilites {
    WAR_SLASH = 0,
    WAR_CRESCENTSWIPE = 1,
    WAR_UNHOLYWARCRY = 2,

    MAGE_ICEBOLT = 20,
    //**Icebolt auras */
    MAGE_ICEBOLT_STACK = 2001,
    MAGE_ICEBOLT_FREEZE = 2002,
    MAGE_ICEBOLT_INSTANT = 2003,

    MAGE_ICICLEORB = 21,
    MAGE_CHILLINGRADIANCE = 22
}

export enum abilityPrior {
    HIGH_PRIORITY,
    MEDIUM_PRIORITY,
    LOW_PRIORITY,
    BUFFS,
    PASSIVE
}

export let abilityPriorList:Array<any> = [];
abilityPriorList[abilityPrior.HIGH_PRIORITY] = [ 
    abilites.MAGE_CHILLINGRADIANCE 
];

abilityPriorList[abilityPrior.MEDIUM_PRIORITY] = [ 
    abilites.MAGE_ICICLEORB, 
    abilites.WAR_CRESCENTSWIPE 
];

abilityPriorList[abilityPrior.LOW_PRIORITY] = [ 
    abilites.MAGE_ICEBOLT, 
    abilites.WAR_SLASH 
];

abilityPriorList[abilityPrior.BUFFS] = [ 
    abilites.WAR_UNHOLYWARCRY 
];

export interface spellEffect {
    damageBase: number,
    damageBonus: number,
    applyAura:boolean,
    auraEffect?:auraEffect,
    cooldown:number,
    castTime:number,
    hasGlobal:boolean,
    manaCost:number,
    ignoreAura?:boolean
}

export default class Ability {
    public id:number;
    public rank:number;

    public owner:Player;

    public cooldown:number = 0;
    public ignoreAura:boolean = false;
    public castTime:number = 0;
    private _storeEffect?:spellEffect;

    constructor(id:abilites, rank:number, owner:Player)
    {
        this.id = id;
        this.rank = rank;
        this.owner = owner;
    }

    //testing
    public cast():void {
        let effect = this._spellEffect();

        if (effect.hasGlobal)
            this.owner.globalCooldown = Placeholders.GLOBAL_COOLDOWN;

        if (this.owner.id == 0)
            if (effect.castTime > 0)
                Main.vue.combatLog = `[${Simulation.timeElsaped}ms] - Casting ability: [${this.id}]\n` + Main.vue.combatLog;
        
        if (effect.castTime > 0) {
            this.castTime = __calcHasteBonus(effect.castTime, this.owner.baseStats.haste + this.owner.bonusStats.haste); // add haste formular
            this.owner.isCasting = true;

            this._storeEffect = effect;
            return;
        }
        this._done(effect);
    }

    /** When cast is done */
    private _done(effect:spellEffect):void {
        if (this.owner.id == 0)
            Main.vue.combatLog = `[${Simulation.timeElsaped}ms] - cast: [${this.id}]\n` + Main.vue.combatLog;

        if (effect.damageBase > 0 || effect.damageBonus > 0)
            this.owner.doDamage(effect.damageBase, effect.damageBonus);

        if (effect.applyAura && effect.auraEffect) {
            let aura:Aura = new Aura(this.id, effect.auraEffect.duration, effect.auraEffect)
            this.owner._activeAuras.push(aura);
        }

        if (effect.cooldown)
            this.cooldown = __calcHasteBonus(effect.cooldown, this.owner.baseStats.haste + this.owner.bonusStats.haste);

        if (effect.manaCost > 0)
            this.owner.mana = 0;

        if (effect.ignoreAura)
            this.ignoreAura = true;

        this.owner.isCasting = false;
        if (this._storeEffect)
            this._storeEffect = undefined; // empty stored effect
    }

    public doUpdate(diff:number):void {
        if (this.cooldown > 0)
            this.cooldown -= diff;
        
        if (this.castTime > 0)
            this.castTime -= diff;
        
        if (this.owner.isCasting && this.castTime <= 0)
            if (this._storeEffect)
                this._done(this._storeEffect);
    }

    /** Do cast Scripts */
    private _spellEffect():spellEffect {
        let effect:spellEffect = {
            damageBase: 0,
            damageBonus: 0,
            applyAura: false,
            cooldown: 0,
            castTime: 0,
            hasGlobal: true,
            manaCost: 0
        }

        switch (Number(this.id)) {
            case abilites.WAR_SLASH:
                return Slash.getEffect(this.rank);
            case abilites.WAR_CRESCENTSWIPE:
                return CrescentSwipe.getEffect(this.rank, 0);
            case abilites.WAR_UNHOLYWARCRY:
                return UnholyWarcry.getEffect(this.rank);
            case abilites.MAGE_ICEBOLT:
                return IceBolt.getEffect(this.rank, false);
            case abilites.MAGE_ICICLEORB:
                return IcicleOrb.getEffect(this.rank);
            case abilites.MAGE_CHILLINGRADIANCE:
                return ChillingRadiance.getEffect(this.rank);
            default: break;
        }
        return effect;
    }
}

export interface auraEffect {
        bonusStats?: statTypes,
        damageEffect?: { baseDamage: number, bonusDamage:number, tickIndex: number},
        hasDamageEffect: boolean,
        duration: number
}

export class Aura {
    public id:number;
    public duration:number;
    private _effect:auraEffect;

    public tickTime:number = 0;
    public stack:number = 1;

    public toRemove:boolean = false;

    constructor(ability:abilites, duration: number, effect:auraEffect) {
        this.id = ability;
        this.duration = duration;

        this._effect = effect;

        this.tickTime = this._effect.damageEffect ? this._effect.damageEffect.tickIndex * 1000 : 0;
    }

    public doUpdate(diff:number, tick:number):void {
        this.duration -= diff;

        if (this.duration <= 0)
            this.expire();

        if (this.tickTime > 0)
            this.tickTime -= diff;
    }

    public expire():void {
        this.delete();
    }

    public delete():void {
        this.toRemove = true;
    }

    public getEffect():auraEffect {
        return this._effect;
    }
}

export class Ranks {
    /** Abilites **/
    public static list:Map<abilites, number> = new Map();

    public static set(ability:abilites, value:number):void {
        if (value == 0) {
            if (this.list.has(ability))
                this.list.delete(ability);
            return;
        }
        this.list.set(ability, value);
    }

    public static get(ability:abilites):abilites | undefined {
        if (this.list.has(ability))
            return this.list.get(ability);
        else
            return 0;
    }

    public static has(ability:abilites):boolean {
        if (this.list.has(ability))
            return this.list.get(ability) as number > 0;
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