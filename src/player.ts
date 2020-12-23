import Stats, { statTypes } from "./stats.js";
import Ability, { Aura, Ranks, abilites, abilityPriorList, abilityPrior, auraEffect } from "./ability.js";
import Main from "./main.js";
import { Placeholders, __calcHasteBonus } from "./placeholders.js";
import Simulation from "./simulation.js";

export default class player {
    public baseStats:statTypes;
    public bonusStats:statTypes; // this is applied when buffs are on
    public abilityList:Array<Ability> = [];
    public mana: number = Stats.mana;

    public id:number;

    public damageDone:number = 0;

    // conditions
    public globalCooldown:number = 0;
    public isCasting:boolean = false;

    public _activeAuras:Array<Aura> = [];

    //unuse now
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

        this.bonusStats = {
            manaregen: 0,
            defense: 0,
            block: 0,
            mindamage: 0,
            maxdamage: 0,
            critical: 0,
            haste: 0
        }

        Ranks.list.forEach((rank:number, abilityId:abilites) => {
            this.abilityList.push(new Ability(abilityId, rank, this));
        });
    }

    private _regenTime = 5000;
    public doUpdate(diff:number, tick:number):void {
        if (this.globalCooldown > 0)
            this.globalCooldown -= diff;

        /** Reset bonus stats */
        for (const [stat] of Object.entries(this.bonusStats)) 
            this.bonusStats[stat] = 0;

        if (this._activeAuras.length > 0) {
            this._activeAuras.forEach((aura:Aura, index:number) => {
                if (aura.toRemove) {
                    // delete aura from list if duration is over
                    this._activeAuras.splice(index, 1);
                    return;
                }

                aura.doUpdate(diff, tick);
                this._auraBuffEffects(aura);
            });
        }

        this._regenTime -= diff;
        if (this._regenTime < 0)
        {
            this.mana += this.baseStats.manaregen + this.bonusStats.manaregen;
            this._regenTime = 5000;
        }

        /** Run all abilites doUpdate */
        if (this.abilityList.length > 0)
            this.abilityList.forEach((ability:Ability) => { ability.doUpdate(diff); });

        if (this.globalCooldown <= 0 && !this.isCasting)
            this.doCast(diff, tick);

        this._auraDamageEffects(diff, tick);
        // doAutoattack future
    }

    public doCast(diff:number, tick:number):void {
        // Prioritze abilites start with buffs
        // CAST BUFFS
        for (const id of abilityPriorList[abilityPrior.BUFFS]) {
            let ability = this.getAbility(id);
            if (!ability || this.hasAura(id) || ability.cooldown > 0)
                continue;
    
            ability.cast();
            return;
        }

        // HIGH PRIORITY
        for (const id of abilityPriorList[abilityPrior.HIGH_PRIORITY]) {
            let ability = this.getAbility(id);
            if (!ability || (this.hasAura(id) && !ability.ignoreAura) || ability.cooldown > 0)
                continue;
    
            ability.cast();
            return;
        }

        // MEDIUM PRIORITY
        for (const id of abilityPriorList[abilityPrior.MEDIUM_PRIORITY]) {
            let ability = this.getAbility(id);
            if (!ability || (this.hasAura(id) && !ability.ignoreAura) || ability.cooldown > 0)
                continue;
    
            ability.cast();
            return;
        }

        // LOW PRIORITY
        for (const id of abilityPriorList[abilityPrior.LOW_PRIORITY]) {
            let ability = this.getAbility(id);
            if (!ability || (this.hasAura(id) && !ability.ignoreAura) || ability.cooldown > 0)
                continue;
    
            ability.cast();
            return;
        }
    }
    
    /*** Ability Functions ***/
    public getAbility(id:abilites):Ability|undefined {
        return this.abilityList.find(ability => ability.id == id);
    }

    /*** Aura functions ***/

    public hasAura(ability:abilites):boolean  {
        if (this._activeAuras.find(aura => aura.id == ability))
            return true;
        return false;
    }

    private _auraBuffEffects(aura:Aura):void {
        let eff = aura.getEffect();

        if (!eff.bonusStats)
            return;

        for (const [stat] of Object.entries(this.baseStats)) {
            this.bonusStats[stat] += eff.bonusStats[stat]
        }
    }

    private _tickIndexPop = 1;
    private _tickTimmer = 0;
    private _auraDamageEffects(diff:number, tick:number):void {
        this._tickTimmer += diff;
        if (this._tickTimmer >= __calcHasteBonus(1000, this.baseStats.haste + this.bonusStats.haste)) {
            this._tickIndexPop = this._tickIndexPop + this._tickIndexPop;

            if (this._activeAuras.length > 0)
            this._activeAuras.forEach((aura:Aura, index:number) => {
                let eff:auraEffect = aura.getEffect();
                if (!eff.hasDamageEffect)
                    return;
                
                if (eff.damageEffect && this._tickIndexPop % eff.damageEffect.tickIndex == 0)
                    this.doDamage(eff.damageEffect.baseDamage, eff.damageEffect.bonusDamage, true);
            });

            if (this._tickIndexPop % 4 == 0)
                this._tickIndexPop = 1;

            this._tickTimmer = 0;
        }
    }

    //*** Player damage function */

    /**
     * doDamage function do calculations
     * @param baseDamage - Flat value of Damage 
     * @param bonusDamage - %Damage based on min-max (Auras are counting average between min and max)
     */
    public doDamage(baseDamage:number, bonusDamage:number, isAura:boolean = false):void {
        let mindamage = this.baseStats.mindamage + this.bonusStats.mindamage;
        let maxdamage = this.baseStats.maxdamage + this.bonusStats.maxdamage;

        let critChance = this.baseStats.critical + this.bonusStats.critical; // roll 1-100

        let formular = Math.floor(baseDamage + (Math.random() * (maxdamage - mindamage) + maxdamage) * bonusDamage / 100);
        if (isAura)
            formular = Math.floor(baseDamage + ((mindamage + maxdamage) / 2) * bonusDamage / 100);

        if (Math.floor(Math.random() * 1000) < critChance * 10)
            formular = formular * Placeholders.CRITICAL_DAMAGE;
        
        this.damageDone += formular;

        if (this.id == 0)
            Main.vue.combatLog = `[${Simulation.timeElsaped}ms] - Damage Done: ${formular}\n` + Main.vue.combatLog;
    }
}