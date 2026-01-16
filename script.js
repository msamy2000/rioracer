/**
 * RioRacer - Dog vs Street
 * Endless Runner Game
 */

// --- Firebase Globals (Dynamic Loading) ---
let app, analytics, db;
let initializeApp, getAnalytics, getFirestore, collection, addDoc, updateDoc, getDocs, query, where, orderBy, limit;
let firebaseLoaded = false;

const firebaseConfig = {
    apiKey: "AIzaSyDWyv1VmQcOD7bwhAfleqQenAHSWsfiN3U",
    authDomain: "rioracer-e8003.firebaseapp.com",
    projectId: "rioracer-e8003",
    storageBucket: "rioracer-e8003.firebasestorage.app",
    messagingSenderId: "928449568156",
    appId: "1:928449568156:web:a1d4d819c4c352caff3c59",
    measurementId: "G-61KD8CPRTN"
};

async function initFirebase() {
    try {
        console.log("Attempting to load Firebase v10.12.2...");
        // Dynamic Imports for Offline Resilience - Using Stable v10.12.2
        const firebaseApp = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
        const firebaseFirestore = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        const firebaseAnalytics = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js");

        // Assign to globals
        initializeApp = firebaseApp.initializeApp;
        getAnalytics = firebaseAnalytics.getAnalytics;
        getFirestore = firebaseFirestore.getFirestore;
        collection = firebaseFirestore.collection;
        addDoc = firebaseFirestore.addDoc;
        updateDoc = firebaseFirestore.updateDoc;
        getDocs = firebaseFirestore.getDocs;
        query = firebaseFirestore.query;
        where = firebaseFirestore.where;
        orderBy = firebaseFirestore.orderBy;
        limit = firebaseFirestore.limit;

        // Initialize
        app = initializeApp(firebaseConfig);
        analytics = getAnalytics(app);
        db = getFirestore(app);

        firebaseLoaded = true;
        console.log("Firebase initialized successfully.");

        // Initial Fetch
        fetchLeaderboard();

    } catch (e) {
        console.warn("Firebase failed to load. Running in Offline Mode.", e);
        const lbList = document.getElementById('leaderboard-list');
        if (lbList) lbList.innerHTML = "<li>Offline Mode (Scores disabled)</li>";
    }
}
// Start init but DO NOT AWAIT it blocks the rest of the script
initFirebase();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
let CANVAS_WIDTH = window.innerWidth;
let CANVAS_HEIGHT = window.innerHeight;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Physics and Scaling Defaults (based on height)
const GRAVITY_CONSTANT = 0.0012;
const JUMP_FORCE_CONSTANT = -0.022;
let GROUND_HEIGHT_PERCENT = 0.15;
let PLAYER_SIZE_PERCENT = 0.15;
let OBSTACLE_MIN_PERCENT = 0.10;
let OBSTACLE_MAX_PERCENT = 0.15;

let BASE_SCALE = 1;
let JUMP_FORCE = 0;
let GROUND_HEIGHT = 0;
let GRAVITY = 0;

function calculateScale() {
    // Detect if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth < 1024 && window.innerHeight < 600);

    // We prioritize Height for the scaling feel of a side-scroller
    // 600px is our reference "internal" height
    // CLAMP: Only apply reference height clamp on mobile to help with tiny characters
    if (isMobile) {
        BASE_SCALE = Math.max(CANVAS_HEIGHT, 400) / 600;
    } else {
        BASE_SCALE = CANVAS_HEIGHT / 600;
    }

    const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

    // Categorical adjustments for better landscape experience
    if (aspectRatio > 1.2) {
        // Landscape (Mobile / Desktop / Laptop)
        if (isMobile) {
            // Mobile Landscape: Tuned for visibility but not "Crazy Large"
            GROUND_HEIGHT_PERCENT = 0.14;
            PLAYER_SIZE_PERCENT = 0.14;
            OBSTACLE_MIN_PERCENT = 0.10;
            OBSTACLE_MAX_PERCENT = 0.14;
        } else {
            // Laptop/Desktop Landscape: Revert to v1.3.4 (leaner)
            GROUND_HEIGHT_PERCENT = 0.12;
            PLAYER_SIZE_PERCENT = 0.11;
            OBSTACLE_MIN_PERCENT = 0.08;
            OBSTACLE_MAX_PERCENT = 0.11;
        }
    } else {
        // Squarer or Portrait
        GROUND_HEIGHT_PERCENT = 0.15;
        PLAYER_SIZE_PERCENT = 0.15;
        OBSTACLE_MIN_PERCENT = 0.10;
        OBSTACLE_MAX_PERCENT = 0.15;
    }

    // Ensure Ground is never too thin to see
    GROUND_HEIGHT = CANVAS_HEIGHT * GROUND_HEIGHT_PERCENT;
    if (isMobile) GROUND_HEIGHT = Math.max(GROUND_HEIGHT, 60);

    JUMP_FORCE = CANVAS_HEIGHT * JUMP_FORCE_CONSTANT;
    GRAVITY = CANVAS_HEIGHT * GRAVITY_CONSTANT;
}
calculateScale();

// Game State Enum
const GameState = {
    MENU: 0,
    PLAYING: 1,
    GAMEOVER: 2
};

// Game State
let currentState = GameState.MENU;
let gameSpeed = 5;
let score = 0;
let highScore = 0; // GLOBAL ONLY - Initialized by fetchLeaderboard
let highScoreBroken = false; // Track if we broke it this run
let highScoreAlertShown = false;
let frameCount = 0;
let gameTime = 0; // v1.8.6: "Simulated Frames" (Time-based accumulator)
let spawnFlags = { s2500: false, s4000: false, s5000: false }; // Prevent duplicate spawns
let lastExpertSpawnCheck = 0; // Track expert mode intervals
let timeSinceStart = 0; // Track time for speed increase

