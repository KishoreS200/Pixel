// Base Boss class
class Boss extends Enemy {
    constructor(x, y, name, config) {
        super(x, y, FACTIONS.BOSS);
        this.name = name;
        this.maxHealth = config.health;
        this.health = config.health;
        this.phase = 1;
        this.phaseTimer = 0;
        this.isBoss = true;
        
        this.setupBossAnimations();
    }
    
    setupBossAnimations() {
        this.animationData = {
            [ANIMATION_STATES.IDLE]: { frames: 6, speed: 200, loop: true },
            [ANIMATION_STATES.WALK]: { frames: 8, speed: 120, loop: true },
            [ANIMATION_STATES.ATTACK]: { frames: 6, speed: 100, loop: false },
            [ANIMATION_STATES.HIT]: { frames: 3, speed: 150, loop: false },
            [ANIMATION_STATES.DEATH]: { frames: 10, speed: 150, loop: false },
            [ANIMATION_STATES.SPAWNING]: { frames: 8, speed: 200, loop: false }
        };
    }
    
    update(deltaTime, player, tilemap) {
        if (this.health <= 0) return;
        
        this.phaseTimer += deltaTime;
        super.update(deltaTime, player, tilemap);
    }
    
    changePhase(newPhase) {
        this.phase = newPhase;
        this.phaseTimer = 0;
        this.setAnimation(ANIMATION_STATES.SPAWNING, true);
        
        // Create phase transition effect
        game.particles.createTeleportEffect(
            this.x + this.width / 2,
            this.y + this.height / 2
        );
    }
}

// Crystal Beast - Mini-boss in Crystal Mines
class CrystalBeast extends Boss {
    constructor(x, y) {
        super(x, y, 'Crystal Beast', BOSS_CONFIG.CRYSTAL_BEAST);
        this.width = CONFIG.TILE_SIZE * 2;
        this.height = CONFIG.TILE_SIZE * 2;
        this.weakPointExposed = false;
        this.weakPointTimer = 0;
        this.chargeTimer = 0;
        this.charging = false;
        this.chargeDirection = null;
    }
    
    update(deltaTime, player, tilemap) {
        if (this.health <= 0) return;
        
        // Update charge mechanics
        if (this.charging) {
            this.updateCharge(deltaTime, tilemap);
        } else {
            this.chargeTimer += deltaTime;
        }
        
        // Update weak point
        if (this.weakPointExposed) {
            this.weakPointTimer -= deltaTime;
            if (this.weakPointTimer <= 0) {
                this.weakPointExposed = false;
            }
        }
        
        super.update(deltaTime, player, tilemap);
    }
    
    updateAI(deltaTime, player, tilemap) {
        const distanceToPlayer = Utils.distance(
            this.x + this.width / 2, this.y + this.height / 2,
            player.x + player.width / 2, player.y + player.height / 2
        );
        
        if (this.phase === 1) {
            this.updatePhase1(deltaTime, player, distanceToPlayer, tilemap);
        } else if (this.phase === 2) {
            this.updatePhase2(deltaTime, player, distanceToPlayer, tilemap);
        }
        
        // Phase transitions
        if (this.health <= this.maxHealth * 0.5 && this.phase === 1) {
            this.changePhase(2);
        }
    }
    
    updatePhase1(deltaTime, player, distance, tilemap) {
        // Basic charge attacks with telegraph
        if (this.chargeTimer > 3000 && distance < 150) { // Telegraphed charge
            this.startCharge(player);
        } else if (!this.charging) {
            // Basic patrol/wander
            this.wanderTimer = (this.wanderTimer + deltaTime) % 4000;
            const patternPhase = this.wanderTimer / 1000;
            
            const speed = this.speed * 0.5; // Slower in phase 1
            const patterns = [
                { x: speed, y: 0 },
                { x: 0, y: speed },
                { x: -speed, y: 0 },
                { x: 0, y: -speed }
            ];
            
            const pattern = patterns[Math.floor(patternPhase) % 4];
            this.vx = pattern.x;
            this.vy = pattern.y;
            
            this.applyMovement(tilemap);
        }
    }
    
