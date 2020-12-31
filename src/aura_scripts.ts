import Aura, { auraEffect } from "./aura.js";
import Player from "./player.js";

export class MageIceboltInstant extends Aura {
    constructor(effect:auraEffect, owner:Player) {
        super(effect, owner);
    }

    public onExpire():void {
        // Reset duration and apply next stack
        this.duration = 8000;
        this._stacks += this._stacks < this._maxStacks ? 1 : 0;
    }

    // this ability can have 0 stacks where this effect is not working
    public removeStack():void {
        if (this._stacks > 0)
            this._stacks -= 1;
    }
}