/**
 * RioRacer v2.0.0 - Neo-Tokyo 3D ("Dog vs. Street" Major Release)
 * Preserves v1.9.20 classic gameplay DNA, characters, audio, and Firebase global leaderboard
 * while elevating the experience to a 3D cel-shaded Japanese anime third-person runner.
 */

import { Engine3D } from './src/engine3d.js?v=2.0.1';
import {
    createRioMesh,
    animateRioMesh,
    createObstacleMesh,
    createGoldenBoneMesh
} from './src/models3d.js?v=2.0.1';
import { NeoTokyoWorld, LANE_X, LANE_WIDTH } from './src/world3d.js?v=2.0.1';
import { VFXSystem3D } from './src/vfx3d.js?v=2.0.1';

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
        const firebaseApp = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
        const firebaseFirestore = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        const firebaseAnalytics = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js");

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

        app = initializeApp(firebaseConfig);
        analytics = getAnalytics(app);
        db = getFirestore(app);

        firebaseLoaded = true;
        console.log("Firebase initialized successfully.");
        fetchLeaderboard();
    } catch (e) {
        console.warn("Firebase failed to load. Running in Offline Mode.", e);
        const lbList = document.getElementById('leaderboard-list');
        if (lbList) lbList.innerHTML = "<li>Offline Mode (Scores disabled)</li>";
    }
}

if (window.requestIdleCallback) {
    window.requestIdleCallback(() => initFirebase());
} else {
    setTimeout(() => initFirebase(), 500);
}

// --- Game State & Constants ---
const GameState = {
    MENU: 0,
    PLAYING: 1,
    GAMEOVER: 2
};

let currentState = GameState.MENU;
let gameSpeed = 8;
let score = 0;
let highScore = 0;
let highScoreBroken = false;
let highScoreAlertShown = false;
let frameCount = 0;
let gameTime = 0;
let spawnFlags = { s2500: false, s4000: false, s5000: false };
let lastExpertSpawnCheck = 0;
let difficultyTimer = 0;

// 3D Physics Constants (Calibrated to match classic jump duration ~38 frames)
const JUMP_VELOCITY_3D = 0.36;
const GRAVITY_3D = 0.019;
const BASE_WORLD_SPEED_Z = 0.58; // Units per normalized frame at gameSpeed = 8

// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
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
const modeBadgeEl = document.getElementById('mode-badge');
const superBarContainer = document.getElementById('super-bar-container');
const superBarFill = document.getElementById('super-bar-fill');
const speedLinesOverlay = document.getElementById('anime-speedlines');

// Leaderboard UI Elements
const newRecordSection = document.getElementById('new-record-section');
const playerNameInput = document.getElementById('player-name-input');
const submitScoreBtn = document.getElementById('submit-score-btn');
const recordErrorMsg = document.getElementById('record-error-msg');
const leaderboardList = document.getElementById('leaderboard-list');