// --- In-App Browser Detection (v1.8.3) ---
function checkInAppBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    // Detect Instagram or Facebook (FBAN/FBAV)
    const isInApp = (ua.indexOf("Instagram") > -1) || (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1);

    // Explicit override for testing: ?forceInApp=true
    const urlParams = new URLSearchParams(window.location.search);
    if (isInApp || urlParams.get('forceInApp') === 'true') {
        const warningEl = document.getElementById('inapp-warning');
        const androidBtn = document.getElementById('android-open-btn');
        const iosInstr = document.querySelector('.ios-instruction');
        const closeBtn = document.getElementById('close-warning-btn');
        const isAndroid = /android/i.test(ua);
        const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;

        if (warningEl) {
            warningEl.classList.remove('hidden');

            // Logic per platform
            if (isAndroid) {
                // Android Deep Link Logic
                if (androidBtn) {
                    androidBtn.classList.remove('hidden');
                    androidBtn.onclick = () => {
                        // Attempt to force open Chrome
                        window.location.href = "googlechrome://rioracer.com";
                        // Fallback logic could go here but is tricky in JS
                    };
                }
            } else if (isIOS) {
                // iOS Instructions
                if (iosInstr) iosInstr.classList.remove('hidden');
            }

            // Dismiss button
            if (closeBtn) {
                closeBtn.onclick = () => {
                    warningEl.classList.add('hidden');
                };
            }
        }
    }
}

// Assets
const heroImg = new Image();
heroImg.src = 'graphics/hero.jpg';

const heroStartImg = new Image();
heroStartImg.src = 'graphics/hero_start.png';

// v1.7 Assets
const heroSuperImg = new Image();
heroSuperImg.src = 'graphics/hero_super.png'; // Super Hero

const goldenBoneImg = new Image();
goldenBoneImg.src = 'graphics/golden_bone.png'; // Power-up

const catImg = new Image();
catImg.src = 'graphics/obst_Cat.jpg';

const dogImg = new Image();
dogImg.src = 'graphics/obst_Dog.jpg';

const dog2Img = new Image();
dog2Img.src = 'graphics/obst_dog2.png';

const bgImg = new Image();
bgImg.src = 'graphics/background_seamless_v2.png';

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('hud');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highscore');
const startHighScoreEl = document.getElementById('start-highscore-value');
const highScoreAlert = document.getElementById('highscore-alert');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Leaderboard UI Elements
const newRecordSection = document.getElementById('new-record-section');
const playerNameInput = document.getElementById('player-name-input');
const submitScoreBtn = document.getElementById('submit-score-btn');
const leaderboardList = document.getElementById('leaderboard-list');

// --- Audio Controller ---
class AudioController {
    constructor() {
        this.ctx = null;
        this.enabled = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.enabled = true;
        }
    }

    playJump() {
        if (!this.enabled || !this.ctx) return;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(150, this.ctx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.start();
        oscillator.stop(this.ctx.currentTime + 0.1);
    }

    playDoubleJump() {
        if (!this.enabled || !this.ctx) return;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, this.ctx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.15);

        gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.start();
        oscillator.stop(this.ctx.currentTime + 0.15);
    }

    playFanfare() {
        if (!this.enabled || !this.ctx) return;

        // C Major Arpeggio Fanfare (C4, E4, G4, C5)
        const notes = [
            { freq: 523.25, time: 0.0, len: 0.1 }, // C5
            { freq: 659.25, time: 0.1, len: 0.1 }, // E5
            { freq: 783.99, time: 0.2, len: 0.1 }, // G5
            { freq: 1046.50, time: 0.3, len: 0.4 } // C6 (High finish!)
        ];

        notes.forEach(note => {
            const oscillator = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();

            oscillator.type = 'triangle'; // Brighter sound
            oscillator.frequency.value = note.freq;

            gainNode.gain.setValueAtTime(0.3, this.ctx.currentTime + note.time);
            gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + note.time + note.len);

            oscillator.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            oscillator.start(this.ctx.currentTime + note.time);
            oscillator.stop(this.ctx.currentTime + note.time + note.len);
        });
    }

    playCrash() {
        if (!this.enabled || !this.ctx) return;

        // Sarcastic "Wah Wah Wah" (Sad Trombone)
        const notes = [
            { freq: 440, time: 0.0, len: 0.4 }, // A4
            { freq: 415, time: 0.4, len: 0.4 }, // G#4
            { freq: 392, time: 0.8, len: 0.4 }, // G4
            { freq: 370, time: 1.2, len: 1.0 }  // F#4 (Long slide)
        ];

        notes.forEach((note, i) => {
            const oscillator = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();

            oscillator.type = 'sawtooth'; // Buzzy sound
            oscillator.frequency.value = note.freq;

            // Slide down on the last note
            if (i === notes.length - 1) {
                oscillator.frequency.linearRampToValueAtTime(note.freq - 50, this.ctx.currentTime + note.time + note.len);
            }

            gainNode.gain.setValueAtTime(0.2, this.ctx.currentTime + note.time);
            gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + note.time + note.len);

            oscillator.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            oscillator.start(this.ctx.currentTime + note.time);
            oscillator.stop(this.ctx.currentTime + note.time + note.len);
        });
    }

    playHighScore() {
        if (!this.enabled || !this.ctx) return;
        // Simple arpeggio
        const notes = [440, 554, 659, 880];
        notes.forEach((freq, i) => {
            const oscillator = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            let startTime = this.ctx.currentTime + (i * 0.1);

            oscillator.type = 'sine';
            oscillator.frequency.value = freq;

            gainNode.gain.setValueAtTime(0.1, startTime);
            gainNode.gain.linearRampToValueAtTime(0, startTime + 0.1);

            oscillator.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            oscillator.start(startTime);
            oscillator.stop(startTime + 0.1);
        });
    }

    // --- v1.7 Audio Upgrades ---

    playGoldenBone() {
        if (!this.enabled || !this.ctx) return;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        // Magical Ascending Tone (Triangle Wave)
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(400, this.ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.start();
        oscillator.stop(this.ctx.currentTime + 0.3);
    }

    playSuperSmash() {
        if (!this.enabled || !this.ctx) return;

        // 1. Crunchy Impact (Sawtooth Drop)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);

        oscGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        oscGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);

        // 2. Noise Burst (White Noise)
        const bufferSize = this.ctx.sampleRate * 0.2; // 0.2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        noiseGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);

        noise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start();
    }

    playClutch() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Fast "Ding"
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playPowerUpWarning() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Urgent Beep
        osc.type = 'square';
        osc.frequency.value = 880;

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playTransition() {
        if (!this.enabled || !this.ctx) return;

        // Cinematic "Whoosh" (Noise + Lowpass Filter)
        const duration = 1.0;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

}