    updatePhase2(deltaTime, player, distance, tilemap) {
        // Melee + charges, weak point exposed
        if (this.chargeTimer > 2000) { // More frequent charges
            this.startCharge(player);
        } else if (!this.charging) {
            // Aggressive pursuit
            const angle = Math.atan2(
                player.y + player.height / 2 - this.y - this.height / 2,
                player.x + player.width / 2 - this.x - this.width / 2
            );
            
            this.vx = Math.cos(angle) * this.speed;
            this.vy = Math.sin(angle) * this.speed;
            
            // Attack when close
            if (distance < this.width && this.attackCooldown === 0) {
                this.performAttack(player);
            }
            
            this.applyMovement(tilemap);
        }
        
        // Expose weak point periodically
        if (this.phaseTimer > 5000) {
            this.exposeWeakPoint();
            this.phaseTimer = 0;
        }
    }
    
    startCharge(target) {
        this.charging = true;
        this.chargeTimer = 0;
        this.chargeDirection = Math.atan2(
            target.y - this.y,
            target.x - this.x
        );
        this.setAnimation(ANIMATION_STATES.ATTACK, true);
        
        // Telegraph with particles
        game.particles.createExplosionEffect(
            this.x + this.width / 2,
            this.y + this.height / 2,
            40
        );
    }
    
    updateCharge(deltaTime, tilemap) {
        const chargeSpeed = this.speed * 4;
        const newX = this.x + Math.cos(this.chargeDirection) * chargeSpeed;
        const newY = this.y + Math.sin(this.chargeDirection) * chargeSpeed;
        
        if (tilemap.moveIsValid(this.x, this.y, newX, newY)) {
            this.x = newX;
            this.y = newY;
        } else {
            this.charging = false;
        }
        
        // End charge after distance or time
        if (this.chargeTimer > 500) {
            this.charging = false;
        }
    }
    
    exposeWeakPoint() {
        this.weakPointExposed = true;
        this.weakPointTimer = 2000; // 2 seconds exposed
        
        // Create visual cue
        game.particles.createPickupEffect(
            this.x + this.width / 2,
            this.y + this.height / 2,
            CORE_TYPES.POWER
        );
    }
    
    takeDamageWithoutInvulnerability(amount) {
        if (this.phase === 2 && this.weakPointExposed) {
            amount *= BOSS_CONFIG.CRYSTAL_BEAST.weakPointMultiplier; // 2x damage
        }
        
        this.health = Math.max(0, this.health - amount);
        this.setAnimation(ANIMATION_STATES.HIT, true);
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    performAttack(target) {
        this.attackCooldown = 1500; // 1.5 second cooldown
        
        // Create attack effect
        game.particles.createExplosionEffect(
            target.x + target.width / 2,
            target.y + target.height / 2,
            25
        );
        
        // Area damage around the beast
        const damageRadius = this.width;
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        if (Utils.pointInCircle(
            { x: target.x + target.width / 2, y: target.y + target.height / 2 },
            { x: centerX, y: centerY },
            damageRadius
        )) {
            const damage = this.phase === 1 ? 
                this.damage * BOSS_CONFIG.CRYSTAL_BEAST.phase1Damage : 
                this.damage * BOSS_CONFIG.CRYSTAL_BEAST.phase2Damage;
            
            target.takeDamage(damage, this);
        }
    }
    
    drawBossSprite(ctx) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Crystal body
        ctx.fillStyle = '#9370DB';
        ctx.beginPath();
        ctx.moveTo(centerX, 4);
        ctx.lineTo(this.width - 4, centerY);
        ctx.lineTo(centerX, this.height - 4);
        ctx.lineTo(4, centerY);
        ctx.closePath();
        ctx.fill();
        
        // Crystal facets
        ctx.fillStyle = '#DDA0DD';
        ctx.beginPath();
        ctx.moveTo(centerX, 8);
        ctx.lineTo(centerX - 8, centerY);
        ctx.lineTo(centerX, this.height - 8);
        ctx.closePath();
        ctx.fill();
        
        // Weak point indicator
        if (this.weakPointExposed) {
            ctx.fillStyle = '#ff0000';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0000';
            ctx.fillRect(centerX - 4, centerY - 4, 8, 8);
            ctx.shadowBlur = 0;
        }
        
        // Phase 2 enhancements
        if (this.phase === 2) {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(2, 2, this.width - 4, this.height - 4);
        }
    }
    
