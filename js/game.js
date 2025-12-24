// Main Game class that orchestrates all game systems
class Game {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Game systems
        this.player = null;
        this.tilemap = null;
        this.particles = null;
        this.dialogue = null;
        this.input = null;
        this.audio = null;
        
        // Game state
        this.state = GAME_STATES.LOADING;
        this.currentRegion = null;
        this.regions = new Map();
        this.worldCorruption = 1.0;
        
        // Camera
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            shakeX: 0,
            shakeY: 0,
            shakeIntensity: 0,
            shakeDuration: 0
        };
        
        // Event system
        this.events = new EventEmitter();
        
        // Bind game loop
        this.gameLoop = this.gameLoop.bind(this);
    }
    
    init() {
        console.log('Initializing Pixel Realm: Echoes of the Glitch...');
        
        // Setup canvas
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize systems
        this.particles = new ParticleSystem();
        this.dialogue = new DialogueSystem();
        this.input = new InputHandler();
        
        // Initialize audio (placeholder)
        this.audio = {
            playSound: (sound) => console.log(`Playing sound: ${sound}`),
            playMusic: (track) => console.log(`Playing music: ${track}`),
            stopMusic: () => console.log('Stopping music'),
            setVolume: (volume) => console.log(`Setting volume: ${volume}`)
        };
        
        // Initialize regions
        this.initializeRegions();
        
        // Create player
        this.player = new Player(100, 100);
        this.camera.targetX = this.player.x - CONFIG.CANVAS_WIDTH / 2;
        this.camera.targetY = this.player.y - CONFIG.CANVAS_HEIGHT / 2;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start game
        this.setState(GAME_STATES.PLAYING);
        this.loadRegion(REGIONS.SILENT_VILLAGE);
        
        // Start game loop
        requestAnimationFrame(this.gameLoop);
    }
    
    initializeRegions() {
        // Create all game regions
        for (const regionId of Object.values(REGIONS)) {
            this.regions.set(regionId, {
                tilemap: new Tilemap(regionId),
                enemies: [],
                npcs: [],
                coreFragments: [],
                visited: false
            });
        }
    }
    
    setupEventListeners() {
        // Player health change events
        this.events.on('playerHealthChanged', (health) => {
            this.updateHealthUI();
        });
        
        // Fragment collection events
        this.events.on('fragmentCollected', (type) => {
            this.updateWorldCorruption();
        });
        
        // Boss defeat events
        this.events.on('bossDefeated', (boss) => {
            this.handleBossDefeat(boss);
        });
    }
    
    loadRegion(regionId) {
        console.log(`Loading region: ${regionId}`);
        
        this.currentRegion = this.regions.get(regionId);
        if (!this.currentRegion) {
            console.error(`Region ${regionId} not found!`);
            return;
        }
        
        // Mark as visited
        this.currentRegion.visited = true;
        
        // Load tilemap
        this.tilemap = this.currentRegion.tilemap;
        
        // Spawn enemies
        this.spawnEnemies();
        
        // Spawn NPCs
        this.spawnNPCs();
        
        // Place core fragments
        this.placeCoreFragments();
        
        // Update corruption
        this.updateWorldCorruption();
        
        // Position player at entrance
        this.positionPlayerAtEntrance();
        
        // Update camera
        this.updateCamera();
    }
    
    spawnEnemies() {
        if (!this.currentRegion || !this.tilemap) return;
        
        this.currentRegion.enemies = [];
        
        for (const spawnPoint of this.tilemap.enemySpawnPoints) {
            const enemy = EnemyFactory.createEnemyFromSpawn(spawnPoint);
            if (enemy) {
                this.currentRegion.enemies.push(enemy);
            }
        }
        
        console.log(`Spawned ${this.currentRegion.enemies.length} enemies`);
    }
    
    spawnNPCs() {
        if (!this.currentRegion || !this.tilemap) return;
        
        this.currentRegion.npcs = [];
        
        for (const spawnPoint of this.tilemap.npcSpawnPoints) {
            const npcData = NPC_DEFINITIONS[spawnPoint.type.toUpperCase()];
            if (npcData) {
                const npc = {
                    x: spawnPoint.x * CONFIG.TILE_SIZE,
                    y: spawnPoint.y * CONFIG.TILE_SIZE,
                    width: CONFIG.TILE_SIZE,
                    height: CONFIG.TILE_SIZE,
                    type: spawnPoint.type,
                    data: npcData,
                    interacted: false
                };
                this.currentRegion.npcs.push(npc);
            }
        }
    }
    
    placeCoreFragments() {
        if (!this.currentRegion) return;
        
        // Only place fragments in regions that haven't been cleared
        const fragmentTypes = [CORE_TYPES.SPEED, CORE_TYPES.SHIELD, CORE_TYPES.POWER];
        const fragmentCount = this.currentRegion.visited ? 0 : 1 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < fragmentCount; i++) {
            const type = fragmentTypes[Math.floor(Math.random() * fragmentTypes.length)];
            const fragment = {
                x: Utils.random(100, CONFIG.CANVAS_WIDTH - 100),
                y: Utils.random(100, CONFIG.CANVAS_HEIGHT - 100),
                width: 20,
                height: 20,
                type: type,
                collected: false,
                pulse: 0
            };
            this.currentRegion.coreFragments.push(fragment);
        }
    }
    
    positionPlayerAtEntrance() {
        if (!this.tilemap || !this.tilemap.exitPortal) return;
        
        // Position player near entrance portal or at center
        const entranceX = this.tilemap.width / 2;
        const entranceY = this.tilemap.height - 3;
        
        this.player.x = entranceX * CONFIG.TILE_SIZE;
        this.player.y = entranceY * CONFIG.TILE_SIZE;
    }
    
    gameLoop(currentTime) {
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (this.deltaTime > 100) this.deltaTime = 16; // Clamp large deltas
        
        this.update(this.deltaTime);
        this.render(this.ctx);
        
        requestAnimationFrame(this.gameLoop);
    }
    
    update(deltaTime) {
        if (this.state === GAME_STATES.PAUSED || this.state === GAME_STATES.DIALOGUE) {
            this.updateDialogue(deltaTime);
            return;
        }
        
        if (this.state !== GAME_STATES.PLAYING && this.state !== GAME_STATES.BOSS_FIGHT) return;
        
        // Update input
        const input = this.input.getInput();
        
        // Update player
        if (this.player.isAlive()) {
            this.player.update(deltaTime, input, this.tilemap);
            this.checkPlayerCollisions();
        }
        
        // Update enemies
        if (this.currentRegion) {
            for (const enemy of this.currentRegion.enemies) {
                enemy.update(deltaTime, this.player, this.tilemap);
            }
        }
        
        // Update particles
        this.particles.update(deltaTime);
        
        // Update camera
        this.updateCamera();
        
        // Update dialogue system
        this.updateDialogue(deltaTime);
        
        // Check for transitions
        this.checkTransitions();
        
        // Clean up
        this.cleanup();
    }
    
    checkPlayerCollisions() {
        // Check enemy collisions
        if (this.currentRegion) {
            for (const enemy of this.currentRegion.enemies) {
                if (enemy.isAlive() && 
                    enemy.getBounds().intersects(this.player.getBounds()) &&
                    !this.player.state.invulnerable) {
                    this.player.takeDamage(enemy.damage, enemy);
                }
            }
        }
        
        // Check tile hazards
        if (this.tilemap.isHazard(this.player.x, this.player.y)) {
            if (!this.player.state.invulnerable) {
                this.player.takeDamage(5); // Environmental damage
            }
        }
    }
    
    updateCamera() {
        // Smooth camera follow
        if (this.player) {
            this.camera.targetX = this.player.x - CONFIG.CANVAS_WIDTH / 2;
            this.camera.targetY = this.player.y - CONFIG.CANVAS_HEIGHT / 2;
        }
        
        // Apply shake
        if (this.camera.shakeDuration > 0) {
            this.camera.shakeDuration -= this.deltaTime;
            this.camera.shakeX = (Math.random() - 0.5) * this.camera.shakeIntensity;
            this.camera.shakeY = (Math.random() - 0.5) * this.camera.shakeIntensity;
            
            if (this.camera.shakeDuration <= 0) {
                this.camera.shakeIntensity = 0;
            }
        }
        
        // Lerp to target
        this.camera.x = Utils.lerp(this.camera.x, this.camera.targetX, CONFIG.CAMERA_LERP) + this.camera.shakeX;
        this.camera.y = Utils.lerp(this.camera.y, this.camera.targetY, CONFIG.CAMERA_LERP) + this.camera.shakeY;
        
        // Clamp camera to bounds
        this.camera.x = Utils.clamp(this.camera.x, 0, (this.tilemap.width * CONFIG.TILE_SIZE) - CONFIG.CANVAS_WIDTH);
        this.camera.y = Utils.clamp(this.camera.y, 0, (this.tilemap.height * CONFIG.TILE_SIZE) - CONFIG.CANVAS_HEIGHT);
    }
    
    shakeCamera(intensity, duration) {
        this.camera.shakeIntensity = intensity;
        this.camera.shakeDuration = duration;
    }
    
    checkTransitions() {
        if (!this.tilemap || !this.tilemap.exitPortal || !this.player) return;
        
        // Check portal transition
        const portalPos = Utils.gridToWorld(this.tilemap.exitPortal.x, this.tilemap.exitPortal.y);
        const distanceToPortal = Utils.distance(
            this.player.x, this.player.y,
            portalPos.x, portalPos.y
        );
        
        if (distanceToPortal < CONFIG.TILE_SIZE) {
            const targetRegion = this.tilemap.exitPortal.targetRegion;
            if (targetRegion) {
                this.loadRegion(targetRegion);
            }
        }
        
        // Check NPC interactions
        if (this.currentRegion) {
            for (const npc of this.currentRegion.npcs) {
                const distance = Utils.distance(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height / 2,
                    npc.x + npc.width / 2,
                    npc.y + npc.height / 2
                );
                
                if (distance < 40 && !npc.interacted) {
                    // Auto-start dialogue when close
                    if (this.dialogue.startDialogue(npc.type, this.player.coreFragments)) {
                        npc.interacted = true;
                        this.setState(GAME_STATES.DIALOGUE);
                    }
                }
            }
        }
    }
    
    updateDialogue(deltaTime) {
        this.dialogue.update(deltaTime);
        
        if (this.state === GAME_STATES.DIALOGUE) {
            const input = this.input.getInput();
            if (input.attack || input.space) {
                if (!this.dialogue.nextLine()) {
                    this.setState(GAME_STATES.PLAYING);
                }
            }
        }
    }
    
    render(ctx) {
        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Draw tilemap
        if (this.tilemap) {
            this.tilemap.draw(ctx, this.camera, this.worldCorruption);
        }
        
        // Draw core fragments (before entities)
        if (this.currentRegion) {
            this.drawCoreFragments(ctx);
        }
        
        // Draw entities
        if (this.currentRegion) {
            for (const enemy of this.currentRegion.enemies) {
                if (enemy.isAlive()) {
                    enemy.draw(ctx, this.camera);
                }
            }
        }
        
        // Draw player
        if (this.player && this.player.isAlive()) {
            this.player.draw(ctx, this.camera);
        }
        
        // Draw NPCs
        if (this.currentRegion) {
            this.drawNPCs(ctx);
        }
        
        // Draw particles
        this.particles.draw(ctx, this.camera);
        
        // Draw dialogue
        if (this.state === GAME_STATES.DIALOGUE) {
            this.dialogue.draw(ctx);
        }
        
        // Draw screen shake effect
        if (this.camera.shakeDuration > 0) {
            this.drawScreenGlitch(ctx);
        }
    }
    
    drawCoreFragments(ctx) {
        for (const fragment of this.currentRegion.coreFragments) {
            if (fragment.collected) continue;
            
            // Pulse effect
            fragment.pulse += 0.05;
            const scale = 1 + Math.sin(fragment.pulse) * 0.2;
            const size = fragment.width * scale;
            
            // Draw fragment
            ctx.save();
            ctx.translate(fragment.x - this.camera.x, fragment.y - this.camera.y);
            
            const colors = {
                [CORE_TYPES.SPEED]: '#00ff00',
                [CORE_TYPES.SHIELD]: '#0000ff',
                [CORE_TYPES.POWER]: '#ff0000'
            };
            
            ctx.fillStyle = colors[fragment.type] || '#ffff00';
            ctx.shadowBlur = 10;
            ctx.shadowColor = colors[fragment.type];
            
            ctx.fillRect(-size / 2, -size / 2, size, size);
            
            ctx.restore();
        }
    }
    
    drawNPCs(ctx) {
        for (const npc of this.currentRegion.npcs) {
            ctx.save();
            
            const screenX = npc.x - this.camera.x;
            const screenY = npc.y - this.camera.y;
            
            // Draw NPC sprite (simple representation)
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(screenX, screenY, npc.width, npc.height);
            
            // Draw name
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Courier New';
            ctx.fillText(npc.data.name, screenX - 10, screenY - 5);
            
            ctx.restore();
        }
    }
    
    drawScreenGlitch(ctx) {
        // Apply screen-wide glitch effect during major events
        if (Math.random() < 0.3) {
            Utils.createGlitchEffect(
                ctx,
                0, 0,
                CONFIG.CANVAS_WIDTH,
                CONFIG.CANVAS_HEIGHT,
                this.camera.shakeIntensity / 10
            );
        }
    }
    
    spawnCoreFragment(x, y, type) {
        const fragment = {
            x: x,
            y: y,
            width: 20,
            height: 20,
            type: type,
            collected: false,
            pulse: 0
        };
        
        if (this.currentRegion) {
            this.currentRegion.coreFragments.push(fragment);
        }
    }
    
    cleanup() {
        // Remove dead enemies
        if (this.currentRegion) {
            this.currentRegion.enemies = this.currentRegion.enemies.filter(
                enemy => enemy.isAlive() || enemy.animationFrame < 5
            );
            
            // Clean up collected fragments
            this.currentRegion.coreFragments = this.currentRegion.coreFragments.filter(
                fragment => !fragment.collected
            );
        }
    }
    
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        
        // Handle state transitions
        if (newState === GAME_STATES.GAME_OVER) {
            this.handleGameOver();
        } else if (newState === GAME_STATES.VICTORY) {
            this.handleVictory();
        }
    }
    
    handleGameOver() {
        console.log('Game Over!');
        this.audio.stopMusic();
        if (confirm('Game Over! Restart?')) {
            this.restart();
        }
    }
    
    handleVictory() {
        console.log('Victory!');
        this.audio.stopMusic();
        alert('You have defeated The Glitch Entity and saved the world!\n\n"I was created to fix errors. You never told me when to stop."');
    }
    
    updateHealthUI() {
        // Handled by player's UI update method
    }
    
    updateWorldCorruption() {
        // Update world corruption based on collected fragments
        const totalFragments = Object.values(this.player.coreFragments)
            .reduce((sum, count) => sum + count, 0);
        
        this.worldCorruption = Math.max(0, 1.0 - (totalFragments * CONFIG.WORLD_RESTORE_RATE));
        
        // Update tilemap corruption
        if (this.tilemap) {
            this.tilemap.worldCorruption = this.worldCorruption;
        }
    }
    
    handleBossDefeat(boss) {
        if (boss.name === 'Crystal Beast') {
            this.events.emit('fragmentCollected', CORE_TYPES.POWER);
            this.shakeCamera(20, 1000);
        } else if (boss.name === 'The Glitch Entity') {
            this.setState(GAME_STATES.VICTORY);
        }
    }
    
    restart() {
        // Reset game state
        this.player = new Player(100, 100);
        this.worldCorruption = 1.0;
        this.initializeRegions();
        this.loadRegion(REGIONS.SILENT_VILLAGE);
        this.setState(GAME_STATES.PLAYING);
    }
    
    // Development helper - start at specific region
    startAtRegion(regionId) {
        this.restart();
        this.loadRegion(regionId);
    }
}

// Global game instance
let game;

// Initialize game when page loads
window.addEventListener('load', () => {
    console.log('Starting Pixel Realm: Echoes of the Glitch...');
    game = new Game();
    game.init();
});

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
}