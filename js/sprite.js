// Sprite Animation System
class Sprite {
    constructor(config) {
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.width = config.width || CONFIG.TILE_SIZE;
        this.height = config.height || CONFIG.TILE_SIZE;
        
        // Animation properties
        this.currentAnimation = config.animation || ANIMATION_STATES.IDLE;
        this.animationFrame = 0;
        this.animationSpeed = config.animationSpeed || 100; // milliseconds per frame
        this.animationTimer = 0;
        this.flipX = false;
        this.flipY = false;
        
        // If using pixel art canvas rendering
        this.color = config.color || '#ffffff';
        this.glowing = config.glowing || false;
        
        // State
        this.state = {
            invulnerable: false,
            invulnerableTimer: 0,
            knockback: false,
            knockbackVelocity: new Vector2(0, 0),
            knockbackTimer: 0,
            stunned: false,
            stunnedTimer: 0
        };
    }
    
    update(deltaTime) {
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Update invulnerability
        if (this.state.invulnerable) {
            this.state.invulnerableTimer -= deltaTime;
            if (this.state.invulnerableTimer <= 0) {
                this.state.invulnerable = false;
            }
        }
        
        // Update knockback
        if (this.state.knockback) {
            this.state.knockbackTimer -= deltaTime;
            if (this.state.knockbackTimer <= 0) {
                this.state.knockback = false;
                this.state.knockbackVelocity = new Vector2(0, 0);
            } else {
                // Apply knockback velocity
                this.x += this.state.knockbackVelocity.x * (deltaTime / 16.67);
                this.y += this.state.knockbackVelocity.y * (deltaTime / 16.67);
            }
        }
        
        // Update stun
        if (this.state.stunned) {
            this.state.stunnedTimer -= deltaTime;
            if (this.state.stunnedTimer <= 0) {
                this.state.stunned = false;
            }
        }
    }
    
