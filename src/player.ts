import Stats, { statTypes } from "./stats.js";
import Ability, { Ranks, abilityList, abilityPrior } from "./ability.js";
import Aura from "./aura.js";
import Main from "./main.js";
import {  __calcHasteBonus, __random } from "./placeholders.js";

import * as MageScripts from "./scripts/mage.js";
import * as WarriorScripts from "./scripts/warrior.js";
import * as DefaultScripts from "./scripts/default.js";

export default class Player {
    public baseStats:statTypes;
    public bonusStats:statTypes = {
        manaregen: 0,
        defense: 0,
        block: 0,
        mindamage: 0,
        maxdamage: 0,
        critical: 0,
        haste: 0 
    };

    public mana:number = Stats.mana;
    public maxMana:number = Stats.mana;

    public id:number;

    public damageDone:number = 0;

    // conditions
    public globalCooldown:number = 0;
    public castTime:number = 0;

    public _activeAuras:Array<Aura> = [];
    private _abilityList:Array<Ability> = [];

    public damageTaken:number = 0;


    constructor(id:number) {
        this.id = id;

        /** Initialize stats */
        this.baseStats = { 
            manaregen: Stats.type.manaregen,
            defense: Stats.type.defense,
            block: Stats.type.block,
            mindamage: Stats.type.mindamage,
            maxdamage: Stats.type.maxdamage,
            critical: Stats.type.critical,
            haste: Stats.type.haste
        }
        Ranks.list.forEach((rank:number, abilityId:abilityList) => {
            /** Search for ability class / script and add it into list */
            let ability:Ability|undefined = this.getAbilityById(Number(abilityId), rank);
            if (ability)
                this._abilityList.push(ability);
        });

        /** Sort by priority */
        this._abilityList.sort((a:Ability, b:Ability) => a.priority > b.priority ? -1 : 1);
    }

    private _regenTime = 5000;
    public doUpdate(diff:number, timeElsaped:number):void {
        if (this.globalCooldown > 0)
            this.globalCooldown -= diff;

        if (this.castTime > 0)
            this.castTime -= diff;

        this._regenTime -= diff;
        if (this._regenTime < 0) {
            if (this.getManaPercentage() < 100)
                this.regenMana(this.baseStats.manaregen + this.bonusStats.manaregen);

            this._regenTime = 5000;
        }

        /** Update all active auras */
        for (let i = 0; i < this._activeAuras.length; i++) {
            this._activeAuras[i].doUpdate(diff, timeElsaped);

            if (this._activeAuras[i].toRemove) {
                this._activeAuras.splice(i, 1);
                Main.vue.activeAuras.splice(i, 1);
            }
        }

        /** Update all abilites */
        for (let i = 0; i < this._abilityList.length; i++) 
            this._abilityList[i].doUpdate(diff, timeElsaped);

        if (this.globalCooldown <= 0 && !this.isCasting())
            this.doCast(timeElsaped);
    }

    public doCast(timeElsaped:number):void {
        for (const ability of this._abilityList) {
            if (ability.priority == abilityPrior.PASSIVE)
                continue;

            if (ability.manaCost > this.mana)
                continue;

            if (ability.cooldown > 0)
                continue;

            if (ability.applyAuraId && !ability.ignoreAura)
                if (this.hasAura(ability.applyAuraId))
                    continue;

            if (!ability.castCondition())
                continue;

            ability.cast(timeElsaped);
            if (ability.hasGlobal)
                return;
            else
                continue;
        }
    }

