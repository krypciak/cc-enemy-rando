import { PluginClass } from 'ultimate-crosscode-typedefs/modloader/mod'
import { Mod1 } from './types'

import { EnemyData } from './enemy-randomizer'
import { injectPoststart, injectPrestart } from './injects'

import enemyData from '../json/enemy-data.json'
import { Opts, registerOpts } from './options'

export function getSeed() {
    return Opts.seed
}

export default class EnemyRando implements PluginClass {
    static dir: string
    static mod: Mod1

    constructor(mod: Mod1) {
        EnemyRando.dir = mod.baseDirectory
        EnemyRando.mod = mod
        EnemyRando.mod.isCCL3 = mod.findAllAssets ? true : false
        EnemyRando.mod.isCCModPacked = mod.baseDirectory.endsWith('.ccmod/')
    }

    async prestart() {
        registerOpts()
        injectPrestart(enemyData as unknown as EnemyData)
    }

    async poststart() {
        injectPoststart()
    }
}
