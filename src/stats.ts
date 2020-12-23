export interface statTypes {
    manaregen:number,
    defense:number,
    block:number,
    mindamage:number,
    maxdamage:number,
    critical:number,
    haste:number
}

export default class Stats {

    public static type:statTypes = {
        manaregen: 10,
        defense: 500,
        block: 20,
        mindamage: 100,
        maxdamage: 150,
        critical: 15,
        haste: 15
    }

    public static mana:number = 300;
    
    /**
     * change stats value. It returns its value
     * @param type - Stat Type
     * @param value - Value of stat
     */
    public static set(type:any, value:number):number {
        return this._state(type, value);
    }

    /**
     * return a value of stat
     * @param type - Stat Type
     */
    public static get(type:any):number {
        return this._state(type);
    }

    /** ???? Need better solution */
    private static _state(stat:any, set?:number): number {
        if (!this.type[stat])
            return 0;
        
        if (set)
            this.type[stat] = set;
        return this.type[stat];
    }
}