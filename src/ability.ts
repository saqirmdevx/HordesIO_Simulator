import Player from "./player.js";
import Simulation from "./simulation.js";
import Main from "./main.js";
import Enemy, {EnemyListShuffle} from "./enemy.js";

import { Placeholders, __calcHasteBonus, __random } from "./misc.js";

export enum abilityList {
    WAR_SLASH = 0,
    WAR_CRESCENTSWIPE = 1,
    WAR_UNHOLYWARCRY = 2,

    WAR_CENTRIFUGAL_LACERATION = 3,
    WAR_ARMOR_REINFORCEMENT = 4,
    WAR_TAUNT = 5,
    WAR_CHARGE = 6,
    WAR_CRUSADERS_COURAGE = 7,

    WAR_BULWARK = 8,
    WAR_BULWARK_AURA_DAMAGE = 1000,

    WAR_COLOSSAL_RECONSTRUCTION = 9,
    WAR_TEMPERING = 10,

    /*** Mage abilites */
    MAGE_ICEBOLT = 20,
    //**Icebolt auras */
    MAGE_ICEBOLT_STACK = 2001,
    MAGE_ICEBOLT_FREEZE = 2002,
    MAGE_ICEBOLT_INSTANT = 2003,

    MAGE_ICICLEORB = 21,
    MAGE_CHILLINGRADIANCE = 22,
    MAGE_ENCHANT = 23,
    MAGE_ARCTIC_AURA = 24,
    MAGE_HYPOTHERMIC_FRENZY = 25,
    MAGE_ICE_SHIELD = 26,
    MAGE_TELEPORT = 27,

    /*** Archer Abilites */
    ARCHER_SWIFT_SHOT = 28,
    ARCHER_SWIFT_SHOT_INSTANT = 3000, /** Applied by precise shot */

    ARCHER_PRECISE_SHOT = 29,
    ARCHER_PRECISE_SHOT_INSTANT = 3001, /** Applied by Dash */

    ARCHER_DASH = 30,
    ARCHER_SERPENT_ARROWS = 31,
    ARCHER_POISON_ARROWS = 32,
    ARCHER_INVIGORATE = 33,
    ARCHER_PATHFINDING = 34,
    ARCHER_CRANIAL_PUNCTURES = 35, /** Passive */
    ARCHER_TEMPORAL_DILATATION = 36,

    /** Shaman Abilites ! Only DPS */ 
    SHAMAN_DECAY = 37,
    SHAMAN_PLAGUESPREADER = 38,
    SHAMAN_SOUL_HARVEST = 39,
    SHAMAN_CANINE_HOWL = 40,
    SHAMAN_MIMIRS_WELL = 41,
    SHAMAN_SPIRIT_ANIMAL = 42,

    /** item abilites */
    ITEM_SMALL_MANA_POTION = 5001,
    ITEM_MEDIUM_MANA_POTION = 5002,
    ITEM_LARGE_MANA_POTION = 5003,
    ITEM_TATTOOED_SKULL = 5004,

    ITEM_MANA_POTION_AURA = 6000,
}

/** This is used as input data */
export interface abilityData {
    id:abilityList,
    rank:number,
    condition: {
        mana?: {
            negated:boolean,
            value:number
        },
        aura?:Array<any>,
        cooldown?:abilityList
    },
    once:boolean
}

export interface spellEffect {
    baseDamage: number,
    bonusDamage: number,
    cooldown:number,
    castTime:number,
    canCrit?:boolean
}

export default abstract class Ability {
    public id:number;
    public rank:number;

    public owner:Player;

    public name:string = "undefined"; // Ability Name just for debuging

    public cooldown:number = 0;
    public triggerGlobal:boolean = true;

    public isAoe:boolean = false;
    public maxTargets:number = 20;

    public applyAuraId:number = 0;
    public forced:boolean = false;

    public manaCost:number = 0;
    public once:boolean = false;

    public isItem:boolean = false;

    private _storeEffect: spellEffect|null = null;

    private _conditions:any;
    get hasConditions():boolean {
        if (Object.keys(this._conditions).length > 0)
            return true;
        return false;
    }

    protected maxRank:number = 5;

    protected constructor(abilityData:abilityData, owner:Player) {
        this.id = abilityData.id;
        this.rank = abilityData.rank;
        this.owner = owner;
        this.once = abilityData.once;

        this._conditions = abilityData.condition;
    }

    public doUpdate(diff:number, timeElsaped:number):void {
        if (this.cooldown > 0)
            this.cooldown -= diff;
        
        if (this.owner.castTime < diff && this._storeEffect)
            this._done(this._storeEffect, timeElsaped);
    }

    /**
     * This function is called before ability is invoked (casted)
     * @param rank - Ability rank
     */
    protected prepare():spellEffect|undefined { return; }

