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
        block: 0.15,
        mindamage: 100,
        maxdamage: 150,
        critical: 0.15,
        haste: 0.15
    }

    public static mana:number = 300;
    
    /**
     * change stats value. It returns its value
     * @param type - Stat Type
     * @param value - Value of stat
     */
    public static set(type:string, value:number):void {
        this._state(type, value);
    }

    /**
     * return a value of stat
     * @param type - Stat Type
     */
    public static get(type:string):number {
        return this._state(type);
    }

    /** ???? Need better solution */
    private static _state(stat:string, set:number = 0): number {
        if (stat === "mana") 
            return this.mana = set;

        if (stat in this.type)
            return this.type[stat] = set;
        return 0;
    }
}