import Ability, { spellEffect, abilityList, abilityData } from "../ability.js";
import Player from "../player.js";

import { auraEffect } from "../aura.js";
import * as AuraScript from "../aura_scripts.js";

// /*** Mage abilites */
export class ManaPotion extends Ability {
    // Placeholder Values
    private _cooldown:number = 30000;
    private _duration:number = 15000;

    private _applyAura:abilityList = abilityList.MANA_POTION_AURA;

    constructor(abilityData:abilityData, owner:Player) {
        super(abilityData, owner);
        this.name = `Mana Potion ${abilityData.rank}`;

        this.maxRank = 3;

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
        this.hasGlobal = false;
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
            script: AuraScript.ManaPotion
        }
        this.owner.applyAura(auraEffect);
    }
}