// --- Initialize 3D Engine, Neo-Tokyo World & VFX ---
const engine3d = new Engine3D(canvas);
const world3d = new NeoTokyoWorld(engine3d.scene);
const vfx = new VFXSystem3D(engine3d.scene);

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
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playJump() {
        if (!this.enabled || !this.ctx) return;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(160, this.ctx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(620, this.ctx.currentTime + 0.11);

        gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.11);

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        oscillator.start();
        oscillator.stop(this.ctx.currentTime + 0.11);
    }

    playDoubleJump() {
        if (!this.enabled || !this.ctx) return;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(320, this.ctx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(860, this.ctx.currentTime + 0.15);

        gainNode.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        oscillator.start();
        oscillator.stop(this.ctx.currentTime + 0.15);
    }

    playLaneDash() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(240, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playFanfare() {
        if (!this.enabled || !this.ctx) return;
        const notes = [
            { freq: 523.25, time: 0.0, len: 0.1 },
            { freq: 659.25, time: 0.1, len: 0.1 },
            { freq: 783.99, time: 0.2, len: 0.1 },
            { freq: 1046.50, time: 0.3, len: 0.4 }
        ];
        notes.forEach(note => {
            const oscillator = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            oscillator.type = 'triangle';
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
        const notes = [
            { freq: 440, time: 0.0, len: 0.35 },
            { freq: 415, time: 0.35, len: 0.35 },
            { freq: 392, time: 0.7, len: 0.35 },
            { freq: 370, time: 1.05, len: 0.85 }
        ];
        notes.forEach((note, i) => {
            const oscillator = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            oscillator.type = 'sawtooth';
            oscillator.frequency.value = note.freq;
            if (i === notes.length - 1) {
                oscillator.frequency.linearRampToValueAtTime(note.freq - 50, this.ctx.currentTime + note.time + note.len);
            }
            gainNode.gain.setValueAtTime(0.18, this.ctx.currentTime + note.time);
            gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + note.time + note.len);
            oscillator.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            oscillator.start(this.ctx.currentTime + note.time);
            oscillator.stop(this.ctx.currentTime + note.time + note.len);
        });
    }

    playHighScore() {
        if (!this.enabled || !this.ctx) return;
        const notes = [440, 554, 659, 880];
        notes.forEach((freq, i) => {
            const oscillator = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            const startTime = this.ctx.currentTime + (i * 0.1);
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

    playGoldenBone() {
        if (!this.enabled || !this.ctx) return;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
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
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);
        oscGain.gain.setValueAtTime(0.38, this.ctx.currentTime);
        oscGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);

        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.28, this.ctx.currentTime);
        noiseGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
        noise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start();
    }

    playClutch() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
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
        osc.type = 'square';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }
}

const audio = new AudioController();

// --- Input Handler (3-Lane Weaving + Single/Double Jump) ---
class InputHandler {
    constructor() {
        this.jumpPressed = false;
        this.laneDelta = 0;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeHandled = false;

        window.addEventListener('keydown', (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault();
                this.jumpPressed = true;
                if (currentState === GameState.MENU) startGame();
            } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                e.preventDefault();
                if (currentState === GameState.PLAYING) this.laneDelta = -1;
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                e.preventDefault();
                if (currentState === GameState.PLAYING) this.laneDelta = 1;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                this.jumpPressed = false;
            }
        });

        // Touch gestures (Swipe Left/Right for lanes, Swipe Up or Tap for Jump)
        window.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('a') || e.target.closest('#touch-controls')) {
                return;
            }
            if (e.touches && e.touches.length > 0) {
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
                this.swipeHandled = false;
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (this.swipeHandled || currentState !== GameState.PLAYING || !e.touches || e.touches.length === 0) return;
            const dx = e.touches[0].clientX - this.touchStartX;
            const dy = e.touches[0].clientY - this.touchStartY;

            if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) {
                this.laneDelta = dx > 0 ? 1 : -1;
                this.swipeHandled = true;
            } else if (dy < -32 && Math.abs(dy) > Math.abs(dx)) {
                this.jumpPressed = true;
                this.swipeHandled = true;
            }
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('a') || e.target.closest('#touch-controls')) {
                return;
            }
            if (!this.swipeHandled) {
                this.jumpPressed = true;
                if (currentState === GameState.MENU) startGame();
            }
        });

        // HUD Quick Touch Buttons
        const btnLeft = document.getElementById('btn-lane-left');
        const btnRight = document.getElementById('btn-lane-right');
        const btnJump = document.getElementById('btn-jump');

        if (btnLeft) {
            btnLeft.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                if (currentState === GameState.PLAYING) this.laneDelta = -1;
            });
        }
        if (btnRight) {
            btnRight.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                if (currentState === GameState.PLAYING) this.laneDelta = 1;
            });
        }
        if (btnJump) {
            btnJump.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                if (currentState === GameState.PLAYING) this.jumpPressed = true;
            });
        }

        // Mouse click on canvas (desktop testing)
        canvas.addEventListener('mousedown', () => {
            if (currentState === GameState.PLAYING) {
                this.jumpPressed = true;
            }
        });
    }
}

// --- 3D Player Class (Rio) ---
class Player3D {
    constructor(scene) {
        this.scene = scene;
        this.mesh = createRioMesh();
        this.scene.add(this.mesh);
        this.reset();
    }

    reset() {
        this.laneIndex = 1; // 0 = Left, 1 = Center, 2 = Right
        this.x = LANE_X[1];
        this.y = 0;
        this.z = 0;
        this.vy = 0;
        this.grounded = true;
        this.jumpCount = 0;
        this.maxJumps = 2;

        this.isSuper = false;
        this.superTimer = 0;
        this.superMaxTime = 600; // 10 seconds at 60fps

        this.mesh.position.set(this.x, this.y, this.z);
        this.mesh.userData.setSuperMode(false);
        this.mesh.userData.setOverdriveMode(false);
        if (superBarContainer) superBarContainer.classList.add('hidden');
    }

    switchLane(delta) {
        const nextLane = Math.max(0, Math.min(2, this.laneIndex + delta));
        if (nextLane !== this.laneIndex) {
            this.laneIndex = nextLane;
            audio.playLaneDash();
            vfx.createTrail(this.x, this.y + 0.7, this.z, this.isSuper);
        }
    }

