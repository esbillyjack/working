/**
 * Cinematic Class - Handles dialog cutscenes between waves
 * Features Japanese RPG-style dialog with portraits and sliding UI
 */

class Cinematic {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.isActive = false;
        this.currentDialog = null;
        this.dialogIndex = 0;
        this.characterIndex = 0;
        this.textIndex = 0;
        this.textSpeed = 2; // Characters per frame
        this.textTimer = 0;
        this.isTextComplete = false;
        this.waitingForInput = false;
        this.inputTimer = 0;
        this.inputDelay = 60; // Frames to wait before allowing input
        
        // Speed control
        this.speedMultiplier = 1; // Normal speed
        this.fastForwardMultiplier = 3; // 3x speed when right arrow is held (33% of normal time)
        
        // Audio context for text beep
        this.audioContext = null;
        this.lastBeepTime = 0;
        this.beepCooldown = 100; // Minimum ms between beeps (increased from 50ms)
        
        // Image loading and caching
        this.imageCache = new Map();
        this.currentImage = null;
        this.imageLoadPromises = [];
        
        // UI Animation properties
        this.uiSlideProgress = 0;
        this.uiSlideSpeed = 0.05;
        this.uiSlideDirection = 'in'; // 'in' or 'out'
        this.portraitSlideProgress = 0;
        this.portraitSlideSpeed = 0.08;
        this.portraitSlideDirection = 'in';
        
        // Visual effects
        this.starfield = [];
        this.starfieldSpeed = 0.5;
        this.starfieldCount = 100;
        this.initializeStarfield();
        
        // Initialize audio context
        this.initAudio();
        
        // Dialog data structure
        this.dialogs = {
            wave0: [
                { character: 'Commander', portrait: 'commander.png', text: 'Welcome to the Blasteroids program, pilot. You\'ve been selected for a critical mission.' },
                { character: 'Commander', portrait: 'commander.png', text: 'Our solar system is under threat from mysterious forces. Asteroids, alien ships, and worse.' },
                { character: 'Commander', portrait: 'commander.png', text: 'Your mission: clear each sector and advance through the solar system.' },
                { character: 'Commander', portrait: 'commander.png', text: 'Good luck, pilot. The fate of humanity rests in your hands.' }
            ],
            wave1: [
                { character: 'Commander', portrait: 'commander.png', text: 'Welcome to the Blasteroids program, pilot. Your mission: clear the asteroid field in Near Earth Orbit.' },
                { character: 'Commander', portrait: 'commander.png', text: 'This is your first test flight. Show us what you can do.' }
            ],
            wave2: [
                { character: 'Commander', portrait: 'commander.png', text: 'Excellent work! Now we\'re sending you to The Moon. The Saucers have been spotted in lunar orbit.' },
                { character: 'Commander', portrait: 'commander.png', text: 'Be careful - they\'re more aggressive than the asteroids.' }
            ],
            wave3: [
                { character: 'Commander', portrait: 'commander.png', text: 'Mars approaches! The Red Planet\'s orbit brings new challenges.' },
                { character: 'Commander', portrait: 'commander.png', text: 'We\'ve detected Novabombs in the area. These explosive enemies will push you around.' }
            ],
            wave4: [
                { character: 'Commander', portrait: 'commander.png', text: 'You\'ve reached the Portal! This mysterious gateway leads to the outer solar system.' },
                { character: 'Commander', portrait: 'commander.png', text: 'The Graviton ships are waiting. They\'ll try to capture you with their tractor beams.' }
            ],
            wave5: [
                { character: 'Commander', portrait: 'commander.png', text: 'Jupiter Ascends! The gas giant\'s massive gravity well affects everything.' },
                { character: 'Commander', portrait: 'commander.png', text: 'Stay focused - the asteroids are larger and faster here.' }
            ],
            wave6: [
                { character: 'Commander', portrait: 'commander.png', text: 'The Lost Planet! This mysterious world shouldn\'t exist in our solar system.' },
                { character: 'Commander', portrait: 'commander.png', text: 'The Cygnus ships are here. They\'re the most dangerous enemies you\'ll face.' }
            ],
            wave7: [
                { character: 'Commander', portrait: 'commander.png', text: 'CYGNUS! The alien mothership has been detected.' },
                { character: 'Commander', portrait: 'commander.png', text: 'This is a pure Cygnus zone. Destroy the mothership to proceed!' }
            ],
            wave8: [
                { character: 'Commander', portrait: 'commander.png', text: 'Interstellar space! You\'ve left our solar system behind.' },
                { character: 'Commander', portrait: 'commander.png', text: 'All enemy types are active here. This is the ultimate test of your skills.' }
            ],
            wave9: [
                { character: 'Commander', portrait: 'commander.png', text: 'The Fortress! This massive space station is heavily defended.' },
                { character: 'Commander', portrait: 'commander.png', text: 'Every enemy type is present in overwhelming numbers. Good luck, pilot.' }
            ],
            wave10: [
                { character: 'Commander', portrait: 'commander.png', text: 'The Black Hole! The final frontier of space.' },
                { character: 'Commander', portrait: 'commander.png', text: 'This is the ultimate challenge. Survive if you can!' }
            ]
        };
        
        // Default portrait (fallback)
        this.defaultPortrait = 'commander.png';
        
        // Multi-dialog system
        this.activeDialogs = []; // Array of active dialog boxes
        this.maxDialogs = 6; // Maximum number of dialog boxes on screen (increased from 3)
        this.dialogBoxHeight = 140; // Increased by 20px from 120
        this.dialogSpacing = 20; // Space between dialog boxes (increased to 20px)
        this.smallDialogHeight = 110; // Height for pushed up dialogs (increased by 20px from 90)
        this.smallDialogScale = 0.85; // Scale factor for pushed up dialogs
        
        // Character color system - controlled palette
        this.colorPalette = {
            'LTBLUE': '#87CEEB',   // Light Blue
            'LTORANGE': '#FFB347', // Light Orange  
            'BLUE': '#4169E1',     // Royal Blue
            'GREEN': '#32CD32',    // Lime Green
            'BLACK': '#2F2F2F',    // Dark Gray (better than pure black)
            'RED': '#DC143C'       // Crimson Red
        };
        
