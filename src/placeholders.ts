export enum Placeholders {
    CRITICAL_DAMAGE = 2.0, // 200%
    GLOBAL_COOLDOWN = 1000 // 1sec
}

export function __calcHasteBonus(time, haste:number)
{
    return Math.floor(time / (1 + (haste / 100)));
}

export var __FPS = 20;
export var __updateTime = 1000 / __FPS; // 20FPS  / 50ms update 