    triggerJump() {
        if (this.grounded) {
            this.vy = JUMP_VELOCITY_3D;
            this.grounded = false;
            this.jumpCount = 1;
            audio.playJump();
            return true;
        } else if (this.jumpCount < this.maxJumps) {
            this.vy = JUMP_VELOCITY_3D * 1.28;
            this.jumpCount++;
            audio.playDoubleJump();
            vfx.createTrail(this.x, this.y + 0.6, this.z, true);
            return true;
        }
        return false;
    }

    update(input, timeScale) {
        // Lane Change Input
        if (input.laneDelta !== 0) {
            this.switchLane(input.laneDelta);
            input.laneDelta = 0;
        }

        // Smooth Lateral Interpolation to Target Lane
        const targetX = LANE_X[this.laneIndex];
        const prevX = this.x;
        this.x += (targetX - this.x) * Math.min(1, 0.26 * timeScale);
        const laneVelocityX = (this.x - prevX) / Math.max(timeScale, 0.1);

        // Super Rio Timer & HUD Gauge
        if (this.isSuper) {
            this.superTimer -= timeScale;
            if (superBarFill) {
                const pct = Math.max(0, (this.superTimer / this.superMaxTime) * 100);
                superBarFill.style.width = `${pct}%`;
            }

            if (this.superTimer <= 0) {
                this.isSuper = false;
                this.mesh.userData.setSuperMode(false);
                if (superBarContainer) superBarContainer.classList.add('hidden');
                audio.playPowerUpWarning();
            } else if (this.superTimer < 120 && Math.floor(this.superTimer) % 18 === 0) {
                audio.playPowerUpWarning();
            }

            if (gameTime % 4 < timeScale) {
                vfx.createTrail(this.x, this.y + 0.85, this.z, true);
            }
        }

        // Jump & Double-Jump Input
        if (input.jumpPressed) {
            this.triggerJump();
            input.jumpPressed = false;
        }

        // Vertical Physics
        this.y += this.vy * timeScale;
        if (!this.grounded) {
            this.vy -= GRAVITY_3D * timeScale;
        }

        if (this.y <= 0) {
            this.y = 0;
            this.vy = 0;
            this.grounded = true;
            this.jumpCount = 0;
        }

        this.mesh.position.set(this.x, this.y, this.z);

        // Update 3D Articulated Animation
        animateRioMesh(this.mesh, {
            timeScale,
            gameSpeed,
            grounded: this.grounded,
            vy: this.vy,
            jumpCount: this.jumpCount,
            laneVelocityX
        });
    }

    transform() {
        this.isSuper = true;
        this.superTimer = this.superMaxTime;
        this.mesh.userData.setSuperMode(true);
        if (superBarContainer) superBarContainer.classList.remove('hidden');
        if (superBarFill) superBarFill.style.width = '100%';

        audio.playGoldenBone();
        vfx.createExplosion(this.x, this.y + 1.0, this.z, 'gold');
        vfx.createFloatingText('⚡ SUPER RIO OVERDRIVE!', '#ffd700');
        vfx.triggerShake(0.45, 22);
    }
}

// --- 3D Golden Bone Power-Up ---
class GoldenBone3D {
    constructor(scene, laneIndex = 1, zOffset = 0) {
        this.scene = scene;
        this.laneIndex = laneIndex;
        this.x = LANE_X[laneIndex];
        this.yOrigin = 2.4; // Elevated so player jumps to grab it
        this.y = this.yOrigin;
        this.z = -115 - zOffset;
        this.floatPhase = Math.random() * Math.PI * 2;
        this.markedForDeletion = false;

        this.mesh = createGoldenBoneMesh();
        this.mesh.position.set(this.x, this.y, this.z);
        this.scene.add(this.mesh);
    }

    update(worldSpeedZ, timeScale) {
        this.z += worldSpeedZ * timeScale;
        this.floatPhase += 0.08 * timeScale;
        this.y = this.yOrigin + Math.sin(this.floatPhase) * 0.45;

        this.mesh.position.set(this.x, this.y, this.z);
        this.mesh.userData.boneGroup.rotation.y += 0.07 * timeScale;
        this.mesh.userData.holoRing.rotation.x += 0.05 * timeScale;
        this.mesh.userData.holoRing.rotation.y += 0.04 * timeScale;

        if (this.z > 14) {
            this.destroy();
        }
    }

