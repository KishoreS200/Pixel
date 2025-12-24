// Enemy base class
class Enemy extends Sprite {
    constructor(x, y, faction) {
        super({
            x: x,
            y: y,
            width: CONFIG.TILE_SIZE,
            height: CONFIG.TILE_SIZE,
            animationSpeed: 150
        });
        
        this.faction = faction;
        this.config = ENEMY_CONFIG[faction];
        this.health = this.config.baseHealth;
        this.maxHealth = this.config.baseHealth;
        this.damage = this.config.baseDamage;
        this.speed = this.config.baseSpeed;
        this.detectionRadius = this.config.detectionRadius;
        this.behavior = this.config.behavior;
        this.color = this.config.color;
        
        // AI state
        this.target = null;
        this.patrolPath = [];
        this.patrolIndex = 0;
        this.attackCooldown = 0;
        this.wanderDirection = Utils.random(0, Math.PI * 2);
        this.wanderTimer = 0;
        
        // Stun and effects
        this.stunned = false;
        this.stunTimer = 0;
        
        this.setupAnimations();
    }
    
    setupAnimations() {
        this.animationData = {
            [ANIMATION_STATES.IDLE]: { frames: 4, speed: 200, loop: true },
            [ANIMATION_STATES.WALK]: { frames: 6, speed: 120, loop: true },
            [ANIMATION_STATES.ATTACK]: { frames: 4, speed: 100, loop: false },
            [ANIMATION_STATES.HIT]: { frames: 2, speed: 150, loop: false },
            [ANIMATION_STATES.DEATH]: { frames: 6, speed: 120, loop: false }
        };
    }
    
    getAnimationData() {
        return this.animationData[this.currentAnimation] || this.animationData[ANIMATION_STATES.IDLE];
    }
    
    update(deltaTime, player, tilemap) {
        if (this.health <= 0) return;
        
        // Update timers
        if (this.attackCooldown > 0) {
            this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
        }
        
        if (this.stunned) {
            this.stunTimer -= deltaTime;
            if (this.stunTimer <= 0) {
                this.stunned = false;
            }
            return; // Don't move while stunned
        }
        
        // Update AI behavior
        this.updateAI(deltaTime, player, tilemap);
        
        // Update parent
        super.update(deltaTime);
    }
    
    updateAI(deltaTime, player, tilemap) {
        switch (this.behavior) {
            case 'erratic':
                this.updateErraticAI(player, tilemap);
                break;
            case 'patrol':
                this.updatePatrolAI(player, tilemap);
                break;
            case 'predictable':
                this.updatePredictableAI(player, tilemap);
                break;
        }
        
        // Update animation based on movement
        if (this.currentAnimation !== ANIMATION_STATES.ATTACK) {
            const moving = this.vx !== 0 || this.vy !== 0;
            this.setAnimation(moving ? ANIMATION_STATES.WALK : ANIMATION_STATES.IDLE);
        }
    }
    
    updateErraticAI(player, tilemap) {
        // Wandering behavior until player is detected
        const distanceToPlayer = Utils.distance(
            this.x, this.y, 
            player.x, player.y
        );
        
        if (distanceToPlayer < this.detectionRadius) {
            // Pursue player erratically
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            const erraticAngle = angle + (Math.random() - 0.5) * Math.PI / 2;
            
            this.vx = Math.cos(erraticAngle) * this.speed;
            this.vy = Math.sin(erraticAngle) * this.speed;
            
            // Try to attack
            if (distanceToPlayer < this.width && this.attackCooldown === 0) {
                this.performAttack(player);
            }
        } else {
            // Wander randomly
            this.wanderTimer -= 16;
            if (this.wanderTimer <= 0) {
                this.wanderDirection += (Math.random() - 0.5) * Math.PI / 4;
                this.wanderTimer = 1000; // Change direction every second
            }
            
            this.vx = Math.cos(this.wanderDirection) * this.speed * 0.5;
            this.vy = Math.sin(this.wanderDirection) * this.speed * 0.5;
        }
        
        // Apply movement with collision detection
        this.applyMovement(tilemap);
    }
    
    updatePatrolAI(player, tilemap) {
        const distanceToPlayer = Utils.distance(
            this.x, this.y, 
            player.x, player.y
        );
        
        if (distanceToPlayer < this.detectionRadius) {
            // Pursue player methodically
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.vx = Math.cos(angle) * this.speed;
            this.vy = Math.sin(angle) * this.speed;
            
            // Try to attack
            if (distanceToPlayer < this.width && this.attackCooldown === 0) {
                this.performAttack(player);
            }
        } else if (this.patrolPath.length > 0) {
            // Follow patrol path
            const targetPoint = this.patrolPath[this.patrolIndex];
            const targetX = targetPoint.x * CONFIG.TILE_SIZE;
            const targetY = targetPoint.y * CONFIG.TILE_SIZE;
            
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.speed) {
                // Reached patrol point, move to next
                this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
                this.vx = 0;
                this.vy = 0;
            } else {
                const angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * this.speed;
                this.vy = Math.sin(angle) * this.speed;
            }
        } else {
            // No patrol path, stand idle
            this.vx = 0;
            this.vy = 0;
        }
        
