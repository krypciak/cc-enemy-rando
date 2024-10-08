import { MapEntity } from './util'
import { EnemyData, randomizeEnemy, randomizeSpawner } from './enemy-randomizer'
import { Opts } from './options'
import { getSeed } from './plugin'

declare global {
    namespace ig.ENTITY {
        interface Enemy {
            customGenerated?: boolean
            fallCount?: number
        }
    }
    namespace sc {
        namespace EnemyInfo {
            interface Settings {
                customGenerated?: boolean
            }
        }
    }
}

export function injectPrestart(enemyData: EnemyData) {
    let mapObjectSpawnQueue: MapEntity[] = []
    ig.Game.inject({
        loadLevel(map: sc.MapModel.Map, ...args) {
            if (Opts.enable && enemyData) {
                const seed = getSeed()

                mapObjectSpawnQueue = []
                const changeMap: Record<string, string[]> = {}
                const entityNameToTypeMap: Record<string, string> = {}
                for (const entity of map.entities) {
                    let mapObjects: MapEntity[] | undefined
                    if (entity.type == 'EnemySpawner' && Opts.randomizeSpawners) {
                        mapObjects = randomizeSpawner(entity, seed, enemyData, changeMap, map.levels)
                    } else if (entity.type == 'Enemy' && Opts.randomizeEnemies) {
                        entityNameToTypeMap[entity.settings.name!] = entity.settings.enemyInfo.type
                        mapObjects = randomizeEnemy(entity, seed, enemyData, changeMap, map.levels)
                    }
                    if (mapObjects) {
                        mapObjectSpawnQueue.push(...mapObjects)
                    }
                }

                // search for SET_TYPED_ENEMY_TARGET in EventTrigger's and replace old enemy types with new
                for (const entity of map.entities) {
                    if (entity.type != 'EventTrigger') continue

                    const events = entity.settings.event!

                    for (let i = 0; i < events.length; i++) {
                        const event = ig.copy(events[i])
                        if (event.type == 'SET_TYPED_ENEMY_TARGET') {
                            const oldType = event.enemyType

                            const newTypes = changeMap[oldType]
                            if (!newTypes) {
                                continue
                            }

                            events.splice(i, 1)
                            const alreadyAdded = new Set()
                            for (const newType of newTypes) {
                                if (alreadyAdded.has(newType)) {
                                    continue
                                }
                                alreadyAdded.add(newType)
                                const newEvent = ig.copy(event)
                                newEvent.enemyType = newType
                                events.splice(i, 0, newEvent)
                                i++
                            }
                        } else if (event.type == 'WAIT_UNTIL_ACTION_DONE') {
                            if (event.entity) {
                                const entityName = event.entity.name
                                if (changeMap[entityNameToTypeMap[entityName]]) {
                                    events.splice(i, 1)
                                    events.splice(i, 0, {
                                        type: 'SET_ENEMY_TARGET',
                                        enemy: { global: true, name: entityName },
                                        target: { player: true },
                                    })
                                }
                            }
                        }
                    }
                }
            }
            return this.parent(map, ...args)
        },
        loadingComplete() {
            this.parent()
            for (const entity of mapObjectSpawnQueue) {
                ig.game.spawnEntity(entity.type, entity.x, entity.y, entity.z, entity.settings)
            }
            mapObjectSpawnQueue = []
        },
    })

    ig.ENTITY.Enemy.inject({
        init(x, y, z, settings) {
            this.parent(x, y, z, settings)
            if (settings.enemyInfo?.customGenerated) this.customGenerated = true
        },
        onFallBehavior(...args) {
            const ret = this.parent(...args)
            // when a flying entity that is over a hole is randomized into a non-flying entity,
            // fix the entity falling over and over by settings the respawn point to the player pos
            if (this.customGenerated) {
                this.fallCount ??= 0
                this.fallCount++
                if (this.fallCount >= 2) {
                    let newPos = ig.copy(ig.game.playerEntity.coll.pos)
                    newPos.z += 256
                    this.setRespawnPoint(newPos)
                    this.setTarget(ig.game.playerEntity)
                    this.fallCount = -100
                }
            }
            return ret
        },
        doEnemyAction(...args) {
            try {
                this.parent(...args)
            } catch (error) {}
        },
    })

    sc.EnemyType.inject({
        updateAction(...args) {
            try {
                return this.parent(...args)
            } catch (error) {}
        },
        postActionUpdate(...args) {
            try {
                return this.parent(...args)
            } catch (error) {}
        },
        getAppearAction(...args) {
            try {
                return this.parent(...args)
            } catch (error) {}
            return new ig.Action('hello', [])
        },
    })

    sc.EnemyState.inject({
        selectAction(...args) {
            try {
                return this.parent(...args)
            } catch (error) {}
        },
    })
}

export function injectPoststart() {
    // register non existing puzzle elements
    ig.MapStyle.registerStyle('default', 'puzzle2', { sheet: 'media/entity/style/default-puzzle-2-fix.png' })
    ig.MapStyle.registerStyle('default', 'magnet', { sheet: 'media/map/shockwave-dng.png', x: 160, y: 272 })
    ig.MapStyle.registerStyle('default', 'bouncer', { sheet: 'media/map/shockwave-dng-props.png', x: 0, y: 0 })
    ig.MapStyle.registerStyle('default', 'waterblock', {
        sheet: 'media/map/shockwave-dng.png',
        x: 384,
        y: 304,
        puddleX: 352,
        puddleY: 448,
    })
    ig.MapStyle.registerStyle('default', 'waveblock', { sheet: 'media/map/shockwave-dng.png', x: 96, y: 480 })
    ig.MapStyle.registerStyle('default', 'tesla', { sheet: 'media/map/shockwave-dng.png', x: 240, y: 352 })
    ig.MapStyle.registerStyle('default', 'waveSwitch', { sheet: 'media/map/shockwave-dng.png', x: 16, y: 696 })
    ig.MapStyle.registerStyle('default', 'anticompressor', { sheet: 'media/map/shockwave-dng.png', x: 240, y: 400 })
    ig.MapStyle.registerStyle('default', 'dynPlatformSmall', {
        sheet: 'media/map/shockwave-dng.png',
        x: 48,
        y: 640,
    })
    ig.MapStyle.registerStyle('default', 'dynPlatformMedium', {
        sheet: 'media/map/shockwave-dng.png',
        x: 0,
        y: 640,
    })
    ig.MapStyle.registerStyle('default', 'lorry', {
        sheet: 'media/map/shockwave-dng.png',
        railX: 176,
        railY: 304,
        lorryX: 128,
        lorryY: 304,
    })
    ig.MapStyle.registerStyle('default', 'rotateBlocker', { sheet: 'media/map/shockwave-dng.png', x: 256, y: 720 })
    ig.MapStyle.registerStyle('default', 'destruct', { sheet: 'media/entity/style/shockwave-dng-destruct.png' })
    ig.MapStyle.registerStyle('default', 'effect', { sheet: 'area.cold-dng' })

    ig.MapStyle.registerStyle('cold-dng', 'puzzle2', { sheet: 'media/entity/style/default-puzzle-2-fix.png' })
}