        // Default colors for each character number
        this.defaultCharacterColors = {
            1: 'LTBLUE',   // Cmdr. Rostova
            2: 'LTORANGE', // Leo  
            3: 'GREEN',    // Dr. Thorne
            4: 'BLUE',     // Roci (Ship AI)
            5: 'RED',      // OVERSEER
            6: 'BLACK',    // ???
            7: 'LTBLUE',   // Additional characters
            8: 'LTORANGE',
            9: 'GREEN',
            10: 'BLUE'
        };
        
        // Track current color for each character (for persistence)
        this.characterCurrentColors = {};
        
        // Load cinematic data from XML
        this.cinematicData = null;
        this.loadCinematicData();
        
        this.prevAdvancePressed = false; // For debounce
        this.dialogAutoAdvanceTime = 2500; // ms each dialog stays before next
        this.lastDialogTimestamp = 0;
        
        // Key press detection for final dialog
        this.lastKeyState = {}; // Track previous key states
        this.keyJustPressed = false; // Flag for fresh key press
        this.lastDebugLog = 0; // For throttling debug logs
        this.lastKeyDebugLog = 0; // For logging active keys
    }
    
    /**
     * Load cinematic data from XML file
     */
    async loadCinematicData() {
        try {
            const response = await fetch('cinematics.xml');
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // Parse the XML into our dialog structure
            this.cinematicData = this.parseCinematicXML(xmlDoc);
        } catch (error) {
            // Fall back to hardcoded dialogs
            this.cinematicData = null;
        }
    }
    
    /**
     * Parse XML cinematic data into dialog structure
     */
    parseCinematicXML(xmlDoc) {
        const cinematics = {};
        const cinematicNodes = xmlDoc.getElementsByTagName('CINEMATIC');
        
        for (let cinematic of cinematicNodes) {
            const levelNumber = parseInt(cinematic.getAttribute('level_number'));
            const levelName = cinematic.getAttribute('level_name');
            const dialogs = [];
            
            const dialogNodes = cinematic.getElementsByTagName('DIALOG');
            for (let dialog of dialogNodes) {
                const character = dialog.getElementsByTagName('CHARACTER')[0]?.textContent || 'Unknown';
                const charNum = parseInt(dialog.getElementsByTagName('CHAR_NUM')[0]?.textContent || '1');
                const line = dialog.getElementsByTagName('LINE')[0]?.textContent || '';
                const image = dialog.getElementsByTagName('IMAGE')[0]?.textContent || '';
                const color = dialog.getElementsByTagName('COLOR')[0]?.textContent || '';
                const position = dialog.getElementsByTagName('POSITION')[0]?.textContent || 'LEFT'; // Default to LEFT
                
                dialogs.push({
                    character: character,
                    charNum: charNum,
                    text: line,
                    portrait: this.getPortraitForChar(charNum),
                    image: image,
                    color: color,
                    position: position.toUpperCase() // Ensure uppercase
                });
            }
            
            cinematics[`wave${levelNumber}`] = {
                levelName: levelName,
                dialogs: dialogs
            };
        }
        
        return cinematics;
    }
    
    /**
     * Get portrait for character number
     */
    getPortraitForChar(charNum) {
        const portraitMap = {
            1: 'commander.png',  // Cmdr. Rostova
            2: 'leo.png',        // Leo
            3: 'aris.png',       // Dr. Thorne
            4: 'roci.png',       // Roci (Ship AI)
            5: 'overseer.png',   // OVERSEER
            6: 'unknown.png'     // ???
        };
        return portraitMap[charNum] || this.defaultPortrait;
    }
    
    /**
     * Initialize the starfield for background
     */
    initializeStarfield() {
        this.starfield = [];
        for (let i = 0; i < this.starfieldCount; i++) {
            this.starfield.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                speed: 0.5 + Math.random() * 1.5,
                size: 1 + Math.random() * 2,
                brightness: 0.3 + Math.random() * 0.7
            });
        }
    }
    
    /**
     * Start cinematic for a specific wave
     */
    async start(waveNumber) {

        this.isActive = true;
        this.dialogIndex = 0;
        this.characterIndex = 0;
        this.textIndex = 0;
        this.textTimer = 0;
        this.isTextComplete = false;
        this.waitingForInput = false;
        this.inputTimer = 0;
        
        // Reset key state to prevent held keys from triggering advancement
        this.lastKeyState = {};
        this.keyJustPressed = false;
        
        // Reset UI animations
        this.uiSlideProgress = 0;
        this.uiSlideDirection = 'in';
        this.portraitSlideProgress = 0;
        this.portraitSlideDirection = 'in';
        
        // Clear any existing dialogs
        this.clearAllDialogs();
        
        // Reset character colors for new cinematic
        this.characterCurrentColors = {};
        
        // Get dialog for this wave - try XML data first, fall back to hardcoded
        const waveKey = `wave${waveNumber}`;
        if (this.cinematicData && this.cinematicData[waveKey]) {
            this.currentDialog = this.cinematicData[waveKey].dialogs;
            this.currentLevelName = this.cinematicData[waveKey].levelName;
        } else {
            this.currentDialog = this.dialogs[waveKey] || this.dialogs.wave1;
            this.currentLevelName = `Wave ${waveNumber}`;
        }
        

        
        // Load images for this dialog set
        await this.loadDialogImages();
        
        // Add the first dialog to the stack
        if (this.currentDialog && this.currentDialog.length > 0) {
    
            this.addDialog(this.currentDialog[0]);
        }
        
        // Start cinematic background music - DISABLED
        // if (typeof soundManager !== 'undefined' && soundManager.playCinematicMusic) {
        //     soundManager.playCinematicMusic();
        // }
        
        this.lastDialogTimestamp = Date.now();
    }
    
    /**
     * Stop cinematic
     */
    stop() {
        this.isActive = false;
        this.currentDialog = null;
        
        // Stop cinematic background music
        if (typeof soundManager !== 'undefined' && soundManager.stopCinematicMusic) {
            soundManager.stopCinematicMusic();
        }
    }
    
    /**
     * Update cinematic state
     */
    update() {
        if (!this.isActive || !this.currentDialog) {
            return;
        }
        
        // Update starfield
        this.updateStarfield();
        
        // Update UI animations
        this.updateUIAnimations();
        
        // Update all active dialogs
        this.updateAllDialogs();
        this.updateDialogTimer();
        
        // Update key press detection
        this.updateKeyPressDetection();
    }
    
    /**
     * Update starfield animation
     */
    updateStarfield() {
        // Always use fast speed by default (no key control needed)
        const speedMultiplier = this.fastForwardMultiplier;
        
        for (let star of this.starfield) {
            star.y += star.speed * this.starfieldSpeed * speedMultiplier;
            if (star.y > this.canvas.height) {
                star.y = -10;
                star.x = Math.random() * this.canvas.width;
            }
        }
    }
    
    /**
     * Update UI slide animations with speed multiplier
     */
    updateUIAnimations() {
        const speedMultiplier = this.isDialogSpeedKeyHeld() ? this.fastForwardMultiplier : 1;
        
        // Dialog box slide
        if (this.uiSlideDirection === 'in' && this.uiSlideProgress < 1) {
            this.uiSlideProgress += this.uiSlideSpeed * speedMultiplier;
            if (this.uiSlideProgress >= 1) {
                this.uiSlideProgress = 1;
            }
        }
        
        // Portrait slide
        if (this.portraitSlideDirection === 'in' && this.portraitSlideProgress < 1) {
            this.portraitSlideProgress += this.portraitSlideSpeed * speedMultiplier;
            if (this.portraitSlideProgress >= 1) {
                this.portraitSlideProgress = 1;
            }
        }
    }
    
    /**
     * Update all active dialogs
     */
    updateAllDialogs() {
        // Remove dialogs that have finished sliding out
        this.activeDialogs = this.activeDialogs.filter(dialog => 
            dialog.slideDirection !== 'out' || dialog.slideProgress > 0
        );
        
        // Update each dialog
        for (let i = 0; i < this.activeDialogs.length; i++) {
            const dialog = this.activeDialogs[i];
            
            // Update slide animation
            if (dialog.slideDirection === 'in' && dialog.slideProgress < 1) {
                dialog.slideProgress += dialog.slideSpeed;
                if (dialog.slideProgress >= 1) {
                    dialog.slideProgress = 1;
                }
            } else if (dialog.slideDirection === 'out' && dialog.slideProgress > 0) {
                dialog.slideProgress -= dialog.slideSpeed;
                if (dialog.slideProgress <= 0) {
                    dialog.slideProgress = 0;
                }
            }
            
            // Update move up animation
            if (dialog.moveUpDirection === 'up' && dialog.moveUpProgress < 1) {
                dialog.moveUpProgress += dialog.moveUpSpeed;
                if (dialog.moveUpProgress >= 1) {
                    dialog.moveUpProgress = 1;
                }
            }
            
            // Update text animation for the current dialog (bottom one)
            if (i === this.activeDialogs.length - 1) {
                this.updateDialogText(dialog);
            }
        }
    }
    
    /**
     * Update text animation for a specific dialog
     */
    updateDialogText(dialog) {
        if (dialog.isTextComplete) return;
        
        // Check for fast-forward (Space or Enter held down for dialog speed)
        const isFastForward = this.isDialogSpeedKeyHeld();
        const speedMultiplier = isFastForward ? this.fastForwardMultiplier : 1;
        
        // Apply speed multiplier to text speed
        const adjustedTextSpeed = Math.max(1, Math.floor(this.textSpeed / speedMultiplier));
        
        dialog.textTimer++;
        if (dialog.textTimer >= adjustedTextSpeed) {
            dialog.textTimer = 0;
            
            // When fast-forwarding, advance multiple characters at once
            const charactersToAdvance = speedMultiplier;
            dialog.textIndex += charactersToAdvance;
            
            // Play text beep for each character (but limit frequency)
            if (!isFastForward || dialog.textIndex % 3 === 0) {
                this.playTextBeep();
            }
            
            if (dialog.textIndex >= dialog.text.length) {
                dialog.textIndex = dialog.text.length;
                dialog.isTextComplete = true;
                dialog.waitingForInput = true;
                // Set completion time for indicator delay
                if (!dialog.completionTime) {
                    dialog.completionTime = Date.now();
                }
            }
        }
    }
    
    /**
     * Check if Enter is being held down for fast-forward (Space key removed)
     */
    isAnyKeyHeld() {
        // Only check Enter key (but not in debug mode for skipping)
        if (typeof keyboardState !== 'undefined') {
            // Only allow Enter for fast-forward if not in debug mode (to avoid conflict with skip)
            if (keyboardState['Enter'] && (typeof debugMode === 'undefined' || !debugMode)) {
                return true;
            }
        }
        
        // Check gamepad buttons for fast-forward (fire button and start button)
        if (typeof navigator !== 'undefined' && navigator.getGamepads) {
            const gamepad = navigator.getGamepads()[0];
            if (gamepad) {
                // Fire button (button 0) and start button (button 9) for fast-forward
                if ((gamepad.buttons[0] && gamepad.buttons[0].pressed) || 
                    (gamepad.buttons[9] && gamepad.buttons[9].pressed)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Check if Space or Enter is being held down for dialog fast-forward
     */
    isDialogSpeedKeyHeld() {
        // Check if Space or Enter is pressed (but not Enter in debug mode for skipping)
        if (typeof keyboardState !== 'undefined') {
            if (keyboardState['Space']) {
                return true;
            }
            // Only allow Enter for fast-forward if not in debug mode (to avoid conflict with skip)
            if (keyboardState['Enter'] && (typeof debugMode === 'undefined' || !debugMode)) {
                return true;
            }
        }
        
        // Check gamepad buttons for fast-forward (fire button and start button)
        if (typeof navigator !== 'undefined' && navigator.getGamepads) {
            const gamepad = navigator.getGamepads()[0];
            if (gamepad) {
                // Fire button (button 0) and start button (button 9) for fast-forward
                if ((gamepad.buttons[0] && gamepad.buttons[0].pressed) || 
                    (gamepad.buttons[9] && gamepad.buttons[9].pressed)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Update input handling with speed multiplier
     */
    updateInput() {
        const currentDialog = this.activeDialogs[this.activeDialogs.length - 1];
        if (!currentDialog || !currentDialog.waitingForInput) return;
        
        const speedMultiplier = this.isDialogSpeedKeyHeld() ? this.fastForwardMultiplier : 1;
        currentDialog.inputTimer += speedMultiplier;
        if (currentDialog.inputTimer >= this.inputDelay) {
            // Allow input after delay
            currentDialog.inputTimer = this.inputDelay;
        }
    }
    
    /**
     * Skip the entire cinematic
     */
    skip() {
        console.log('[Cinematic] Skip method called');
        this.stop();
    }
    
    /**
     * Check if Enter key is pressed for skipping
     */
    isEnterPressed() {
        // Check keyboard Enter key (both 'Enter' and 'NumpadEnter' codes)
        if (typeof keyboardState !== 'undefined' && (keyboardState['Enter'] || keyboardState['NumpadEnter'])) {
            console.log('[Cinematic] Enter key detected in isEnterPressed()');
            return true;
        }

        return false;
    }
    
    /**
     * Handle input (called from main game loop)
     */
    handleInput() {
        // Only allow skip in debug mode with Enter key or gamepad start button
        if (typeof debugMode !== 'undefined' && debugMode) {
            // Check keyboard Enter key
            if (this.isEnterPressed()) {
                console.log('[Cinematic] Debug mode enabled, Enter pressed - skipping cinematic');
                this.skip();
                return true; // Signal that cinematic was skipped
            }
            
            // Check gamepad start button (button 9)
            if (typeof navigator !== 'undefined' && navigator.getGamepads) {
                const gamepad = navigator.getGamepads()[0];
                if (gamepad && gamepad.buttons[9] && gamepad.buttons[9].pressed) {
                    console.log('[Cinematic] Debug mode enabled, gamepad start button pressed - skipping cinematic');
                    this.skip();
                    return true; // Signal that cinematic was skipped
                }
            }
        }
        
        return false;
    }
    
    /**
     * Draw cinematic
     */
    draw() {
        if (!this.isActive) return;
        
        // Note: Starfield is now drawn by the main game loop
        // to keep ship and starfield visible during cinematics
        
        // Draw dialog UI
        this.drawDialogUI();
    }
    
    /**
     * Draw starfield background
     */
    drawStarfield() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#fff';
        for (let star of this.starfield) {
            this.ctx.globalAlpha = star.brightness;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Draw starfield with custom alpha (for pre-flight fade-in)
     */
    drawStarfieldWithAlpha(alpha = 1.0) {
        this.ctx.fillStyle = '#fff';
        for (let star of this.starfield) {
            this.ctx.globalAlpha = star.brightness * alpha;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Draw dialog UI
     */
    drawDialogUI() {
        if (!this.activeDialogs || this.activeDialogs.length === 0) {
            return;
        }
        
        // Draw all active dialogs from bottom to top
        for (let i = 0; i < this.activeDialogs.length; i++) {
            const dialog = this.activeDialogs[i];
            const dialogIndex = this.activeDialogs.length - 1 - i; // Reverse order for stacking
            const isCurrentDialog = i === this.activeDialogs.length - 1;
            
            // Calculate alpha based on position in stack
            // Bottom dialog (most recent) = 1.0, higher dialogs = more transparent
            const maxAlpha = 1.0;
            const minAlpha = 0.45; // Balanced minimum alpha - dimmer than 0.6 but not as dim as 0.3
            const alphaStep = (maxAlpha - minAlpha) / Math.max(1, this.activeDialogs.length - 1);
            const dialogAlpha = maxAlpha - (dialogIndex * alphaStep);
            
            // Calculate position and size - pushed up with good bottom margin
            const dialogHeight = this.dialogBoxHeight; // All dialogs same size
            const bottomMargin = 60; // Good margin from bottom of screen
            const baseY = this.canvas.height - this.dialogBoxHeight - bottomMargin;
            const dialogY = baseY - (dialogIndex * (this.dialogBoxHeight + this.dialogSpacing));
            

            
            // Apply move up animation for existing dialogs
            const moveUpOffset = dialog.moveUpProgress ? (dialog.moveUpProgress * 20) : 0; // Move up 20px
            const movedY = dialogY - moveUpOffset;
            
            // Apply slide animation based on direction
            let slideXOffset = 0;
            let slideYOffset = 0;
            if (dialog.slideFrom === 'left') {
                slideXOffset = (1 - dialog.slideProgress) * -400; // Slide from left
            } else if (dialog.slideFrom === 'right') {
                slideXOffset = (1 - dialog.slideProgress) * 400; // Slide from right
            } else {
                // Fallback to vertical slide
                slideYOffset = (1 - dialog.slideProgress) * 200;
            }
            
            const finalY = movedY + slideYOffset;
            const finalX = slideXOffset; // X offset for horizontal sliding
            
            // Only draw if dialog is visible
            
            if (dialog.slideProgress > 0 && finalY < this.canvas.height) {
                this.drawSingleDialog(dialog, finalY, isCurrentDialog, dialogHeight, finalX, dialogAlpha);
            }
        }
    }
    
    /**
     * Draw a single dialog box
     */
    drawSingleDialog(dialog, y, isCurrentDialog, dialogHeight, xOffset = 0, alpha = 1.0) {
        // Apply alpha for this dialog
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // Draw dialog components
        
        // Determine styling
        const borderWidth = isCurrentDialog ? 4 : 2; // Thicker border for current dialog
        const textScale = 1.0;
        const portraitSize = 80;
        const dialogColor = this.getDialogColor(dialog);
        const radius = 12;
        
        // Calculate portrait box dimensions
        const portraitBoxWidth = portraitSize + 40; // Portrait + margins
        const portraitBoxHeight = portraitSize + 60; // Portrait + name space + margins
        
        // Fix portrait box positioning - ensure it stays within canvas bounds
        let basePortraitBoxX;
        if (dialog.position === 'RIGHT') {
            basePortraitBoxX = this.canvas.width - portraitBoxWidth - 20; // Right side
        } else {
            basePortraitBoxX = 20; // Left side
        }
        
        const portraitBoxX = basePortraitBoxX + xOffset;
        const portraitBoxY = y;
        
        try {
            // Draw portrait box background
            const portraitGradient = this.createDialogGradient(dialogColor, portraitBoxY, portraitBoxHeight, isCurrentDialog);
        this.ctx.save();
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
            this.ctx.roundRect(portraitBoxX, portraitBoxY, portraitBoxWidth, portraitBoxHeight, radius);
        } else {
            // Manual rounded rect for compatibility
            this.ctx.moveTo(portraitBoxX + radius, portraitBoxY);
            this.ctx.lineTo(portraitBoxX + portraitBoxWidth - radius, portraitBoxY);
            this.ctx.quadraticCurveTo(portraitBoxX + portraitBoxWidth, portraitBoxY, portraitBoxX + portraitBoxWidth, portraitBoxY + radius);
            this.ctx.lineTo(portraitBoxX + portraitBoxWidth, portraitBoxY + portraitBoxHeight - radius);
            this.ctx.quadraticCurveTo(portraitBoxX + portraitBoxWidth, portraitBoxY + portraitBoxHeight, portraitBoxX + portraitBoxWidth - radius, portraitBoxY + portraitBoxHeight);
            this.ctx.lineTo(portraitBoxX + radius, portraitBoxY + portraitBoxHeight);
            this.ctx.quadraticCurveTo(portraitBoxX, portraitBoxY + portraitBoxHeight, portraitBoxX, portraitBoxY + portraitBoxHeight - radius);
            this.ctx.lineTo(portraitBoxX, portraitBoxY + radius);
            this.ctx.quadraticCurveTo(portraitBoxX, portraitBoxY, portraitBoxX + radius, portraitBoxY);
        }
        this.ctx.closePath();
        this.ctx.fillStyle = portraitGradient;
        this.ctx.fill();

        // Draw portrait box border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = borderWidth;
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
            this.ctx.roundRect(portraitBoxX, portraitBoxY, portraitBoxWidth, portraitBoxHeight, radius);
        } else {
            this.ctx.moveTo(portraitBoxX + radius, portraitBoxY);
            this.ctx.lineTo(portraitBoxX + portraitBoxWidth - radius, portraitBoxY);
            this.ctx.quadraticCurveTo(portraitBoxX + portraitBoxWidth, portraitBoxY, portraitBoxX + portraitBoxWidth, portraitBoxY + radius);
            this.ctx.lineTo(portraitBoxX + portraitBoxWidth, portraitBoxY + portraitBoxHeight - radius);
            this.ctx.quadraticCurveTo(portraitBoxX + portraitBoxWidth, portraitBoxY + portraitBoxHeight, portraitBoxX + portraitBoxWidth - radius, portraitBoxY + portraitBoxHeight);
            this.ctx.lineTo(portraitBoxX + radius, portraitBoxY + portraitBoxHeight);
            this.ctx.quadraticCurveTo(portraitBoxX, portraitBoxY + portraitBoxHeight, portraitBoxX, portraitBoxY + portraitBoxHeight - radius);
            this.ctx.lineTo(portraitBoxX, portraitBoxY + radius);
            this.ctx.quadraticCurveTo(portraitBoxX, portraitBoxY, portraitBoxX + radius, portraitBoxY);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();

        // Position portrait within portrait box
        const portraitX = portraitBoxX + 20; // 20px margin from left edge of portrait box
        const portraitY = portraitBoxY + 20; // 20px margin from top edge of portrait box
        
        // Portrait background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(portraitX, portraitY, portraitSize, portraitSize);
        
        // Draw image or placeholder
        if (dialog.currentImage) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.9;
            this.ctx.drawImage(dialog.currentImage, portraitX, portraitY, portraitSize, portraitSize);
            this.ctx.restore();
        } else {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = `${Math.floor(14 * textScale)}px "Courier New", "Monaco", "Consolas", monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PORTRAIT', portraitX + portraitSize/2, portraitY + portraitSize/2 + 4);
        }
        
        // Draw character name under portrait
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${Math.floor(14 * textScale)}px 'Press Start 2P', 'Arial Black', 'Courier New', monospace`; // Reduced from 16 to 14
        
        // Position name under portrait
        const nameX = portraitX + portraitSize / 2; // Center under portrait
        const nameY = portraitY + portraitSize + Math.floor(20 * textScale); // Below portrait
        
        this.ctx.textAlign = 'center';
        this.ctx.fillText(dialog.character, nameX, nameY);
        
        } catch (error) {
            console.error('Error drawing portrait box:', error);
        }
        
        // Calculate text bubble dimensions and position
        const isRightPosition = dialog.position === 'RIGHT';
        const textBubbleMargin = 20;
        const textBubblePadding = 20;
        
        // Calculate text bubble position based on portrait position
        let textBubbleX, textBubbleWidth;
        if (isRightPosition) {
            // Portrait on right, text bubble on left - anchor to right, shorten from left
            const fullWidth = this.canvas.width - portraitBoxWidth - 40 - textBubbleMargin; // Full width minus portrait area and margins
            textBubbleWidth = fullWidth * 0.8; // Reduce width by 20%
            textBubbleX = this.canvas.width - portraitBoxWidth - 40 - textBubbleWidth - textBubbleMargin; // Anchor to right side
        } else {
            // Portrait on left, text bubble on right - anchor to left, shorten from right
            textBubbleX = portraitBoxWidth + textBubbleMargin + textBubbleMargin;
            const fullWidth = this.canvas.width - textBubbleX - textBubbleMargin;
            textBubbleWidth = fullWidth * 0.8; // Reduce width by 20% towards the right side
        }
        
        // Apply X offset to both portrait and text bubble together
        const finalPortraitBoxX = portraitBoxX; // portraitBoxX already includes xOffset
        const finalTextBubbleX = textBubbleX + xOffset;
        

        
        // Calculate text bubble height based on content
        const textBubbleMinHeight = 60;
        const textBubbleMaxHeight = 120;
        const textBubbleHeight = Math.max(textBubbleMinHeight, Math.min(textBubbleMaxHeight, dialogHeight));
        
        // Draw text bubble background
        const textBubbleGradient = this.createDialogGradient(dialogColor, y, textBubbleHeight, isCurrentDialog);
        this.ctx.save();
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
            this.ctx.roundRect(finalTextBubbleX, y, textBubbleWidth, textBubbleHeight, radius);
        } else {
            // Manual rounded rect for compatibility
            this.ctx.moveTo(finalTextBubbleX + radius, y);
            this.ctx.lineTo(finalTextBubbleX + textBubbleWidth - radius, y);
            this.ctx.quadraticCurveTo(finalTextBubbleX + textBubbleWidth, y, finalTextBubbleX + textBubbleWidth, y + radius);
            this.ctx.lineTo(finalTextBubbleX + textBubbleWidth, y + textBubbleHeight - radius);
            this.ctx.quadraticCurveTo(finalTextBubbleX + textBubbleWidth, y + textBubbleHeight, finalTextBubbleX + textBubbleWidth - radius, y + textBubbleHeight);
            this.ctx.lineTo(finalTextBubbleX + radius, y + textBubbleHeight);
            this.ctx.quadraticCurveTo(finalTextBubbleX, y + textBubbleHeight, finalTextBubbleX, y + textBubbleHeight - radius);
            this.ctx.lineTo(finalTextBubbleX, y + radius);
            this.ctx.quadraticCurveTo(finalTextBubbleX, y, finalTextBubbleX + radius, y);
        }
        this.ctx.closePath();
        this.ctx.fillStyle = textBubbleGradient;
        this.ctx.fill();

        // Draw text bubble border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = borderWidth;
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
            this.ctx.roundRect(finalTextBubbleX, y, textBubbleWidth, textBubbleHeight, radius);
        } else {
            this.ctx.moveTo(finalTextBubbleX + radius, y);
            this.ctx.lineTo(finalTextBubbleX + textBubbleWidth - radius, y);
            this.ctx.quadraticCurveTo(finalTextBubbleX + textBubbleWidth, y, finalTextBubbleX + textBubbleWidth, y + radius);
            this.ctx.lineTo(finalTextBubbleX + textBubbleWidth, y + textBubbleHeight - radius);
            this.ctx.quadraticCurveTo(finalTextBubbleX + textBubbleWidth, y + textBubbleHeight, finalTextBubbleX + textBubbleWidth - radius, y + textBubbleHeight);
            this.ctx.lineTo(finalTextBubbleX + radius, y + textBubbleHeight);
            this.ctx.quadraticCurveTo(finalTextBubbleX, y + textBubbleHeight, finalTextBubbleX, y + textBubbleHeight - radius);
            this.ctx.lineTo(finalTextBubbleX, y + radius);
            this.ctx.quadraticCurveTo(finalTextBubbleX, y, finalTextBubbleX + radius, y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();
        
        // Draw dialog text within text bubble
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${Math.floor(16 * textScale)}px "Courier New", "Monaco", "Consolas", monospace`; // Reduced from 18 to 16
        this.ctx.textAlign = 'left';
        
        const dialogTextY = y + textBubblePadding + Math.floor(20 * textScale);
        const maxWidth = (textBubbleWidth - (textBubblePadding * 2)) * 0.9; // Reduced width by 10%
        
        // Pre-calculate word positions and line assignments
        const fullText = dialog.text;
        const allWords = fullText.split(' ');
        const wordLineAssignments = [];
        let currentLine = '';
        let currentLineIndex = 0;
        
        // Calculate which line each word belongs to
        for (let i = 0; i < allWords.length; i++) {
            const word = allWords[i];
            const testLine = currentLine + word + ' ';
            const metrics = this.ctx.measureText(testLine);
            
            if (metrics.width <= maxWidth) {
                currentLine = testLine;
                wordLineAssignments.push(currentLineIndex);
            } else {
                // Word doesn't fit, move to next line
                currentLineIndex++;
                currentLine = word + ' ';
                wordLineAssignments.push(currentLineIndex);
            }
        }
        
        // Calculate number of lines for this dialog
        const totalLines = Math.max(...wordLineAssignments) + 1;
        
        // Adjust bottom margin based on number of lines
        const baseBottomMargin = Math.floor(20 * textScale);
        const extraMargin = totalLines > 2 ? Math.floor(15 * textScale) : 0; // Increased extra margin for 3+ lines
        const bottomMargin = baseBottomMargin + extraMargin;
        const maxTextHeight = textBubbleHeight - (textBubblePadding * 2) - bottomMargin;
        
        // Display characters based on pre-calculated line structure
        const currentText = isCurrentDialog ? dialog.text.substring(0, dialog.textIndex) : dialog.text;
        const totalChars = currentText.length;
        
        // Calculate character positions for each line
        let charIndex = 0;
        const lines = [];
        
        for (let i = 0; i < allWords.length; i++) {
            const word = allWords[i];
            const lineIndex = wordLineAssignments[i];
            
            if (!lines[lineIndex]) {
                lines[lineIndex] = '';
            }
            
            // Add the word to its assigned line
            if (charIndex < totalChars) {
                const wordLength = word.length;
                const charsToAdd = Math.min(wordLength, totalChars - charIndex);
                
                if (charsToAdd > 0) {
                    lines[lineIndex] += word.substring(0, charsToAdd);
                    charIndex += charsToAdd;
                    
                    // Add space if not the last character and not the last word in the line
                    if (charIndex < totalChars && i < allWords.length - 1 && wordLineAssignments[i + 1] === lineIndex) {
                        lines[lineIndex] += ' ';
                        charIndex++;
                    }
                }
            }
        }
        
        // Draw each line
        let lineY = dialogTextY;
        const lineHeight = Math.floor(28 * textScale);
        

        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const lineText = lines[lineIndex];
            
            if (lineText && lineText.length > 0) {
                const lineX = finalTextBubbleX + textBubblePadding; // Left-aligned within text bubble
                this.ctx.fillText(lineText, lineX, lineY);
                lineY += lineHeight;
            }
        }
        
        // Draw continue indicator outside text bubble for any complete dialog (after 5 second delay)
        const isDialogComplete = isCurrentDialog && dialog.isTextComplete;
        if (isDialogComplete) {
            const timeSinceComplete = Date.now() - (dialog.completionTime || 0);
            const showIndicator = timeSinceComplete > 5000; // 5 seconds
            
            if (showIndicator) {
                this.ctx.fillStyle = '#FFFF00'; // Yellow
                this.ctx.font = 'bold 14px "Courier New", "Monaco", "Consolas", monospace';
                this.ctx.textAlign = 'right';
                const indicatorX = finalTextBubbleX + textBubbleWidth - 20;
                const indicatorY = y + textBubbleHeight + 22; // 22px below text bubble border
                
                // Blinking effect
                if (Math.floor(Date.now() / 500) % 2) {
                    this.ctx.fillText('PRESS ANY KEY TO CONTINUE...', indicatorX, indicatorY);
                }
            }
        }
        
        // Draw skip instructions only for current dialog and only in debug mode
        if (isCurrentDialog && dialog.isTextComplete && dialog.waitingForInput && dialog.inputTimer >= this.inputDelay && debugMode) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '12px "Courier New", "Monaco", "Consolas", monospace';
            this.ctx.textAlign = 'right';
            const skipX = finalTextBubbleX + textBubbleWidth - 20;
            const skipY = y + textBubbleHeight - 5;
            this.ctx.fillText('DEBUG: ENTER TO SKIP CINEMATIC', skipX, skipY);
        }
        
        // Restore alpha
        this.ctx.restore();
    }
    
    /**
     * Check if cinematic is complete
     */
    isComplete() {
        return !this.isActive;
    }
    
    /**
     * Initialize audio context for text beep
     */
    initAudio() {
        try {
            // Create audio context if not already created
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        } catch (error) {
            console.warn('[Cinematic] Could not initialize audio context:', error);
        }
    }
    
    /**
     * Play 80s-style text beep sound
     */
    playTextBeep() {
        // Check if sound is enabled globally
        if (typeof soundManager !== 'undefined' && !soundManager.isSoundEnabled()) {
            return;
        }
        
        if (!this.audioContext) return;
        
        const now = Date.now();
        if (now - this.lastBeepTime < this.beepCooldown) return;
        this.lastBeepTime = now;
        
        try {
            // Create oscillator for the beep
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Set up the sound - 80s computer style
            oscillator.type = 'sine'; // Sine wave for smoother, less harsh sound
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime); // 800Hz base frequency
            oscillator.frequency.exponentialRampToValueAtTime(1000, this.audioContext.currentTime + 0.05); // Reduced pitch rise for smoother sound
            
            // Set up volume envelope - much softer and gentler
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.025, this.audioContext.currentTime + 0.02); // Much lower volume (2.5%)
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.12); // Longer, gentler decay
            
            // Start and stop the oscillator
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.12);
            
        } catch (error) {
            console.warn('[Cinematic] Could not play text beep:', error);
        }
    }
    

    
    /**
     * Load and cache an image
     */
    loadImage(imagePath) {
        if (!imagePath || imagePath.trim() === '') {
            return Promise.resolve(null);
        }
        
        // Check if already cached
        if (this.imageCache.has(imagePath)) {
            return Promise.resolve(this.imageCache.get(imagePath));
        }
        
        // Load new image
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.imageCache.set(imagePath, img);
                resolve(img);
            };
            img.onerror = () => {
                resolve(null);
            };
            img.src = imagePath;
        });
    }
    
    /**
     * Load images for the current dialog set
     */
    async loadDialogImages() {
        if (!this.currentDialog) return;
        
        const imagePaths = new Set();
        
        // Collect all unique image paths from the dialog
        for (const dialog of this.currentDialog) {
            if (dialog.image && dialog.image.trim() !== '') {
                imagePaths.add(dialog.image);
            }
        }
        
        // Load each image
        for (const imagePath of imagePaths) {
            await this.loadImage(imagePath);
        }
    }
    
    /**
     * Add a new dialog to the stack
     */
    addDialog(dialogData) {

        const baseTime = 800; // ms
        const timePerChar = 40; // ms per character
        const textLength = dialogData.text.length;
        const displayTime = baseTime + textLength * timePerChar;
        
        // Move existing dialogs up to make room
        this.moveExistingDialogsUp();
        
        const newDialog = {
            character: dialogData.character,
            charNum: dialogData.charNum,
            text: dialogData.text,
            portrait: dialogData.portrait,
            image: dialogData.image,
            position: dialogData.position || 'LEFT', // Default to LEFT if not specified
            textIndex: 0,
            textTimer: 0,
            isTextComplete: false,
            waitingForInput: false,
            inputTimer: 0,
            slideProgress: 0,
            slideDirection: 'in',
            slideSpeed: 0.02, // Slower speed for 1 second animation (60fps * 0.02 = 1.2 seconds)
            slideFrom: dialogData.position === 'RIGHT' ? 'right' : 'left', // Slide from appropriate side
            startTime: Date.now(),
            displayTime: displayTime
        };
        
        // Add to active dialogs
        this.activeDialogs.push(newDialog);
        
        // If we exceed max dialogs, remove the oldest one
        if (this.activeDialogs.length > this.maxDialogs) {
            this.activeDialogs.shift(); // Remove the first (oldest) dialog
        }
        
        // Set image for new dialog
        this.setDialogImage(newDialog);
        
        // Play appropriate comms beep based on dialog position
        if (typeof soundManager !== 'undefined') {
            if (newDialog.position === 'RIGHT') {
                // Eva/outgoing comms - right side
                soundManager.playEvaCommsBeep();
            } else {
                // Incoming comms - left side
                soundManager.playIncomingCommsBeep();
            }
        }
        

    }
    
    /**
     * Set image for a specific dialog
     */
    setDialogImage(dialog) {
        if (dialog.image && dialog.image.trim() !== '') {
            dialog.currentImage = this.imageCache.get(dialog.image) || null;
        } else if (dialog.character === 'Cmdr. Rostova' || dialog.character === 'Eva') {
            // Auto-assign Eva portrait for Commander Rostova/Eva when no image specified
            const evaPortraits = ['images/cinematic/ev1.jpg', 'images/cinematic/ev2.jpg'];
            const imagePath = evaPortraits[Math.floor(Math.random() * evaPortraits.length)];
            dialog.currentImage = this.imageCache.get(imagePath) || null;
        } else {
            dialog.currentImage = null;
        }
    }
    
    /**
     * Remove a dialog from the stack
     */
    removeDialog(dialogIndex) {
        if (dialogIndex >= 0 && dialogIndex < this.activeDialogs.length) {
            this.activeDialogs[dialogIndex].slideDirection = 'out';
        }
    }
    
    /**
     * Move existing dialogs up to make room for new dialog
     */
    moveExistingDialogsUp() {
        for (let dialog of this.activeDialogs) {
            dialog.moveUpProgress = 0;
            dialog.moveUpDirection = 'up';
            dialog.moveUpSpeed = 0.02; // Match the slide speed for synchronized animation
        }
    }
    
    /**
     * Clear all dialogs
     */
    clearAllDialogs() {
        this.activeDialogs = [];
    }
    
    updateDialogTimer() {
        // Check if current dialog is complete and waiting for input
        const currentDialog = this.activeDialogs[this.activeDialogs.length - 1];
        if (currentDialog && currentDialog.isTextComplete) {
            // Reduced logging - only log once per second
            const now = Date.now();
            if (!this.lastDebugLog || now - this.lastDebugLog > 1000) {
        
                this.lastDebugLog = now;
            }
            
            // Wait for key press to advance to next dialog
            if (this.isAnyKeyPressed()) {
        
                // If this is the final dialog, end the cinematic
                if (this.dialogIndex >= this.currentDialog.length - 1) {
            
                    this.stop();
                } else {
                    // Advance to next dialog
                    this.dialogIndex++;
            
                    this.addDialog(this.currentDialog[this.dialogIndex]);
                    this.lastDialogTimestamp = Date.now();
                }
            }
        }
    }
    
    /**
     * Update key press detection for final dialog
     */
    updateKeyPressDetection() {
        this.keyJustPressed = false;
        
        if (typeof keyboardState !== 'undefined') {
            // Check if this is the first frame after key state reset
            const isFirstFrame = Object.keys(this.lastKeyState).length === 0;
            
            // Only track Space key for advancement (Enter is handled by skip logic)
            const validKeys = ['Space'];
            
            for (let key of validKeys) {
                if (keyboardState.hasOwnProperty(key)) {
                    const isCurrentlyPressed = keyboardState[key];
                    const wasPreviouslyPressed = this.lastKeyState[key] || false;
                    

                    
                    // Key was just pressed (wasn't pressed before, is pressed now)
                    // OR if this is the first frame and a key is currently pressed, treat it as fresh
                    if ((isCurrentlyPressed && !wasPreviouslyPressed) || (isFirstFrame && isCurrentlyPressed)) {
                
                        this.keyJustPressed = true;
                    }
                    
                    // Update last key state
                    this.lastKeyState[key] = isCurrentlyPressed;
                }
            }
            
            // Debug: Log active valid keys once per second
            const now = Date.now();
            if (!this.lastKeyDebugLog || now - this.lastKeyDebugLog > 1000) {
                const activeKeys = validKeys.filter(key => keyboardState[key]);
                if (activeKeys.length > 0) {
                    console.log('[Cinematic] Active valid keys:', activeKeys);
                }
                this.lastKeyDebugLog = now;
            }
        } else {
            console.log('[Cinematic] keyboardState is undefined!');
        }
        
        // Check gamepad buttons for fresh presses (fire button and start button only)
        if (typeof navigator !== 'undefined' && navigator.getGamepads) {
            const gamepad = navigator.getGamepads()[0];
            if (gamepad) {
                const isFirstFrame = Object.keys(this.lastKeyState).length === 0;
                
                // Only track fire button (0) and start button (9)
                const validButtons = [0, 9];
                
                for (let buttonIndex of validButtons) {
                    if (gamepad.buttons[buttonIndex]) {
                        const isCurrentlyPressed = gamepad.buttons[buttonIndex].pressed;
                        const wasPreviouslyPressed = this.lastKeyState[`gamepad_${buttonIndex}`] || false;
                        
                        if ((isCurrentlyPressed && !wasPreviouslyPressed) || (isFirstFrame && isCurrentlyPressed)) {
                            console.log('[Cinematic] Valid gamepad button just pressed:', buttonIndex);
                            this.keyJustPressed = true;
                        }
                        
                        this.lastKeyState[`gamepad_${buttonIndex}`] = isCurrentlyPressed;
                    }
                }
            }
        }
    }
    
    /**
     * Check if Space is just pressed (for ending final dialog)
     */
    isAnyKeyPressed() {
        // Only return true if Space was just pressed
        if (this.keyJustPressed) {
            // Check if the pressed key was Space
            if (typeof keyboardState !== 'undefined') {
                if (keyboardState['Space']) {
                    return true;
                }
            }
            
            // Check gamepad (fire button and start button)
            if (typeof navigator !== 'undefined' && navigator.getGamepads) {
                const gamepad = navigator.getGamepads()[0];
                if (gamepad) {
                    // Fire button (button 0) and start button (button 9) for advancement
                    if ((gamepad.buttons[0] && gamepad.buttons[0].pressed) || 
                        (gamepad.buttons[9] && gamepad.buttons[9].pressed)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    /**
     * Get color for a dialog based on XML color or character number
     */
    getDialogColor(dialog) {
        let colorCode;
        
        // Use XML color if specified, otherwise use character's current or default color
        if (dialog.color && dialog.color.trim() !== '') {
            colorCode = dialog.color.trim().toUpperCase();
        } else {
            // Use character's current color if they have one, otherwise use default
            colorCode = this.characterCurrentColors[dialog.charNum] || this.defaultCharacterColors[dialog.charNum] || 'LTBLUE';
        }
        
        // Update character's current color for persistence
        this.characterCurrentColors[dialog.charNum] = colorCode;
        
        // Convert color code to hex value
        return this.colorPalette[colorCode] || this.colorPalette['LTBLUE'];
    }
    
    /**
     * Create a gradient for dialog background
     */
    createDialogGradient(color, y, height, isCurrentDialog) {
        const gradient = this.ctx.createLinearGradient(0, y, 0, y + height);
        // Parse color (assume hex format)
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        // Flip: top is less opaque/darker, bottom is more opaque/brighter
        const alpha1 = isCurrentDialog ? 0.65 : 0.45; // Less opaque for current dialog (top)
        const alpha2 = isCurrentDialog ? 0.85 : 0.65; // More opaque for current dialog (bottom)
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha1})`); // Top (darker)
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${alpha2})`); // Bottom (brighter)
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${alpha2})`); // Ensure bottom stays bright
        return gradient;
    }
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Cinematic;
}