// Particle System for visual effects
class Particle {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        this.life = config.life || 1000; // milliseconds
        this.maxLife = this.life;
        this.color = config.color || '#ffffff';
        this.size = config.size || 4;
        this.gravity = config.gravity || 0;
        this.friction = config.friction || 0.98;
        this.sparkle = config.sparkle || false;
        this.glitch = config.glitch || false;
        this.glow = config.glow || false;
        
        this.originalX = x;
        this.originalY = y;
        this.time = 0;
    }
    
    update(deltaTime) {
        this.time += deltaTime;
        
        // Update position
        this.vy += this.gravity * (deltaTime / 16.67);
        this.vx *= this.friction ** (deltaTime / 16.67);
        this.vy *= this.friction ** (deltaTime / 16.67);
        
        this.x += this.vx * (deltaTime / 16.67);
        this.y += this.vy * (deltaTime / 16.67);
        
        // Update life
        this.life -= deltaTime;
        
        // Sparkle effect
        if (this.sparkle) {
            this.size = this.size * (0.8 + 0.4 * Math.sin(this.time * 0.02));
        }
        
        return this.life > 0;
    }
    
    draw(ctx, camera) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        
        // Apply glow effect
        if (this.glow) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
        }
        
        // Handle glitch effect
        if (this.glitch && Math.random() < 0.1) {
            ctx.fillStyle = this.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
            const glitchOffset = (Math.random() - 0.5) * 4;
            ctx.fillRect(this.x - camera.x + glitchOffset, this.y - camera.y, this.size, this.size);
        } else {
            ctx.fillStyle = this.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
            ctx.fillRect(this.x - camera.x, this.y - camera.y, this.size, this.size);
        }
        
        ctx.restore();
    }
    
    getAlpha() {
        return this.life / this.maxLife;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.emitters = [];
    }
    
    update(deltaTime) {
        // Update particles
        this.particles = this.particles.filter(particle => {
            return particle.update(deltaTime);
        });
        
        // Update emitters
        this.emitters = this.emitters.filter(emitter => {
            emitter.update(deltaTime);
            return emitter.isAlive();
        });
    }
    
    draw(ctx, camera) {
        // Draw particles
        for (const particle of this.particles) {
            particle.draw(ctx, camera);
        }
    }
    
    // Particle creation methods
    createAttackEffect(x, y, direction, attackType = 'normal') {
        const particleCount = PARTICLE_CONFIG.types.ATTACK.count;
        const speed = PARTICLE_CONFIG.types.ATTACK.speed;
        const color = PARTICLE_CONFIG.types.ATTACK.color;
        
        const angle = Utils.directionToAngle(direction);
        
        for (let i = 0; i < particleCount; i++) {
            const spread = (Math.random() - 0.5) * Math.PI / 2;
            const particleAngle = angle + spread;
            const particleSpeed = speed * (0.5 + Math.random() * 0.5);
            
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(particleAngle) * particleSpeed,
                vy: Math.sin(particleAngle) * particleSpeed,
                color: color,
                size: Utils.random(2, 6),
                life: Utils.random(300, 600),
                gravity: 0.1
            }));
        }
    }
    
    createDamageEffect(x, y, damageDealer) {
        const particleCount = PARTICLE_CONFIG.types.DAMAGE.count;
        const speed = PARTICLE_CONFIG.types.DAMAGE.speed;
        const color = PARTICLE_CONFIG.types.DAMAGE.color;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const particleSpeed = speed * (0.5 + Math.random() * 0.5);
            
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * particleSpeed,
                vy: Math.sin(angle) * particleSpeed,
                color: color,
                size: Utils.random(3, 7),
                life: Utils.random(400, 800),
                gravity: 0.2
            }));
        }
        
        // Add damage number (future enhancement)
        this.createFloatingText(x, y, `-${Math.floor(damageDealer)}`, '#ff3333');
    }
    
    createDeathEffect(x, y, color) {
        const particleCount = PARTICLE_CONFIG.types.DEATH.count;
        const speed = PARTICLE_CONFIG.types.DEATH.speed;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const particleSpeed = speed * (0.5 + Math.random() * 0.5);
            
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * particleSpeed,
                vy: Math.sin(angle) * particleSpeed,
                color: color || PARTICLE_CONFIG.types.DEATH.color,
                size: Utils.random(4, 8),
                life: Utils.random(600, 1200),
                gravity: 0.15
            }));
        }
    }
    
    createPickupEffect(x, y, pickupType) {
        const config = PARTICLE_CONFIG.types.PICKUP;
        const particleCount = config.count;
        const speed = config.speed;
        
        const colors = {
            [CORE_TYPES.SPEED]: '#00ff00',
            [CORE_TYPES.SHIELD]: '#0000ff',
            [CORE_TYPES.POWER]: '#ff0000'
        };
        
        const color = colors[pickupType] || '#ffff00';
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const particleSpeed = speed * (0.3 + Math.random() * 0.7);
            
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * particleSpeed,
                vy: Math.sin(angle) * particleSpeed,
                color: color,
                size: Utils.random(2, 5),
                life: Utils.random(800, 1600),
                sparkle: true,
                glow: true,
                gravity: -0.1
            }));
        }
        
        // Create floating text
        const pickupNames = {
            [CORE_TYPES.SPEED]: 'SPEED CORE',
            [CORE_TYPES.SHIELD]: 'SHIELD CORE',
            [CORE_TYPES.POWER]: 'POWER CORE'
        };
        
        this.createFloatingText(x, y - 20, pickupNames[pickupType], color);
    }
    
    createTeleportEffect(x, y) {
        const config = PARTICLE_CONFIG.types.TELEPORT;
        const particleCount = config.count;
        const speed = config.speed;
        const color = config.color;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const particleSpeed = speed * (0.5 + Math.random() * 0.5);
            
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * particleSpeed,
                vy: Math.sin(angle) * particleSpeed,
                color: color,
                size: Utils.random(2, 6),
                life: Utils.random(500, 1000),
                glitch: true,
                glow: true
            }));
        }
    }
    
    createFloatingText(x, y, text, color) {
        // For now, log to console (future enhancement: actual floating text)
        console.log(`${text} at (${x}, ${y})`);
        
        // Create text particle
        this.particles.push(new Particle(x, y, {
            vx: 0,
            vy: -1,
            color: color,
            size: 8,
            life: 1500,
            sparkle: true
        }));
    }
    
    createExplosionEffect(x, y, radius = 30) {
        const particleCount = Math.floor(radius * 2);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const distance = Utils.random(0, radius);
            const px = x + Math.cos(angle) * distance;
            const py = y + Math.sin(angle) * distance;
            
            this.particles.push(new Particle(px, py, {
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                color: '#ff6600',
                size: Utils.random(2, 6),
                life: Utils.random(500, 1000),
                gravity: 0.05
            }));
        }
    }
    
    createScreenShakeEffect(intensity = 5) {
        // This will be handled by camera system
        console.log(`Screen shake: ${intensity}`);
    }
    
    clear() {
        this.particles = [];
        this.emitters = [];
    }
}

