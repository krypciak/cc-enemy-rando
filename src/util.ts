export function fixedRandomNumber(seed: number): number {
    // @ts-expect-error
    const number = new Math.seedrandomSeed(seed)()
    return number
}

export function fixedRandomInt(seed: number, min: number, max: number): number {
    return (fixedRandomNumber(seed) * (max - min) + min) >>> 0
}

export type MapEntity<T extends sc.MapModel.EntityNames = sc.MapModel.EntityNames> = Omit<
    sc.MapModel.MapEntity<T>,
    'level'
> & { z: number }
