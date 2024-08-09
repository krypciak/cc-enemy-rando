export function fixedRandomNumber(seed: number): number {
    // @ts-expect-error
    const number = new Math.seedrandomSeed(seed)()
    return number
}

export function fixedRandomInt(seed: number, min: number, max: number): number {
    return (fixedRandomNumber(seed) * (max - min) + min) >>> 0
}

export type MapEntity = Omit<sc.MapModel.MapEntity, 'level'> & { z: number }

export interface Spawner extends sc.MapModel.MapEntity {
    settings: ig.ENTITY.EnemySpawner.Settings
}
export interface Enemy extends sc.MapModel.MapEntity {
    settings: ig.ENTITY.Enemy.Settings
}
export interface EventTrigger extends sc.MapModel.MapEntity {
    settings: ig.ENTITY.EventTrigger.Settings
}

export function isEventTrigger(entity: sc.MapModel.MapEntity): entity is EventTrigger {
    return entity.type == 'EventTrigger'
}
export function isSpawner(entity: sc.MapModel.MapEntity): entity is Spawner {
    return entity.type == 'EnemySpawner'
}
export function isEnemy(entity: sc.MapModel.MapEntity): entity is Enemy {
    return entity.type == 'Enemy'
}