// Particle Emitter for continuous effects
class ParticleEmitter {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.config = config;
        this.active = true;
        this.life = config.life || Infinity;
        this.emissionRate = config.emissionRate || 50; // milliseconds between emissions
        this.emissionTimer = 0;
    }
    
    update(deltaTime) {
        this.emissionTimer += deltaTime;
        this.life -= deltaTime;
        
        if (this.emissionTimer >= this.emissionRate) {
            this.emissionTimer = 0;
            this.emit();
        }
    }
    
    emit() {
        const config = this.config;
        const angle = config.angle || Utils.random(0, Math.PI * 2);
        const spread = config.spread || Math.PI / 4;
        const particleAngle = angle + (Math.random() - 0.5) * spread;
        const speed = config.speed || 2;
        
        const particle = new Particle(this.x, this.y, {
            vx: Math.cos(particleAngle) * speed * (0.5 + Math.random() * 0.5),
            vy: Math.sin(particleAngle) * speed * (0.5 + Math.random() * 0.5),
            color: config.color || '#ffffff',
            size: config.size || Utils.random(2, 6),
            life: config.life || Utils.random(500, 1000),
            gravity: config.gravity || 0,
            sparkle: config.sparkle || false,
            glow: config.glow || false
        });
        
        this.particles.push(particle);
    }
    
    isAlive() {
        return this.active && this.life > 0;
    }
    
    stop() {
        this.active = false;
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Particle, ParticleSystem, ParticleEmitter };
}