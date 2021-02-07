import Ability, { abilityList, abilityData } from "./ability.js";
import Aura, { auraEffect } from "./aura.js";
import Main from "./main.js";
import Simulation from "./simulation.js";
import { __calcHasteBonus, __random } from "./misc.js";
import Enemy from "./enemy.js"

import * as MageScripts from "./scripts/mage.js";
import * as WarriorScripts from "./scripts/warrior.js";
import * as ArcherScripts from "./scripts/archer.js";
import * as ShamanScripts from "./scripts/shaman.js";
import * as ItemScripts from "./scripts/items.js";

export interface statTypes {
    manaregen:number,
    block:number,
    mindamage:number,
    maxdamage:number,
    critical:number,
    haste:number,
    attackSpeed:number
}

export default class Player {
    private _baseStats:statTypes;
    private _bonusStats:statTypes = {
        manaregen: 0,
        block: 0,
        mindamage: 0,
        maxdamage: 0,
        critical: 0,
        haste: 0,
        attackSpeed: 0
    };

    private _bonusStatsPercentage:statTypes = {
        manaregen: 0,
        block: 0,
        mindamage: 0,
        maxdamage: 0,
        critical: 0,
        haste: 0,
        attackSpeed: 0
    };

    public mana:number;
    public maxMana:number;

    public id:number;

    public damageDone:number = 0;

    // conditions
    public globalCooldown:number = 0;
    public castTime:number = 0;
    private _autoAttackTimmer:number = 0;

    public _activeAuras:Array<Aura> = [];
    private _abilityList:Array<Ability> = [];
    private _abilityQueue:Array<Ability> = [];
    private _abilityQueueLength:number;

    public damageTaken:number = 0;

    public hasAutoattack:boolean;

    public isPlayer:boolean = true;

    constructor(id:number, stats:statTypes, mana:number, abilityList:Array<any>, abilityQue:Array<number>, hasAutoattack:boolean = false) {
        this.id = id;

        /** Initialize stats */
        this.maxMana = mana;
        this.mana = mana;

        this.hasAutoattack = hasAutoattack;

        if (Simulation.debug) {
            Main.vue.mana = this.mana;
            Main.vue.maxMana = this.maxMana;
        }

        this._baseStats = { 
            manaregen: stats.manaregen ?? 0,
            block: stats.block ?? 0,
            mindamage: stats.mindamage ?? 0,
            maxdamage: stats.maxdamage ?? 0,
            critical: stats.critical ?? 0,
            haste: stats.haste ?? 0,
            attackSpeed: stats.attackSpeed ?? 0
        }

        /** Parse abilites from APL script */
        for (const ability of abilityList) {
            /** Search for ability class / script and add it into list */
            let abilityScript:Ability|undefined = this._getAbilityScripts(ability);
            if (abilityScript)
                this._abilityList.push(abilityScript);
        }

        /** Sort by priority */
        for (const id of abilityQue) {
            let ability:Ability|undefined = this.getAbility(id);
            if (ability)
                this._abilityQueue.push(ability);
        }

        this._abilityQueueLength = this._abilityQueue.length - 1;
    }

    private _regenTime = 5000;
    /**
     * doUpdate fired in simulation each (updateTime/diff)
     * @param diff - Update Time
     * @param timeElsaped - Time elsaped from start
     */
    public doUpdate(diff:number, timeElsaped:number):void {
        if (this.globalCooldown > 0)
            this.globalCooldown -= diff;

        if (this.castTime > 0)
            this.castTime -= diff;

        if (this.hasAutoattack) {
            if (this._autoAttackTimmer < diff)
                this.commitAutoattack(timeElsaped);
            else
                this._autoAttackTimmer -= diff;
        }

        this._regenTime -= diff;
        if (this._regenTime < diff) {
            if (this.getManaPercentage() < 100)
                this.regenerateMana(this.manaregenStat);
            this._regenTime = 5000;
        }

        if (Simulation.slowMotion && Simulation.debug && timeElsaped % 200 === 0)
            Main.vue.mana = this.mana;

        /** Update all active auras -> fire doUpdate on all auras and remove those whcih are inactive */
        for (let i = 0; i < this._activeAuras.length; i++) {
            this._activeAuras[i].doUpdate(diff, timeElsaped);

            if (this._activeAuras[i].toRemove) {
                this._activeAuras.splice(i, 1);
                if (Simulation.slowMotion && Simulation.debug)
                    Main.vue.activeAuras.splice(i, 1);
            }
        }

        /** Update all abilites */
        for (let i = 0; i < this._abilityList.length; i++) 
            this._abilityList[i].doUpdate(diff, timeElsaped);

        if (!this.isCasting){
            this._jumps = 0;
            this.doCast(timeElsaped, this._queIndex);
        }
    }