        this.applyMovement(tilemap);
    }
    
    updatePredictableAI(player, tilemap) {
        // Predictable pattern AI (like turrets or drones)
        const distanceToPlayer = Utils.distance(
            this.x, this.y, 
            player.x, player.y
        );
        
        if (distanceToPlayer < this.detectionRadius) {
            // Face player and attack periodically
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.direction = Utils.getDirection(angle);
            
            this.vx = 0;
            this.vy = 0;
            
            // Attack in predictable intervals
            if (this.attackCooldown === 0 && distanceToPlayer < this.width * 2) {
                this.performAttack(player);
            }
        } else {
            // Patrol in simple pattern
            this.patrolTimer = (this.patrolTimer + 16) % 4000; // 4 second cycle
            const patternPhase = this.patrolTimer / 1000;
            
            if (patternPhase < 1) {
                this.vx = this.speed;
                this.vy = 0;
            } else if (patternPhase < 2) {
                this.vx = 0;
                this.vy = this.speed;
            } else if (patternPhase < 3) {
                this.vx = -this.speed;
                this.vy = 0;
            } else {
                this.vx = 0;
                this.vy = -this.speed;
            }
        }
        
        this.applyMovement(tilemap);
    }
    
    applyMovement(tilemap) {
        if (this.vx !== 0 || this.vy !== 0) {
            const newX = this.x + this.vx;
            const newY = this.y + this.vy;
            
            if (tilemap.moveIsValid(this.x, this.y, newX, this.y)) {
                this.x = newX;
            }
            if (tilemap.moveIsValid(this.x, this.y, this.x, newY)) {
                this.y = newY;
            }
        }
    }
    
    performAttack(target) {
        this.attacking = true;
        this.attackCooldown = 1000; // 1 second cooldown
        this.setAnimation(ANIMATION_STATES.ATTACK, true);
        
        // Calculate direction to target
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        this.direction = Utils.getDirection(angle);
        
        // Create attack effect
        game.particles.createAttackEffect(
            this.x + this.width / 2,
            this.y + this.height / 2,
            this.direction
        );
        
        // Check if attack hits
        const myCenter = this.getCenter();
        const targetCenter = target.getCenter();
        const distance = myCenter.distance(targetCenter);
        
        if (distance < this.width + target.width) {
            target.takeDamage(this.damage, this);
            
            // Particle effect
            game.particles.createDamageEffect(
                target.x + target.width / 2,
                target.y + target.height / 2,
                this.damage
            );
        }
    }
    
    takeDamageWithoutInvulnerability(amount) {
        this.health = Math.max(0, this.health - amount);
        this.setAnimation(ANIMATION_STATES.HIT, true);
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        this.setAnimation(ANIMATION_STATES.DEATH, true);
        
        // Create death effect
        game.particles.createDeathEffect(
            this.x + this.width / 2,
            this.y + this.height / 2,
            this.color
        );
    }
    
    isAlive() {
        return this.health > 0;
    }
    
    stun(duration) {
        this.stunned = true;
        this.stunTimer = duration;
        this.vx = 0;
        this.vy = 0;
    }
    
    // Draw enemy sprite
    draw(ctx, camera) {
        if (this.currentAnimation === ANIMATION_STATES.DEATH && this.animationFrame >= 5) {
            return; // Don't draw completely dead enemies
        }
        
        ctx.save();
        
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
        
        // Apply faction-specific visual effects
        if (this.faction === FACTIONS.GLITCH_FAUNA) {
            // Magenta highlights and glitch effects
            ctx.globalCompositeOperation = 'difference';
        }
        
        ctx.translate(-this.width / 2, -this.height / 2);
        
        // Draw invulnerability glitch effect
        if (this.state.invulnerable && Math.floor(this.state.invulnerableTimer / 100) % 2 === 0) {
            Utils.createGlitchEffect(ctx, 0, 0, this.width, this.height);
        }
        
        this.drawEnemySprite(ctx);
        
        ctx.restore();
    }
    
    drawEnemySprite(ctx) {
        // Draw based on faction
        switch (this.faction) {
            case FACTIONS.GLITCH_FAUNA:
                this.drawGlitchFauna(ctx);
                break;
            case FACTIONS.CORRUPTED_HUMANS:
                this.drawCorruptedHuman(ctx);
                break;
            case FACTIONS.SENTINEL_MACHINES:
                this.drawSentinelMachine(ctx);
                break;
        }
        
        // Draw corrupted visual effect
        if (this.animationFrame % 3 === 0 && this.faction !== FACTIONS.SENTINEL_MACHINES) {
            ctx.fillStyle = 'rgba(255, 0, 255, 0.2)';
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }
    
    drawGlitchFauna(ctx) {
        // Glitch bugs or corrupted wolves
        const size = this.width * 0.8;
        const offset = (this.width - size) / 2;
        
        // Body
        ctx.fillStyle = this.color;
        ctx.fillRect(offset, offset, size, size);
        
        // Missing pixels effect
        if (this.animationFrame % 4 === 0) {
            ctx.clearRect(offset + 4, offset + 4, 4, 4);
            ctx.clearRect(offset + 12, offset + 12, 4, 4);
        }
        
        // Erratic movement indicators
        if (this.currentAnimation === ANIMATION_STATES.WALK) {
            const glitchOffset = (Math.random() - 0.5) * 2;
            ctx.translate(glitchOffset, glitchOffset);
        }
    }
    
    drawCorruptedHuman(ctx) {
        // Villager echoes or city guards
        // Body (humanoid shape)
        ctx.fillStyle = this.color;
        ctx.fillRect(8, 12, 16, 12); // Torso
        ctx.fillRect(10, 4, 12, 10); // Head
        
        // Hollow eyes
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(12, 7, 2, 2);
        ctx.fillRect(18, 7, 2, 2);
        
        // Trapped memory effect
        if (this.currentAnimation === ANIMATION_STATES.IDLE && this.animationFrame === 0) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 1;
            ctx.strokeRect(6, 2, 20, 24);
        }
    }
    
    drawSentinelMachine(ctx) {
        // Turrets or patrol drones
        // Metallic body
        ctx.fillStyle = '#6666ff';
        ctx.fillRect(6, 6, 20, 20);
        
        // Glowing eye/camera
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0000';
        ctx.fillRect(13, 13, 6, 6);
        ctx.shadowBlur = 0;
        
        // Scan pattern (only for turrets)
        if (this.behavior === 'predictable') {
            const scanAngle = Date.now() * 0.002;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(16, 16, 12, scanAngle, scanAngle + 0.5);
            ctx.stroke();
        }
    }
}

