import { Opts } from './options'
import { MapEntity, fixedRandomInt } from './util'

export interface EnemyData {
    regularEnemies: RawRegularEnemies
}

export type RawRegularEnemies = { [name: string]: RawRegularEnemy }

export interface RawRegularEnemy {
    elements: [heat: -1 | 0 | 1, cold: 0 | 1, shock: 0 | 1, wave: 0 | 1]
    mapElements: string
    endurance: number
}

let mapId = 1000

interface Rectangle {
    x: number
    y: number
    z: number
    width: number
    height: number
}

type ElementFlags = [heat: boolean, cold: boolean, shock: boolean, wave: boolean]

export async function loadAllEnemyTypes(data: RawRegularEnemies) {
    for (let enemy in data) {
        new sc.EnemyType(enemy)
    }
}

export function randomizeEnemy(
    enemy: sc.MapModel.MapEntity<'Enemy'>,
    seed: number,
    data: EnemyData,
    changeMap: Record<string, string[]>,
    levels: sc.MapModel.Map['levels']
) {
    // console.log('enemy', ig.copy(enemy), seed, data, preset)

    let level = enemy.level
    let z: number
    if (typeof level == 'object') {
        z = levels[level.level].height + (level.offset ?? 0)
    } else {
        z = levels[level].height
    }

    // let enemyGroup = enemy.settings.enemyInfo.group
    // let enemyType = enemy.settings.enemyInfo.type

    return getRandomEnemy(
        enemy.settings.enemyInfo,
        { x: enemy.x, y: enemy.y, width: 16, height: 16, z },
        (enemy.x * enemy.y * seed) % 1000000,
        data.regularEnemies,
        changeMap
    )
}

export function randomizeSpawner(
    spawner: sc.MapModel.MapEntity<'EnemySpawner'>,
    seed: number,
    data: EnemyData,
    changeMap: Record<string, string[]>,
    levels: sc.MapModel.Map['levels']
) {
    // console.log('spawner', spawner, seed, data, preset)

    const spawnerSeed = (spawner.x * spawner.y * seed) % 1000000
    const allMapObjects: MapEntity[] = []
    const allObjectsSet = new Set<string>()

    const level = spawner.level
    let z: number
    if (typeof level == 'object') {
        z = levels[level.level].height + (level.offset ?? 0)
    } else {
        z = levels[level].height
    }

    const newEnemyTypes: ig.ENTITY.EnemySpawner.Entry[] = []
    const enemyTypes = spawner.settings.enemyTypes!
    for (let i = 0; i < enemyTypes.length; i++) {
        const entry = enemyTypes[i]

        for (let h = 0; h < entry.count; h++) {
            const newEntry = ig.copy(entry)
            newEntry.count = 1
            const newEnemyInfo = newEntry.info
            const enemySeed = spawnerSeed * (i + 1) * (h + 1)
            const mapObjects = getRandomEnemy(
                newEnemyInfo,
                { x: spawner.x, y: spawner.y, width: spawner.settings.size!.x, height: spawner.settings.size!.y, z },
                enemySeed,
                data.regularEnemies,
                changeMap
            )

            newEnemyTypes.push(newEntry)
            for (const objEntity of mapObjects) {
                const type = objEntity.type
                if (allObjectsSet.has(type)) {
                    continue
                }
                allObjectsSet.add(type)
                allMapObjects.push(objEntity)
            }
        }
    }

    spawner.settings.enemyTypes = newEnemyTypes

    return allMapObjects
}

function getCurrentPlayerElements(): ElementFlags {
    if (!sc.model.player.getCore(sc.PLAYER_CORE.ELEMENT_CHANGE)) {
        return [false, false, false, false]
    }
    return [
        sc.model.player.getCore(sc.PLAYER_CORE.ELEMENT_HEAT),
        sc.model.player.getCore(sc.PLAYER_CORE.ELEMENT_COLD),
        sc.model.player.getCore(sc.PLAYER_CORE.ELEMENT_SHOCK),
        sc.model.player.getCore(sc.PLAYER_CORE.ELEMENT_WAVE),
    ]
}