    private _queIndex:number = 0;
    private _jumps:number = 0; /** Max jumps to prevent stuck */
    public doCast(timeElsaped:number, queIndex:number):void {
        if (this._jumps > this._abilityQueueLength)
            return;

        this._jumps++;

        if (queIndex > this._abilityQueueLength)
            queIndex = 0

        let ability:Ability = this._abilityQueue[queIndex];
        if (!ability) {
            this._queIndex = 0;
            return;
        }

        if (!ability.isItem && this.globalCooldown > 0)
            return;

        if (ability.cooldown > 0 || ability.manaCost > this.mana) {
            this.doCast(timeElsaped, queIndex + 1);
            return;
        }

        if (ability.applyAuraId && !ability.forced)
            if (this.hasAura(ability.applyAuraId)) {
                this.doCast(timeElsaped, queIndex + 1);
                return;
            }

        if (ability.hasConditions && !ability.castCondition()) {
            this.doCast(timeElsaped, queIndex + 1);
            return;
        }

        if (ability.once) {
            let index = this._abilityQueue.findIndex((ab) => ab == ability);
            this._abilityQueue.splice(index, 1);
            this._abilityQueueLength = this._abilityQueue.length - 1;
        }

        ability.cast(timeElsaped);

        this._queIndex = ++queIndex;
        this._jumps = 0;
        if (this._queIndex > this._abilityQueueLength)
            this._queIndex = 0;

        if (!ability.triggerGlobal || ability.isItem) {
            this.doCast(timeElsaped, queIndex);
        }
        return;
    }

    public commitAutoattack(timeElsaped:number):void {
        this._autoAttackTimmer = Math.round(__calcHasteBonus(1000 / this.attackSpeedStat, this.hasteStat)) * 100;
        let damageDone:number = Math.floor(__random(this.mindamageStat, this.maxdamageStat));

        if (Math.random() < this.criticalStat)
            this.dealDamage(Enemy.list[0], damageDone, {isCrit: true, timeElsaped: timeElsaped, name: "Auto Attack"});
        else
            this.dealDamage(Enemy.list[0], damageDone, {timeElsaped: timeElsaped, name: "Auto Attack"});
    }