    destroy() {
        if (!this.markedForDeletion) {
            this.markedForDeletion = true;
            this.scene.remove(this.mesh);
        }
    }
}

// --- 3D Obstacle Rival ---
class Obstacle3D {
    constructor(scene, laneIndex, zOffset = 0, forcedType = null) {
        this.scene = scene;
        this.laneIndex = laneIndex;
        this.x = LANE_X[laneIndex];
        this.y = 0;
        this.z = -118 - zOffset;
        this.markedForDeletion = false;
        this.nearMissTriggered = false;

        const rand = Math.random();
        this.type = forcedType || (rand < 0.34 ? 'cat' : (rand < 0.67 ? 'dog' : 'dog2'));

        // Physical collision dimensions in 3D space
        if (this.type === 'cat') {
            this.hitWidth = 1.45;
            this.hitHeight = 1.35;
            this.hitDepth = 1.5;
        } else if (this.type === 'dog') {
            this.hitWidth = 1.65;
            this.hitHeight = 1.55;
            this.hitDepth = 1.75;
        } else {
            // Buff Bulldog ('dog2')
            this.hitWidth = 1.85;
            this.hitHeight = 1.85;
            this.hitDepth = 1.8;
        }

        this.speedOffset = Math.random() * 0.04;
        this.mesh = createObstacleMesh(this.type);
        this.mesh.position.set(this.x, this.y, this.z);
        this.scene.add(this.mesh);
    }

    update(worldSpeedZ, timeScale) {
        this.z += (worldSpeedZ + this.speedOffset) * timeScale;

        // Subtle animated bounce & tail wag as rivals charge down the highway
        const phase = (this.mesh.userData.animPhase += 0.18 * timeScale);
        this.mesh.position.set(this.x, Math.abs(Math.sin(phase)) * 0.12, this.z);
        if (this.mesh.userData.tail) {
            this.mesh.userData.tail.rotation.z = Math.sin(phase * 1.4) * 0.35;
        }

        if (this.z > 14) {
            this.destroy();
        }
    }

    destroy() {
        if (!this.markedForDeletion) {
            this.markedForDeletion = true;
            this.scene.remove(this.mesh);
        }
    }
}

// --- Instantiate Core Entities ---
const input = new InputHandler();
const player = new Player3D(engine3d.scene);
let obstacles = [];
let powerups = [];
let spawnTimer = 0;
let nextSpawnDelay = 45;

function getWorldSpeedZ() {
    return BASE_WORLD_SPEED_Z * (gameSpeed / 8);
}

/**
 * Spawns a single row of 1, 2, or 3 obstacles across the 3 lanes at a given zOffset
 */
function spawnObstacleWave(zOffset = 0, laneCount = 1) {
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(laneCount, 3); i++) {
        obstacles.push(new Obstacle3D(engine3d.scene, lanes[i], zOffset));
    }
}

