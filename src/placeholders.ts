export enum Placeholders {
    CRITICAL_DAMAGE = 2.0, // 200%
    GLOBAL_COOLDOWN = 1000 // 1sec
}

/**
 * Calculate time after haste modifier
 * @param time - Base time in ms
 * @param haste - haste % (stats)
 */
export function __calcHasteBonus(time:number, haste:number):number
{
    return Math.floor(time / (1 + (haste / 100)));
}

export var __FPS:number = 30;
export var __updateTime:number = 1000 / __FPS; // 20FPS  / 50ms update 
