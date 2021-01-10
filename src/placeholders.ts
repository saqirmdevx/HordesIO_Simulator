export enum Placeholders {
    CRITICAL_DAMAGE = 2.0, // 200%
    GLOBAL_COOLDOWN = 1000 // 1sec
}

/**
 * Calculate time after haste modifier
 * @param time - Base time in ms
 * @param haste - haste % (stats)
 */
export function __calcHasteBonus(time:number, haste:number):number {
    return Math.floor(time / (1 + haste));
}

/**
 * roll a random value between Min and Max 
 * @param min - Min value
 * @param max - Max value
 */
export function __random(min:number, max:number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}