function handleObstacles3D(timeScale) {
    const worldSpeedZ = getWorldSpeedZ();
    // Distance covered in Z during one full single jump (~38 frames)
    const jumpAirFrames = (2 * JUMP_VELOCITY_3D) / GRAVITY_3D;
    const jumpDistanceZ = jumpAirFrames * worldSpeedZ;
    const minSafeGapZ = jumpDistanceZ * 1.25;

    const hardModeTime = 1800;   // 30s
    const expertModeTime = 5400; // 90s

    const isHardMode = gameTime > hardModeTime;
    const isExpertMode = gameTime > expertModeTime;

    spawnTimer += timeScale;

    if (spawnTimer > nextSpawnDelay) {
        let safeToSpawn = true;
        if (obstacles.length > 0) {
            // Find the obstacle farthest back (most negative Z)
            let minZ = 0;
            for (const obs of obstacles) {
                if (obs.z < minZ) minZ = obs.z;
            }
            const distFromSpawnEdge = Math.abs(-118 - minZ);
            if (distFromSpawnEdge < minSafeGapZ * 0.85) {
                safeToSpawn = false;
            }
        }

        if (safeToSpawn) {
            if (isExpertMode && Math.random() < 0.45) {
                // EXPERT MODE: 3D Chaos Patterns ("The Timmy Special")
                const patternType = Math.random();
                if (patternType < 0.34) {
                    // PATTERN A: "The Gap Trap" (3-lane barrier -> Landing gap -> 3-lane barrier)
                    spawnObstacleWave(0, 3);
                    const landingGap = jumpDistanceZ * (1.15 + Math.random() * 0.25);
                    spawnObstacleWave(landingGap, 3);
                } else if (patternType < 0.67) {
                    // PATTERN B: "The Triple Threat" (3 rapid staggered waves across lanes)
                    let offset = 0;
                    for (let i = 0; i < 3; i++) {
                        spawnObstacleWave(offset, 2);
                        offset += jumpDistanceZ * (0.55 + Math.random() * 0.2);
                    }
                } else {
                    // PATTERN C: "The Fake-Out" (Wave -> calm gap -> sudden double wave)
                    spawnObstacleWave(0, 2);
                    const longGap = jumpDistanceZ * 2.1;
                    spawnObstacleWave(longGap, 2);
                    spawnObstacleWave(longGap + jumpDistanceZ * 0.6, 3);
                }
            } else if (isHardMode && Math.random() < 0.55) {
                // HARD MODE: Multi-wave sequences + 2-lane blockades
                const waveCount = Math.random() < 0.5 ? 2 : 3;
                let offset = 0;
                for (let i = 0; i < waveCount; i++) {
                    const blockedLanes = Math.random() < 0.65 ? 2 : 1;
                    spawnObstacleWave(offset, blockedLanes);
                    offset += jumpDistanceZ * (0.58 + Math.random() * 0.28);
                }
            } else {
                // NORMAL MODE: 1 or 2 lanes blocked (prioritize player's current lane 60% of the time to keep action engaging)
                if (Math.random() < 0.35) {
                    spawnObstacleWave(0, 2);
                } else {
                    const targetLane = Math.random() < 0.6 ? player.laneIndex : Math.floor(Math.random() * 3);
                    obstacles.push(new Obstacle3D(engine3d.scene, targetLane, 0));
                }
            }

            spawnTimer = 0;
            if (isExpertMode) {
                nextSpawnDelay = 26 + Math.random() * 24;
            } else if (isHardMode) {
                nextSpawnDelay = 34 + Math.random() * 30;
            } else {
                nextSpawnDelay = 46 + Math.random() * 38;
            }
        }
    }

    // --- Power-Up Spawning (Scripted & Random) ---
    if (gameTime >= 2500 && !spawnFlags.s2500) {
        powerups.push(new GoldenBone3D(engine3d.scene, player.laneIndex, 0));
        spawnFlags.s2500 = true;
    }
    if (gameTime >= 4000 && !spawnFlags.s4000) {
        powerups.push(new GoldenBone3D(engine3d.scene, Math.floor(Math.random() * 3), 0));
        spawnFlags.s4000 = true;
    }
    if (gameTime >= 5000 && !spawnFlags.s5000) {
        powerups.push(new GoldenBone3D(engine3d.scene, Math.floor(Math.random() * 3), 0));
        spawnFlags.s5000 = true;
    }
    if (isExpertMode) {
        const currentInterval = Math.floor(gameTime / 900);
        if (currentInterval > lastExpertSpawnCheck) {
            lastExpertSpawnCheck = currentInterval;
            if (Math.random() < 0.75) {
                powerups.push(new GoldenBone3D(engine3d.scene, Math.floor(Math.random() * 3), 0));
            }
        }
    }

    // Update & Check Collisions for Golden Bones
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.update(worldSpeedZ, timeScale);

        const dx = Math.abs(player.x - p.x);
        const dy = Math.abs((player.y + 0.9) - p.y);
        const dz = Math.abs(player.z - p.z);

        if (dx < 1.35 && dy < 1.45 && dz < 1.45) {
            p.destroy();
            player.transform();
        }

        if (p.markedForDeletion) {
            powerups.splice(i, 1);
        }
    }

    // Update & Check Collisions for 3D Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.update(worldSpeedZ, timeScale);

        const dx = Math.abs(player.x - obs.x);
        const dz = Math.abs(player.z - obs.z);
        const playerBottomY = player.y;

        // 1. Broad Phase (Near-Miss / Grazing Zone in 3D)
        const broadCollision =
            dx < (obs.hitWidth * 0.72 + 0.55) &&
            dz < (obs.hitDepth * 0.65 + 0.55) &&
            playerBottomY < (obs.hitHeight + 0.45);

        if (broadCollision) {
            // 2. Narrow Phase (30% Padded Fair Hitbox)
            const narrowCollision =
                dx < obs.hitWidth * 0.48 &&
                dz < obs.hitDepth * 0.45 &&
                playerBottomY < obs.hitHeight * 0.72;

            if (narrowCollision) {
                if (player.isSuper) {
                    // SUPER SMASH!
                    audio.playSuperSmash();
                    vfx.createExplosion(obs.x, 1.0, obs.z, 'orange');
                    vfx.createFloatingText('💥 SUPER SMASH! +50', '#ff9f1c');
                    vfx.triggerShake(0.35, 12);
                    score += 50;
                    obs.destroy();
                } else {
                    vfx.createExplosion(player.x, player.y + 0.8, player.z, 'orange');
                    vfx.triggerShake(0.55, 24);
                    gameOver();
                    return;
                }
            } else if (!obs.nearMissTriggered) {
                // NEAR MISS ("CLUTCH! +100")
                audio.playClutch();
                vfx.createFloatingText('⚡ CLUTCH! +100', '#00f0ff');
                score += 100;
                obs.nearMissTriggered = true;
            }
        }

        if (obs.markedForDeletion) {
            obstacles.splice(i, 1);
        }
    }
}