const audio = new AudioController();

// --- Input Handling ---
class InputHandler {
    constructor() {
        this.jumpPressed = false;

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                this.jumpPressed = true;
                if (currentState === GameState.MENU) startGame();
                if (currentState === GameState.GAMEOVER && e.code === 'Space') {
                    // PREVENT ACCIDENTAL RESET: Only reset if name input is NOT visible
                    if (newRecordSection.classList.contains('hidden')) {
                        resetGame();
                    }
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                this.jumpPressed = false;
            }
        });

        window.addEventListener('touchstart', (e) => {
            // Ignore touches on button/input/link to allow interaction
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('a')) {
                return;
            }

            this.jumpPressed = true;
            if (currentState === GameState.MENU) startGame();

            if (currentState === GameState.GAMEOVER) {
                // Only reset if new record section is HIDDEN
                if (newRecordSection.classList.contains('hidden')) {
                    resetGame();
                }
            }
        });

        window.addEventListener('touchend', () => {
            this.jumpPressed = false;
        });

        // Mouse click for desktop testing without keyboard
        window.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('a')) return;

            this.jumpPressed = true;
            if (currentState === GameState.MENU) startGame();
        });
        window.addEventListener('mouseup', () => {
            this.jumpPressed = false;
        });
    }
}

// --- Player Class ---
class Player {
    constructor() {
        this.resize();
        this.x = CANVAS_WIDTH * 0.1; // 10% from left
        this.vy = 0;
        this.grounded = true;

        // Sprite animation (simple toggle or just static for now since we have 1 image)
        this.image = heroStartImg;

        this.jumpCount = 0; // Track jumps
        this.maxJumps = 2;

        // v1.7 Super Hero State
        this.isSuper = false;
        this.superTimer = 0;
    }

    resize() {
        this.height = CANVAS_HEIGHT * PLAYER_SIZE_PERCENT;
        this.width = this.height;
        if (this.grounded) {
            this.y = CANVAS_HEIGHT - GROUND_HEIGHT - this.height;
        }
    }

    update(input, timeScale) {
        // Super Hero Timer
        if (this.isSuper) {
            this.superTimer -= 1 * timeScale;
            if (this.superTimer <= 0) {
                this.isSuper = false;
                this.image = heroImg; // Revert to strong dog (or start dog)
                audio.playPowerUpWarning(); // Play end sound? Actually defined 'playPowerUpWarning' for last 2s
            }

            // Warning Beep last 120 frames (2s)
            if (this.superTimer > 0 && this.superTimer < 120 && Math.floor(this.superTimer) % 15 === 0) {
                audio.playPowerUpWarning();
            }

            // Trail Effect (Time-based: Every ~80ms or 5 frames at 60fps)
            if (gameTime % 5 < timeScale) {
                particles.createTrail(this.x, this.y + this.height / 2);
            }
        }

        // Jumping
        if (input.jumpPressed) {
            if (this.grounded) {
                // First Jump (Impulse, no timeScale)
                this.vy = JUMP_FORCE;
                this.grounded = false;
                this.jumpCount = 1;
                audio.playJump();
                input.jumpPressed = false; // Prevent holding
            } else if (this.jumpCount < this.maxJumps) {
                // Double Jump
                this.vy = JUMP_FORCE * 1.3;
                this.jumpCount++;
                audio.playDoubleJump();
                input.jumpPressed = false;
            }
        }

        // Apply Physics
        this.y += this.vy * timeScale;

        if (!this.grounded) {
            this.vy += GRAVITY * timeScale;
        }

        // Ground Collision
        const groundLevel = CANVAS_HEIGHT - GROUND_HEIGHT - this.height;
        if (this.y >= groundLevel) {
            this.y = groundLevel;
            this.vy = 0;
            this.grounded = true;
            this.jumpCount = 0; // Reset jumps
        }
    }

    transform() {
        this.isSuper = true;
        this.superTimer = 600; // 10 seconds at 60fps
        this.image = heroSuperImg;
        audio.playGoldenBone(); // Transformation sound

        // Burst Effect
        particles.createExplosion(this.x + this.width / 2, this.y + this.height / 2, 'gold');
        vfx.triggerShake(10, 20); // Big impact
    }