    updateAnimation(deltaTime) {
        const animationData = this.getAnimationData();
        if (!animationData) return;
        
        this.animationTimer += deltaTime;
        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer = 0;
            this.animationFrame = (this.animationFrame + 1) % animationData.frames;
            
            // Handle animation completion
            if (this.animationFrame === 0) {
                this.onAnimationComplete();
            }
        }
    }
    
    getAnimationData() {
        // Override in subclasses
        return null;
    }
    
    onAnimationComplete() {
        // Override in subclasses to handle animation loops
    }
    
    setAnimation(animation, force = false) {
        if (this.currentAnimation !== animation || force) {
            this.currentAnimation = animation;
            this.animationFrame = 0;
            this.animationTimer = 0;
        }
    }
    
    getBounds() {
        return new Rectangle(this.x, this.y, this.width, this.height);
    }
    
    getCenter() {
        return new Vector2(this.x + this.width / 2, this.y + this.height / 2);
    }
    
    takeDamage(amount, source = null) {
        if (this.state.invulnerable) return 0;
        
        this.takeDamageWithoutInvulnerability(amount);
        
        // Apply invulnerability
        this.state.invulnerable = true;
        this.state.invulnerableTimer = CONFIG.PLAYER_INVULNERABILITY_TIME;
        
        // Apply knockback if source provided
        if (source) {
            this.applyKnockback(source);
        }
        
        // Play damage animation
        this.setAnimation(ANIMATION_STATES.HIT, true);
        
        return amount;
    }
    
    takeDamageWithoutInvulnerability(amount) {
        // Override in subclasses to actually apply damage
    }
    
    applyKnockback(source) {
        if (!source || !source.getCenter) return;
        
        this.state.knockback = true;
        this.state.knockbackTimer = CONFIG.KNOCKBACK_DURATION;
        
        const sourceCenter = source.getCenter();
        const thisCenter = this.getCenter();
        const direction = new Vector2(
            thisCenter.x - sourceCenter.x,
            thisCenter.y - sourceCenter.y
        ).normalize();
        
        this.state.knockbackVelocity = direction.multiply(CONFIG.KNOCKBACK_FORCE / CONFIG.FPS);
    }
    
    isAlive() {
        // Override in subclasses
        return true;
    }
    
    // For pixel art sprites
    drawPixelSprite(ctx) {
        ctx.save();
        
        // Apply position
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        // Apply flips
        if (this.flipX) ctx.scale(-1, 1);
        if (this.flipY) ctx.scale(1, -1);
        
        ctx.translate(-this.width / 2, -this.height / 2);
        
        // Draw glow effect if applicable
        if (this.glowing) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        }
        
        // Draw base rectangle
        ctx.fillStyle = this.color;
        
        // Simple 32x32 pixel art representation
        switch (this.currentAnimation) {
            case ANIMATION_STATES.IDLE:
                this.drawIdleSprite(ctx);
                break;
            case ANIMATION_STATES.WALK:
                this.drawWalkSprite(ctx);
                break;
            case ANIMATION_STATES.ATTACK:
                this.drawAttackSprite(ctx);
                break;
            case ANIMATION_STATES.HIT:
                this.drawHitSprite(ctx);
                break;
            case ANIMATION_STATES.DEATH:
                this.drawDeathSprite(ctx);
                break;
            default:
                this.drawDefaultSprite(ctx);
        }
        
        ctx.restore();
        
        // Draw glitch effect if damaged
        if (this.state.invulnerable && Math.floor(this.state.invulnerableTimer / 100) % 2 === 0) {
            Utils.createGlitchEffect(ctx, this.x, this.y, this.width, this.height);
        }
    }
    
    // Override these in subclasses for specific sprites
    drawIdleSprite(ctx) {
        // Basic rectangle with some details
        ctx.fillRect(8, 8, 16, 16);
        // Add detail based on animation frame
        if (this.animationFrame % 2 === 0) {
            ctx.fillStyle = '#888';
            ctx.fillRect(10, 10, 4, 4);
        }
    }
    
    drawWalkSprite(ctx) {
        ctx.fillRect(8, 8, 16, 16);
        // Walking animation frame variations
        const offset = Math.sin(this.animationFrame * Math.PI / 2) * 2;
        ctx.fillRect(8 + offset, 20, 4, 4);
        ctx.fillRect(20 - offset, 20, 4, 4);
    }
    
    drawAttackSprite(ctx) {
        ctx.fillRect(8, 8, 16, 16);
        // Attack effect
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(16 + this.animationFrame * 4, 12, 8, 8);
    }
    
    drawHitSprite(ctx) {
        // Flash red when hit
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(8, 8, 16, 16);
    }
    
    drawDeathSprite(ctx) {
        // Fading/death animation
        ctx.globalAlpha = 1 - (this.animationFrame / 6);
        ctx.fillRect(8, 8, 16, 16);
        ctx.globalAlpha = 1;
    }
    
    drawDefaultSprite(ctx) {
        ctx.fillRect(8, 8, 16, 16);
    }
}

// Animation Data Class
class AnimationData {
    constructor(frames, speed = 100, loop = true) {
        this.frames = frames; // Number of frames in animation
        this.speed = speed; // milliseconds per frame
        this.loop = loop; // whether to loop the animation
    }
}

// Animation Manager for handling multiple animations
class AnimationManager {
    constructor() {
        this.animations = new Map();
        this.currentAnimation = null;
        this.currentFrame = 0;
        this.timer = 0;
    }
    
    addAnimation(name, animationData) {
        this.animations.set(name, animationData);
    }
    
    play(animationName, force = false) {
        if (this.currentAnimation !== animationName || force) {
            this.currentAnimation = animationName;
            this.currentFrame = 0;
            this.timer = 0;
        }
    }
    
    update(deltaTime) {
        if (!this.currentAnimation || !this.animations.has(this.currentAnimation)) {
            return { frame: 0, completed: false };
        }
        
        const anim = this.animations.get(this.currentAnimation);
        this.timer += deltaTime;
        
        let completed = false;
        if (this.timer >= anim.speed) {
            this.timer = 0;
            this.currentFrame++;
            
            if (this.currentFrame >= anim.frames) {
                if (anim.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = anim.frames - 1;
                    completed = true;
                }
            }
        }
        
        return {
            frame: this.currentFrame,
            completed: completed
        };
    }
    
    getCurrentFrame() {
        return this.currentFrame;
    }
    
    getAnimation() {
        return this.currentAnimation;
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Sprite, AnimationData, AnimationManager };
}