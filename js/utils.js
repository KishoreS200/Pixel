// Utility functions
class Utils {
    // Distance between two points
    static distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    
    // Check if two rectangles intersect
    static intersectRect(rect1, rect2) {
        return !(rect2.x > rect1.x + rect1.width || 
                rect2.x + rect2.width < rect1.x || 
                rect2.y > rect1.y + rect1.height ||
                rect2.y + rect2.height < rect1.y);
    }
    
    // Check if point is in circle
    static pointInCircle(point, center, radius) {
        return this.distance(point.x, point.y, center.x, center.y) <= radius;
    }
    
    // Random number between min and max
    static random(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    // Random integer between min and max (inclusive)
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // Clamp value between min and max
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    // Lerp between two values
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    // Get direction from angle
    static getDirection(angle) {
        const normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        
        if (normalized >= Math.PI / 4 && normalized < 3 * Math.PI / 4) {
            return DIRECTIONS.DOWN;
        } else if (normalized >= 3 * Math.PI / 4 && normalized < 5 * Math.PI / 4) {
            return DIRECTIONS.LEFT;
        } else if (normalized >= 5 * Math.PI / 4 && normalized < 7 * Math.PI / 4) {
            return DIRECTIONS.UP;
        } else {
            return DIRECTIONS.RIGHT;
        }
    }
    
    // Convert direction to angle
    static directionToAngle(direction) {
        switch (direction) {
            case DIRECTIONS.UP: return -Math.PI / 2;
            case DIRECTIONS.DOWN: return Math.PI / 2;
            case DIRECTIONS.LEFT: return Math.PI;
            case DIRECTIONS.RIGHT: return 0;
            default: return 0;
        }
    }
    
    // Create a 2D array
    static create2DArray(width, height, defaultValue = 0) {
        const array = [];
        for (let y = 0; y < height; y++) {
            array[y] = [];
            for (let x = 0; x < width; x++) {
                array[y][x] = defaultValue;
            }
        }
        return array;
    }
    
    // Copy a 2D array
    static copy2DArray(array) {
        return array.map(row => [...row]);
    }
    
    // Convert world coordinates to grid coordinates
    static worldToGrid(x, y) {
        return {
            x: Math.floor(x / CONFIG.TILE_SIZE),
            y: Math.floor(y / CONFIG.TILE_SIZE)
        };
    }
    
    // Convert grid coordinates to world coordinates
    static gridToWorld(gridX, gridY) {
        return {
            x: gridX * CONFIG.TILE_SIZE,
            y: gridY * CONFIG.TILE_SIZE
        };
    }
    
    // Simple A* pathfinding (simplified for this game)
    static findPath(start, end, grid, maxIterations = 100) {
        const openSet = [];
        const closedSet = [];
        
        const startNode = {
            x: start.x,
            y: start.y,
            g: 0,
            h: this.distance(start.x, start.y, end.x, end.y),
            f: 0,
            parent: null
        };
        startNode.f = startNode.g + startNode.h;
        
        openSet.push(startNode);
        
        let iterations = 0;
        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;
            
            // Find node with lowest f
            let current = openSet[0];
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < current.f) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }
            
            // Remove from open set, add to closed set
            openSet.splice(currentIndex, 1);
            closedSet.push(current);
            
            // Check if we've reached the goal
            if (current.x === end.x && current.y === end.y) {
                const path = [];
                let node = current;
                while (node) {
                    path.unshift({ x: node.x, y: node.y });
                    node = node.parent;
                }
                return path;
            }
            
            // Check neighbors
            const neighbors = [
                { x: 0, y: -1 }, { x: 0, y: 1 },
                { x: -1, y: 0 }, { x: 1, y: 0 }
            ];
            
            for (const offset of neighbors) {
                const nx = current.x + offset.x;
                const ny = current.y + offset.y;
                
                // Skip if out of bounds
                if (nx < 0 || ny < 0 || nx >= grid[0].length || ny >= grid.length) {
                    continue;
                }
                
                // Skip if wall or hazard
                if (grid[ny][nx] === TILE_TYPES.WALL || grid[ny][nx] === TILE_TYPES.HAZARD) {
                    continue;
                }
                
                // Skip if already in closed set
                if (closedSet.some(node => node.x === nx && node.y === ny)) {
                    continue;
                }
                
                const g = current.g + 1;
                const h = this.distance(nx, ny, end.x, end.y);
                const f = g + h;
                
                let neighborNode = openSet.find(node => node.x === nx && node.y === ny);
                
                if (!neighborNode) {
                    neighborNode = {
                        x: nx,
                        y: ny,
                        g: g,
                        h: h,
                        f: f,
                        parent: current
                    };
                    openSet.push(neighborNode);
                } else if (g < neighborNode.g) {
                    neighborNode.g = g;
                    neighborNode.f = f;
                    neighborNode.parent = current;
                }
            }
        }
        
        return []; // No path found
    }
    
    // Simple easing functions
    static easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    static easeOutElastic(t) {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    }
    
    // Create glitch effect on canvas
    static createGlitchEffect(ctx, x, y, width, height, intensity = 0.1) {
        if (Math.random() < 0.1 * intensity) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            
            // RGB shift
            ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
            ctx.fillRect(x - 2, y, width, height);
            
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.fillRect(x + 2, y, width, height);
            
            // Pixel offset
            for (let i = 0; i < 3; i++) {
                const offset = Utils.randomInt(-2, 2);
                const lineY = Utils.randomInt(y, y + height);
                ctx.drawImage(ctx.canvas, x, lineY, width, 1, x + offset, lineY, width, 1);
            }
            
            ctx.restore();
        }
    }
}

// Vector2 class for 2D math
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }
    
    subtract(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }
    
    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return new Vector2(this.x / mag, this.y / mag);
    }
    
    distance(other) {
        return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
    }
    
    static fromAngle(angle, magnitude = 1) {
        return new Vector2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
    }
}

// Rectangle class for collision detection
class Rectangle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    
    intersects(other) {
        return !(other.x > this.x + this.width || 
                other.x + other.width < this.x || 
                other.y > this.y + this.height ||
                other.y + other.height < this.y);
    }
    
    contains(point) {
        return point.x >= this.x && point.x <= this.x + this.width &&
               point.y >= this.y && point.y <= this.y + this.height;
    }
    
    center() {
        return new Vector2(this.x + this.width / 2, this.y + this.height / 2);
    }
}

// Event system
class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    
    emit(event, data = null) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
    
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Utils, Vector2, Rectangle, EventEmitter };
}