    draw() {
        // Draw image STRICT CHECK
        if (this.image.complete && this.image.naturalWidth > 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // Fallback
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// --- Background Class ---
class Background {
    constructor() {
        this.x = 0;
        this.width = 2400; // Will be set by image width likely, hardcoded fallback
    }

    update(timeScale) {
        // Scroll speed proportional to screen width
        let currentRealSpeed = (CANVAS_WIDTH * 0.005) * (gameSpeed / 5);

        this.x -= currentRealSpeed * 0.5 * timeScale; // Parallax effect

        if (this.x <= -this.width) {
            this.x = 0;
        }
    }

    draw() {
        if (bgImg.complete && bgImg.naturalWidth > 0) {
            // Calculate scale to fit height
            let scale = CANVAS_HEIGHT / bgImg.height;
            let scaledWidth = bgImg.width * scale;
            this.width = scaledWidth;

            // Rounding for background to prevent seam gaps or jitter
            const drawX = Math.floor(this.x);
            const drawW = Math.floor(this.width);

            // Calculate how many tiles we need to cover the screen
            // We need to cover CANVAS_WIDTH + the bit that scrolled off (Math.abs(this.x))
            // Since this.x is negative, we need ensures width * count > CANVAS_WIDTH - this.x
            let numTiles = Math.ceil(CANVAS_WIDTH / this.width) + 1;

            for (let i = 0; i < numTiles; i++) {
                ctx.drawImage(bgImg, drawX + (i * drawW), 0, drawW, CANVAS_HEIGHT);
            }

        } else {
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
    }
}

// --- Golden Bone Class ---
class GoldenBone {
    constructor() {
        this.width = 50;
        this.height = 30;
        this.x = CANVAS_WIDTH;
        this.y = CANVAS_HEIGHT - GROUND_HEIGHT - 150; // Higher up, requires jump
        this.markedForDeletion = false;

        // Sine wave movement (Floating)
        this.yOrigin = this.y;
        this.floatOffset = Math.random() * Math.PI * 2;
    }

    update(timeScale) {
        let currentRealSpeed = (CANVAS_WIDTH * 0.005) * (gameSpeed / 5);
        this.x -= currentRealSpeed * timeScale;

        // Floating effect
        this.y = this.yOrigin + Math.sin((Date.now() * 0.005) + this.floatOffset) * 20;

        if (this.x < -this.width) this.markedForDeletion = true;
    }

    draw() {
        if (goldenBoneImg.complete) {
            ctx.drawImage(goldenBoneImg, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'gold';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// --- Obstacle Class ---
class Obstacle {
    constructor(xOffset) {
        // Dynamic size based on scaling factors
        let sizeRange = OBSTACLE_MAX_PERCENT - OBSTACLE_MIN_PERCENT;
        let sizeFactor = CANVAS_HEIGHT * OBSTACLE_MIN_PERCENT + Math.random() * (CANVAS_HEIGHT * sizeRange);
        this.width = sizeFactor;
        this.height = sizeFactor;

        // Start exactly at screen edge + optional offset passed from spawner
        this.x = CANVAS_WIDTH + (xOffset || 0);

        // Align bottom with ground
        this.y = CANVAS_HEIGHT - GROUND_HEIGHT - this.height;
        this.markedForDeletion = false;

        // Randomly choose Cat, Dog, or Dog2
        const rand = Math.random();
        if (rand < 0.33) {
            this.type = 'cat';
            this.image = catImg;
        } else if (rand < 0.66) {
            this.type = 'dog';
            this.image = dogImg;
        } else {
            this.type = 'dog2';
            this.image = dog2Img;
        }

        // Speed variation relative to gameSpeed
        this.speedOffset = Math.random() * (CANVAS_WIDTH * 0.0005);
    }

    update(timeScale) {
        // Move left based on screen width percentage? 
        // gameSpeed is basically pixels per frame.
        // It should be proportional to screen width to keep "time to cross screen" constant.

        // Recalculate real speed
        let currentRealSpeed = (CANVAS_WIDTH * 0.005) * (gameSpeed / 5); // 0.5% width per frame at base speed

        this.x -= (currentRealSpeed + this.speedOffset) * timeScale;

        if (this.x < -this.width) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        // Round coordinates for sharper rendering and less browser interpolation jitter
        const drawX = Math.floor(this.x);
        const drawY = Math.floor(this.y);
        const drawW = Math.floor(this.width);
        const drawH = Math.floor(this.height);

        if (this.image.complete && this.image.naturalWidth > 0) {
            ctx.drawImage(this.image, drawX, drawY, drawW, drawH);
        } else {
            ctx.fillStyle = this.type === 'cat' ? 'orange' : 'brown';
            ctx.fillRect(drawX, drawY, drawW, drawH);
        }
    }
}

// --- v1.7 Visual FX System ---

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    createExplosion(x, y, color) {
        // Confetti Burst
        for (let i = 0; i < 60; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 1.5) * 15,
                life: 1.0, // 1 second
                color: color || `hsl(${Math.random() * 360}, 100%, 50%)`,
                size: Math.random() * 8 + 4,
                gravity: 0.5
            });
        }
    }

    createTrail(x, y) {
        // Super-Hero Trail
        this.particles.push({
            x: x,
            y: y,
            vx: -5, // Move left with world (approx)
            vy: (Math.random() - 0.5) * 2,
            life: 0.5,
            color: 'rgba(255, 215, 0, 0.8)', // Gold
            size: Math.random() * 5 + 2,
            gravity: 0,
            isTrail: true
        });
    }

    createFloatingText(x, y, text, color) {
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: -2, // Float up
            life: 2.0, // 2 seconds
            color: color || '#FFF',
            text: text,
            size: 30, // Font size
            gravity: 0,
            isText: true
        });
    }

    update(timeScale) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx * timeScale;
            p.y += p.vy * timeScale;
            p.vy += p.gravity * timeScale;
            p.life -= (p.isText ? 0.01 : 0.02) * timeScale; // Text lasts longer

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;

            if (p.isText) {
                ctx.font = `bold ${p.size}px Arial`;
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }
        });
        ctx.globalAlpha = 1.0;
    }
}

class VisualFX {
    constructor() {
        this.shakeTimer = 0;
        this.shakeMagnitude = 0;
    }

    triggerShake(magnitude, durationFrames) {
        this.shakeMagnitude = magnitude;
        this.shakeTimer = durationFrames;
    }

    apply(ctx) {
        if (this.shakeTimer > 0) {
            const dx = (Math.random() - 0.5) * this.shakeMagnitude;
            const dy = (Math.random() - 0.5) * this.shakeMagnitude;
            ctx.translate(dx, dy);
            this.shakeTimer--;
        }
    }

    reset(ctx) {
        // Reset transform is handled by clearRect/restore usually, 
        // but here we just need to ensure we don't accumulate offsets if using save/restore
        // In our main loop we clearRect, so translation persists? 
        // Actually animate() doesn't use save/restore on ctx globally.
        // We should reset translation manually if we moved it.
        if (this.shakeTimer > 0 || this.shakeMagnitude > 0) {
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Identity matrix
        }
    }

