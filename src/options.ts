import type { Options } from 'ccmodmanager/types/mod-options'

export let Opts: ReturnType<typeof modmanager.registerAndGetModOptions<ReturnType<typeof registerOpts>>>

function randomSeed() {
    return Number((Math.random() + '').slice(2))
}

export function registerOpts() {
    const opts = {
        general: {
            settings: {
                title: 'General',
                tabIcon: 'general',
            },
            headers: {
                general: {
                    enable: {
                        type: 'CHECKBOX',
                        init: true,
                        name: 'Enable the mod',
                        description: 'Enables/Disables the entire functionality of the mod',
                    },
                    randomizeSpawners: {
                        type: 'CHECKBOX',
                        init: true,
                        name: 'Randomize spawners',
                        description: 'Randomize enemy spawners (the enemies that roam somewhat freely in areas)',
                    },
                    randomizeEnemies: {
                        type: 'CHECKBOX',
                        init: true,
                        name: 'Randomize enemies',
                        description: 'Randomize enemies that are pre-programmed (for example in dungeon sequences)',
                    },
                    elementCompatibility: {
                        type: 'CHECKBOX',
                        init: true,
                        name: 'Elemental compatibility',
                        description: `Don't spawn enemies that require an element to break that you don't have`,
                    },
                    spawnMapObjects: {
                        type: 'CHECKBOX',
                        init: true,
                        name: 'Spawn map objects',
                        description: 'Spawn map objects for some enemies that are required to break them',
                    },

                    seed: {
                        type: 'JSON_DATA',
                        init: 123 as number,
                    },
                    regenerateSeed: {
                        type: 'BUTTON',
                        onPress() {
                            Opts.seed = randomSeed()
                        },
                        name: 'Regenrate seed',
                        description: 'Regenrate the seed.',
                    },

                    levelInfo: {
                        type: 'INFO',
                        name: `The enemy level is somewhat randomized.\nThe new level is based on the original \\c[3]level\\c[0], with some randomness added.\nForumla: \nmin: \\c[3]level\\c[0] - \\c[3]levelMinus\\c[0]\nmax: \\c[3]level\\c[0] + \\c[3]levelPlus\\c[0]`,
                    },
                    levelMinus: {
                        type: 'OBJECT_SLIDER',
                        min: 0,
                        max: 20,
                        step: 1,
                        init: 5,

                        fill: true,
                        showPercentage: true,
                        customNumberDisplay(index: number): string {
                            const { min, step } = opts.general.headers.general.levelMinus
                            return (min + step * index).toFixed(0)
                        },

                        name: 'Level minus -',
                        description: 'Level minus',
                    },
                    levelPlus: {
                        type: 'OBJECT_SLIDER',
                        min: 0,
                        max: 50,
                        step: 1,
                        init: 3,

                        fill: true,
                        showPercentage: true,
                        customNumberDisplay(index: number): string {
                            const { min, step } = opts.general.headers.general.levelPlus
                            return (min + step * index).toFixed(0)
                        },

                        name: 'Level plus +',
                        description: 'Level plus',
                    },

                    enduranceInfo: {
                        type: 'INFO',
                        name: `\\c[3]Endurance\\c[0] is the entity "toughness". A rabbit has small endurance, a buffalo has high endurance. Increasing endurance max means tougher enemies will more often spawn in the place of weaker ones.\nYou probaly shouldn't mess with this`,
                    },
                    enduranceMin: {
                        type: 'OBJECT_SLIDER',
                        min: 0,
                        max: 2,
                        step: 0.1,
                        init: 1,

                        fill: true,
                        showPercentage: true,
                        customNumberDisplay(index: number): string {
                            const { min, step } = opts.general.headers.general.enduranceMin
                            return (min + step * index).toFixed(1)
                        },

                        name: 'Endurance Min',
                        description: 'Enemy endurance range minimum',
                    },
                    enduranceMax: {
                        type: 'OBJECT_SLIDER',
                        min: 1,
                        max: 3,
                        step: 0.1,
                        init: 1.5,

                        fill: true,
                        showPercentage: true,
                        customNumberDisplay(index: number): string {
                            const { min, step } = opts.general.headers.general.enduranceMax
                            return (min + step * index).toFixed(1)
                        },

                        name: 'Endurance Max',
                        description: '',
                    },
                },
            },
        },
    } as const satisfies Options

    Opts = modmanager.registerAndGetModOptions(
        {
            modId: 'cc-enemy-rando',
            title: 'Enemy randomizer',
        },
        opts
    )
    return opts
}