    public cast(timeElsaped:number):void {
        let effect:spellEffect|undefined = this.prepare();

        if (!effect)
            return;

        if (this.triggerGlobal && !this.isItem)
            this.owner.globalCooldown = Math.round(__calcHasteBonus(Placeholders.GLOBAL_COOLDOWN, this.owner.hasteStat)) * 100;

        if (this.owner.id == 0 && Simulation.debug)
            if (effect.castTime > 0)
                Main.addCombatLog(`Cast: [${this.name}]`, timeElsaped);
        
        if (effect.castTime > 0) {
            this.owner.castTime =  Math.round(__calcHasteBonus(effect.castTime / 100, this.owner.hasteStat)) * 100;
            this._storeEffect = effect;
            return;
        }
        this._done(effect, timeElsaped);
    }

    /**
     * Ability _done is casted when ability is sucessfuly casted. This is first method which is invoked (cant be re-written in script)
     * It is followed by -> onCasted, doEffect, dealDamage, onImpact this is exact order
     */
    private _done(effect: spellEffect|undefined, timeElsaped:number):void {
        if (!effect)
            return;

        if (effect.cooldown > 0)
            this.cooldown = this.isItem ? effect.cooldown : Math.round(__calcHasteBonus(effect.cooldown / 100, this.owner.hasteStat)) * 100;

        if (this.manaCost)
            this.owner.mana -= this.manaCost;

        if (this.owner.id == 0 && Simulation.debug && !effect.baseDamage && !effect.bonusDamage)
            Main.addCombatLog(`Casted ${this.name}`, timeElsaped);

        this.onCasted(effect, timeElsaped);

        this._storeEffect = null;
    }

    /**
     * Rewritable method in script, invoked when cast is done. Here we are searching for targets and invoking doEffect for each target it hits
     */
    protected onCasted(effect:spellEffect, timeElsaped:number, {damageMod = 1, critMod = 0, randomizeTarget = false} = {}):void {
        /** If ability is AOE then deal damage multiple times */
        if (this.isAoe && Simulation.targets > 1) {
            let targets:number = Simulation.targets > this.maxTargets ? this.maxTargets : Simulation.targets;
            if (randomizeTarget) {
                let enemyList = new EnemyListShuffle(Enemy.list, targets, true);
                let target = enemyList.next();
                while (target) {
                    this.doEffect(target, effect, timeElsaped, {damageMod:damageMod, critMod: critMod});
                    target = enemyList.next();
                }
            }
            else
                for (let i = 0; i < targets; i++)
                    this.doEffect(Enemy.list[i], effect, timeElsaped, {damageMod:damageMod, critMod: critMod});
            return;
        }
        this.doEffect(Enemy.list[0], effect, timeElsaped, {damageMod:damageMod, critMod: critMod});
    }

    /**
     * Rewritable method in script - It is invoked by onCasted, This method can be invoked multiple times when ability is AOE
     */
    protected doEffect(target:Enemy, effect:spellEffect, timeElsaped:number, {damageMod = 1, critMod = 0, name = this.name} = {}):number {
        let damageDone:number = effect.baseDamage + __random(this.owner.mindamageStat, this.owner.maxdamageStat) * effect.bonusDamage / 100;

        if (damageDone > 0) {
            let critChance:number = this.owner.criticalStat + critMod;
            let isCrit:boolean = false;

            if (Math.random() < critChance){
                this.onCrit();
                isCrit = true; 
            }

            let damage = this.owner.dealDamage(target, damageDone, {timeElsaped: timeElsaped, name: name, isCrit: isCrit}, damageMod);
            this.onImpact(target, damage, effect, timeElsaped);
            return damage;
        }
        this.onImpact(target, 0, effect, timeElsaped);
        return 0;
    }

    public resetCooldown():void {
        this.cooldown = 0;
    }

    public reduceCoolown(time:number):void {
        if (!time)
            return;

        this.cooldown = this.cooldown - time;
    }

    public onCooldown():boolean {
        return this.cooldown > 0;
    }

    /** for customScripts if condition is passed it can cast */
    public castCondition():boolean {
        let result:boolean = true;
        if (this._conditions.mana) 
            result = this._conditions.mana.negated ? this.owner.getManaPercentage() < this._conditions.mana.value : this.owner.getManaPercentage() > this._conditions.mana.value;
    
        if (this._conditions.aura)
            for (const condition of this._conditions.aura) 
                if (this.owner.hasAura(condition.value) || Enemy.list[0].hasAura(condition.value, this.owner))
                    result = !condition.negated;

        if (this._conditions.cooldown) {
            let ability:Ability|undefined = this.owner.getAbility(this._conditions.cooldown.value);
            if (ability) 
                result = this._conditions.cooldown.negated ? !ability.onCooldown() : ability.onCooldown();
        }

        if (this._conditions.forced !== undefined)
            this.forced = this._conditions.forced;
        return result;
    }

    /** Hooks */
    protected onCrit():void {
        return;
    }

    /**
     * This method is invoked when target takes damage and everything is sucessfuly commited. Use this if you need invoke method after DamageDone
     * Auras applied by this method has no effect on current effect.
     * @param target - Hitted Target
     * @param damageDone - Damage dealt
     * @param effect - Effect
     * @param timeElsaped - Time elsaped
     */
    protected onImpact(target:Enemy, damageDone:number, effect:spellEffect, timeElsaped:number):void {
        return;
    }
}