    drawSpeedLines(ctx) {
        if (gameSpeed > 20) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                const y = Math.random() * CANVAS_HEIGHT;
                const len = Math.random() * 200 + 50;
                ctx.beginPath();
                ctx.moveTo(CANVAS_WIDTH, y);
                ctx.lineTo(CANVAS_WIDTH - len, y);
                ctx.stroke();
            }
        }
    }
}

// --- Game Logic ---
const input = new InputHandler();
const player = new Player();
const background = new Background();
const particles = new ParticleSystem();
const vfx = new VisualFX();
let obstacles = [];
let powerups = []; // Golden Bone array

let spawnTimer = 0;
let nextSpawnDelay = 0; // Frames to wait

function handleObstacles(timeScale) {
    // Determine Jump Physics properties to calculate safe gap
    // Jump time (time in air) = 2 * vy / g. 
    // This is approximate because vy is initial velocity.
    // Note: Variables scale dynamically, so we calculate fresh.

    // Let's use the Values actually used in Player.update:
    let usedGravity = GRAVITY;
    let usedJumpForce = Math.abs(JUMP_FORCE);

    let timeInAir = (2 * usedJumpForce) / usedGravity; // frames

    // Horizontal distance covered during a full jump
    let currentRealSpeed = (CANVAS_WIDTH * 0.005) * (gameSpeed / 5);
    let jumpDistance = timeInAir * currentRealSpeed;

    // Safety buffer (user can't frame-perfect jump every time)
    let minSafeGap = jumpDistance * 1.5;

    // DIFFICULTY ESCALATION (Updated v1.7.2):
    // "Hard Mode": After 30 seconds (1800 frames) -> Multi-obstacles
    // "Expert Mode": After 1m 30s (5400 frames) -> "Chaos Patterns" & Faster Speed
    const hardModeTime = 1800;     // 30s
    const expertModeTime = 5400;   // 90s

    const isHardMode = gameTime > hardModeTime;
    const isExpertMode = gameTime > expertModeTime;

    // Spawning Strategy: Random timer + Distance Check
    // Spawning Strategy: Random timer + Distance Check
    spawnTimer += timeScale;

    if (spawnTimer > nextSpawnDelay) {
        // Time to try spawning
        let safeToSpawn = true;

        if (obstacles.length > 0) {
            let lastObs = obstacles[obstacles.length - 1];
            // Distance from right edge (where new one spawns) to last obstacle's right edge
            let distFromEdge = CANVAS_WIDTH - (lastObs.x + lastObs.width);

            // If the last obstacle is still too close to the edge, wait.
            // Using minSafeGap ensures we have room to land.
            if (distFromEdge < minSafeGap) {
                safeToSpawn = false;
            }
        }

        if (safeToSpawn) {
            // EXPERT MODE: "Chaos Patterns" (Randomized to prevent memorization)
            // 40% Chance of a complex pattern, otherwise single/double
            if (isExpertMode && Math.random() < 0.4) {
                const patternType = Math.random();

                if (patternType < 0.33) {
                    // PATTERN A: "The Gap Trap" (Jump -> Land -> Jump)
                    // Gap is sized to force a landing.
                    obstacles.push(new Obstacle(0));
                    const landingBuffer = jumpDistance * (1.1 + Math.random() * 0.3); // 1.1x - 1.4x gap
                    obstacles.push(new Obstacle(landingBuffer));
                }
                else if (patternType < 0.66) {
                    // PATTERN B: "The Triple Threat" (Rapid fire small jumps)
                    // 3 obstacles with tight, random spacing
                    let offset = 0;
                    for (let i = 0; i < 3; i++) {
                        obstacles.push(new Obstacle(offset));
                        offset += jumpDistance * (0.5 + Math.random() * 0.2); // 0.5x - 0.7x gap (Tight!)
                    }
                }
                else {
                    // PATTERN C: "The Fake-Out" (Long wait... then rapid pair)
                    // First obstacle... long pause... fast double
                    obstacles.push(new Obstacle(0));
                    const longGap = jumpDistance * 2.5;
                    obstacles.push(new Obstacle(longGap));
                    const tightGap = jumpDistance * 0.6;
                    obstacles.push(new Obstacle(longGap + tightGap));
                }
            }
            // HARD MODE: Spawn multiple consecutive obstacles (Double Jump Check)
            else if (isHardMode && Math.random() < 0.5) {
                // Spawn 2-3 obstacles in quick succession
                const count = Math.random() < 0.5 ? 2 : 3;

                let currentOffset = 0;
                for (let i = 0; i < count; i++) {
                    obstacles.push(new Obstacle(currentOffset));

                    // Randomize the gap for the NEXT one
                    // Range: 0.5 to 0.8 of jump distance (Varied spacing: Tight to Moderate)
                    const randomGap = jumpDistance * (0.5 + Math.random() * 0.3);
                    currentOffset += randomGap;
                }
            } else {
                // Normal single obstacle
                obstacles.push(new Obstacle());
            }

            spawnTimer = 0;
            // Delay Logic
            if (isExpertMode) {
                nextSpawnDelay = 30 + Math.random() * 30; // Extreme pace
            } else if (isHardMode) {
                nextSpawnDelay = 40 + Math.random() * 40; // Fast pace
            } else {
                nextSpawnDelay = 60 + Math.random() * 60; // Normal pace
            }
        }
    }

    // --- Power-Up Spawning (Expert Mode) ---
    // --- Power-Up Spawning (Scripted & Random) ---

    // 1. HARD MODE INTRO (Once Only) - @ ~42s (2500 frames)
    if (gameTime >= 2500 && !spawnFlags.s2500) {
        powerups.push(new GoldenBone());
        spawnFlags.s2500 = true;
    }

    // 2. UNPREDICTABLE PHASE (Twice) - @ ~66s (4000 frames) & ~83s (5000 frames)
    if (gameTime >= 4000 && !spawnFlags.s4000) {
        powerups.push(new GoldenBone());
        spawnFlags.s4000 = true;
    }
    if (gameTime >= 5000 && !spawnFlags.s5000) {
        powerups.push(new GoldenBone());
        spawnFlags.s5000 = true;
    }

    // 3. EXPERT MODE (Randomized) - After 90s
    if (isExpertMode) {
        let currentInterval = Math.floor(gameTime / 900);
        if (currentInterval > lastExpertSpawnCheck) {
            lastExpertSpawnCheck = currentInterval;
            if (Math.random() < 0.7) {
                powerups.push(new GoldenBone());
            }
        }
    }

    // Update & Collision: Power-Ups
    powerups.forEach(p => {
        p.update(timeScale);
        p.draw(); // Draw here or main loop? update() here is fine for now

        // Simple Collision
        if (
            player.x < p.x + p.width &&
            player.x + player.width > p.x &&
            player.y < p.y + p.height &&
            player.y + player.height > p.y
        ) {
            // Collected!
            p.markedForDeletion = true;
            player.transform();
        }
    });
    powerups = powerups.filter(p => !p.markedForDeletion);


    obstacles.forEach(obs => {
        obs.update(timeScale);
        obs.draw();

        // 1. Check "Broad Phase" (Zero Padding) - Are we close?
        const broadCollision =
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y;

        if (broadCollision) {
            // We are definitely interacting with the obstacle's volume

            // 2. Check "Narrow Phase" (Safe Padding) - Did we actually hit?
            const paddingX = obs.width * 0.3;
            const paddingY = obs.height * 0.3;

            const realCollision =
                player.x + paddingX < obs.x + obs.width - paddingX &&
                player.x + player.width - paddingX > obs.x + paddingX &&
                player.y + paddingY < obs.y + obs.height - paddingY &&
                player.y + player.height - paddingY > obs.y + paddingY;

            if (realCollision) {
                // HIT!
                if (player.isSuper) {
                    // Super Smash!
                    audio.playSuperSmash();
                    particles.createExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, 'orange');
                    vfx.triggerShake(5, 10);
                    obs.markedForDeletion = true; // Destroy it
                } else {
                    // Dead
                    gameOver();
                }
            } else {
                // NEAR MISS! We hit the broad box but missed the narrow box.
                // Limit frequency: only trigger if we haven't marked this specific obs as "missed" yet
                if (!obs.nearMissTriggered) {
                    audio.playClutch();
                    particles.createFloatingText(player.x, player.y - 20, "CLUTCH! +100", "#00FF00");
                    score += 100; // Bonus points
                    obs.nearMissTriggered = true;
                }
            }
        }
    });

    // OPTIMIZATION: In-place removal to avoid GC churn
    // obstacles = obstacles.filter(obs => !obs.markedForDeletion);
    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (obstacles[i].markedForDeletion) {
            obstacles.splice(i, 1);
        }
    }
}