    /** There should be better way to connect enums with class rework in future */
    private _getAbilityScripts(abilityData:abilityData):Ability|undefined {
        switch (abilityData.id) {
            /** Warrior abilites */
            case abilityList.WAR_SLASH: 
                return new WarriorScripts.Slash(abilityData, this);
            case abilityList.WAR_CRESCENTSWIPE: 
                return new WarriorScripts.CrescentSwipe(abilityData, this);
            case abilityList.WAR_CENTRIFUGAL_LACERATION: 
                return new WarriorScripts.CentrifugalLaceration(abilityData, this);
            case abilityList.WAR_UNHOLYWARCRY: 
                return new WarriorScripts.UnholyWarcry(abilityData, this);
            case abilityList.WAR_ARMOR_REINFORCEMENT: 
                return new WarriorScripts.ArmorReinforcement(abilityData, this);
            case abilityList.WAR_TAUNT: 
                return new WarriorScripts.Taunt(abilityData, this);
            case abilityList.WAR_CHARGE: 
                return new WarriorScripts.Charge(abilityData, this);
            case abilityList.WAR_CRUSADERS_COURAGE: 
                return new WarriorScripts.CrusadersCourage(abilityData, this);
            case abilityList.WAR_COLOSSAL_RECONSTRUCTION:
                return new WarriorScripts.ColossalReconstruction(abilityData, this);
            case abilityList.WAR_BULWARK:
                return new WarriorScripts.Bulwark(abilityData, this);
            /*** Mage Abilites */    
            case abilityList.MAGE_ICEBOLT: 
                return new MageScripts.IceBolt(abilityData, this);
            case abilityList.MAGE_ICICLEORB: 
                return new MageScripts.IcicleOrb(abilityData, this);
            case abilityList.MAGE_CHILLINGRADIANCE: 
                return new MageScripts.ChillingRadiance(abilityData, this);
            case abilityList.MAGE_ENCHANT: 
                return new MageScripts.Enchant(abilityData, this);
            case abilityList.MAGE_ARCTIC_AURA:
                return new MageScripts.ArcticAura(abilityData, this);
            case abilityList.MAGE_HYPOTHERMIC_FRENZY:
                return new MageScripts.HypothermicFrenzy(abilityData, this);
            case abilityList.MAGE_ICE_SHIELD:
                return new MageScripts.IceShield(abilityData, this);
            case abilityList.MAGE_TELEPORT:
                return new MageScripts.Teleport(abilityData, this);
            /** Archer Abilites */
            case abilityList.ARCHER_SWIFT_SHOT: 
                return new ArcherScripts.SwiftShot(abilityData, this);
            case abilityList.ARCHER_PRECISE_SHOT: 
                return new ArcherScripts.PreciseShot(abilityData, this);
            case abilityList.ARCHER_DASH: 
                return new ArcherScripts.Dash(abilityData, this);
            case abilityList.ARCHER_SERPENT_ARROWS:
                return new ArcherScripts.SerpentArrows(abilityData, this);
            case abilityList.ARCHER_POISON_ARROWS:
                return new ArcherScripts.PoisonArrows(abilityData, this);
            case abilityList.ARCHER_INVIGORATE:
                return new ArcherScripts.Invigorate(abilityData, this);
            case abilityList.ARCHER_PATHFINDING:
                return new ArcherScripts.Pathfinding(abilityData, this);
            case abilityList.ARCHER_CRANIAL_PUNCTURES:
                return new ArcherScripts.CranialPunctures(abilityData, this);
            case abilityList.ARCHER_TEMPORAL_DILATATION:
                return new ArcherScripts.TemporalDilatation(abilityData, this);
            /** Shaman */
            case abilityList.SHAMAN_DECAY:
                return new ShamanScripts.Decay(abilityData, this);
            case abilityList.SHAMAN_PLAGUESPREADER:
                return new ShamanScripts.Plaguespreader(abilityData, this);
            case abilityList.SHAMAN_SOUL_HARVEST:
                return new ShamanScripts.SoulHarvest(abilityData, this);
            case abilityList.SHAMAN_CANINE_HOWL:
                return new ShamanScripts.CanineHowl(abilityData, this);
            case abilityList.SHAMAN_MIMIRS_WELL:
                return new ShamanScripts.MimirsWell(abilityData, this);
            case abilityList.SHAMAN_SPIRIT_ANIMAL:
                return new ShamanScripts.SpiritAnimal(abilityData, this);
            /** Default */
            case abilityList.ITEM_SMALL_MANA_POTION: 
                return new ItemScripts.ManaPotion(abilityData, this, 1);
            case abilityList.ITEM_MEDIUM_MANA_POTION: 
                return new ItemScripts.ManaPotion(abilityData, this, 2);
            case abilityList.ITEM_LARGE_MANA_POTION: 
                return new ItemScripts.ManaPotion(abilityData, this, 3);
            case abilityList.ITEM_TATTOOED_SKULL: 
                return new ItemScripts.TatooedSkull(abilityData, this);
            default:
                return undefined;
        }
    }

    public getAbility(id:abilityList):Ability|undefined {
        return this._abilityList.find((ability:Ability) => ability.id == id);
    }

    public hasAbility(id:abilityList):Boolean {
        return this._abilityList.some((ability:Ability) => ability.id == id);
    }

    /*** Aura functions ***/
    public hasAura(auraId:abilityList):boolean {
        return this._activeAuras.some((aura:Aura) => aura.id == auraId);
    }
    