function updateDifficulty(timeScale) {
    score += 0.1 * timeScale;
    scoreEl.innerText = Math.floor(score);

    // Dynamic Record-Breaker Overdrive Switch
    if (highScore > 0 && score > highScore && !highScoreBroken) {
        highScoreBroken = true;
        player.mesh.userData.setOverdriveMode(true);
        audio.playFanfare();

        if (highScoreAlert) {
            highScoreAlert.classList.remove('hidden');
            highScoreAlert.innerText = "RECORD BROKEN!";
            highScoreAlert.style.color = "#00f0ff";
        }

        document.body.classList.add('flash-animation');
        setTimeout(() => document.body.classList.remove('flash-animation'), 500);

        vfx.createExplosion(player.x, player.y + 1.5, player.z - 2, 'cyan');
        vfx.createExplosion(player.x, player.y + 1.5, player.z - 2, 'gold');
        vfx.createFloatingText('🏆 NEW GLOBAL RECORD!', '#00f0ff');
        vfx.triggerShake(0.5, 28);
    }

    // HUD Mode Badge & Speed Lines Update
    const isHardMode = gameTime > 1800;
    const isExpertMode = gameTime > 5400;

    if (modeBadgeEl) {
        if (isExpertMode) {
            modeBadgeEl.innerText = 'STAGE 03 // EXPERT CHAOS 超級';
            modeBadgeEl.className = 'mode-expert';
        } else if (isHardMode) {
            modeBadgeEl.innerText = 'STAGE 02 // HARD OVERDRIVE';
            modeBadgeEl.className = 'mode-hard';
        } else {
            modeBadgeEl.innerText = 'STAGE 01 // NEO-STREET';
            modeBadgeEl.className = 'mode-normal';
        }
    }

    if (speedLinesOverlay) {
        if (gameSpeed >= 13 || player.isSuper || isExpertMode) {
            speedLinesOverlay.classList.remove('hidden');
        } else {
            speedLinesOverlay.classList.add('hidden');
        }
    }

    difficultyTimer += timeScale;
    const speedThreshold = score > 1000 ? 420 : 600;
    if (difficultyTimer >= speedThreshold) {
        gameSpeed += 1;
        difficultyTimer = 0;
    }
}

// --- Main Animation Loop ---
let lastTime = 0;
const REFERENCE_FRAME_MS = 1000 / 60;

function animate(currentTime) {
    if (!lastTime) lastTime = currentTime;
    let deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    if (deltaTime > 100) deltaTime = 100;
    if (deltaTime > 15 && deltaTime < 18) deltaTime = REFERENCE_FRAME_MS;

    const timeScale = deltaTime / REFERENCE_FRAME_MS;
    requestAnimationFrame(animate);

    const isHardMode = gameTime > 1800;
    const isExpertMode = gameTime > 5400;

    if (currentState === GameState.PLAYING) {
        frameCount++;
        gameTime += timeScale;

        world3d.update(getWorldSpeedZ(), timeScale, isExpertMode, isHardMode);
        player.update(input, timeScale);
        updateDifficulty(timeScale);
        handleObstacles3D(timeScale);
        vfx.update(timeScale);
        engine3d.updateAtmosphere(isHardMode, isExpertMode, player.isSuper);
        engine3d.updateChaseCamera({
            playerX: player.x,
            playerY: player.y,
            gameSpeed,
            isSuper: player.isSuper,
            isMenu: false,
            shakeOffset: vfx.getShakeOffset(),
            timeScale
        });
    } else {
        // Live 3D Neo-Tokyo background showcase on Start / Game Over screen
        world3d.update(0.22, timeScale, false, false);
        animateRioMesh(player.mesh, {
            timeScale,
            gameSpeed: 6,
            grounded: true,
            vy: 0,
            jumpCount: 0,
            laneVelocityX: 0
        });
        vfx.update(timeScale);
        engine3d.updateAtmosphere(false, false, false);
        engine3d.updateChaseCamera({
            playerX: player.x,
            playerY: player.y,
            gameSpeed: 8,
            isSuper: false,
            isMenu: currentState === GameState.MENU,
            shakeOffset: vfx.getShakeOffset(),
            timeScale
        });
    }

    engine3d.render();
}

