import Ability, { spellEffect, abilityList, abilityData } from "../ability.js";
import Player from "../player.js";

import { auraEffect } from "../aura.js";
import * as AuraScripts from "../aura_scripts.js";

// /*** Mage abilites */
export class ManaPotion extends Ability {
    // Placeholder Values
    private _cooldown:number = 30000;
    private _duration:number = 15000;

    private _applyAura:abilityList = abilityList.ITEM_MANA_POTION_AURA;

    constructor(abilityData:abilityData, owner:Player, rank:number) {
        super(abilityData, owner);

        this.rank = rank;
        this.maxRank = 3;
        this.isItem = true;

        this.name = "[Item] "

        switch (rank) {
            case 1: this.name += "Small mana potion"; break;
            case 2: this.name += "Medium mana potion"; break;
            case 3: this.name += "Large mana potion"; break;
            default: break;
        }

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
        this.applyAuraId = this._applyAura; // only for condition
        this.triggerGlobal = false;
        return effect;
    }
    /**
     * OnImpact is called when ability is casted succesfuly (Done) this is how we apply auras 
     * @param effect - unused here
     * @param timeElsaped - unused here
     */
    public onCasted():void {
        // start with 3 stacks of instabolt
        let auraEffect:auraEffect = {
            id: this._applyAura,
            name: "Mana Potion",
            hasDamageEffect: false,
            duration: this._duration,
            rank: this.rank,
            script: AuraScripts.ManaPotion
        }
        this.owner.applyAura(auraEffect);
    }
}

export class TatooedSkull extends Ability {
    // Placeholder Values
    private _bonusDamage:number = 0.2; // we multiply by rank
    private _duration:number = 10000;
    private _cooldown:number = 60000;

    private _applyAura:abilityList = abilityList.ITEM_TATTOOED_SKULL;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `[Item] Tattooed skull`;

        this.isItem = true
        this.maxRank = 1;

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

        this.applyAuraId = this._applyAura; // only for condition
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
            name: this.name,
            bonusStatsPercentage:  {
                manaregen:0,
                block: 0,
                mindamage: this._bonusDamage, /** 0 Base damage we give only % */
                maxdamage: this._bonusDamage, /** 0 Base damage we give only % */
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