    /** There should be better way to connect enums with class rework in future */
    public getAbilityById(abilityId:abilityList, rank:number):Ability|undefined {
        switch (abilityId) {
            /** Warrior abilites */
            case abilityList.WAR_SLASH: 
                return new WarriorScripts.Slash(abilityId, rank, this);
            case abilityList.WAR_CRESCENTSWIPE: 
                return new WarriorScripts.CrescentSwipe(abilityId, rank, this);
            case abilityList.WAR_CENTRIFUGAL_LACERATION: 
                return new WarriorScripts.CentrifugalLaceration(abilityId, rank, this);
            case abilityList.WAR_UNHOLYWARCRY: 
                return new WarriorScripts.UnholyWarcry(abilityId, rank, this);
            case abilityList.WAR_ARMOR_REINFORCEMENT: 
                return new WarriorScripts.ArmorReinforcement(abilityId, rank, this);
            case abilityList.WAR_TAUNT: 
                return new WarriorScripts.Taunt(abilityId, rank, this);
            case abilityList.WAR_CHARGE: 
                return new WarriorScripts.Charge(abilityId, rank, this);
            case abilityList.WAR_CRUSADERS_COURAGE: 
                return new WarriorScripts.CrusadersCourage(abilityId, rank, this);
            case abilityList.WAR_COLOSSAL_RECONSTRUCTION:
                return new WarriorScripts.ColossalReconstruction(abilityId, rank, this);
            case abilityList.WAR_BULWARK:
                return new WarriorScripts.Bulwark(abilityId, rank, this);
            /*** Mage Abilites */    
            case abilityList.MAGE_ICEBOLT: 
                return new MageScripts.IceBolt(abilityId, rank, this);
            case abilityList.MAGE_ICICLEORB: 
                return new MageScripts.IcicleOrb(abilityId, rank, this);
            case abilityList.MAGE_CHILLINGRADIANCE: 
                return new MageScripts.ChillingRadiance(abilityId, rank, this);
            case abilityList.MAGE_ENCHANT: 
                return new MageScripts.Enchant(abilityId, rank, this);
            case abilityList.MAGE_ARCTIC_AURA:
                return new MageScripts.ArcticAura(abilityId, rank, this);
            case abilityList.MAGE_HYPOTHERMIC_FRENZY:
                return new MageScripts.HypothermicFrenzy(abilityId, rank, this);
            case abilityList.MAGE_ICE_SHIELD:
                return new MageScripts.IceShield(abilityId, rank, this);
            case abilityList.MAGE_TELEPORT:
                return new MageScripts.Teleport(abilityId, rank, this);
            /** Default */
            case abilityList.DEFAULT_POTION: 
                return new DefaultScripts.ManaPotion(abilityId, rank, this);
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
        if (this._activeAuras.some((aura:Aura) => aura.id == auraId as number))
            return true;
        return false;
    }

    public applyAura(aura:Aura):void {
        this._activeAuras.push(aura);
    }
    
    public getAuraById(auraId:number):Aura|undefined {
        let found = this._activeAuras.find((aura:Aura) => aura.id == auraId as number);
        return found ? found : undefined;
    }

    public isCasting():boolean {
        return this.castTime > 0;
    }

    public getManaPercentage():number {
        return Math.floor(this.mana / this.maxMana * 100);
    }
    
    //*** Player damage function */
    /**
     * doDamage function do calculations
     * @param baseDamage - Flat value of Damage 
     * @param bonusDamage - %Damage based on min-max (Auras are counting average between min and max)
     */
    public dealDamage(baseDamage:number, bonusDamage:number, modifier:number, timeElsaped:number, isAura:boolean = false):void {
        let mindamage:number = this.baseStats.mindamage + this.bonusStats.mindamage;
        let maxdamage:number = this.baseStats.maxdamage + this.bonusStats.maxdamage;

        let formular:number = Math.floor(baseDamage + __random(mindamage, maxdamage) * bonusDamage / 100);
        if (isAura)
            formular = Math.floor(baseDamage + (mindamage + maxdamage) / 2 * bonusDamage / 100);

        formular = modifier > 0 ? formular * modifier : formular;

        formular = this.damageReductions(formular);
    
        this.damageDone += formular;

        if (this.id == 0 && Main.vue.debugText)
            Main.addCombatLog(`Damage Done: ${formular} modifier: ${modifier}`, timeElsaped);
    }

    public damageReductions(damage:number):number {
        let reducedDamage:number = damage;
        reducedDamage = reducedDamage * (1 - Main.vue.mitigation);

        return Math.floor(reducedDamage);
    }

    public regenMana(mana:number):void {
        this.mana += mana;
        if (this.mana > this.maxMana)
            this.mana = this.maxMana;
    }
}