// --- Leaderboard Logic (Firebase v10.12.2) ---
let lowestTop10Score = 0;

async function fetchLeaderboard() {
    if (!firebaseLoaded || !db) return;

    try {
        const scoresRef = collection(db, "scores");
        const q = query(scoresRef, orderBy("score", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        leaderboardList.innerHTML = "";
        let count = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `<span>${count + 1}. ${data.name}</span> <span>${data.score}</span>`;
            leaderboardList.appendChild(li);

            if (count === 0) {
                startHighScoreEl.innerText = `${data.score}`;
                highScore = data.score;
                highScoreEl.innerText = `${Math.floor(highScore)}`;
            }

            if (count === querySnapshot.size - 1) {
                lowestTop10Score = data.score;
            }
            count++;
        });

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
        if (recordErrorMsg) recordErrorMsg.innerText = "Offline Mode: Cannot save score.";
        return;
    }

    try {
        if (recordErrorMsg) recordErrorMsg.innerText = "";
        submitScoreBtn.disabled = true;
        submitScoreBtn.innerText = "SAVING...";

        const scoresRef = collection(db, "scores");
        const lowerName = name.toLowerCase();

        const qNorm = query(scoresRef, where("name_lowercase", "==", lowerName));
        const snapNorm = await getDocs(qNorm);

        let existingDoc = null;
        if (!snapNorm.empty) {
            existingDoc = snapNorm.docs[0];
        } else {
            const qLegacy = query(scoresRef, where("name", "==", name));
            const snapLegacy = await getDocs(qLegacy);
            if (!snapLegacy.empty) {
                existingDoc = snapLegacy.docs[0];
            }
        }

        if (existingDoc) {
            const existingData = existingDoc.data();
            if (newScore > existingData.score) {
                await updateDoc(existingDoc.ref, {
                    score: newScore,
                    timestamp: new Date(),
                    name: name,
                    name_lowercase: lowerName
                });
                localStorage.setItem('rioRacerPlayerName', name);
            }
        } else {
            await addDoc(scoresRef, {
                name: name,
                name_lowercase: lowerName,
                score: newScore,
                timestamp: new Date()
            });
            localStorage.setItem('rioRacerPlayerName', name);
        }

        if (recordErrorMsg) recordErrorMsg.innerText = "";
        newRecordSection.classList.add('hidden');
        fetchLeaderboard();
    } catch (e) {
        console.error("Error saving score:", e);
        submitScoreBtn.innerText = "RETRY";
        submitScoreBtn.disabled = false;
        if (recordErrorMsg) {
            recordErrorMsg.innerText = e.message || "Failed to save score. Please try again.";
        }
    }
}

submitScoreBtn.addEventListener('click', submitScore);
playerNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitScore();
});

// --- Game Lifecycle ---
function clearEntities() {
    for (const obs of obstacles) obs.destroy();
    for (const p of powerups) p.destroy();
    obstacles = [];
    powerups = [];
    vfx.clear();
}

function startGame() {
    audio.init();
    clearEntities();

    currentState = GameState.PLAYING;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    highScoreEl.innerText = Math.floor(highScore);

    gameSpeed = 8;
    score = 0;
    highScoreBroken = false;
    highScoreAlertShown = false;
    if (highScoreAlert) {
        highScoreAlert.classList.add('hidden');
        highScoreAlert.innerText = "NEW HIGH SCORE!";
        highScoreAlert.style.color = "yellow";
    }

    player.reset();
    frameCount = 0;
    gameTime = 0;
    spawnTimer = 0;
    difficultyTimer = 0;
    lastExpertSpawnCheck = 0;
    spawnFlags = { s2500: false, s4000: false, s5000: false };
}

