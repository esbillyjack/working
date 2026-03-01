/**
 * BLASTEROIDS SOUND MANAGER
 * 
 * This module handles all audio functionality for the Blasteroids game.
 * It provides a centralized system for managing sound effects, music,
 * and audio state across the entire game.
 */

// Audio-related constants
const AUDIO_CONSTANTS = {
    // Frequencies
    E2_FREQ: 82.41,
    A4_FREQ: 440,
    B4_FREQ: 493.88,
    F5_FREQ: 739.99,
    B5_FREQ: 987.77,
    
    // Timing
    DRONE_INTERVAL: (60 / 65) / 2 * 1000, // Eighth note duration
    ATTRACT_MUSIC_ON_DURATION: 10000, // 10s on
    ATTRACT_MUSIC_OFF_DURATION: 20000, // 20s silence
    
    // Reverb settings
    REVERB_DELAY_TIME: 0.4,
    REVERB_FEEDBACK: 0.3,
    REVERB_WET_LEVEL: 0.2,
    
    // Volume levels
    MASTER_VOLUME: 1.0,
    SFX_VOLUME: 1.0,
    MUSIC_VOLUME: 0.7,
    
    // Attract music notes
    ATTRACT_NOTES: [
        { freq: 329.63, time: 0.0 },
        { freq: 293.66, time: 0.923 * 0.55 },
        { freq: 659.25, time: 0.923 * 2 },
        { freq: 293.66, time: 0.923 * 2.55 }
    ],
    ATTRACT_SEQUENCE_DURATION: 0.923 * 4 * 1000
};

class SoundManager {
    constructor(gameConfig = null) {
        // Audio context and state
        this.audioContext = null;
        this.soundEnabled = true;
        this.wasSoundEnabled = true;
        this.reverbNode = null;
        
        // Game configuration
        this.gameConfig = gameConfig;
        
        // Looping sound oscillators and gain nodes
        this.thrustOscillator = null;
        this.thrustGain = null;
        this.saucerOscillator = null;
        this.saucerGain = null;
        this.gravitonOscillator = null;
        this.gravitonGain = null;
        this.tractorOscillator = null;
        this.tractorGain = null;
        this.cygnusOscillator = null;
        this.cygnusGain = null;
        this.blackHoleOscillator = null;
        this.blackHoleGain = null;
        this.shipHumOscillator = null;
        this.shipHumGain = null;
        
        // Music and timing
        this.attractMelodyTimeoutId = null;
        this.droneIntervalId = null;
        this.musicOnTimer = null;
        this.musicOffTimer = null;
        this.activeAttractOscillators = []; // Track currently playing attract music oscillators
        
        // Game state reference (will be set by main game)
        this.gameState = 'attract';

        // 20-second cooldown logic
        this.lastAttractMusicPlayTime = null;
        this.attractMusicCooldown = (gameConfig && gameConfig.gameplay && gameConfig.gameplay.attractMusicCooldown) ? gameConfig.gameplay.attractMusicCooldown : 20; // seconds
        this.attractMusicPlayTime = (gameConfig && gameConfig.gameplay && gameConfig.gameplay.attractMusicPlayTime) ? gameConfig.gameplay.attractMusicPlayTime : 30; // seconds
    }