    public getAuraById(auraId:number):Aura|undefined {
        return this._activeAuras.find((aura:Aura) => aura && aura.id == auraId);
    }

    public getManaPercentage():number {
        return Math.floor(this.mana / this.maxMana * 100);
    }

    /** Generic function to get stat by name */
    public getStatByName(stat:string):number {
        if (stat in this._baseStats && stat in this._bonusStats)
            return this._baseStats[stat] + this._bonusStats[stat] * (1 + this._bonusStatsPercentage[stat]);
        return 0;
    }

    /** Getter functions */
    get manaregenStat():number {
        return (this._baseStats.manaregen + this._bonusStats.manaregen) * (1 + this._bonusStatsPercentage.manaregen);
    }

    get blockStat():number {
        return (this._baseStats.block + this._bonusStats.block) * (1 + this._bonusStatsPercentage.block);
    }

    get mindamageStat():number {
        return (this._baseStats.mindamage + this._bonusStats.mindamage) * (1 + this._bonusStatsPercentage.mindamage);
    }

    get maxdamageStat():number {
        return (this._baseStats.maxdamage + this._bonusStats.maxdamage) * (1 + this._bonusStatsPercentage.maxdamage);
    }

    get criticalStat():number {
        return (this._baseStats.critical + this._bonusStats.critical) * (1 + this._bonusStatsPercentage.critical);
    }

    get hasteStat():number {
        return (this._baseStats.haste + this._bonusStats.haste) * (1 + this._bonusStatsPercentage.haste);
    }

    get attackSpeedStat():number {
        return (this._baseStats.attackSpeed + this._bonusStats.attackSpeed) * (1 + this._bonusStatsPercentage.attackSpeed);
    }

    get isCasting():boolean { return this.castTime > 0 };

    /** Stat bonuses */
    public addBonusStat(stat:string, value:number, percentage:boolean = false):void {
        if (percentage) {
            if (this._bonusStatsPercentage.hasOwnProperty(stat))
                this._bonusStatsPercentage[stat] = this._bonusStatsPercentage[stat] + value;
        }
        else {
            if (this._bonusStats.hasOwnProperty(stat))
                this._bonusStats[stat] += value;
        }
    }

    public removeBonusStat(stat:string, value:number, percentage:boolean = false):void {
        if (percentage) {
            if (this._bonusStatsPercentage.hasOwnProperty(stat))
                this._bonusStatsPercentage[stat] = this._bonusStatsPercentage[stat] - value;
        }
        else {
            if (this._bonusStats.hasOwnProperty(stat))
                this._bonusStats[stat] -= value;
        }
    }

    //*** Player apply function */
    public applyAura(effect:auraEffect):void {
        let findAura:Aura|undefined = this.getAuraById(effect.id);
        if (findAura) {
            findAura.reapply(effect);
            return;
        }
        let aura:Aura;
        if (effect.script)
            aura = new effect.script(effect, this);
        else
            aura = new Aura(effect, this);

        this._activeAuras.push(aura);
    }

    /**
     * doDamage function do calculations
     * @param baseDamage - Flat value of Damage 
     * @param bonusDamage - %Damage based on min-max (Auras are counting average between min and max)
     * !! Always return base damage before reductions & modifications (I.e crit etc)
     */
    public dealDamage(target:Enemy, damageDone:number, {timeElsaped, name, isCrit = false}, modifier:number = 1, isAura:boolean = false):number {
        let damage:number = modifier > 0 ? damageDone * modifier : damageDone;

        target.damageTaken(damage, this, {timeElsaped, name, isCrit});

        return damage;
    }

    public regenerateMana(mana:number):void {
        this.mana += mana;
        if (this.mana > this.maxMana)
            this.mana = this.maxMana;
    }

    public regenerateManaPercentage(manaPercentage:number, remainManaPercentage:number = 0):void {
        this.mana += Math.floor(this.maxMana * manaPercentage);
        this.mana += Math.floor(this.mana * remainManaPercentage);
        if (this.mana > this.maxMana)
            this.mana = this.maxMana;
    }
}