function displayScore() {
    scoreEl.innerText = Math.floor(score);
}

// Difficulty Timer Accumulator
let difficultyTimer = 0;

function updateDifficulty(timeScale) {
    // Increase speed every 500 points
    score += 0.1 * timeScale; // Slow score increment consistent with time

    // Dynamic Hero Switch Logic
    // Only if we have a valid high score to beat (>0)
    if (highScore > 0 && score > highScore && !highScoreBroken) {
        highScoreBroken = true;
        player.image = heroImg; // Switch to "Strong" dog
        audio.playFanfare();

        // CELEBRATION EFFECTS
        highScoreAlert.innerText = "RECORD BROKEN!";
        highScoreAlert.style.color = "#00FFFF";
        highScoreAlert.style.transform = "scale(1.5)"; // Make it HUGE
        highScoreAlertShown = false;

        // Screen Flash
        document.body.classList.add('flash-animation');
        setTimeout(() => {
            document.body.classList.remove('flash-animation');
        }, 500);

        // v1.7 Confetti & Shockwave
        particles.createExplosion(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'cyan'); // Center burst
        particles.createExplosion(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'gold');  // Double burst
        vfx.triggerShake(15, 30); // Major impact shake
    }

    // Time-based Speed Increase
    // Accumulate time instead of frames
    difficultyTimer += timeScale;

    // 600 frames = 600 units of time (approx 10s)
    let speedThreshold = 600;
    if (score > 1000) speedThreshold = 420; // Expert Mode

    if (difficultyTimer >= speedThreshold) {
        gameSpeed += 1; // Progressive difficulty - no cap!
        difficultyTimer = 0;
    }
}

let isAnimating = false;

// --- Game Loop (Variable Time Step - Scaled, No Cap) ---
let lastTime = 0;
// const TARGET_FPS = 60; // Not used for capping anymore, just reference
const REFERENCE_FRAME_MS = 1000 / 60; // 16.66ms = 1.0 scale