    /**
     * Initialize the audio system
     */
    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createReverb();
            console.log('[SoundManager] Audio context created, state:', this.audioContext.state);
        } else if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
            console.log('[SoundManager] Audio context resumed, state:', this.audioContext.state);
        } else if (this.audioContext.state === 'running') {
            console.log('[SoundManager] Audio context already running');
            return;
        }
    }

    /**
     * Create reverb effect for enhanced audio
     */
    createReverb() {
        if (!this.audioContext || this.reverbNode) return;
        
        const delay = this.audioContext.createDelay(1.0);
        const feedback = this.audioContext.createGain();
        const wetLevel = this.audioContext.createGain();
        delay.delayTime.value = 0.4;
        feedback.gain.value = 0.3;
        wetLevel.gain.value = 0.2;
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wetLevel);
        const reverbBus = this.audioContext.createGain();
        reverbBus.connect(delay);
        wetLevel.connect(this.audioContext.destination);
        this.reverbNode = reverbBus;
    }

    /**
     * Stop all currently playing looping sounds
     */
    stopAllLoopingSounds() {
        this.stopThrustSound();
        this.stopSaucerSound();
        this.stopGravitonSound();
        this.stopTractorSound();
        this.stopCygnusSound();
        this.stopBlackHoleLoopSound();
        this.stopCinematicMusic();
        this.stopShipHum();
    }

    /**
     * Toggle sound on/off
     */
    toggleSound() {
        this.initAudio();
        this.soundEnabled = !this.soundEnabled;
        this.wasSoundEnabled = this.soundEnabled;
        document.getElementById('soundStatus').textContent = this.soundEnabled ? 'ON' : 'OFF';
        
        if (!this.soundEnabled) {
            this.stopAllLoopingSounds();
            this.stopAttractMusic();
            this.stopCinematicMusic();
        } else {
            if (this.gameState === 'attract' || this.gameState === 'highScoreDisplay' || this.gameState === 'highScoreEntry') {
                this.playAttractMusic();
            }
        }
    }

    /**
     * Play thump sound effect
     */
    playThump() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.connect(gainNode);
        
        const dryGain = this.audioContext.createGain();
        dryGain.gain.value = 1.0;
        gainNode.connect(dryGain);
        dryGain.connect(this.audioContext.destination);

        if (this.reverbNode) {
            const wetGain = this.audioContext.createGain();
            wetGain.gain.value = 0.3;
            gainNode.connect(wetGain);
            wetGain.connect(this.reverbNode);
        }

        osc.type = 'sawtooth';
        osc.frequency.value = 82.41; // E2

        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.015, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    /**
     * Start drone sound for attract mode
     */
    startDrone() {
        if (!this.soundEnabled || !this.audioContext || this.droneIntervalId) return;
        const eighthNoteDuration = (60 / 65) / 2 * 1000;
        this.droneIntervalId = setInterval(() => this.playThump(), eighthNoteDuration);
    }

    /**
     * Stop drone sound
     */
    stopDrone() {
        if (this.droneIntervalId) {
            clearInterval(this.droneIntervalId);
            this.droneIntervalId = null;
        }
    }

    /**
     * Start ship's ambient hum sound (Star Trek TNG style)
     */
    startShipHum() {
        console.log('[SoundManager] startShipHum called - soundEnabled:', this.soundEnabled, 'audioContext:', !!this.audioContext, 'oscillator:', !!this.shipHumOscillator);
        
        if (!this.soundEnabled) {
            console.log('[SoundManager] startShipHum blocked - sound disabled');
            return;
        }
        if (!this.audioContext) {
            console.log('[SoundManager] startShipHum blocked - no audio context');
            return;
        }
        if (this.shipHumOscillator) {
            console.log('[SoundManager] startShipHum blocked - oscillator already exists');
            return;
        }
        
        this.initAudio();
        
        if (this.audioContext.state !== 'running') {
            console.log('[SoundManager] startShipHum blocked - audio context not running, state:', this.audioContext.state);
            return;
        }
        
        // Create main hum oscillator (low frequency, warm tone)
        this.shipHumOscillator = this.audioContext.createOscillator();
        this.shipHumGain = this.audioContext.createGain();
        
        // Create a second oscillator for subtle harmonics
        this.shipHumHarmonicOsc = this.audioContext.createOscillator();
        const harmonicGain = this.audioContext.createGain();
        
        // Main hum: lower frequency for softer, warmer tone
        this.shipHumOscillator.type = 'sine';
        this.shipHumOscillator.frequency.value = 80; // Lower frequency for softer tone
        
        // Harmonic: subtle higher frequency for depth
        this.shipHumHarmonicOsc.type = 'sine';
        this.shipHumHarmonicOsc.frequency.value = 160; // Second harmonic
        
        // Create subtle modulation for organic feel
        this.shipHumLfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        this.shipHumLfo.frequency.value = 0.1; // Very slow modulation
        lfoGain.gain.value = 2; // Small frequency variation
        this.shipHumLfo.connect(lfoGain);
        lfoGain.connect(this.shipHumOscillator.frequency);
        lfoGain.connect(this.shipHumHarmonicOsc.frequency);
        
        // Connect oscillators to gain nodes
        this.shipHumOscillator.connect(this.shipHumGain);
        this.shipHumHarmonicOsc.connect(harmonicGain);
        
        // Create dry and wet paths for spatial effect
        const dryGain = this.audioContext.createGain();
        const wetGain = this.audioContext.createGain();
        
        dryGain.gain.value = 0.3; // Main signal
        wetGain.gain.value = 0.4; // Reverb signal
        
        this.shipHumGain.connect(dryGain);
        harmonicGain.connect(dryGain);
        dryGain.connect(this.audioContext.destination);
        
        // Add reverb for distant, ambient feel
        if (this.reverbNode) {
            this.shipHumGain.connect(wetGain);
            harmonicGain.connect(wetGain);
            wetGain.connect(this.reverbNode);
        }
        
        // Set volume levels - softer for ambient feel
        this.shipHumGain.gain.value = 0.15; // Softer main hum volume
        harmonicGain.gain.value = 0.08; // Softer harmonic volume
        
        // Start all oscillators
        const now = this.audioContext.currentTime;
        this.shipHumOscillator.start(now);
        this.shipHumHarmonicOsc.start(now);
        this.shipHumLfo.start(now);
        
        // Fade in the hum
        this.shipHumGain.gain.setValueAtTime(0, now);
        this.shipHumGain.gain.linearRampToValueAtTime(0.15, now + 2.0); // 2 second fade in
        
        harmonicGain.gain.setValueAtTime(0, now);
        harmonicGain.gain.linearRampToValueAtTime(0.08, now + 2.0);
        
        console.log('[SoundManager] Ship hum started');
    }

    /**
     * Stop ship's ambient hum sound
     */
    stopShipHum() {
        if (this.shipHumOscillator) {
            const now = this.audioContext.currentTime;
            
            // Fade out the hum
            this.shipHumGain.gain.linearRampToValueAtTime(0, now + 1.0); // 1 second fade out
            
            // Stop all oscillators after fade
            setTimeout(() => {
                try {
                    this.shipHumOscillator.stop();
                } catch (e) {
                    // Oscillator might already be stopped
                }
                try {
                    this.shipHumHarmonicOsc.stop();
                } catch (e) {
                    // Oscillator might already be stopped
                }
                try {
                    this.shipHumLfo.stop();
                } catch (e) {
                    // Oscillator might already be stopped
                }
                this.shipHumOscillator = null;
                this.shipHumGain = null;
                this.shipHumHarmonicOsc = null;
                this.shipHumLfo = null;
            }, 1000);
            
            console.log('[SoundManager] Ship hum stopped');
        }
    }

    /**
     * Stop attract music and cycle
     */
    stopAttractMusicAndCycle() {
        console.log('stopAttractMusicAndCycle');
        this.stopDrone();
        if (this.attractMelodyTimeoutId) {
            clearTimeout(this.attractMelodyTimeoutId);
            this.attractMelodyTimeoutId = null;
        }
        this.musicOffTimer = setTimeout(() => this.playAttractMusic(), this.attractMusicCooldown * 1000); // silence period
    }

    /**
     * Stop attract music completely
     */
    stopAttractMusic() {
        console.log('stopAttractMusic');
        clearTimeout(this.musicOnTimer);
        clearTimeout(this.musicOffTimer);
        this.stopDrone();
        if (this.attractMelodyTimeoutId) {
            clearTimeout(this.attractMelodyTimeoutId);
            this.attractMelodyTimeoutId = null;
        }
        
        // Immediately stop all currently playing attract music oscillators
        if (this.activeAttractOscillators.length > 0) {
            console.log(`Stopping ${this.activeAttractOscillators.length} active attract oscillators`);
            this.activeAttractOscillators.forEach(osc => {
                try {
                    osc.stop();
                } catch (e) {
                    // Oscillator might already be stopped
                }
            });
            this.activeAttractOscillators = [];
        }
    }

    /**
     * Play attract mode music
     */
    playAttractMusic() {
        if (!this.soundEnabled) return;
        
        // Cooldown logic using configurable value
        const now = Date.now();
        if (!this.lastAttractMusicPlayTime) this.lastAttractMusicPlayTime = 0;
        if (now - this.lastAttractMusicPlayTime < this.attractMusicCooldown * 1000) {
            console.log('playAttractMusic: Cooldown active, skipping');
            return;
        }
        this.lastAttractMusicPlayTime = now;
        // Ensure audio context is initialized and resumed
        this.initAudio();
        
        // If audio context is still suspended, we can't play music yet
        if (!this.audioContext || this.audioContext.state === 'suspended') {
            console.log('playAttractMusic: Audio context suspended, will retry when resumed');
            return;
        }
        
        console.log('playAttractMusic');

        clearTimeout(this.musicOffTimer);
        
        if (this.attractMelodyTimeoutId) return;

        this.startDrone();
        
        const notes = [
            { freq: 329.63, time: 0.0 },      // E4
            { freq: 293.66, time: 0.923 * 0.55 }, // D4  
            { freq: 659.25, time: 0.923 * 2 },    // E5
            { freq: 293.66, time: 0.923 * 2.55 }, // D4
            { freq: 293.66, time: 0.923 * 4 },    // D4 (new)
            { freq: 349.23, time: 0.923 * 4.55 }, // F4 (new)
            { freq: 659.25, time: 0.923 * 6 },    // E5 (new)
            { freq: 329.63, time: 0.923 * 6.55 }  // E4 (new)
        ];
        const sequenceDuration = 0.923 * 8 * 1000; // Updated for 8 beats

        const playNote = (freq, startTime) => {
            if (!this.soundEnabled) return;
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            osc.connect(gainNode);
            const dryGain = this.audioContext.createGain();
            dryGain.gain.value = 0.7;
            gainNode.connect(dryGain);
            dryGain.connect(this.audioContext.destination);
            
            if (this.reverbNode) {
                const wetGain = this.audioContext.createGain();
                wetGain.gain.value = 0.3;
                gainNode.connect(wetGain);
                wetGain.connect(this.reverbNode);
            }

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
            osc.start(startTime);
            osc.stop(startTime + 0.85);
            
            // Track this oscillator for immediate stopping
            this.activeAttractOscillators.push(osc);
            
            // Remove from tracking when it naturally stops
            setTimeout(() => {
                const index = this.activeAttractOscillators.indexOf(osc);
                if (index > -1) {
                    this.activeAttractOscillators.splice(index, 1);
                }
            }, (startTime + 0.85 - this.audioContext.currentTime) * 1000);
        };
        
        const scheduleNotes = () => {
            const sequenceStartTime = this.audioContext.currentTime;
            notes.forEach(note => playNote(note.freq, sequenceStartTime + note.time));
            this.attractMelodyTimeoutId = setTimeout(scheduleNotes, sequenceDuration);
        };
        scheduleNotes();
        
        // Start the cycling after the initial period - don't stop immediately
        this.musicOnTimer = setTimeout(() => this.stopAttractMusicAndCycle(), this.attractMusicPlayTime * 1000); // configurable music ON duration
    }

    /**
     * Play spawn sound effect
     */
    playSpawnSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const duration = 1.6;
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + duration * 0.9);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 20;
        lfoGain.gain.value = 25;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.start(now);
        lfo.start(now);
        osc.stop(now + duration);
        lfo.stop(now + duration);
    }

    /**
     * Play novabomb bounce sound
     */
    playNovabombBounceSound() {
        this.playBounceSound();
    }

    /**
     * Helper function for bounce sounds
     */
    playBounceSound(asteroidSize = null) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        // Determine pitch based on asteroid size
        let baseFreq = 200; // Default (medium asteroid)
        if (asteroidSize !== null) {
            if (asteroidSize >= 35) {
                baseFreq = 120; // Large asteroid - deeper thump
            } else if (asteroidSize < 15) {
                baseFreq = 300; // Small asteroid - higher thump
            }
            // Medium asteroids (15-34) use default 200Hz
        }
        
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        osc.type = 'sine';
        const now = this.audioContext.currentTime;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.2);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    /**
     * Play graviton explosion sound
     */
    playGravitonExplosionSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const duration = 0.6;
        const now = this.audioContext.currentTime;
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate more intense white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 1.5; // Increased amplitude for more white noise
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        // Lower frequencies by an octave (halved)
        filter.frequency.setValueAtTime(2000, now); // Was 4000, now 2000
        filter.frequency.exponentialRampToValueAtTime(150, now + duration * 0.8); // Was 300, now 150
        filter.Q.value = 10; // Reduced Q for more white noise content
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.4, now); // Slightly increased volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        noise.start(now);
        noise.stop(now + duration);
    }

    /**
     * Play heartbeat sound
     */
    playHeartbeatSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const E2_FREQ = 82.41;
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(E2_FREQ, 0);
        const startTime = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        osc.start(startTime);
        osc.stop(startTime + 0.3);
    }

    /**
     * Play explosion sound
     */
    playExplosionSound(size) {
        if (!this.soundEnabled || !this.audioContext) return;
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * size;
        }
        const noise = this.audioContext.createBufferSource();
        const filter = this.audioContext.createBiquadFilter();
        const gainNode = this.audioContext.createGain();
        noise.buffer = buffer;
        noise.connect(filter);
        gainNode.connect(this.audioContext.destination);
        filter.connect(gainNode);
        filter.type = 'lowpass';
        const minFreq = 200;
        const maxFreq = this.audioContext.sampleRate / 2;
        // Invert: smaller asteroids get higher freq, larger get lower freq
        const minSize = 8, maxSize = 48;
        const normSize = Math.max(minSize, Math.min(size, maxSize));
        const freq = minFreq + (maxFreq - minFreq) * (maxSize - normSize) / (maxSize - minSize);
        filter.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.3 * size, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        noise.start(this.audioContext.currentTime);
        noise.stop(this.audioContext.currentTime + 0.5);
    }

    /**
     * Play boing sound
     */
    playBoingSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        osc.type = 'sine';
        const startTime = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
        osc.frequency.setValueAtTime(1000, startTime);
        osc.frequency.exponentialRampToValueAtTime(400, startTime + 0.2);
        osc.start(startTime);
        osc.stop(startTime + 0.2);
    }

    /**
     * Play novabomb beep sound
     */
    playNovabombBeepSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        // Reduce volume in attract mode using config value
        const volumeMultiplier = this.gameState === 'attract' ? (this.gameConfig?.gameplay?.novabombVolume || 0.3) : 1.0;
        
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.2 * volumeMultiplier, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.15);
    }

    /**
     * Play nova explosion sound
     */
    playNovaExplosionSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        // Reduce volume in attract mode using config value
        const volumeMultiplier = this.gameState === 'attract' ? (this.gameConfig?.gameplay?.novabombVolume || 0.3) : 1.0;
        
        const bufferSize = this.audioContext.sampleRate * 0.8;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        noise.buffer = buffer;
        noise.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        const startTime = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.5 * volumeMultiplier, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);
        noise.start(startTime);
        noise.stop(startTime + 0.8);
    }

    /**
     * Play black hole spawn sound
     */
    playBlackHoleSpawnSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        osc.type = 'sawtooth';
        const startTime = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 1.0);
        osc.frequency.setValueAtTime(50, startTime);
        osc.frequency.exponentialRampToValueAtTime(800, startTime + 0.8);
        osc.start(startTime);
        osc.stop(startTime + 1.0);
    }

    /**
     * Start black hole loop sound
     */
    startBlackHoleLoopSound() {
        if (!this.soundEnabled || !this.audioContext || this.blackHoleOscillator) return;
        this.blackHoleOscillator = this.audioContext.createOscillator();
        this.blackHoleGain = this.audioContext.createGain();
        this.blackHoleOscillator.connect(this.blackHoleGain);
        this.blackHoleGain.connect(this.audioContext.destination);
        this.blackHoleOscillator.type = 'sine';
        this.blackHoleOscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
        this.blackHoleGain.gain.setValueAtTime(0.12, this.audioContext.currentTime);
        this.blackHoleOscillator.start(this.audioContext.currentTime);
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.connect(lfoGain);
        lfoGain.connect(this.blackHoleOscillator.frequency);
        lfo.frequency.setValueAtTime(5, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(15, this.audioContext.currentTime);
        lfo.type = 'sine';
        lfo.start(this.audioContext.currentTime);
        this.blackHoleOscillator.lfo = lfo;
    }

    /**
     * Stop black hole loop sound
     */
    stopBlackHoleLoopSound() {
        if (this.blackHoleOscillator) {
            if (this.blackHoleOscillator.lfo) {
                this.blackHoleOscillator.lfo.stop(this.audioContext.currentTime + 0.5);
            }
            this.blackHoleGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
            this.blackHoleOscillator.stop(this.audioContext.currentTime + 0.5);
            this.blackHoleOscillator = null;
        }
    }

    /**
     * Play laser sound
     */
    playLaserSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        oscillator.type = 'square';
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }

    /**
     * Play red projectile sound (more aggressive than laser)
     */
    playRedProjectileSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // More aggressive sound: lower frequency, longer duration, sawtooth wave
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime); // Lower start frequency
        oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.4); // Slower drop
        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime); // Higher volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
        oscillator.type = 'sawtooth'; // More aggressive waveform
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.4); // Longer duration
    }

    /**
     * Start thrust sound
     */
    startThrustSound() {
        if (!this.soundEnabled || !this.audioContext || this.thrustOscillator) return;
        this.thrustOscillator = this.audioContext.createOscillator();
        this.thrustGain = this.audioContext.createGain();
        this.thrustOscillator.connect(this.thrustGain);
        this.thrustGain.connect(this.audioContext.destination);
        this.thrustOscillator.frequency.setValueAtTime(35, this.audioContext.currentTime);
        this.thrustOscillator.type = 'sawtooth';
        this.thrustGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        this.thrustOscillator.start(this.audioContext.currentTime);
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.connect(lfoGain);
        lfoGain.connect(this.thrustOscillator.frequency);
        lfo.frequency.setValueAtTime(15, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(6, this.audioContext.currentTime);
        lfo.type = 'sine';
        lfo.start(this.audioContext.currentTime);
        this.thrustOscillator.lfo = lfo;
    }

    /**
     * Stop thrust sound
     */
    stopThrustSound() {
        if (this.thrustOscillator) {
            if (this.thrustOscillator.lfo) {
                this.thrustOscillator.lfo.stop(this.audioContext.currentTime);
            }
            this.thrustOscillator.stop(this.audioContext.currentTime);
            this.thrustOscillator = null;
        }
    }

    /**
     * Start saucer sound
     */
    startSaucerSound() {
        if (!this.soundEnabled || !this.audioContext || this.saucerOscillator) return;
        this.saucerOscillator = this.audioContext.createOscillator();
        this.saucerGain = this.audioContext.createGain();
        this.saucerOscillator.connect(this.saucerGain);
        this.saucerGain.connect(this.audioContext.destination);
        this.saucerOscillator.frequency.setValueAtTime(60, this.audioContext.currentTime);
        this.saucerOscillator.type = 'sawtooth';
        this.saucerGain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
        this.saucerOscillator.start(this.audioContext.currentTime);
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.connect(lfoGain);
        lfoGain.connect(this.saucerOscillator.frequency);
        lfo.frequency.setValueAtTime(3, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(15, this.audioContext.currentTime);
        lfo.type = 'sine';
        lfo.start(this.audioContext.currentTime);
        this.saucerOscillator.lfo = lfo;
    }

    /**
     * Stop saucer sound
     */
    stopSaucerSound() {
        if (this.saucerOscillator) {
            if (this.saucerOscillator.lfo) {
                this.saucerOscillator.lfo.stop(this.audioContext.currentTime);
            }
            this.saucerOscillator.stop(this.audioContext.currentTime);
            this.saucerOscillator = null;
        }
    }

    /**
     * Start graviton sound
     */
    startGravitonSound() {
        if (!this.soundEnabled || !this.audioContext || this.gravitonOscillator) return;
        this.gravitonOscillator = this.audioContext.createOscillator();
        this.gravitonGain = this.audioContext.createGain();
        this.gravitonOscillator.connect(this.gravitonGain);
        this.gravitonGain.connect(this.audioContext.destination);
        // Raise pitch by 3 semitones: 120 Hz * 2^(3/12) ≈ 142.7 Hz
        this.gravitonOscillator.frequency.setValueAtTime(120 * 1.1892, this.audioContext.currentTime);
        this.gravitonOscillator.type = 'square';
        // Lower volume by 20%
        this.gravitonGain.gain.setValueAtTime(0.06 * 0.8, this.audioContext.currentTime);
        this.gravitonOscillator.start(this.audioContext.currentTime);
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.connect(lfoGain);
        lfoGain.connect(this.gravitonOscillator.frequency);
        // Oscillate slower by 20%
        lfo.frequency.setValueAtTime(5.6, this.audioContext.currentTime); // 7 * 0.8 = 5.6
        lfoGain.gain.setValueAtTime(10, this.audioContext.currentTime);
        lfo.type = 'square';
        lfo.start(this.audioContext.currentTime);
        this.gravitonOscillator.lfo = lfo;
    }

    /**
     * Stop graviton sound
     */
    stopGravitonSound() {
        if (this.gravitonOscillator) {
            if (this.gravitonOscillator.lfo) {
                this.gravitonOscillator.lfo.stop(this.audioContext.currentTime);
            }
            this.gravitonOscillator.stop(this.audioContext.currentTime);
            this.gravitonOscillator = null;
        }
    }

    /**
     * Start cygnus sound
     */
    startCygnusSound() {
        if (!this.soundEnabled || !this.audioContext || this.cygnusOscillator) return;
        this.cygnusOscillator = this.audioContext.createOscillator();
        this.cygnusGain = this.audioContext.createGain();
        this.cygnusOscillator.connect(this.cygnusGain);
        this.cygnusGain.connect(this.audioContext.destination);
        this.cygnusOscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
        this.cygnusOscillator.type = 'sine';
        this.cygnusGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        this.cygnusOscillator.start(this.audioContext.currentTime);
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.connect(lfoGain);
        lfoGain.connect(this.cygnusOscillator.frequency);
        lfo.frequency.setValueAtTime(4, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(3, this.audioContext.currentTime);
        lfo.type = 'sine';
        lfo.start(this.audioContext.currentTime);
        this.cygnusOscillator.lfo = lfo;
    }

    /**
     * Stop cygnus sound
     */
    stopCygnusSound() {
        if (this.cygnusOscillator) {
            if (this.cygnusOscillator.lfo) {
                this.cygnusOscillator.lfo.stop(this.audioContext.currentTime);
            }
            this.cygnusOscillator.stop(this.audioContext.currentTime);
            this.cygnusOscillator = null;
        }
    }

    /**
     * Start tractor sound
     */
    startTractorSound() {
        if (!this.soundEnabled || !this.audioContext || this.tractorOscillator) return;
        this.tractorOscillator = this.audioContext.createOscillator();
        this.tractorGain = this.audioContext.createGain();
        this.tractorOscillator.connect(this.tractorGain);
        this.tractorGain.connect(this.audioContext.destination);
        this.tractorOscillator.frequency.setValueAtTime(40, this.audioContext.currentTime);
        this.tractorOscillator.type = 'sawtooth';
        // Use lower volume in attract mode
        const volume = this.gameState === 'attract' ? 0.03 : 0.1;
        this.tractorGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        this.tractorOscillator.start(this.audioContext.currentTime);
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.connect(lfoGain);
        lfoGain.connect(this.tractorGain.gain);
        lfo.frequency.setValueAtTime(4, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(0.05, this.audioContext.currentTime);
        lfo.type = 'sine';
        lfo.start(this.audioContext.currentTime);
        this.tractorOscillator.lfo = lfo;
    }

    /**
     * Stop tractor sound
     */
    stopTractorSound() {
        if (this.tractorOscillator) {
            if (this.tractorOscillator.lfo) {
                this.tractorOscillator.lfo.stop(this.audioContext.currentTime);
            }
            this.tractorOscillator.stop(this.audioContext.currentTime);
            this.tractorOscillator = null;
        }
    }

    /**
     * Play death sound
     */
    playDeathSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        for (let i = 0; i < 3; i++) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            const baseFreq = 180 + i * 60;
            oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(25, this.audioContext.currentTime + 2.0);
            gainNode.gain.setValueAtTime(0.25, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 2.0);
            oscillator.type = 'sawtooth';
            oscillator.start(this.audioContext.currentTime + i * 0.1);
            oscillator.stop(this.audioContext.currentTime + 2.0);
        }
    }

    /**
     * Play wave complete sound
     */
    playWaveCompleteSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + index * 0.2);
            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime + index * 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + index * 0.2 + 0.3);
            oscillator.type = 'square';
            oscillator.start(this.audioContext.currentTime + index * 0.2);
            oscillator.stop(this.audioContext.currentTime + index * 0.2 + 0.3);
        });
    }

    /**
     * Play extra life sound
     */
    playExtraLifeSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.type = 'triangle';
        oscillator.frequency.value = 880;
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.18, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.42);
    }

    /**
     * Play saucer hit sound
     */
    playSaucerHitSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        oscillator.type = 'square';
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }

    /**
     * Play powerup bounce sound
     */
    playPowerupBounceSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        osc.type = 'sine';
        const now = this.audioContext.currentTime;
        osc.frequency.setValueAtTime(320, now); // Higher pitch than novabomb
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    /**
     * Play powerup destruction sound
     */
    playPowerupDestructionSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const duration = 0.5; // Longer duration
        
        // Main sawtooth sound with more character
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + duration); // Lower end frequency
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.start(now);
        osc.stop(now + duration);
        
        // White noise impact
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        
        noise.buffer = noiseBuffer;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(2000, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.2);
        noiseFilter.Q.value = 8;
        
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        noise.start(now);
        noise.stop(now + 0.2);
    }

    /**
     * Play powerup pickup sound
     */
    playPowerupPickupSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const now = this.audioContext.currentTime;
        // Main ramp-up: triangle + sine (octave up)
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioContext.destination);
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now); // Start low (A4)
        osc1.frequency.linearRampToValueAtTime(2200, now + 0.22); // Ramp up
        osc2.frequency.setValueAtTime(880, now); // Octave up
        osc2.frequency.linearRampToValueAtTime(4400, now + 0.22);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
        // White noise burst for impact
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.05, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        noise.buffer = noiseBuffer;
        noise.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        noiseGain.gain.setValueAtTime(0.18, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        noise.start(now);
        noise.stop(now + 0.05);
    }

    /**
     * Play powerup activation sound
     */
    playPowerupOnSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const now = this.audioContext.currentTime;
        const notes = [493.88, 739.99, 987.77]; // B4, F#5, B5
        
        // Create reverb
        const reverb = this.audioContext.createConvolver();
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = 0.3;
        reverb.connect(reverbGain);
        reverbGain.connect(this.audioContext.destination);
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + i * 0.12);
            gain.gain.setValueAtTime(0.4, now + i * 0.12); // Louder
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25); // Longer duration
            
            // Add filter for warmth
            filter.type = 'lowpass';
            filter.frequency.value = 2000;
            filter.Q.value = 0.5;
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.audioContext.destination);
            gain.connect(reverb); // Send to reverb
            
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.25);
        });
    }

    /**
     * Play powerup deactivation sound
     */
    playPowerupOffSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const now = this.audioContext.currentTime;
        const notes = [987.77, 739.99, 493.88]; // B5, F#5, B4
        
        // Create reverb
        const reverb = this.audioContext.createConvolver();
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = 0.3;
        reverb.connect(reverbGain);
        reverbGain.connect(this.audioContext.destination);
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + i * 0.12);
            gain.gain.setValueAtTime(0.4, now + i * 0.12); // Louder
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25); // Longer duration
            
            // Add filter for warmth
            filter.type = 'lowpass';
            filter.frequency.value = 2000;
            filter.Q.value = 0.5;
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.audioContext.destination);
            gain.connect(reverb); // Send to reverb
            
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.25);
        });
    }

    /**
     * Play color cycle sound
     */
    playColorCycleSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Play waka waka sound (Pac-Man style)
     */
    playWakaWakaSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const pacmanVolume = this.gameConfig?.gameplay?.pacmanVolume || 0.3;
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gainNode.gain.setValueAtTime(pacmanVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Play Pac-Man collision sound
     */
    playPacmanCollisionSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const pacmanVolume = this.gameConfig?.gameplay?.pacmanVolume || 0.3;
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gainNode.gain.setValueAtTime(pacmanVolume*.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    /**
     * Update game state reference
     */
    setGameState(state) {
        this.gameState = state;
        
        // Automatically stop attract music when entering playing mode or cinematic mode
        if ((state === 'playing' || state === 'cinematic') && this.gameState !== state) {
            this.stopAttractMusic();
        }
        
        // Stop cinematic music when leaving cinematic mode
        if (state !== 'cinematic' && this.cinematicMusicActive) {
            this.stopCinematicMusic();
        }
    }

    /**
     * Get current sound enabled state
     */
    isSoundEnabled() {
        return this.soundEnabled;
    }

    /**
     * Play build-up sound for transition
     */
    playBuildUpSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Create a rising tension sound with multiple oscillators
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const osc3 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        osc3.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Add reverb if available
        if (this.reverbNode) {
            const reverbGain = this.audioContext.createGain();
            reverbGain.gain.value = 0.4;
            gainNode.connect(reverbGain);
            reverbGain.connect(this.reverbNode);
        }
        
        // Create a rising tension effect
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc3.type = 'sine';
        
        // Start low and build up
        osc1.frequency.setValueAtTime(110, now); // A2
        osc1.frequency.linearRampToValueAtTime(440, now + 1.0); // A4
        
        osc2.frequency.setValueAtTime(220, now); // A3
        osc2.frequency.linearRampToValueAtTime(880, now + 1.0); // A5
        
        osc3.frequency.setValueAtTime(55, now); // A1
        osc3.frequency.linearRampToValueAtTime(220, now + 1.0); // A3
        
        // Volume envelope - start quiet, build up, then fade
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.5);
        gainNode.gain.linearRampToValueAtTime(0.6, now + 1.0);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        osc1.stop(now + 1.5);
        osc2.stop(now + 1.5);
        osc3.stop(now + 1.5);
    }

    /**
     * Play warp speed sound for transition
     */
    playWarpSpeedSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Create a dramatic warp speed effect
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const noise = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Create white noise buffer
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.8, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        noise.buffer = noiseBuffer;
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        noise.connect(gainNode);
        gainNode.connect(filter);
        filter.connect(this.audioContext.destination);
        
        // Add reverb for dramatic effect
        if (this.reverbNode) {
            const reverbGain = this.audioContext.createGain();
            reverbGain.gain.value = 0.5;
            gainNode.connect(reverbGain);
            reverbGain.connect(this.reverbNode);
        }
        
        // Create the warp speed effect
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        
        // Rapid frequency sweep up
        osc1.frequency.setValueAtTime(200, now);
        osc1.frequency.exponentialRampToValueAtTime(4000, now + 0.3);
        
        osc2.frequency.setValueAtTime(400, now);
        osc2.frequency.exponentialRampToValueAtTime(8000, now + 0.3);
        
        // Filter sweep for dramatic effect
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(100, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
        filter.Q.value = 2;
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0.8, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc1.start(now);
        osc2.start(now);
        noise.start(now);
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
        noise.stop(now + 0.4);
    }

    /**
     * Play cinematic background music (looping)
     */
    playCinematicMusic() {
        if (!this.soundEnabled) return;
        
        // Ensure audio context is initialized and resumed
        this.initAudio();
        
        // If audio context is still suspended, we can't play music yet
        if (!this.audioContext || this.audioContext.state === 'suspended') {
            console.log('playCinematicMusic: Audio context suspended, will retry when resumed');
            return;
        }
        
        console.log('playCinematicMusic: Starting cinematic background music');
        
        // Stop any existing cinematic music
        this.stopCinematicMusic();
        
        // Create a dramatic, ambient cinematic score
        const notes = [
            { freq: 220.00, time: 0.0, duration: 2.0 },    // A3 - deep foundation
            { freq: 329.63, time: 0.5, duration: 1.5 },    // E4 - harmony
            { freq: 440.00, time: 1.0, duration: 1.0 },    // A4 - melody
            { freq: 293.66, time: 2.0, duration: 2.0 },    // D4 - transition
            { freq: 349.23, time: 2.5, duration: 1.5 },    // F4 - tension
            { freq: 523.25, time: 3.0, duration: 1.0 },    // C5 - resolution
            { freq: 196.00, time: 4.0, duration: 2.0 },    // G3 - new phrase
            { freq: 293.66, time: 4.5, duration: 1.5 },    // D4 - harmony
            { freq: 392.00, time: 5.0, duration: 1.0 },    // G4 - melody
            { freq: 261.63, time: 6.0, duration: 2.0 },    // C4 - final phrase
            { freq: 329.63, time: 6.5, duration: 1.5 },    // E4 - harmony
            { freq: 440.00, time: 7.0, duration: 1.0 }     // A4 - resolution
        ];
        
        // Moog-like lead line (Rush Xanadu inspired) - 4x longer than base loop (32 seconds total)
        const leadNotes = [
            // Bar 1 - Soaring high melody
            { freq: 880.00, time: 0.0, duration: 1.0 },    // A5 - high soaring (8th note)
            { freq: 783.99, time: 1.0, duration: 1.0 },    // G5 - descending (8th note)
            { freq: 698.46, time: 2.0, duration: 2.0 },    // F5 - held (quarter note)
            { freq: 880.00, time: 4.0, duration: 1.0 },    // A5 - return (8th note)
            { freq: 659.25, time: 5.0, duration: 3.0 },    // E5 - resolution (dotted quarter)
            
            // Bar 2 - Tension building
            { freq: 783.99, time: 8.0, duration: 1.0 },    // G5 - tension (8th note)
            { freq: 698.46, time: 9.0, duration: 1.0 },    // F5 - building (8th note)
            { freq: 587.33, time: 10.0, duration: 2.0 },   // D5 - lower tension (quarter note)
            { freq: 783.99, time: 12.0, duration: 1.0 },   // G5 - return (8th note)
            { freq: 523.25, time: 13.0, duration: 3.0 },   // C5 - resolution (dotted quarter)
            
            // Bar 3 - Climactic phrase
            { freq: 880.00, time: 16.0, duration: 1.0 },   // A5 - high climax (8th note)
            { freq: 987.77, time: 17.0, duration: 1.0 },   // B5 - higher tension (8th note)
            { freq: 880.00, time: 18.0, duration: 2.0 },   // A5 - held tension (quarter note)
            { freq: 783.99, time: 20.0, duration: 1.0 },   // G5 - descending (8th note)
            { freq: 698.46, time: 21.0, duration: 3.0 },   // F5 - resolution (dotted quarter)
            
            // Bar 4 - Final resolution
            { freq: 659.25, time: 24.0, duration: 1.0 },   // E5 - final phrase (8th note)
            { freq: 587.33, time: 25.0, duration: 1.0 },   // D5 - descending (8th note)
            { freq: 523.25, time: 26.0, duration: 2.0 },   // C5 - building (quarter note)
            { freq: 587.33, time: 28.0, duration: 1.0 },   // D5 - return (8th note)
            { freq: 659.25, time: 29.0, duration: 3.0 }    // E5 - final resolution (dotted quarter)
        ];
        
        const sequenceDuration = 8.0; // 8-second loop
        
        const playNote = (freq, startTime, duration) => {
            if (!this.soundEnabled) return;
            
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gainNode);
            
            // Create a more complex sound with multiple oscillators
            const osc2 = this.audioContext.createOscillator();
            const osc3 = this.audioContext.createOscillator();
            const mixer = this.audioContext.createGain();
            
            osc2.connect(mixer);
            osc3.connect(mixer);
            mixer.connect(filter);
            
            // Main oscillator - sine wave for smooth tone
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            
            // Second oscillator - triangle wave for harmonics
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(freq * 2, startTime); // Octave up
            
            // Third oscillator - very low sine for depth
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(freq * 0.5, startTime); // Octave down
            
            // Mixer levels
            mixer.gain.setValueAtTime(0.3, startTime); // Reduce overall level
            
            // Filter for warmth
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, startTime);
            filter.Q.value = 0.5;
            
            // Volume envelope - slow attack, long sustain, gentle release
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.3); // Slow attack
            gainNode.gain.setValueAtTime(0.08, startTime + duration - 0.5); // Sustain
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Gentle release
            
            // Connect to output
            const dryGain = this.audioContext.createGain();
            dryGain.gain.value = 0.4; // Reduced from 0.8 to 0.4 (half volume)
            gainNode.connect(dryGain);
            dryGain.connect(this.audioContext.destination);
            
            // Add reverb if available
            if (this.reverbNode) {
                const wetGain = this.audioContext.createGain();
                wetGain.gain.value = 0.2; // Reduced from 0.4 to 0.2 (half volume)
                gainNode.connect(wetGain);
                wetGain.connect(this.reverbNode);
            }
            
            // Start and stop oscillators
            osc.start(startTime);
            osc2.start(startTime);
            osc3.start(startTime);
            osc.stop(startTime + duration);
            osc2.stop(startTime + duration);
            osc3.stop(startTime + duration);
            
            // Track for cleanup
            if (!this.activeCinematicOscillators) this.activeCinematicOscillators = [];
            this.activeCinematicOscillators.push(osc, osc2, osc3);
            
            // Remove from tracking when they naturally stop
            setTimeout(() => {
                this.activeCinematicOscillators = this.activeCinematicOscillators.filter(o => o !== osc && o !== osc2 && o !== osc3);
            }, (startTime + duration - this.audioContext.currentTime) * 1000);
        };
        
        // Moog-like lead note function with classic synth characteristics
        const playLeadNote = (freq, startTime, duration) => {
            if (!this.soundEnabled) return;
            
            // Create Moog-style oscillators
            const osc1 = this.audioContext.createOscillator(); // Main sawtooth
            const osc2 = this.audioContext.createOscillator(); // Square for body
            const osc3 = this.audioContext.createOscillator(); // Sine for warmth
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc1.connect(filter);
            osc2.connect(filter);
            osc3.connect(filter);
            filter.connect(gainNode);
            
            // Moog-style oscillator setup
            osc1.type = 'sawtooth'; // Classic Moog sawtooth
            osc2.type = 'square';   // Body and harmonics
            osc3.type = 'sine';     // Warmth and fundamental
            
            // Set frequencies with slight detuning for richness
            osc1.frequency.setValueAtTime(freq, startTime);
            osc2.frequency.setValueAtTime(freq * 0.999, startTime); // Slight detune
            osc3.frequency.setValueAtTime(freq * 1.001, startTime); // Slight detune
            
            // Enhanced Moog-style filter with more resonance
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1800, startTime); // Slightly lower for more warmth
            filter.Q.value = 12; // Higher resonance for more prominent lead sound
            
            // Volume envelope - Lower volume for lead line, with quarter/half note feel
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.05, startTime + 0.3); // Faster attack for quarter note feel
            gainNode.gain.setValueAtTime(0.05, startTime + duration - 0.5); // Sustain
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Long release
            
            // Connect to output with lower volume
            const dryGain = this.audioContext.createGain();
            dryGain.gain.value = 0.25; // Reduced from 0.5 to 0.25 (half volume)
            gainNode.connect(dryGain);
            dryGain.connect(this.audioContext.destination);
            
            // Add reverb for space with more resonance
            if (this.reverbNode) {
                const wetGain = this.audioContext.createGain();
                wetGain.gain.value = 0.3; // Reduced from 0.6 to 0.3 (half volume)
                gainNode.connect(wetGain);
                wetGain.connect(this.reverbNode);
            }
            
            // Start and stop oscillators
            osc1.start(startTime);
            osc2.start(startTime);
            osc3.start(startTime);
            osc1.stop(startTime + duration);
            osc2.stop(startTime + duration);
            osc3.stop(startTime + duration);
            
            // Track for cleanup
            if (!this.activeCinematicOscillators) this.activeCinematicOscillators = [];
            this.activeCinematicOscillators.push(osc1, osc2, osc3);
            
            // Remove from tracking when they naturally stop
            setTimeout(() => {
                this.activeCinematicOscillators = this.activeCinematicOscillators.filter(o => o !== osc1 && o !== osc2 && o !== osc3);
            }, (startTime + duration - this.audioContext.currentTime) * 1000);
        };
        
        const scheduleNotes = () => {
            if (!this.soundEnabled || !this.cinematicMusicActive) return;
            
            const sequenceStartTime = this.audioContext.currentTime;
            
            // Play base notes for this loop
            notes.forEach(note => playNote(note.freq, sequenceStartTime + note.time, note.duration));
            
            // Track which loop we're on for the lead line
            if (!this.cinematicLoopCount) this.cinematicLoopCount = 0;
            this.cinematicLoopCount++;
            
            // Play lead notes only on the first loop (they span 4 loops total)
            if (this.cinematicLoopCount === 1) {
                leadNotes.forEach(note => playLeadNote(note.freq, sequenceStartTime + note.time, note.duration));
            }
            
            // Reset loop count after 4 loops (32 seconds)
            if (this.cinematicLoopCount >= 4) {
                this.cinematicLoopCount = 0;
            }
            
            // Schedule next loop
            this.cinematicMusicTimeoutId = setTimeout(scheduleNotes, sequenceDuration * 1000);
        };
        
        // Mark as active and start the loop
        this.cinematicMusicActive = true;
        scheduleNotes();
    }
    
    /**
     * Stop cinematic background music
     */
    stopCinematicMusic() {
        console.log('stopCinematicMusic: Stopping cinematic background music');
        
        this.cinematicMusicActive = false;
        this.cinematicLoopCount = 0; // Reset loop counter
        
        if (this.cinematicMusicTimeoutId) {
            clearTimeout(this.cinematicMusicTimeoutId);
            this.cinematicMusicTimeoutId = null;
        }
        
        // Stop all active oscillators
        if (this.activeCinematicOscillators) {
            this.activeCinematicOscillators.forEach(osc => {
                try {
                    osc.stop();
                } catch (e) {
                    // Oscillator might already be stopped
                }
            });
            this.activeCinematicOscillators = [];
        }
    }

    /**
     * Play launch sound for ship transition
     */
    playLaunchSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Create multiple oscillators for a rich rocket explosion sound
        const osc1 = this.audioContext.createOscillator(); // Deep rumble
        const osc2 = this.audioContext.createOscillator(); // Mid explosion
        const osc3 = this.audioContext.createOscillator(); // High crackle
        const gainNode = this.audioContext.createGain();
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        osc3.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Add reverb for dramatic effect
        if (this.reverbNode) {
            const reverbGain = this.audioContext.createGain();
            reverbGain.gain.value = 0.4;
            gainNode.connect(reverbGain);
            reverbGain.connect(this.reverbNode);
        }
        
        // Deep rumble (rocket engine)
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(60, now);
        osc1.frequency.exponentialRampToValueAtTime(120, now + 0.8);
        
        // Mid explosion
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(200, now);
        osc2.frequency.exponentialRampToValueAtTime(800, now + 0.4);
        
        // High crackle (explosion debris)
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(800, now);
        osc3.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
        
        // Gain envelope for explosion effect
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.8, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        osc1.stop(now + 1.0);
        osc2.stop(now + 0.6);
        osc3.stop(now + 0.3);
    }

    /**
     * Play deceleration sound effect (mechanical whoosh)
     */
    playDecelerationSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Create a mechanical deceleration effect with multiple oscillators and noise
        const osc1 = this.audioContext.createOscillator(); // Main mechanical tone
        const osc2 = this.audioContext.createOscillator(); // Harmonic
        const osc3 = this.audioContext.createOscillator(); // Metallic resonance
        const noise = this.audioContext.createBufferSource(); // Mechanical noise
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter(); // Mechanical filter
        
        // Create white noise buffer for mechanical sounds
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 1.0, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        noise.buffer = noiseBuffer;
        
        // Connect all components
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        osc3.connect(gainNode);
        noise.connect(gainNode);
        gainNode.connect(filter);
        filter.connect(this.audioContext.destination);
        
        // Add reverb for spatial effect
        if (this.reverbNode) {
            const reverbGain = this.audioContext.createGain();
            reverbGain.gain.value = 0.3;
            gainNode.connect(reverbGain);
            reverbGain.connect(this.reverbNode);
        }
        
        // Create mechanical oscillators
        osc1.type = 'sawtooth'; // Harsh mechanical tone
        osc2.type = 'square'; // Industrial harmonic
        osc3.type = 'triangle'; // Metallic resonance
        
        // Mechanical frequency sweep with harmonics
        osc1.frequency.setValueAtTime(400, now);
        osc1.frequency.exponentialRampToValueAtTime(100, now + 0.9);
        
        osc2.frequency.setValueAtTime(800, now);
        osc2.frequency.exponentialRampToValueAtTime(200, now + 0.9);
        
        osc3.frequency.setValueAtTime(1200, now);
        osc3.frequency.exponentialRampToValueAtTime(300, now + 0.9);
        
        // Mechanical filter sweep
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.9);
        filter.Q.value = 4; // Sharp resonance
        
        // Volume envelope - mechanical startup and shutdown
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.16, now + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        noise.start(now);
        osc1.stop(now + 0.9);
        osc2.stop(now + 0.9);
        osc3.stop(now + 0.9);
        noise.stop(now + 0.9);
        
        console.log('[SoundManager] Mechanical deceleration sound started - duration: 0.9s');
    }

    /**
     * Play staccato computer glitchy EVA comms beep (outgoing/right side) - same as incoming
     */
    playEvaCommsBeep() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        try {
            const now = this.audioContext.currentTime;
            
            // Create incoming comms beep - lower pitched, authoritative, staccato
            const osc1 = this.audioContext.createOscillator(); // First note
            const osc2 = this.audioContext.createOscillator(); // Second note
            const gainNode = this.audioContext.createGain();
            
            // Connect audio chain - no reverb for clean staccato
            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Incoming comms two-note sequence - staccato authoritative
            osc1.type = 'square'; // Digital square wave
            osc2.type = 'square'; // Digital square wave
            
            // First note (lower frequency, authoritative)
            osc1.frequency.setValueAtTime(600, now);
            
            // Second note (even lower frequency)
            osc2.frequency.setValueAtTime(400, now + 0.08);
            
            // Volume envelope - sharp staccato attack/decay (75% volume reduction)
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.03, now + 0.005); // Sharp attack
            gainNode.gain.setValueAtTime(0.03, now + 0.06); // Sustain first note
            gainNode.gain.setValueAtTime(0, now + 0.07); // Cut off first note
            gainNode.gain.setValueAtTime(0.025, now + 0.08); // Attack second note
            gainNode.gain.setValueAtTime(0.025, now + 0.13); // Sustain second note
            gainNode.gain.setValueAtTime(0, now + 0.14); // Cut off second note
            
            // Start oscillators
            osc1.start(now);
            osc2.start(now + 0.08);
            
            // Stop oscillators
            osc1.stop(now + 0.07);
            osc2.stop(now + 0.14);
            
        } catch (error) {
            console.warn('[SoundManager] Could not play Eva comms beep:', error);
        }
    }
    
    /**
     * Play staccato computer glitchy incoming comms beep (left side) - two notes
     */
    playIncomingCommsBeep() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        try {
            const now = this.audioContext.currentTime;
            
            // Create incoming comms beep - lower pitched, authoritative, staccato
            const osc1 = this.audioContext.createOscillator(); // First note
            const osc2 = this.audioContext.createOscillator(); // Second note
            const gainNode = this.audioContext.createGain();
            
            // Connect audio chain - no reverb for clean staccato
            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Incoming comms two-note sequence - staccato authoritative
            osc1.type = 'square'; // Digital square wave
            osc2.type = 'square'; // Digital square wave
            
            // First note (lower frequency, authoritative)
            osc1.frequency.setValueAtTime(600, now);
            
            // Second note (even lower frequency)
            osc2.frequency.setValueAtTime(400, now + 0.08);
            
            // Volume envelope - sharp staccato attack/decay (75% volume reduction)
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.03, now + 0.005); // Sharp attack
            gainNode.gain.setValueAtTime(0.03, now + 0.06); // Sustain first note
            gainNode.gain.setValueAtTime(0, now + 0.07); // Cut off first note
            gainNode.gain.setValueAtTime(0.025, now + 0.08); // Attack second note
            gainNode.gain.setValueAtTime(0.025, now + 0.13); // Sustain second note
            gainNode.gain.setValueAtTime(0, now + 0.14); // Cut off second note
            
            // Start oscillators
            osc1.start(now);
            osc2.start(now + 0.08);
            
            // Stop oscillators
            osc1.stop(now + 0.07);
            osc2.stop(now + 0.14);
            
        } catch (error) {
            console.warn('[SoundManager] Could not play incoming comms beep:', error);
        }
    }

    /**
     * Get audio context
     */
    getAudioContext() {
        return this.audioContext;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
} 