function gameOver() {
    currentState = GameState.GAMEOVER;
    hud.classList.add('hidden');
    if (speedLinesOverlay) speedLinesOverlay.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');

    finalScoreEl.innerText = "Score: " + Math.floor(score);
    audio.playCrash();

    if (typeof updateAvailable !== 'undefined' && updateAvailable) {
        applyUpdate();
        return;
    }

    newRecordSection.classList.add('hidden');
    if (recordErrorMsg) recordErrorMsg.innerText = "";

    const currentScore = Math.floor(score);
    if (currentScore > 0 && currentScore >= lowestTop10Score) {
        newRecordSection.classList.remove('hidden');
        playerNameInput.value = localStorage.getItem('rioRacerPlayerName') || "";
        submitScoreBtn.disabled = false;
        submitScoreBtn.innerText = "SAVE";
        audio.playHighScore();
    } else {
        fetchLeaderboard();
    }

    startHighScoreEl.innerText = `${Math.floor(highScore)}`;
}

function resetGame() {
    clearEntities();
    currentState = GameState.MENU;
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    startHighScoreEl.innerText = `${Math.floor(highScore)}`;
    player.reset();
    fetchLeaderboard();
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);

// --- About Modal & Share ---
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

aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
        aboutModal.classList.add('hidden');
    }
});

shareBtn.addEventListener('click', async () => {
    const shareData = {
        title: 'RioRacer v2.0: Neo-Tokyo 3D',
        text: `I just scored ${Math.floor(score)} in RioRacer v2.0 (Neo-Tokyo 3D)! Can you beat me?`,
        url: 'https://rioracer.com'
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            const shareText = `${shareData.text} ${shareData.url}`;
            await navigator.clipboard.writeText(shareText);
            alert('Score copied to clipboard! Paste it to share.');
        }
    } catch (err) {
        console.log('Error sharing:', err);
    }
});

// --- Connectivity & In-App Browser Detection ---
function checkConnectivity() {
    const offlineScreen = document.getElementById('offline-screen');
    const startButton = document.getElementById('start-btn');
    const restartButton = document.getElementById('restart-btn');

    if (!navigator.onLine) {
        if (offlineScreen) offlineScreen.classList.remove('hidden');
        if (startButton) startButton.disabled = true;
        if (restartButton) restartButton.disabled = true;
    } else {
        if (offlineScreen) offlineScreen.classList.add('hidden');
        if (startButton) startButton.disabled = false;
        if (restartButton) restartButton.disabled = false;
    }
}

function checkInAppBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isInApp = (ua.indexOf("Instagram") > -1) || (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1);
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
            if (isAndroid && androidBtn) {
                androidBtn.classList.remove('hidden');
                androidBtn.onclick = () => {
                    window.location.href = "googlechrome://rioracer.com";
                };
            } else if (isIOS && iosInstr) {
                iosInstr.classList.remove('hidden');
            }
            if (closeBtn) {
                closeBtn.onclick = () => warningEl.classList.add('hidden');
            }
        }
    }
}

window.addEventListener('online', checkConnectivity);
window.addEventListener('offline', checkConnectivity);
checkConnectivity();
checkInAppBrowser();

// Start 3D Animation Loop
requestAnimationFrame(animate);

// Expose Runtime Hook for Testing & Inspection
window.__RIORACER__ = {
    getState: () => ({
        currentState,
        score: Math.floor(score),
        highScore,
        gameSpeed,
        gameTime: Math.floor(gameTime),
        laneIndex: player.laneIndex,
        playerX: Number(player.x.toFixed(2)),
        playerY: Number(player.y.toFixed(2)),
        isSuper: player.isSuper,
        obstacleCount: obstacles.length,
        powerupCount: powerups.length
    }),
    startGame,
    switchLane: (d) => player.switchLane(d),
    jump: () => player.triggerJump(),
    triggerSuperMode: () => player.transform(),
    spawnGoldenBoneNow: () => powerups.push(new GoldenBone3D(engine3d.scene, player.laneIndex, -90))
};

// --- Service Worker & Auto-Update Logic ---
let newWorker = null;
let updateAvailable = false;

// Actively purge any legacy v1.x or v2.0.x caches from window.caches
if ('caches' in window) {
    caches.keys().then((keys) => {
        keys.forEach((key) => {
            if (key !== 'rioracer-v2.0.3-3d') {
                console.log('[Cache Purge] Removing stale cache:', key);
                caches.delete(key);
            }
        });
    });
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
            reg.update();
            reg.addEventListener('updatefound', () => {
                newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        updateAvailable = true;
                        if (currentState === GameState.MENU) {
                            applyUpdate();
                        }
                    }
                });
            });
        }).catch(err => console.warn('SW registration skipped:', err));
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'FORCE_RELOAD' && !refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}

function applyUpdate() {
    if (newWorker) {
        newWorker.postMessage({ type: 'SKIP_WAITING' });
    }
}