function animate(currentTime) {
    if (!lastTime) lastTime = currentTime;
    let deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Safety Cap to prevent "Spiral of Death" on lag spikes (e.g. switching tabs)
    if (deltaTime > 100) deltaTime = 100;

    // --- OPTIMIZATION: Delta Snapping (v1.8.5) ---
    // Snap close-enough frames to perfect 60fps (16.66ms) to prevent micro-stutter
    // Range: 15ms (~66fps) to 18ms (~55fps)
    if (deltaTime > 15 && deltaTime < 18) {
        deltaTime = REFERENCE_FRAME_MS;
    }

    // Calculate Scale Factor (1.0 = 60fps, 0.5 = 120fps)
    const timeScale = deltaTime / REFERENCE_FRAME_MS;

    requestAnimationFrame(animate);

    // --- Logic Update ---
    isAnimating = true;

    // Explicit Orientation Check (JS Fallback for embedded browsers)
    const warningEl = document.getElementById('portrait-warning');
    if (window.innerWidth < window.innerHeight) {
        if (warningEl) warningEl.style.display = 'flex';
        // Pause logic if needed, but display block covers it
    } else {
        if (warningEl) warningEl.style.display = 'none';
    }

    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Apply Screen Shake
    ctx.save();
    vfx.apply(ctx);

    // Resize fix
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        CANVAS_WIDTH = window.innerWidth;
        CANVAS_HEIGHT = window.innerHeight;
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        calculateScale();
        player.resize();
    }

    if (currentState === GameState.PLAYING) {
        // Update Game State
        background.update(timeScale);
        player.update(input, timeScale);
        updateDifficulty(timeScale);

        particles.update(timeScale);
        // frameCount is still useful for discrete events, but we increment by scale?
        // Actually, let's keep frameCount as "simulation steps" logic or simple frames.
        // For events (like spawn checks), we used 'frameCount'.
        // If we run at 120fps, frameCount increases 2x unless we use time.
        // Let's use timeScale to increment a "simulatedFrameCount" if needed, 
        // OR just let frameCount run wild and rely on timers.
        // Simplest for now: Increment frameCount purely for "Total Frames Rendered" debugging,
        // but use global timers for events. 
        // NOTE: The spawn logic uses 'spawnTimer++'. We must scale that too.
        // See spawn logic below...
        // Simplest for now: Increment frameCount purely for "Total Frames Rendered" debugging,
        // but use global timers for events. 
        frameCount++;
        gameTime += timeScale; // Accumulate normalized time (60 units per second constantly)

        // Draw Background
        background.draw();

        // Sky Color Shift (Expert Mode)
        // using score as proxy for time is safer now
        // Sky Color Shift (Expert Mode)
        // Reverted to Time-based check (v1.8.6)
        if (gameTime > 5400) { // 90 seconds (normalized)
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = '#663399';
            ctx.globalAlpha = 0.3;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.restore();
        }

        // Draw Ground
        ctx.fillStyle = '#555';
        ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);

        // Dashed line 
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 5;
        ctx.setLineDash([40, 40]);
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT + 20);
        // (frameCount * speed) logic needs time scaling for position?
        // Actually this is just visual. (Date.now() / X) is smoother.
        let dashOffset = (Date.now() * (gameSpeed / 10)) % 80;
        ctx.lineTo(CANVAS_WIDTH + dashOffset, CANVAS_HEIGHT - GROUND_HEIGHT + 20);
        ctx.stroke();

        // Draw Player
        player.draw();

        // Handle Obstacles & Powerups
        handleObstacles(timeScale);

        // Draw Particles & FX
        particles.draw(ctx);
        vfx.drawSpeedLines(ctx);

        // UI
        displayScore();
    } else {
        // MENU or GAMEOVER: Draw static
        background.draw();
        ctx.fillStyle = '#555';
        ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
        player.draw();
        particles.draw(ctx);
    }

    ctx.restore(); // Restore transform (shake)
}

// Start the loop
if (!isAnimating) requestAnimationFrame(animate);

// --- Leaderboard Logic ---
// --- Leaderboard Logic ---
// Dynamic ref
let scoresCollectionRef = null;

let lowestTop10Score = 0;

async function fetchLeaderboard() {
    if (!firebaseLoaded || !db) return; // Silent fail if offline or loading

    try {
        const scoresRef = collection(db, "scores");
        const q = query(scoresRef, orderBy("score", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        leaderboardList.innerHTML = ""; // Clear existing
        let count = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `<span>${count + 1}. ${data.name}</span> <span>${data.score}</span>`;
            leaderboardList.appendChild(li);

            // Sync Start Screen & global variable with Global Best (Active score to beat)
            if (count === 0) {
                startHighScoreEl.innerText = `${data.score}`;
                highScore = data.score;
                highScoreEl.innerText = `${Math.floor(highScore)}`; // Sync HUD too
            }

            // Track the lowest score in the top 10
            if (count === querySnapshot.size - 1) {
                lowestTop10Score = data.score;
            }
            count++;
        });

        // If less than 10 players, any score > 0 is a top score
        if (count < 10) {
            lowestTop10Score = 0;
        }

    } catch (e) {
        console.error("Error fetching leaderboard:", e);
        leaderboardList.innerHTML = "<li>Error loading scores.</li>";
    }
}

async function submitScore() {
    const name = playerNameInput.value.trim() || "Anonymous";
    const newScore = Math.floor(score);

    if (newScore <= 0) return;

    if (!firebaseLoaded || !db) {
        alert("Cannot save score: Offline Mode");
        return;
    }

    try {
        submitScoreBtn.disabled = true;
        submitScoreBtn.innerText = "SAVING...";

        const scoresRef = collection(db, "scores");

        try {
            submitScoreBtn.disabled = true;
            submitScoreBtn.innerText = "SAVING...";

            const scoresRef = collection(db, "scores");
            const lowerName = name.toLowerCase();

            // 1. Check for normalized name (Future-proof)
            const qNorm = query(scoresRef, where("name_lowercase", "==", lowerName));
            const snapNorm = await getDocs(qNorm);

            let existingDoc = null;
            let isLegacy = false;

            if (!snapNorm.empty) {
                existingDoc = snapNorm.docs[0];
            } else {
                // 2. Legacy Fallback: Check for exact name match (e.g. "Samy" == "Samy")
                const qLegacy = query(scoresRef, where("name", "==", name));
                const snapLegacy = await getDocs(qLegacy);
                if (!snapLegacy.empty) {
                    existingDoc = snapLegacy.docs[0];
                    isLegacy = true;
                }
            }

            if (existingDoc) {
                const existingData = existingDoc.data();

                if (newScore > existingData.score) {
                    // New PB! Update Score AND Name (to update casing preference)
                    await updateDoc(existingDoc.ref, {
                        score: newScore,
                        timestamp: new Date(),
                        name: name, // Store latest preferred case
                        name_lowercase: lowerName // Ensure normalized field exists
                    });
                    localStorage.setItem('rioRacerPlayerName', name);
                } else {
                    // Lower score, but maybe we should update the normalized field for legacy docs?
                    // Optional: upgrade legacy doc even if score isn't beaten?
                    // User requirement: "store the name submitted latest IF his score is the higher"
                    // So strictly only update if score is higher.
                    console.log("Score lower than personal best. Retaining old score.");
                    if (isLegacy) {
                        // Silently modernize the doc so future lookups work? 
                        // No, "only his personal best will exist". 
                    }
                }
            } else {
                // New user
                await addDoc(scoresRef, {
                    name: name,
                    name_lowercase: lowerName,
                    score: newScore,
                    timestamp: new Date()
                });
                localStorage.setItem('rioRacerPlayerName', name);
            }

            // Success (UI feedback)
            newRecordSection.classList.add('hidden'); // Hide input
            fetchLeaderboard(); // Refresh list

        } catch (e) {
            console.error("Error saving score:", e);
            submitScoreBtn.innerText = "ERROR";
            submitScoreBtn.disabled = false;
        }

    } catch (e) {
        console.error("Error saving score:", e);
        submitScoreBtn.innerText = "ERROR";
        submitScoreBtn.disabled = false;
    }
}

