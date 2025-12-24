// Tilemap System for world generation
class Tilemap {
    constructor(region, width, height) {
        this.region = region;
        this.width = width || CONFIG.TILEMAP_WIDTH;
        this.height = height || CONFIG.TILEMAP_HEIGHT;
        this.tiles = Utils.create2DArray(this.width, this.height, TILE_TYPES.EMPTY);
        this.exitPortal = null;
        this.enemySpawnPoints = [];
        this.npcSpawnPoints = [];
        this.coreFragments = [];
        this.decorations = []; // Decorative elements
        this.worldCorruption = 1.0; // 1.0 = fully corrupted, 0.0 = restored
        
        this.generateRegion();
    }
    
    generateRegion() {
        switch (this.region) {
            case REGIONS.SILENT_VILLAGE:
                this.generateSilentVillage();
                break;
            case REGIONS.FORGOTTEN_FOREST:
                this.generateForgottenForest();
                break;
            case REGIONS.CRYSTAL_MINES:
                this.generateCrystalMines();
                break;
            case REGIONS.BROKEN_CITY:
                this.generateBrokenCity();
                break;
            case REGIONS.THE_CORE:
                this.generateTheCore();
                break;
            default:
                this.generateEmptyMap();
        }
    }
    
    generateSilentVillage() {
        // Create basic rectangular map with houses
        // Ground (empty tiles in game context)
        this.fillRect(0, 0, this.width, this.height, TILE_TYPES.EMPTY);
        
        // Outer boundary walls
        for (let x = 0; x < this.width; x++) {
            this.tiles[0][x] = TILE_TYPES.WALL;
            this.tiles[this.height - 1][x] = TILE_TYPES.WALL;
        }
        for (let y = 0; y < this.height; y++) {
            this.tiles[y][0] = TILE_TYPES.WALL;
            this.tiles[y][this.width - 1] = TILE_TYPES.WALL;
        }
        
        // Main path
        this.fillRect(Math.floor(this.width / 2) - 2, 1, 4, this.height - 2, TILE_TYPES.EMPTY);
        
        // Houses
        this.placeHouse(5, 5);
        this.placeHouse(18, 5);
        this.placeHouse(7, 12);
        this.placeHouse(16, 12);
        
        // Portal to next area
        this.exitPortal = { 
            x: Math.floor(this.width / 2) - 1, 
            y: this.height - 2,
            targetRegion: REGIONS.FORGOTTEN_FOREST
        };
        this.tiles[this.exitPortal.y][this.exitPortal.x] = TILE_TYPES.PORTAL;
        
        // NPC spawn point (Elder Mira)
        this.npcSpawnPoints.push({ x: 12, y: 8, type: 'elder_mira' });
        
        // Enemy spawn points (minimal in starting area)
        this.enemySpawnPoints.push({ x: 3, y: 3, faction: FACTIONS.GLITCH_FAUNA });
        this.enemySpawnPoints.push({ x: 21, y: 3, faction: FACTIONS.GLITCH_FAUNA });
    }
    
    generateForgottenForest() {
        // Maze-like forest with trees and bushes
        this.fillRect(0, 0, this.width, this.height, TILE_TYPES.EMPTY);
        
        // Create tree clusters
        for (let i = 0; i < 15; i++) {
            const x = Utils.randomInt(1, this.width - 3);
            const y = Utils.randomInt(1, this.height - 3);
            this.placeTreeCluster(x, y, Utils.randomInt(2, 4));
        }
        
        // Add bushes (slow movement)
        for (let i = 0; i < 20; i++) {
            const x = Utils.randomInt(1, this.width - 2);
            const y = Utils.randomInt(1, this.height - 2);
            if (this.tiles[y][x] === TILE_TYPES.EMPTY) {
                this.tiles[y][x] = TILE_TYPES.BUSH;
            }
        }
        
        // Carve paths by clearing corridors
        for (let y = 0; y < this.height; y += 3) {
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = TILE_TYPES.EMPTY;
            }
        }
        for (let x = 0; x < this.width; x += 3) {
            for (let y = 0; y < this.height; y++) {
                this.tiles[y][x] = TILE_TYPES.EMPTY;
            }
        }
        
