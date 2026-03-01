/**
 * Sub-Mode System for Blasteroids
 * Handles different gameplay modes within the PLAYING state
 */

/**
 * Base class for all sub-modes
 */
class SubMode {
    constructor(config) {
        this.config = config;
        this.isActive = false;
        this.enemySpawnCounter = 0;
        this.nextCygnusSpawnCount = Math.floor(Math.random() * 3) + 3;
        this.backgroundImage = null;
        this.backgroundImageLoaded = false;
    }
    
    /**
     * Initialize the sub-mode
     */
    initialize() {
        this.isActive = true;
        this.enemySpawnCounter = 0;
        this.nextCygnusSpawnCount = Math.floor(Math.random() * 3) + 3;
        console.log(`[SubMode] Initialized: ${this.constructor.name}`);
        
        // Load background image if specified
        this.loadBackgroundImage();
    }
    
    /**
     * Load background image if specified in config
     */
    loadBackgroundImage() {
        if (this.config.backgroundImage) {
            console.log(`[SubMode] Attempting to load background image: ${this.config.backgroundImage}`);
            console.log(`[SubMode] setBackgroundImage function available: ${typeof this.setBackgroundImage}`);
            console.log(`[SubMode] this.setBackgroundImage:`, this.setBackgroundImage);
            
            // Set the global background image for the game
            if (typeof this.setBackgroundImage === 'function') {
                console.log(`[SubMode] Calling setBackgroundImage with: ${this.config.backgroundImage}`);
                this.setBackgroundImage(this.config.backgroundImage);
                console.log(`[SubMode] Set global background image: ${this.config.backgroundImage}`);
            } else {
                console.error(`[SubMode] setBackgroundImage function not available!`);
                console.error(`[SubMode] this.setBackgroundImage type:`, typeof this.setBackgroundImage);
            }
            
            // Also keep local reference for submode-specific use if needed
            this.backgroundImage = new Image();
            this.backgroundImage.onload = () => {
                this.backgroundImageLoaded = true;
                console.log(`[SubMode] Background image loaded: ${this.config.backgroundImage}`);
            };
            this.backgroundImage.onerror = () => {
                console.error(`[SubMode] Failed to load background image: ${this.config.backgroundImage}`);
                this.backgroundImage = null;
            };
            this.backgroundImage.src = this.config.backgroundImage;
        } else {
            console.log(`[SubMode] No background image specified in config`);
        }
    }
    
    /**
     * Draw background image if available
     */
    drawBackground(ctx, canvas) {
        if (typeof drawBackgroundImageOrColor === 'function') {
            drawBackgroundImageOrColor();
        }
        // Add any submode-specific overlays here if needed
    }
    
    /**
     * Spawn wave elements (asteroids, enemies, etc.)
     * Override in subclasses to define wave initialization
     */
    spawnWave() {
        // Override in subclasses
    }
    
    /**
     * Update sub-mode logic (called every frame)
     */
    update() {
        // Override in subclasses
    }
    
    /**
     * Check if the current wave/stage is complete
     * @returns {boolean} True if wave is complete
     */
    isWaveComplete() {
        // Override in subclasses
        return false;
    }
    
    /**
     * Handle enemy spawning logic
     * @returns {boolean} True if an enemy was spawned
     */
    handleEnemySpawning() {
        // Override in subclasses
        return false;
    }
    
    /**
     * Clean up when sub-mode ends
     */
    cleanup() {
        this.isActive = false;
        this.backgroundImage = null;
        this.backgroundImageLoaded = false;
        console.log(`[SubMode] Cleaned up: ${this.constructor.name}`);
    }
    
    /**
     * Get the display name for this sub-mode
     * @returns {string} Display name
     */
    getDisplayName() {
        return this.constructor.name;
    }
}

/**
 * Normal sub-mode - handles standard wave gameplay
 */
class NormalSubMode extends SubMode {
    constructor(config) {
        super(config);
        this.waveNumber = config.waveNumber || 1;
    }
    
    /**
     * Update normal wave logic
     */
    update() {
        // Handle enemy spawning
        this.handleEnemySpawning();
    }
    
    /**
     * Check if wave is complete (asteroids destroyed - enemies can remain)
     */
    isWaveComplete() {
        const asteroidsEmpty = asteroids.length === 0;
        const enemiesEmpty = enemies.filter(e => !e.isDestroyed).length === 0;
        const isComplete = asteroidsEmpty && enemiesEmpty;
        

        
        return isComplete;
    }
    