// Bind Submit Button
submitScoreBtn.addEventListener('click', submitScore);

// Allow Enter key to submit
playerNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitScore();
});

// Initialize
// Initialize called in initFirebase
// fetchLeaderboard();

function startGame() {
    audio.init();

    currentState = GameState.PLAYING;
    startScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    // Ensure HUD shows current high score
    highScoreEl.innerText = Math.floor(highScore);

    gameSpeed = 8;
    score = 0;
    highScoreBroken = false;
    highScoreAlertShown = false;
    highScoreAlert.innerText = "NEW HIGH SCORE!";
    highScoreAlert.style.color = "yellow";

    // Reset Hero Image
    player.image = heroStartImg;

    obstacles = [];
    frameCount = 0;
    gameTime = 0;
}

function gameOver() {
    currentState = GameState.GAMEOVER;
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');

    finalScoreEl.innerText = "Score: " + Math.floor(score);
    audio.playCrash();

    // Hide input by default
    newRecordSection.classList.add('hidden');

    // Strict Global Score: No Local Storage Update needed.
    // We only care if we made the Top 10 list.

    // Check if score qualifies for Top 10
    // If we have less than 10 scores OR score > lowestTop10Score
    const currentScore = Math.floor(score);
    if (currentScore > 0 && currentScore >= lowestTop10Score) {
        newRecordSection.classList.remove('hidden');
        playerNameInput.value = localStorage.getItem('rioRacerPlayerName') || "";
        submitScoreBtn.disabled = false;
        submitScoreBtn.innerText = "SAVE";
        audio.playHighScore(); // Play happy sound
    } else {
        // Just refresh leaderboard to be sure
        fetchLeaderboard();
    }

    startHighScoreEl.innerText = `${Math.floor(highScore)}`;
}

function resetGame() {
    currentState = GameState.MENU;
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    startHighScoreEl.innerText = `${Math.floor(highScore)}`;

    // Reset player
    player.y = CANVAS_HEIGHT - GROUND_HEIGHT - player.height;
    player.vy = 0;

    // Initial state is handled by the persistent animate loop
    fetchLeaderboard(); // Refresh
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);
// === Event Listeners ===
// v1.9: About Modal & Share
const aboutModal = document.getElementById('about-modal');
const infoBtn = document.getElementById('info-btn');
const closeAboutBtn = document.getElementById('close-about-btn');
const shareBtn = document.getElementById('share-btn');

infoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    aboutModal.classList.remove('hidden');
});

closeAboutBtn.addEventListener('click', () => {
    aboutModal.classList.add('hidden');
});

// Close modal when clicking outside content
aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
        aboutModal.classList.add('hidden');
    }
});

// Web Share API
shareBtn.addEventListener('click', async () => {
    const shareData = {
        title: 'RioRacer - Dog vs. Street',
        text: `I just scored {Math.floor(score)} in RioRacer! Can you beat me?`,
        url: 'https://rioracer.com'
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
            console.log('Shared successfully');
        } else {
            // Fallback: Copy to clipboard
            const shareText = `{shareData.text} {shareData.url}`;
            await navigator.clipboard.writeText(shareText);
            alert('Score copied to clipboard! Paste it to share.');
        }
    } catch (err) {
        console.log('Error sharing:', err);
    }
});
startBtn.addEventListener('click', resetGame);

// Removed Reset Local Score Button Logic

// Initial Draw & Setup
// startHighScoreEl value is set by fetchLeaderboard
calculateScale();

// === Online Only Enforcement (v1.9.4) ===
function checkConnectivity() {
    const offlineScreen = document.getElementById('offline-screen');
    const startButton = document.getElementById('start-btn');
    const restartButton = document.getElementById('restart-btn');

    if (!navigator.onLine) {
        // Offline
        if (offlineScreen) offlineScreen.classList.remove('hidden');
        if (startButton) startButton.disabled = true;
        if (restartButton) restartButton.disabled = true;
        console.log('Connection Lost - Game Blocked');
    } else {
        // Online
        if (offlineScreen) offlineScreen.classList.add('hidden');
        if (startButton) startButton.disabled = false;
        if (restartButton) restartButton.disabled = false;
        console.log('Connection Restored');
    }
}

window.addEventListener('online', checkConnectivity);
window.addEventListener('offline', checkConnectivity);
checkConnectivity(); // Initial check
checkInAppBrowser(); // Run Detection
player.resize();
background.draw();
ctx.fillStyle = '#555';
ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
player.draw();
highScoreEl.innerText = Math.floor(highScore);

// Start Loop
requestAnimationFrame(animate);
// Force Re-deploy v1.7.3 (GitHub Actions Trigger)