// Specific enemy types
class GlitchBug extends Enemy {
    constructor(x, y) {
        super(x, y, FACTIONS.GLITCH_FAUNA);
        this.speed = this.config.baseSpeed * 1.5; // Faster bugs
        this.width = CONFIG.TILE_SIZE * 0.6;
        this.height = CONFIG.TILE_SIZE * 0.6;
    }
}

class CorruptedWolf extends Enemy {
    constructor(x, y) {
        super(x, y, FACTIONS.GLITCH_FAUNA);
        this.health = this.config.baseHealth * 1.5;
        this.damage = this.config.baseDamage * 1.2;
    }
}

class VillagerEcho extends Enemy {
    constructor(x, y) {
        super(x, y, FACTIONS.CORRUPTED_HUMANS);
        this.speed = this.config.baseSpeed * 0.8; // Slower, more methodical
    }
}

class CityGuard extends Enemy {
    constructor(x, y) {
        super(x, y, FACTIONS.CORRUPTED_HUMANS);
        this.health = this.config.baseHealth * 1.3;
        this.detectionRadius = this.config.detectionRadius * 1.2;
    }
}

class Turret extends Enemy {
    constructor(x, y) {
        super(x, y, FACTIONS.SENTINEL_MACHINES);
        this.speed = 0; // Turrets don't move
        this.damage = this.config.baseDamage * 1.5;
        this.attackRange = 120; // Long range
    }
    
    updateAI(deltaTime, player, tilemap) {
        // Stationary but rotates to face player
        const distanceToPlayer = Utils.distance(
            this.x, this.y, 
            player.x, player.y
        );
        
        if (distanceToPlayer < this.detectionRadius) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.direction = Utils.getDirection(angle);
            
            // Attack when in range
            if (distanceToPlayer < this.attackRange && this.attackCooldown === 0) {
                this.performAttack(player);
            }
        }
        
        // Override parent movement
        this.vx = 0;
        this.vy = 0;
    }
}

class PatrolDrone extends Enemy {
    constructor(x, y) {
        super(x, y, FACTIONS.SENTINEL_MACHINES);
        this.speed = this.config.baseSpeed * 1.2;
        this.behavior = 'predictable';
        this.patrolTimer = 0;
    }
}

// Enemy Factory
class EnemyFactory {
    static createEnemy(type, x, y) {
        switch (type) {
            case 'glitch_bug':
                return new GlitchBug(x, y);
            case 'corrupted_wolf':
                return new CorruptedWolf(x, y);
            case 'villager_echo':
                return new VillagerEcho(x, y);
            case 'city_guard':
                return new CityGuard(x, y);
            case 'turret':
                return new Turret(x, y);
            case 'patrol_drone':
                return new PatrolDrone(x, y);
            default:
                return new Enemy(x, y, FACTIONS.GLITCH_FAUNA);
        }
    }
    
    static createEnemyFromSpawn(spawnPoint) {
        const enemyTypes = {
            [FACTIONS.GLITCH_FAUNA]: ['glitch_bug', 'corrupted_wolf'],
            [FACTIONS.CORRUPTED_HUMANS]: ['villager_echo', 'city_guard'],
            [FACTIONS.SENTINEL_MACHINES]: ['turret', 'patrol_drone']
        };
        
        const possibleTypes = enemyTypes[spawnPoint.faction] || ['glitch_bug'];
        const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
        
        return this.createEnemy(type, 
            spawnPoint.x * CONFIG.TILE_SIZE,
            spawnPoint.y * CONFIG.TILE_SIZE
        );
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Enemy, EnemyFactory };
}