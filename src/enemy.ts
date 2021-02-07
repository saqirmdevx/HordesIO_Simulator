import Aura, {auraEffect} from "./aura.js";
import Player from "./player.js"
import Simulation from "./simulation.js";
import Main from "./main.js";
import { Placeholders } from "./misc.js"
import {abilityList} from "./ability.js";


export default class Enemy {
    public id:number;
    public static list:Array<Enemy> = [];

    public _activeAuras:Array<Aura> = [];
    private _mitigation:number = 0;
    //private _defense:number = 0;

    public isPlayer:boolean = false;

    constructor(id:number, mitigation:number) {
        this.id = id;
        this._mitigation = mitigation;
    }

    public doUpdate(diff:number, timeElsaped:number) {
        /** Update all active auras */
        for (let i = 0; i < this._activeAuras.length; i++) {
            this._activeAuras[i].doUpdate(diff, timeElsaped, this);

            if (this._activeAuras[i].toRemove) {
                this._activeAuras.splice(i, 1);
            }
        }
    }

    /*** Aura functions ***/
    public hasAura(auraId:abilityList, owner?:Player):boolean {
        if (owner)
            return this._activeAuras.some((aura:Aura) => aura.id == auraId && aura.owner.id == owner.id);
        return this._activeAuras.some((aura:Aura) => aura.id == auraId);
    }
    
    public getAuraById(auraId:number, owner?:Player):Aura|undefined {
        if (owner)
            return this._activeAuras.find((aura:Aura) => aura && aura.id == auraId && aura.owner.id == owner.id as number);
        return this._activeAuras.find((aura:Aura) => aura && aura.id == auraId as number);
    }

    public applyAura(effect:auraEffect, owner:Player):void {
        let findAura:Aura|undefined = this.getAuraById(effect.id, owner);
        if (findAura) {
            findAura.reapply(effect);
            return;
        }
        let aura:Aura = effect.script ? new effect.script(effect, owner) : new Aura(effect, owner);
        this._activeAuras.push(aura);
    }

    public damageTaken(damageDone:number, owner:Player, {timeElsaped, name, isCrit = false}):void {
        let damage = isCrit ? damageDone * Placeholders.CRITICAL_DAMAGE : damageDone;

        damage = this.damageReductions(damage);

        owner.damageDone += damage;

        if (owner.id == 0 && Simulation.debug)
            if (isCrit) /** Crit */
                Main.addCombatLog(`${name} - Damage Done: ${damage} CRIT`, timeElsaped);
            else
                Main.addCombatLog(`${name} - Damage Done: ${damage}`, timeElsaped);
    }

    public damageReductions(damage:number):number {
        damage = damage * (1 - this._mitigation);
        return Math.round(damage);
    }
}

export class EnemyListShuffle {
    private _list:Array<Enemy> = [];

    constructor(list:Array<Enemy>, size:number, countFirst:boolean = true) {
        this._list = [...list].slice(countFirst ? 0 : 1, size);
    }

    public next():Enemy|null {
        if (this._list.length == 0) 
            return null; // return last
        
        let generateIndex = Math.floor(Math.random() * (this._list.length));
        let enemy:Enemy = this._list[generateIndex];
        this._list.splice(generateIndex, 1);
        return enemy;
    }
}