function getRandomEnemy(
    enemyInfo: sc.EnemyInfo.Settings,
    rect: Rectangle,
    enemySeed: number,
    data: RawRegularEnemies,
    changeMap: Record<string, string[]>
) {
    const enemyType = enemyInfo.type
    const myDbEntry = data[enemyType]

    if (!myDbEntry) {
        console.log('enemy randomizer:', enemyType, 'not found in db')
        return []
    }
    // if (enemyType == 'mine-runbot') { return [] }

    const endurance = myDbEntry.endurance

    const gameDbEntry = ig.database.data.enemies[enemyType]
    const origLevel: number = gameDbEntry.level

    const elements = getCurrentPlayerElements()

    const compatibleEnemyTypes = Object.entries(data).filter(entry => {
        let entryEndurance = data[entry[0]].endurance

        if (entryEndurance - Opts.enduranceMin > endurance || entryEndurance + Opts.enduranceMax < endurance) {
            return false
        }
        if (!Opts.elementCompatibility) {
            return true
        }

        const val = entry[1]

        // check for element compatibility
        // check if any elements are available
        if (val.elements[0] == -1) {
            let elementsOk = false
            for (let i = 0; i < val.elements.length; i++) {
                if (elements[i]) {
                    elementsOk = true
                    break
                }
            }
            if (!elementsOk) {
                return false
            }
        } else {
            for (let i = 0; i < val.elements.length; i++) {
                if (val.elements[i] && !elements[i]) {
                    return false
                }
            }
        }
        return true
    })

    const randTypeIndex = fixedRandomInt(enemySeed, 0, compatibleEnemyTypes.length)
    const randType = compatibleEnemyTypes[randTypeIndex][0]
    // console.log( 'rand', enemySeed, randTypeIndex, 'from', enemyType, 'to', randType, 'endurance', endurance, 'to', data[randType].endurance)

    enemySeed *= 1.5
    let randLevel = fixedRandomInt(enemySeed, origLevel - Opts.levelMinus, origLevel + Opts.levelPlus)
    if (randLevel <= 0) {
        randLevel = 1
    }

    if (!changeMap[enemyType]) {
        changeMap[enemyType] = []
    }
    changeMap[enemyType].push(randType)

    enemyInfo.type = randType
    enemyInfo.level = randLevel
    enemyInfo.customGenerated = true

    let mapObjects: MapEntity[] = []
    if (Opts.spawnMapObjects) {
        mapObjects = spawnMapObjects(data[randType].mapElements, rect, elements)
    }
    return mapObjects
}

function spawnMapObjects(mapObject: string, rect: Rectangle, elements: ElementFlags): MapEntity[] {
    let mx = rect.x + rect.width / 2
    let my = rect.y + rect.height / 2
    const x2 = rect.x + rect.width
    const y2 = rect.y + rect.height
    let z = rect.z
    switch (mapObject) {
        case 'pole':
            return [elementPole(mx - 8, my + 64, z)]
        case 'magnet':
            return [magnet(mx - 8, y2 - 24, z, 'NORTH')]
        case 'teslaCoil':
            return [
                teslaCoil(rect.x + 4, rect.y + 4, z, 'SOURCE'),
                antiCompressor(rect.x + 24, rect.y + 4, z),
                teslaCoil(rect.x + 4, rect.y + 20, z, 'GROUND_DISCHARGE'),
                compressor(rect.x - 20, rect.y + 4, z),
            ]
        case 'compressor':
            return [boldPntMarker(mx - 16, my - 16, z, 1), compressor(rect.x + 80, y2 - 80, z)]

        case 'waveTeleport': {
            const arr: MapEntity[] = [waveTeleport(rect.x + 32, rect.y + 32, z), waveTeleport(x2 - 32, y2 - 32, z)]
            // if player is missing wave
            if (!elements[3]) {
                arr.push(ballChangerElement(rect.x + 32, y2 - 48, z, 'WAVE'))
                arr.push(ballChangerElement(x2 - 48, rect.y + 32, z, 'WAVE'))
            }
            return arr
        }
        case 'waterBubblePanel':
            return [waterBubblePanel(mx + 56, my + 56, z)]
    }
    return []
}

function elementPole(x: number, y: number, z: number): MapEntity<'ElementPole'> {
    return { type: 'ElementPole', x, y, z, settings: { name: '', poleType: 'LONG', group: '', mapId: mapId++ } }
}

function waterBubblePanel(x: number, y: number, z: number): MapEntity<'WaterBubblePanel'> {
    return { type: 'WaterBubblePanel', x, y, z, settings: { name: '', mapId: mapId++ } }
}

function waveTeleport(x: number, y: number, z: number): MapEntity<'WaveTeleport'> {
    return { type: 'WaveTeleport', x, y, z, settings: { name: '', mapId: mapId++ } }
}

function ballChangerElement(
    x: number,
    y: number,
    z: number,
    element: 'HEAT' | 'COLD' | 'WAVE' | 'HEAT'
): MapEntity<'BallChanger'> {
    return {
        type: 'BallChanger',
        x,
        y,
        z,
        settings: {
            name: '',
            condition: '',
            changerType: {
                type: 'CHANGE_ELEMENT',
                settings: { element },
            },
            mapId: mapId++,
        },
    }
}

function compressor(x: number, y: number, z: number): MapEntity<'Compressor'> {
    return { type: 'Compressor', x, y, z, settings: { name: '', mapId: mapId++ } }
}

function antiCompressor(x: number, y: number, z: number): MapEntity<'AntiCompressor'> {
    return { type: 'AntiCompressor', x, y, z, settings: { name: '', mapId: mapId++ } }
}

function boldPntMarker(x: number, y: number, z: number, index: number): MapEntity<'Marker'> {
    return { type: 'Marker', x, y, z, settings: { name: 'boldPnt' + index, dir: 'NORTH', mapId: mapId++ } }
}

function magnet(x: number, y: number, z: number, dir: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'): MapEntity<'Magnet'> {
    return { type: 'Magnet', x, y, z, settings: { name: '', dir, mapId: mapId++ } }
}

function teslaCoil(
    x: number,
    y: number,
    z: number,
    type: 'SOURCE' | 'EXTENDER' | 'GROUND_DISCHARGE'
): MapEntity<'TeslaCoil'> {
    return { type: 'TeslaCoil', x, y, z, settings: { name: '', coilType: type, mapId: mapId++ } }
}