        // Enemy spawn points
        for (let i = 0; i < 10; i++) {
            this.enemySpawnPoints.push({
                x: Utils.randomInt(2, this.width - 2),
                y: Utils.randomInt(2, this.height - 2),
                faction: FACTIONS.GLITCH_FAUNA
            });
        }
        
        // NPC spawn point (Rune)
        this.npcSpawnPoints.push({ x: 12, y: 3, type: 'rune' });
        
        // Portal to mines
        this.exitPortal = { x: 22, y: 15, targetRegion: REGIONS.CRYSTAL_MINES };
        this.tiles[this.exitPortal.y][this.exitPortal.x] = TILE_TYPES.PORTAL;
        
        // Add some roots (trap tiles)
        for (let i = 0; i < 5; i++) {
            const x = Utils.randomInt(5, 20);
            const y = Utils.randomInt(5, 15);
            if (this.tiles[y][x] === TILE_TYPES.EMPTY) {
                this.tiles[y][x] = TILE_TYPES.HAZARD;
            }
        }
    }
    
    generateCrystalMines() {
        // Industrial mining area with crystal walls and hazards
        this.fillRect(0, 0, this.width, this.height, TILE_TYPES.EMPTY);
        
        // Crystal wall borders (some openings)
        for (let x = 0; x < this.width; x++) {
            if (x < 8 || x > 16) {
                this.tiles[0][x] = TILE_TYPES.CRYSTAL_WALL;
                this.tiles[this.height - 1][x] = TILE_TYPES.CRYSTAL_WALL;
            }
        }
        
        // Crystal wall chambers
        const chambers = [
            { x: 5, y: 3, w: 6, h: 5 },
            { x: 14, y: 3, w: 6, h: 5 },
            { x: 5, y: 11, w: 6, h: 5 },
            { x: 14, y: 11, w: 6, h: 5 }
        ];
        
        for (const chamber of chambers) {
            // Create crystal walls around chambers
            this.fillRect(chamber.x, chamber.y, chamber.w, chamber.h, TILE_TYPES.CRYSTAL_WALL);
            // Clear inside for enemies
            this.fillRect(chamber.x + 1, chamber.y + 1, chamber.w - 2, chamber.h - 2, TILE_TYPES.EMPTY);
            
            // Add cracked floors inside chambers (hazards)
            for (let i = 0; i < 3; i++) {
                const hx = Utils.randomInt(chamber.x + 1, chamber.x + chamber.w - 2);
                const hy = Utils.randomInt(chamber.y + 1, chamber.y + chamber.h - 2);
                this.tiles[hy][hx] = TILE_TYPES.CRACKED_FLOOR;
            }
        }
        
        // Enemy spawn points in chambers
        for (const chamber of chambers) {
            this.enemySpawnPoints.push({
                x: chamber.x + Math.floor(chamber.w / 2),
                y: chamber.y + Math.floor(chamber.h / 2),
                faction: FACTIONS.SENTINEL_MACHINES
            });
        }
        
        // NPC spawn point (Archivist Unit)
        this.npcSpawnPoints.push({ x: 2, y: 2, type: 'archivist_unit' });
        
        // Boss room
        this.bossRoom = { x: 10, y: 7, w: 5, h: 5 };
        this.fillRect(this.bossRoom.x, this.bossRoom.y, this.bossRoom.w, this.bossRoom.h, TILE_TYPES.EMPTY);
        
        // Portal to next area
        this.exitPortal = { x: 24, y: 17, targetRegion: REGIONS.BROKEN_CITY };
        this.tiles[this.exitPortal.y][this.exitPortal.x] = TILE_TYPES.PORTAL;
    }
    
    generateBrokenCity() {
        // Urban area with buildings, barricades, and high enemy density
        this.fillRect(0, 0, this.width, this.height, TILE_TYPES.ROAD);
        
        // Buildings (solid obstacles)
        const buildingPositions = [
            { x: 3, y: 3, w: 4, h: 4 },
            { x: 9, y: 5, w: 6, h: 3 },
            { x: 17, y: 3, w: 4, h: 4 },
            { x: 4, y: 12, w: 5, h: 4 },
            { x: 16, y: 12, w: 5, h: 4 },
            { x: 10, y: 15, w: 5, h: 3 }
        ];
        
        for (const building of buildingPositions) {
            this.fillRect(building.x, building.y, building.w, building.h, TILE_TYPES.BUILDING);
        }
        
        // Barricades
        this.fillRect(8, 9, 10, 1, TILE_TYPES.BARRICADE);
        this.fillRect(1, 8, 2, 10, TILE_TYPES.BARRICADE);
        this.fillRect(23, 8, 1, 8, TILE_TYPES.BARRICADE);
        
        // Enemy spawn points (high density)
        for (let i = 0; i < 15; i++) {
            const x = Utils.randomInt(2, this.width - 2);
            const y = Utils.randomInt(2, this.height - 2);
            if (this.tiles[y][x] === TILE_TYPES.ROAD) {
                const faction = Math.random() < 0.6 ? 
                    FACTIONS.CORRUPTED_HUMANS : 
                    FACTIONS.SENTINEL_MACHINES;
                this.enemySpawnPoints.push({ x, y, faction });
            }
        }
        
        // Portal to core
        this.exitPortal = { x: 12, y: 17, targetRegion: REGIONS.THE_CORE };
        this.tiles[this.exitPortal.y][this.exitPortal.x] = TILE_TYPES.PORTAL;
    }
    
    generateTheCore() {
        // Abstract final area with glitch aesthetics
        this.fillRect(0, 0, this.width, this.height, TILE_TYPES.EMPTY);
        
        // Abstract geometry
        for (let i = 0; i < 8; i++) {
            const x = Utils.randomInt(2, this.width - 5);
            const y = Utils.randomInt(2, this.height - 5);
            const w = Utils.randomInt(2, 6);
            const h = Utils.randomInt(2, 6);
            
            this.fillRect(x, y, w, h, TILE_TYPES.ABSTRACT_GEOMETRY);
        }
        
        // Boss spawn at center
        this.bossRoom = { x: 10, y: 7, w: 5, h: 5 };
        this.fillRect(this.bossRoom.x, this.bossRoom.y, this.bossRoom.w, this.bossRoom.h, TILE_TYPES.EMPTY);
        
        // This area has no exit - final boss arena
    }
    
    generateEmptyMap() {
        // Simple empty map for testing
        this.fillRect(0, 0, this.width, this.height, TILE_TYPES.EMPTY);
        
        // Simple border
        for (let x = 0; x < this.width; x++) {
            this.tiles[0][x] = TILE_TYPES.WALL;
            this.tiles[this.height - 1][x] = TILE_TYPES.WALL;
        }
        for (let y = 0; y < this.height; y++) {
            this.tiles[y][0] = TILE_TYPES.WALL;
            this.tiles[y][this.width - 1] = TILE_TYPES.WALL;
        }
        
        // Test enemy spawn
        this.enemySpawnPoints.push({ x: 5, y: 5, faction: FACTIONS.GLITCH_FAUNA });
    }
    
    // Helper methods
    fillRect(x, y, width, height, tileType) {
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const tileX = x + dx;
                const tileY = y + dy;
                if (tileX >= 0 && tileX < this.width && tileY >= 0 && tileY < this.height) {
                    this.tiles[tileY][tileX] = tileType;
                }
            }
        }
    }
    
    placeHouse(x, y) {
        // 3x3 house structure
        const size = 3;
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const tileX = x + dx;
                const tileY = y + dy;
                if (tileX >= 0 && tileX < this.width && tileY >= 0 && tileY < this.height) {
                    this.tiles[tileY][tileX] = TILE_TYPES.WOODEN_HOUSE;
                }
            }
        }
    }
    
    placeTreeCluster(x, y, size) {
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const tileX = x + dx;
                const tileY = y + dy;
                if (tileX >= 0 && tileX < this.width && tileY >= 0 && tileY < this.height) {
                    this.tiles[tileY][tileX] = TILE_TYPES.TREE;
                }
            }
        }
    }
    
    // Tile queries
    isWalkable(x, y) {
        const grid = Utils.worldToGrid(x, y);
        if (grid.x < 0 || grid.x >= this.width || grid.y < 0 || grid.y >= this.height) {
            return false;
        }
        
        const tileType = this.tiles[grid.y][grid.x];
        return tileType !== TILE_TYPES.WALL && 
               tileType !== TILE_TYPES.TREE && 
               tileType !== TILE_TYPES.WOODEN_HOUSE &&
               tileType !== TILE_TYPES.BUILDING &&
               tileType !== TILE_TYPES.ABSTRACT_GEOMETRY;
    }
    
    isHazard(x, y) {
        const grid = Utils.worldToGrid(x, y);
        if (grid.x < 0 || grid.x >= this.width || grid.y < 0 || grid.y >= this.height) {
            return false;
        }
        
        const tileType = this.tiles[grid.y][grid.x];
        return tileType === TILE_TYPES.HAZARD || tileType === TILE_TYPES.CRACKED_FLOOR;
    }
    
    isSlowGround(x, y) {
        const grid = Utils.worldToGrid(x, y);
        if (grid.x < 0 || grid.x >= this.width || grid.y < 0 || grid.y >= this.height) {
            return false;
        }
        
        const tileType = this.tiles[grid.y][grid.x];
        return tileType === TILE_TYPES.BUSH;
    }
    
    getTileType(x, y) {
        const grid = Utils.worldToGrid(x, y);
        if (grid.x < 0 || grid.x >= this.width || grid.y < 0 || grid.y >= this.height) {
            return TILE_TYPES.WALL;
        }
        return this.tiles[grid.y][grid.x];
    }
    
    moveIsValid(fromX, fromY, toX, toY) {
        return this.isWalkable(toX, toY);
    }
    
    // Draw the tilemap
    draw(ctx, camera, worldCorruption = 1.0) {
        const startGrid = Utils.worldToGrid(camera.x - CONFIG.TILE_SIZE, camera.y - CONFIG.TILE_SIZE);
        const endGrid = Utils.worldToGrid(camera.x + CONFIG.CANVAS_WIDTH, camera.y + CONFIG.CANVAS_HEIGHT);
        
        for (let y = Math.max(0, startGrid.y); y < Math.min(this.height, endGrid.y + 1); y++) {
            for (let x = Math.max(0, startGrid.x); x < Math.min(this.width, endGrid.x + 1); x++) {
                const worldPos = Utils.gridToWorld(x, y);
                this.drawTile(ctx, worldPos.x, worldPos.y, this.tiles[y][x], worldCorruption);
            }
        }
        
        // Draw special features
        this.drawSpecialFeatures(ctx, camera);
    }
    
    drawTile(ctx, x, y, tileType, worldCorruption) {
        const baseColor = this.getTileColor(tileType, worldCorruption);
        const gridX = x / CONFIG.TILE_SIZE;
        const gridY = y / CONFIG.TILE_SIZE;
        
        // Add glitch effect based on corruption
        if (worldCorruption > 0.5 && Math.random() < worldCorruption * 0.1) {
            Utils.createGlitchEffect(ctx, x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }
        
        switch (tileType) {
            case TILE_TYPES.EMPTY:
                ctx.fillStyle = baseColor;
                ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                break;
                
            case TILE_TYPES.WALL:
            case TILE_TYPES.WOODEN_HOUSE:
            case TILE_TYPES.TREE:
            case TILE_TYPES.BUILDING:
            case TILE_TYPES.ABSTRACT_GEOMETRY:
                ctx.fillStyle = baseColor;
                ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                // Add some texture
                ctx.fillStyle = this.darkenColor(baseColor, 20);
                ctx.fillRect(x, y, CONFIG.TILE_SIZE / 2, CONFIG.TILE_SIZE);
                break;
                
            case TILE_TYPES.BUSH:
                ctx.fillStyle = baseColor;
                // Draw bush as scattered pixels
                for (let i = 0; i < 4; i++) {
                    const px = x + Utils.randomInt(2, 28);
                    const py = y + Utils.randomInt(2, 28);
                    ctx.fillRect(px, py, 4, 4);
                }
                break;
                
            case TILE_TYPES.CRYSTAL_WALL:
                // Draw crystal pattern
                ctx.fillStyle = baseColor;
                ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                // Add highlight
                ctx.fillStyle = this.lightenColor(baseColor, 40);
                ctx.fillRect(x + 4, y + 4, CONFIG.TILE_SIZE - 8, CONFIG.TILE_SIZE - 8);
                break;
                
            case TILE_TYPES.CRACKED_FLOOR:
            case TILE_TYPES.HAZARD:
                // Draw cracked pattern
                ctx.fillStyle = baseColor;
                ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + 8, y + 8);
                ctx.lineTo(x + 24, y + 24);
                ctx.stroke();
                break;
                
            case TILE_TYPES.PORTAL:
                // Draw pulsing portal
                const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
                const portalColor = this.changeAlpha('#00ffff', pulse);
                ctx.fillStyle = portalColor;
                ctx.fillRect(x + 4, y + 4, CONFIG.TILE_SIZE - 8, CONFIG.TILE_SIZE - 8);
                break;
        }
    }
    
    getTileColor(tileType, worldCorruption) {
        // Base colors
        const colors = {
            [TILE_TYPES.EMPTY]: '#1a1a1a',
            [TILE_TYPES.WALL]: '#333333',
            [TILE_TYPES.WOODEN_HOUSE]: '#8B4513',
            [TILE_TYPES.TREE]: '#228B22',
            [TILE_TYPES.BUSH]: '#008000',
            [TILE_TYPES.CRYSTAL_WALL]: '#9370DB',
            [TILE_TYPES.CRACKED_FLOOR]: '#8B7355',
            [TILE_TYPES.HAZARD]: '#654321',
            [TILE_TYPES.ROAD]: '#444444',
            [TILE_TYPES.BUILDING]: '#696969',
            [TILE_TYPES.BARRICADE]: '#8B4513',
            [TILE_TYPES.ABSTRACT_GEOMETRY]: '#9400D3'
        };
        
        let baseColor = colors[tileType] || '#ffffff';
        
        // Apply corruption effect - desaturate and dark
        const corruption = Utils.lerp(worldCorruption, 0, 0.7); // Less corruption in this system
        if (corruption > 0) {
            baseColor = this.desaturateColor(baseColor, corruption * 50);
            baseColor = this.darkenColor(baseColor, corruption * 30);
        }
        
        return baseColor;
    }
    
    drawSpecialFeatures(ctx, camera) {
        // Draw exit portal with glow if it exists
        if (this.exitPortal) {
            const worldPos = Utils.gridToWorld(this.exitPortal.x, this.exitPortal.y);
            if (this.isInCameraView(worldPos.x, worldPos.y, camera)) {
                // Add glow effect
                ctx.save();
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00ffff';
                this.drawTile(ctx, worldPos.x, worldPos.y, TILE_TYPES.PORTAL, this.worldCorruption);
                ctx.restore();
            }
        }
    }
    
    isInCameraView(x, y, camera) {
        return x >= camera.x - CONFIG.TILE_SIZE && 
               x <= camera.x + CONFIG.CANVAS_WIDTH + CONFIG.TILE_SIZE &&
               y >= camera.y - CONFIG.TILE_SIZE && 
               y <= camera.y + CONFIG.CANVAS_HEIGHT + CONFIG.TILE_SIZE;
    }
    
    // Color manipulation helpers
    darkenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * amount);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }
    
    lightenColor(color, amount) {
        return this.darkenColor(color, -amount);
    }
    
    desaturateColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const R = (num >> 16);
        const G = (num >> 8 & 0x00FF);
        const B = (num & 0x0000FF);
        const gray = R * 0.299 + G * 0.587 + B * 0.114;
        
        const newR = Utils.lerp(R, gray, amount / 100);
        const newG = Utils.lerp(G, gray, amount / 100);
        const newB = Utils.lerp(B, gray, amount / 100);
        
        return '#' + (0x1000000 + Math.round(newR) * 0x10000 +
            Math.round(newG) * 0x100 +
            Math.round(newB))).toString(16).slice(1);
    }
    
    changeAlpha(color, alpha) {
        // Simple alpha approximation for colors
        const num = parseInt(color.replace('#', ''), 16);
        const R = Math.round((num >> 16) * alpha);
        const G = Math.round((num >> 8 & 0x00FF) * alpha);
        const B = Math.round((num & 0x0000FF) * alpha);
        
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Tilemap;
}