    die() {
        super.die();
        
        // Drop Power Core fragment
        game.spawnCoreFragment(this.x + this.width / 2, this.y + this.height / 2, CORE_TYPES.POWER);
        
        // Screen shake
        game.camera.shake(30);
    }
}

// The Glitch Entity - Final Boss
class GlitchEntity extends Boss {
    constructor(x, y) {
        super(x, y, 'The Glitch Entity', BOSS_CONFIG.GLITCH_ENTITY);
        this.width = CONFIG.TILE_SIZE * 3;
        this.height = CONFIG.TILE_SIZE * 3;
        this.teleportCooldown = 0;
        this.projectiles = [];
        this.noFixedForm = true;
        this.screenGlitchIntensity = 0;
    }
    
    update(deltaTime, player, tilemap) {
        if (this.health <= 0) return;
        
        this.teleportCooldown -= deltaTime;
        this.updateProjectiles(deltaTime, player);
        
        // Update screen glitch effect based on phase
        if (this.phase === 1) {
            this.screenGlitchIntensity = Utils.lerp(this.screenGlitchIntensity, 0.8, 0.1);
        } else if (this.phase === 2) {
            this.screenGlitchIntensity = Utils.lerp(this.screenGlitchIntensity, 0.3, 0.1);
        } else {
            this.screenGlitchIntensity = Utils.lerp(this.screenGlitchIntensity, 1.0, 0.1);
        }
        
        super.update(deltaTime, player, tilemap);
    }
    
    updateAI(deltaTime, player, tilemap) {
        const distanceToPlayer = Utils.distance(
            this.x + this.width / 2, this.y + this.height / 2,
            player.x + player.width / 2, player.y + player.height / 2
        );
        
        if (this.phase === 1) {
            this.updatePhase1(deltaTime, player, distanceToPlayer);
        } else if (this.phase === 2) {
            this.updatePhase2(deltaTime, player, distanceToPlayer);
        } else if (this.phase === 3) {
            this.updatePhase3(deltaTime, player, distanceToPlayer);
        }
        
        // Phase transitions
        const healthPercent = this.health / this.maxHealth;
        if (healthPercent <= 0.33 && this.phase === 2) {
            this.changePhase(3);
        } else if (healthPercent <= 0.66 && this.phase === 1) {
            this.changePhase(2);
        }
    }
    
    updatePhase1(deltaTime, player, distance) {
        // Chaos: Teleports, erratic attacks, random projectiles
        if (this.teleportCooldown <= 0 && distance < 200) {
            this.teleport();
        }
        
        // Erratic movement when not teleporting
        if (this.teleportCooldown > 1000) {
            const erraticX = this.x + (Math.random() - 0.5) * 4;
            const erraticY = this.y + (Math.random() - 0.5) * 4;
            
            // Boundary check
            if (erraticX > 0 && erraticX < CONFIG.CANVAS_WIDTH - this.width) {
                this.x = erraticX;
            }
            if (erraticY > 0 && erraticY < CONFIG.CANVAS_HEIGHT - this.height) {
                this.y = erraticY;
            }
        }
        
        // Random attacks
        if (Math.random() < 0.02) { // 2% chance per frame
            this.performAttack(player);
        }
        
        // Random projectiles
        if (Math.random() < 0.01) {
            this.fireRandomProjectile();
        }
    }
    
