export enum Placeholders {
    CRITICAL_DAMAGE = 2.0, // 200%
    GLOBAL_COOLDOWN = 15 // 1.5sec (* 100)
}

/**
 * Calculate time after haste modifier
 * @param time - Base time in ms
 * @param haste - haste % (stats)
 */
export var __calcHasteBonus = (time:number, haste:number):number => time / (1 + haste);

/**
 * roll a random value between Min and Max 
 * @param min - Min value
 * @param max - Max value
 */
export var __random = (min:number, max:number) => Math.floor(Math.random() * (max - min + 1) + min);