    /**
     * Handle enemy spawning based on current wave configuration
     */
    handleEnemySpawning() {
        // Only spawn new enemies if no wave announcement is active
        if (waveAnnouncement) return false;
        
        if (shouldSpawnEnemyShip()) {
            this.enemySpawnCounter++;
            const enemyType = this.determineEnemyType();
            
            if (enemyType === 'cygnus') {
                enemies.push(createCygnusShip());
                this.enemySpawnCounter = 0;
                this.nextCygnusSpawnCount = Math.floor(Math.random() * 3) + 3;
                return true;
            } else if (enemyType === 'graviton') {
                enemies.push(createGravitonShip());
                return true;
            } else if (enemyType === 'saucer') {
                enemies.push(createFlyingSaucer());
                return true;
            } else if (enemyType === 'novabomb') {
                enemies.push(createNovabomb());
                return true;
            }
        }
        return false;
    }
    
    /**
     * Determine which enemy type to spawn based on wave configuration
     */
    determineEnemyType() {
        const waveData = getCurrentWaveData();
        const totalEnemies = enemies.filter(e => !e.isDestroyed).length;
        
        // Check if we've reached the enemy limit
        if (totalEnemies >= waveData.enemyShipLimit) {
            return 'nothing';
        }
        
        // Check if we should spawn a Cygnus ship
        if (waveData.unlocks.cygnus && this.enemySpawnCounter >= this.nextCygnusSpawnCount) {
            return 'cygnus';
        }
        
        // Random enemy selection based on unlocked types
        const availableEnemies = [];
        
        if (waveData.unlocks.saucer) availableEnemies.push('saucer');
        if (waveData.unlocks.graviton) availableEnemies.push('graviton');
        if (waveData.unlocks.novabomb) availableEnemies.push('novabomb');
        
        // Add chance to spawn nothing based on XML configuration
        const noShipChance = GAME_CONFIG.gameplay.noShipSpawnChance || 0.15;
        if (Math.random() < noShipChance) {
            availableEnemies.push('nothing');
        }
        
        if (availableEnemies.length === 0) {
            return 'nothing';
        }
        
        return availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
    }
    
    /**
     * Get display name for normal waves
     */
    getDisplayName() {
        // Use displayName from config if available (for defined waves)
        if (this.config.displayName) {
            return this.config.displayName;
        }
        // Fall back to WAVE X for waves beyond the defined list
        return `WAVE ${this.waveNumber}`;
    }
    
    /**
     * Spawn wave elements for normal waves
     */
    spawnWave() {
        const waveData = this.config;
        const numAsteroids = gameState === 'attract' ? 5 : waveData.asteroids;
        const baseSpeed = 1.4 * waveData.speedFactor;
        powerupsSpawned = 0;
        
        for (let i = 0; i < numAsteroids; i++) {
            let x, y;
            do {
                x = Math.random() * canvas.width;
                y = Math.random() * canvas.height;
            } while (gameState !== 'attract' && Math.hypot(x - ship.x, y - ship.y) < 100);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = baseSpeed + (Math.random() - 0.5);
            asteroids.push(createAsteroid(x, y, 40, Math.cos(angle) * speed, Math.sin(angle) * speed));
        }
    }
}

/**
 * Sub-mode factory - creates appropriate sub-mode based on configuration
 */
class SubModeFactory {
    /**
     * Create a sub-mode instance based on configuration
     * @param {Object} config - Sub-mode configuration
     * @returns {SubMode} Sub-mode instance
     */
    static createSubMode(config) {
        const subModeType = config.subMode || 'normal';
        
        switch (subModeType.toLowerCase()) {
            case 'normal':
                return new NormalSubMode(config);
            // Future sub-modes will be added here:
            // case 'bossfight':
            //     return new BossFightSubMode(config);
            // case 'survival':
            //     return new SurvivalSubMode(config);
            default:
                console.warn(`[SubModeFactory] Unknown sub-mode type: ${subModeType}, falling back to normal`);
                return new NormalSubMode(config);
        }
    }
}

// Export for use in main game file
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SubMode, NormalSubMode, SubModeFactory };
} 