    updatePhase2(deltaTime, player, distance) {
        // Order: Predictable patterns, learnable sequences
        this.vx = 0;
        this.vy = 0;
        
        // Pattern-based attacks
        const patternTime = this.phaseTimer % 8000; // 8-second pattern cycle
        
        if (patternTime < 2000) {
            // Pattern 1: Circle of projectiles
            if (patternTime % 500 < 50) {
                this.fireCircularProjectiles();
            }
        } else if (patternTime < 4000) {
            // Pattern 2: Directed attacks
            const angle = Math.atan2(
                player.y + player.height / 2 - this.y - this.height / 2,
                player.x + player.width / 2 - this.x - this.width / 2
            );
            this.direction = Utils.getDirection(angle);
            
            if (patternTime % 1000 < 100) {
                this.performAttack(player);
            }
        } else {
            // Pattern 3: Teleport to corners and attack
            if (patternTime % 2000 < 100) {
                this.teleportToCorner();
            }
        }
    }
    
    updatePhase3(deltaTime, player, distance) {
        // Desperate speed attacks, screen glitch effects increased
        const desperationSpeed = this.speed * 2;
        
        // Aggressively pursue player
        const angle = Math.atan2(
            player.y + player.height / 2 - this.y - this.height / 2,
            player.x + player.width / 2 - this.x - this.width / 2
        );
        
        this.vx = Math.cos(angle) * desperationSpeed;
        this.vy = Math.sin(angle) * desperationSpeed;
        
        // Rapid teleport when too close or too far
        if ((distance < 50 || distance > 150) && this.teleportCooldown <= 0) {
            this.teleport();
        }
        
        // Constant rapid attacks
        if (this.attackCooldown === 0) {
            this.performAttack(player);
            this.attackCooldown = 200; // Very fast attacks
        }
        
        // Continuous projectiles
        if (Math.random() < 0.05) {
            this.fireRandomProjectile();
        }
    }
    
    teleport() {
        const newX = Utils.random(100, CONFIG.CANVAS_WIDTH - this.width - 100);
        const newY = Utils.random(100, CONFIG.CANVAS_HEIGHT - this.height - 100);
        
        this.x = newX;
        this.y = newY;
        this.teleportCooldown = 1500;
        
        game.particles.createTeleportEffect(
            this.x + this.width / 2,
            this.y + this.height / 2
        );
    }
    
    teleportToCorner() {
        const corners = [
            { x: 50, y: 50 },
            { x: CONFIG.CANVAS_WIDTH - this.width - 50, y: 50 },
            { x: 50, y: CONFIG.CANVAS_HEIGHT - this.height - 50 },
            { x: CONFIG.CANVAS_WIDTH - this.width - 50, y: CONFIG.CANVAS_HEIGHT - this.height - 50 }
        ];
        
        const corner = corners[Math.floor(Math.random() * corners.length)];
        this.x = corner.x;
        this.y = corner.y;
        
        game.particles.createTeleportEffect(
            this.x + this.width / 2,
            this.y + this.height / 2
        );
    }
    
    fireRandomProjectile() {
        const angle = Utils.random(0, Math.PI * 2);
        this.fireProjectile(angle);
    }
    
    fireCircularProjectiles() {
        const projectileCount = BOSS_CONFIG.GLITCH_ENTITY.projectileCount;
        for (let i = 0; i < projectileCount; i++) {
            const angle = (Math.PI * 2 / projectileCount) * i;
            this.fireProjectile(angle);
        }
    }
    
    fireProjectile(angle) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        const projectile = {
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * BOSS_CONFIG.GLITCH_ENTITY.projectileSpeed,
            vy: Math.sin(angle) * BOSS_CONFIG.GLITCH_ENTITY.projectileSpeed,
            damage: this.damage * 0.5,
            size: 6
        };
        
