// Game Configuration
const CONFIG = {
    // Display settings
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    TILE_SIZE: 32,
    
    // Game settings
    FPS: 60,
    TILEMAP_WIDTH: 25, // 800 / 32
    TILEMAP_HEIGHT: 19, // 600 / 32
    
    // Player settings
    PLAYER_BASE_SPEED: 2,
    PLAYER_ATTACK_RANGE: 24, // pixels
    PLAYER_ATTACK_COOLDOWN: 500, // milliseconds
    PLAYER_INVULNERABILITY_TIME: 1000, // milliseconds after taking damage
    PLAYER_MAX_HEALTH: 100,
    
    // Camera settings
    CAMERA_LERP: 0.1,
    CAMERA_SHAKE_DURATION: 200,
    
    // Combat settings
    KNOCKBACK_FORCE: 50,
    KNOCKBACK_DURATION: 200,
    ATTACK_KNOCKBACK: 10,
    
    // Progression settings
    CORE_FRAGMENT_PICKUP_RANGE: 30,
    WORLD_RESTORE_RATE: 0.2, // color restoration per fragment
};

// Direction constants
const DIRECTIONS = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right'
};

// Regions
const REGIONS = {
    SILENT_VILLAGE: 'silent_village',
    FORGOTTEN_FOREST: 'forgotten_forest',
    CRYSTAL_MINES: 'crystal_mines',
    BROKEN_CITY: 'broken_city',
    THE_CORE: 'the_core'
};

// Enemy factions
const FACTIONS = {
    GLITCH_FAUNA: 'glitch_fauna',
    CORRUPTED_HUMANS: 'corrupted_humans',
    SENTINEL_MACHINES: 'sentinel_machines',
    BOSS: 'boss'
};

// Tile types
const TILE_TYPES = {
    EMPTY: 0,
    WALL: 1,
    HAZARD: 2,
    SLOW_GROUND: 3,
    PORTAL: 4,
    WOODEN_HOUSE: 5,
    TREE: 6,
    BUSH: 7,
    CRYSTAL_WALL: 8,
    CRACKED_FLOOR: 9,
    ROAD: 10,
    BUILDING: 11,
    BARRICADE: 12,
    ABSTRACT_GEOMETRY: 13
};

// Core fragment types
const CORE_TYPES = {
    SPEED: 'speed',
    SHIELD: 'shield',
    POWER: 'power'
};

// Game states
const GAME_STATES = {
    LOADING: 'loading',
    PLAYING: 'playing',
    PAUSED: 'paused',
    DIALOGUE: 'dialogue',
    BOSS_FIGHT: 'boss_fight',
    GAME_OVER: 'game_over',
    VICTORY: 'victory'
};

// Animation states
const ANIMATION_STATES = {
    IDLE: 'idle',
    WALK: 'walk',
    ATTACK: 'attack',
    HIT: 'hit',
    DEATH: 'death',
    SPAWNING: 'spawning'
};

// Player stats (affected by cores)
const PLAYER_STATS = {
    speed: CONFIG.PLAYER_BASE_SPEED,
    attackDamage: 10,
    defense: 1, // damage multiplier (1 = full, 0.5 = 50% reduction)
    maxHealth: CONFIG.PLAYER_MAX_HEALTH
};

// Enemy configuration by faction
const ENEMY_CONFIG = {
    [FACTIONS.GLITCH_FAUNA]: {
        baseHealth: 30,
        baseDamage: 10,
        baseSpeed: 1.5,
        detectionRadius: 50,
        behavior: 'erratic',
        color: '#ff00ff' // Magenta
    },
    [FACTIONS.CORRUPTED_HUMANS]: {
        baseHealth: 40,
        baseDamage: 15,
        baseSpeed: 1.0,
        detectionRadius: 60,
        behavior: 'patrol',
        color: '#666666'
    },
    [FACTIONS.SENTINEL_MACHINES]: {
        baseHealth: 50,
        baseDamage: 20,
        baseSpeed: 0.8,
        detectionRadius: 80,
        behavior: 'predictable',
        color: '#6666ff'
    }
};

// Boss configuration
const BOSS_CONFIG = {
    CRYSTAL_BEAST: {
        health: 150,
        damage: 25,
        speed: 1.2,
        phase1Damage: 0.5,
        phase2Damage: 1.0,
        weakPointMultiplier: 2.0
    },
    GLITCH_ENTITY: {
        health: 250,
        damage: 30,
        teleportRange: 100,
        phase1Duration: 10000, // 10 seconds
        phase2Duration: 15000, // 15 seconds
        projectileSpeed: 3,
        projectileCount: 8
    }
};

// NPC definitions
const NPC_DEFINITIONS = {
    ELDER_MIRA: {
        name: 'Elder Mira',
        region: REGIONS.SILENT_VILLAGE,
        dialogue: [
            "Kiro... you finally returned.",
            "The Core... it was never supposed to end this way.",
            "These crystals... they're the world's last hope.",
            "Use them wisely, child. Restore what was broken."
        ],
        glitched: true
    },
    RUNE: {
        name: 'Rune',
        region: REGIONS.FORGOTTEN_FOREST,
        dialogue: [
            "The glitches took everyone...",
            "My family... my friends... they're all gone.",
            "Please... make it stop."
        ],
        glitched: false
    },
    ARCHIVIST_UNIT: {
        name: 'Archivist Unit',
        region: REGIONS.CRYSTAL_MINES,
        dialogue: [
            "Accessing historical records...",
            "The Glitch Entity: Designed to correct.",
            "Never programmed to stop.",
            "You created this. You must end it.",
            "The choice is yours: Control or destruction?"
        ],
        glitched: false,
        moralConflict: true
    }
};

// Audio configuration (for future implementation)
const AUDIO_CONFIG = {
    enabled: false, // Set to true when audio system is implemented
    volume: {
        music: 0.7,
        sfx: 0.8
    },
    regions: {
        [REGIONS.SILENT_VILLAGE]: 'peaceful_mysterious',
        [REGIONS.FORGOTTEN_FOREST]: 'eerie_organic',
        [REGIONS.CRYSTAL_MINES]: 'industrial_echoing',
        [REGIONS.BROKEN_CITY]: 'dystopian_corrupted',
        [REGIONS.THE_CORE]: 'intense_climactic'
    }
};

// Particle system configuration
const PARTICLE_CONFIG = {
    lifetime: {
        minimal: 500,
        short: 1000,
        medium: 2000,
        long: 4000
    },
    types: {
        ATTACK: { color: '#ff00ff', count: 8, speed: 3 },
        DAMAGE: { color: '#ff3333', count: 12, speed: 2 },
        DEATH: { color: '#444444', count: 16, speed: 1.5 },
        PICKUP: { color: '#00ffff', count: 20, speed: 2, sparkle: true },
        TELEPORT: { color: '#ff00ff', count: 24, speed: 4, glitch: true }
    }
};

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        DIRECTIONS,
        REGIONS,
        FACTIONS,
        TILE_TYPES,
        CORE_TYPES,
        GAME_STATES,
        ANIMATION_STATES,
        PLAYER_STATS,
        ENEMY_CONFIG,
        BOSS_CONFIG,
        NPC_DEFINITIONS,
        AUDIO_CONFIG,
        PARTICLE_CONFIG
    };
}