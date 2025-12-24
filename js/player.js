// Player Character: Kiro - The Last Technician
class Player extends Sprite {
    constructor(x, y) {
        super({
            x: x,
            y: y,
            width: CONFIG.TILE_SIZE,
            height: CONFIG.TILE_SIZE,
            color: '#2a4a6b', // Dark cloak color
            animationSpeed: 150
        });
        
        // Player-specific properties
        this.health = CONFIG.PLAYER_MAX_HEALTH;
        this.maxHealth = CONFIG.PLAYER_MAX_HEALTH;
        this.direction = DIRECTIONS.DOWN;
        this.moving = false;
        this.attacking = false;
        this.attackCooldown = 0;
        
        // Core fragments collected
        this.coreFragments = {
            [CORE_TYPES.SPEED]: 0,
            [CORE_TYPES.SHIELD]: 0,
            [CORE_TYPES.POWER]: 0
        };
        
        // Current core abilities
        this.activeCores = new Set();
        this.coreEffects = {
            dashActive: false,
            shieldActive: false,
            powerActive: false
        };
        
        // Dash mechanics
        this.dashCooldown = 0;
        this.dashDuration = 0;
        this.dashDirection = null;
        
        // Visual properties for Kiro's design
        this.glowingEyeOffset = 0;
        this.coreFragmentPulse = 0;
        
        // Animation setup
        this.setupAnimations();
    }
    
    setupAnimations() {
        // Animation sequences based on game design
        this.animationData = {
            [ANIMATION_STATES.IDLE]: {
                frames: 4,
                speed: 200, // Slower for idle breathing
                loop: true
            },
            [ANIMATION_STATES.WALK]: {
                frames: 6,
                speed: 100, // Faster for walking
                loop: true
            },
            [ANIMATION_STATES.ATTACK]: {
                frames: 4,
                speed: 80, // Quick attack animation
                loop: false
            },
            [ANIMATION_STATES.HIT]: {
                frames: 2,
                speed: 100,
                loop: false
            },
            [ANIMATION_STATES.DEATH]: {
                frames: 6,
                speed: 150,
                loop: false
            }
        };
    }
    
    getAnimationData() {
        return this.animationData[this.currentAnimation] || this.animationData[ANIMATION_STATES.IDLE];
    }
    
    onAnimationComplete() {
        // Return to appropriate animation after one-shot animations
        if (this.currentAnimation === ANIMATION_STATES.ATTACK) {
            this.attacking = false;
            this.setAnimation(this.moving ? ANIMATION_STATES.WALK : ANIMATION_STATES.IDLE);
        } else if (this.currentAnimation === ANIMATION_STATES.HIT) {
            this.setAnimation(ANIMATION_STATES.IDLE);
        }
    }
    
    update(deltaTime, input, tilemap) {
        // Update timers
        this.updateTimers(deltaTime);
        
        // Don't update if dead or stunned
        if (this.health <= 0 || this.state.stunned) {
            super.update(deltaTime);
            return;
        }
        
        // Handle input
        this.handleInput(input, tilemap);
        
        // Update dash
        this.updateDash(deltaTime);
        
        // Update core effects
        this.updateCoreEffects(deltaTime);
        
        // Update visual effects
        this.glowingEyeOffset = Math.sin(Date.now() * 0.003) * 2;
        this.coreFragmentPulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        
        // Update parent
        super.update(deltaTime);
    }
    
    updateTimers(deltaTime) {
        // Attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
        }
        
        // Dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown = Math.max(0, this.dashCooldown - deltaTime);
        }
    }
    
    handleInput(input, tilemap) {
        const wasMoving = this.moving;
        this.moving = false;
        
        let moveX = 0;
        let moveY = 0;
        
        // Get input vector
        if (input.up) {
            moveY = -1;
            this.direction = DIRECTIONS.UP;
            this.moving = true;
        }
        if (input.down) {
            moveY = 1;
            this.direction = DIRECTIONS.DOWN;
            this.moving = true;
        }
        if (input.left) {
            moveX = -1;
            this.direction = DIRECTIONS.LEFT;
            this.flipX = false;
            this.moving = true;
        }
        if (input.right) {
            moveX = 1;
            this.direction = DIRECTIONS.RIGHT;
            this.flipX = true;
            this.moving = true;
        }
        
        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.707; // sqrt(2)/2
            moveY *= 0.707;
        }
        
        // Handle dash (Space key)
        if (input.space && this.dashCooldown === 0 && moveX !== 0 || moveY !== 0) {
            this.startDash();
        }
        
        // Handle attack
        if (input.attack && this.attackCooldown === 0 && !this.attacking) {
            this.performAttack();
        }
        
        // Handle core abilities
        if (input.dashCore && this.activeCores.has(CORE_TYPES.SPEED)) {
            this.activateCore(CORE_TYPES.SPEED);
        }
        if (input.shieldCore && this.activeCores.has(CORE_TYPES.SHIELD)) {
            this.activateCore(CORE_TYPES.SHIELD);
        }
        if (input.powerCore && this.activeCores.has(CORE_TYPES.POWER)) {
            this.activateCore(CORE_TYPES.POWER);
        }
        
        // Apply movement
        if (this.dashActive) {
            // Dash overrides normal movement
            this.applyDashMovement(tilemap);
        } else if (this.moving) {
            const speed = this.getCurrentSpeed();
            const newX = this.x + moveX * speed;
            const newY = this.y + moveY * speed;
            
            // Collision detection
            if (tilemap.moveIsValid(this.x, this.y, newX, newY)) {
                this.x = newX;
                this.y = newY;
            } else {
                // Try moving in one axis at a time for better collision response
                if (tilemap.moveIsValid(this.x, this.y, newX, this.y)) {
                    this.x = newX;
                }
                if (tilemap.moveIsValid(this.x, this.y, this.x, newY)) {
                    this.y = newY;
                }
            }
        }
        
        // Update animation
        if (this.moving && !this.attacking && !this.dashActive) {
            this.setAnimation(ANIMATION_STATES.WALK);
        } else if (!this.moving && !this.attacking && this.currentAnimation !== ANIMATION_STATES.HIT) {
            this.setAnimation(ANIMATION_STATES.IDLE);
        }
    }
    
    getCurrentSpeed() {
        let speed = CONFIG.PLAYER_BASE_SPEED;
        
        // Apply terrain modifiers
        const tileType = tilemap.getTileType(this.x, this.y);
        if (tileType === TILE_TYPES.BUSH) {
            speed *= 0.5; // Slow in bushes
        }
        
        // Apply core effects
        if (this.coreEffects.dashActive) {
            speed *= 2.0; // Double speed during dash
        }
        
        return speed;
    }
    
    startDash() {
        this.coreEffects.dashActive = true;
        this.dashDuration = 300; // 300ms dash
        this.dashCooldown = 3000; // 3 seconds cooldown
        this.dashDirection = this.direction;
        
        // Create particles
        game.particles.createTeleportEffect(this.x + this.width/2, this.y + this.height/2);
    }
    
    updateDash(deltaTime) {
        if (this.dashDuration > 0) {
            this.dashDuration -= deltaTime;
            if (this.dashDuration <= 0) {
                this.coreEffects.dashActive = false;
            }
        }
    }
    
    applyDashMovement(tilemap) {
        const dashSpeed = CONFIG.PLAYER_BASE_SPEED * 4; // Very fast during dash
        
        const dashVectors = {
            [DIRECTIONS.UP]: { x: 0, y: -1 },
            [DIRECTIONS.DOWN]: { x: 0, y: 1 },
            [DIRECTIONS.LEFT]: { x: -1, y: 0 },
            [DIRECTIONS.RIGHT]: { x: 1, y: 0 }
        };
        
        const dashVector = dashVectors[this.dashDirection] || { x: 0, y: 0 };
        const newX = this.x + dashVector.x * dashSpeed;
        const newY = this.y + dashVector.y * dashSpeed;
        
        if (tilemap.moveIsValid(this.x, this.y, newX, newY)) {
            this.x = newX;
            this.y = newY;
        }
    }
    
    performAttack() {
        this.attacking = true;
        this.attackCooldown = CONFIG.PLAYER_ATTACK_COOLDOWN;
        this.setAnimation(ANIMATION_STATES.ATTACK, true);
        
        // Create attack effect
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        game.particles.createAttackEffect(centerX, centerY, this.direction);
        
        // Calculate attack hitbox
        const attackRange = CONFIG.PLAYER_ATTACK_RANGE;
        const attackBox = this.getAttackHitbox();
        
        // Check for hits
        this.checkAttackHits(attackBox);
    }
    
    getAttackHitbox() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const range = CONFIG.PLAYER_ATTACK_RANGE;
        
        const hitboxes = {
            [DIRECTIONS.UP]: {
                x: centerX - range / 2,
                y: centerY - range,
                width: range,
                height: range
            },
            [DIRECTIONS.DOWN]: {
                x: centerX - range / 2,
                y: centerY,
                width: range,
                height: range
            },
            [DIRECTIONS.LEFT]: {
                x: centerX - range,
                y: centerY - range / 2,
                width: range,
                height: range
            },
            [DIRECTIONS.RIGHT]: {
                x: centerX,
                y: centerY - range / 2,
                width: range,
                height: range
            }
        };
        
        return hitboxes[this.direction];
    }
    
    checkAttackHits(attackBox) {
        const damage = this.getAttackDamage();
        
        // Check enemy hits (this will be called from game state)
        if (game.currentRegion && game.currentRegion.enemies) {
            for (const enemy of game.currentRegion.enemies) {
                if (enemy.isAlive() && enemy.getBounds().intersects(new Rectangle(
                    attackBox.x, attackBox.y, attackBox.width, attackBox.height
                ))) {
                    const actualDamage = enemy.takeDamage(damage, this);
                    
                    // Knockback
                    enemy.applyKnockback(this);
                    
                    // Particle effect
                    game.particles.createDamageEffect(
                        enemy.x + enemy.width / 2,
                        enemy.y + enemy.height / 2,
                        actualDamage
                    );
                }
            }
        }
    }
    
    getAttackDamage() {
        let damage = 10; // Base damage
        
        if (this.activeCores.has(CORE_TYPES.POWER)) {
            damage *= 2; // Double damage with power core
        }
        
        return damage;
    }
    
    activateCore(coreType) {
        this.activeCores.add(coreType);
        
        const coreDurations = {
            [CORE_TYPES.SPEED]: 3000, // 3 seconds
            [CORE_TYPES.SHIELD]: 5000, // 5 seconds
            [CORE_TYPES.POWER]: 4000  // 4 seconds
        };
        
        setTimeout(() => {
            this.activeCores.delete(coreType);
        }, coreDurations[coreType]);
    }
    
    updateCoreEffects(deltaTime) {
        // Core effects are handled in real-time
        // Speed core: handled in getCurrentSpeed()
        // Shield core: handled in takeDamage()
        // Power core: handled in getAttackDamage()
    }
    
    takeDamageWithoutInvulnerability(amount) {
        // Apply shield if active
        if (this.activeCores.has(CORE_TYPES.SHIELD)) {
            amount *= 0.5; // 50% damage reduction
        }
        
        this.health = Math.max(0, this.health - amount);
        
        // Update UI
        this.updateHealthUI();
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        this.setAnimation(ANIMATION_STATES.DEATH, true);
        game.setState(GAME_STATES.GAME_OVER);
    }
    
    isAlive() {
        return this.health > 0;
    }
    
    collectCoreFragment(type) {
        this.coreFragments[type]++;
        game.worldCorruption = Math.max(0, game.worldCorruption - CONFIG.WORLD_RESTORE_RATE);
        
        // Create pickup effect
        game.particles.createPickupEffect(this.x + this.width / 2, this.y + this.height / 2, type);
        
        // Update UI
        this.updateFragmentUI();
    }
    
    canCollectCoreFragment(fragment) {
        const distance = Utils.distance(
            this.x + this.width / 2,
            this.y + this.height / 2,
            fragment.x + fragment.width / 2,
            fragment.y + fragment.height / 2
        );
        return distance <= CONFIG.CORE_FRAGMENT_PICKUP_RANGE;
    }
    
    updateHealthUI() {
        const healthPercent = (this.health / this.maxHealth) * 100;
        const healthFill = document.getElementById('healthFill');
        if (healthFill) {
            healthFill.style.width = `${healthPercent}%`;
        }
    }
    
    updateFragmentUI() {
        const totalFragments = Object.values(this.coreFragments).reduce((a, b) => a + b, 0);
        const fragmentCount = document.getElementById('fragmentCount');
        if (fragmentCount) {
            fragmentCount.textContent = totalFragments;
        }
    }
    
    // Override sprite drawing for Kiro's specific appearance
    draw(ctx, camera) {
        ctx.save();
        
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        // Apply position
        ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
        
        // Apply flips
        if (this.flipX) ctx.scale(-1, 1);
        if (this.flipY) ctx.scale(1, -1);
        
        ctx.translate(-this.width / 2, -this.height / 2);
        
        // Draw Kiro's sprite based on animation state
        if (this.state.invulnerable && Math.floor(this.state.invulnerableTimer / 100) % 2 === 0) {
            Utils.createGlitchEffect(ctx, 0, 0, this.width, this.height);
        }
        
        this.drawKiroSprite(ctx);
        
        ctx.restore();
    }
    
    drawKiroSprite(ctx) {
        // Base torso (dark cloak/jacket)
        ctx.fillStyle = '#2a4a6b';
        ctx.fillRect(8, 8, 16, 16);
        
        // Utility belt
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(6, 18, 20, 4);
        
        // Head
        ctx.fillStyle = '#FDBCB4';
        ctx.fillRect(10, 4, 12, 8);
        
        // One normal eye, one glowing
        ctx.fillStyle = '#000000';
        ctx.fillRect(11, 6, 2, 2); // Normal eye
        
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#00ffff';
        ctx.fillRect(18 + this.glowingEyeOffset, 6, 3, 3); // Glowing eye
        ctx.shadowBlur = 0;
        
        // Short messy hair
        ctx.fillStyle = '#654321';
        for (let i = 0; i < 6; i++) {
            const hairX = 10 + (i * 2);
            const hairY = 3 + Math.floor(Math.random() * 3);
            ctx.fillRect(hairX, hairY, 2, 2);
        }
        
        // Glowing cyan core fragment in chest
        ctx.fillStyle = `#00ffff${Math.floor(this.coreFragmentPulse * 255).toString(16).padStart(2, '0')}`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00ffff';
        ctx.fillRect(14, 12, 4, 4);
        ctx.shadowBlur = 0;
        
        // Animation-specific details
        if (this.currentAnimation === ANIMATION_STATES.WALK) {
            // Walking leg positions
            const legOffset = Math.sin(this.animationFrame * Math.PI / 3) * 2;
            ctx.fillStyle = '#1a2f4a';
            ctx.fillRect(10, 22 + legOffset, 4, 6);
            ctx.fillRect(18, 22 - legOffset, 4, 6);
        } else if (this.currentAnimation === ANIMATION_STATES.ATTACK) {
            // Attack effect
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            const attackRange = CONFIG.PLAYER_ATTACK_RANGE;
            const directions = {
                [DIRECTIONS.UP]: { x: 14, y: -attackRange + 4 },
                [DIRECTIONS.DOWN]: { x: 14, y: this.height + attackRange - 4 },
                [DIRECTIONS.LEFT]: { x: -attackRange + 4, y: 12 },
                [DIRECTIONS.RIGHT]: { x: this.width + attackRange - 4, y: 12 }
            };
            
            const dir = directions[this.direction];
            ctx.moveTo(14, 12);
            ctx.lineTo(dir.x, dir.y);
            ctx.stroke();
        } else if (this.currentAnimation === ANIMATION_STATES.HIT) {
            // Flash red when hit
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }
}

// Input handler class
class InputHandler {
    constructor() {
        this.keys = new Set();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys.add(e.code);
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });
    }
    
    getInput() {
        return {
            up: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
            down: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
            left: this.keys.has('KeyA') || this.keys.has('ArrowLeft'),
            right: this.keys.has('KeyD') || this.keys.has('ArrowRight'),
            space: this.keys.has('Space'),
            attack: this.keys.has('Space') || this.keys.has('KeyX'),
            dashCore: this.keys.has('Digit1'),
            shieldCore: this.keys.has('Digit2'),
            powerCore: this.keys.has('Digit3')
        };
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Player, InputHandler };
}