        this.projectiles.push(projectile);
    }
    
    updateProjectiles(deltaTime, player) {
        this.projectiles = this.projectiles.filter(projectile => {
            projectile.x += projectile.vx * (deltaTime / 16.67);
            projectile.y += projectile.vy * (deltaTime / 16.67);
            
            // Check collision with player
            const projBounds = new Rectangle(
                projectile.x - projectile.size / 2,
                projectile.y - projectile.size / 2,
                projectile.size,
                projectile.size
            );
            
            const playerBounds = player.getBounds();
            
            if (projBounds.intersects(playerBounds)) {
                player.takeDamage(projectile.damage, this);
                return false; // Remove projectile
            }
            
            // Remove if off-screen
            return projectile.x > -50 && projectile.x < CONFIG.CANVAS_WIDTH + 50 &&
                   projectile.y > -50 && projectile.y < CONFIG.CANVAS_HEIGHT + 50;
        });
    }
    
    performAttack(target) {
        super.performAttack(target);
        
        if (this.phase === 1) {
            this.attackCooldown = 800; // Erratic timing
        } else if (this.phase === 2) {
            this.attackCooldown = 1200; // Predictable timing
        } else {
            this.attackCooldown = 200; // Rapid in phase 3
        }
        
        // Create glitch effect on attack
        const intensity = this.phase === 3 ? 2.0 : 1.0;
        game.particles.createTeleportEffect(
            target.x + target.width / 2,
            target.y + target.height / 2
        );
    }
    
    drawBossSprite(ctx) {
        ctx.save();
        
        // Apply pixel distortion for no fixed form
        const time = Date.now() * 0.005;
        const distortion = Math.sin(time) * 3;
        
        // Main glitch body
        ctx.fillStyle = '#ff00ff';
        
        for (let i = 0; i < 5; i++) {
            ctx.globalAlpha = 0.5 - i * 0.1;
            const offsetX = (Math.sin(time + i) * distortion) * (i + 1);
            const offsetY = (Math.cos(time + i) * distortion) * (i + 1);
            
            ctx.fillRect(
                8 + offsetX, 
                8 + offsetY, 
                this.width - 16, 
                this.height - 16
            );
        }
        
        ctx.globalAlpha = 1.0;
        
        // Central core
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffff';
        ctx.fillRect(
            this.width / 2 - 6, 
            this.height / 2 - 6, 
            12, 
            12
        );
        
        // Phase-specific effects
        if (this.phase === 2) {
            // Order pattern - geometric shapes
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(4, 4, this.width - 8, this.height - 8);
        } else if (this.phase === 3) {
            // Collapse effect - fragmented
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 1;
            for (let i = 0; i < 8; i++) {
                const x = Math.random() * this.width;
                const y = Math.random() * this.height;
                ctx.strokeRect(x, y, 4, 4);
            }
        }
        
        ctx.restore();
    }
    
    drawProjectiles(ctx, camera) {
        for (const projectile of this.projectiles) {
            ctx.save();
            
            // Glitchy projectiles
            if (Math.random() < 0.3) {
                Utils.createGlitchEffect(
                    ctx,
                    projectile.x - camera.x,
                    projectile.y - camera.y,
                    projectile.size,
                    projectile.size
                );
            }
            
            ctx.fillStyle = '#ff00ff';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff00ff';
            ctx.fillRect(
                projectile.x - camera.x - projectile.size / 2,
                projectile.y - camera.y - projectile.size / 2,
                projectile.size,
                projectile.size
            );
            
            ctx.restore();
        }
    }
    
    die() {
        super.die();
        
        // Final game victory
        game.setState(GAME_STATES.VICTORY);
        
        // Massive particle effect
        for (let i = 0; i < 50; i++) {
            game.particles.createExplosionEffect(
                this.x + this.width / 2,
                this.y + this.height / 2,
                100
            );
        }
        
        // Final dialogue
        console.log('THE GLITCH ENTITY: "I was created to fix errors. You never told me when to stop."');
    }
}

// Boss Factory
class BossFactory {
    static createBoss(type, x, y) {
        switch (type) {
            case 'crystal_beast':
                return new CrystalBeast(x, y);
            case 'glitch_entity':
                return new GlitchEntity(x, y);
            default:
                return new CrystalBeast(x, y);
        }
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Boss, CrystalBeast, GlitchEntity, BossFactory };
}