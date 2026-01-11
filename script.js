/**
 * RioRacer - Dog vs Street
 * Endless Runner Game
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import {
    getFirestore, doc, getDoc, setDoc, updateDoc,
    collection, addDoc, query, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDWyv1VmQcOD7bwhAfleqQenAHSWsfiN3U",
    authDomain: "rioracer-e8003.firebaseapp.com",
    projectId: "rioracer-e8003",
    storageBucket: "rioracer-e8003.firebasestorage.app",
    messagingSenderId: "928449568156",
    appId: "1:928449568156:web:a1d4d819c4c352caff3c59",
    measurementId: "G-61KD8CPRTN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
let CANVAS_WIDTH = window.innerWidth;
let CANVAS_HEIGHT = window.innerHeight;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Physics Constants
const GRAVITY = 0.6;
let BASE_SCALE = 1;

function calculateScale() {
    BASE_SCALE = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 800; // Base reference
}
calculateScale();

// Physics Constants
let JUMP_FORCE = -15 * BASE_SCALE;
let GROUND_HEIGHT = CANVAS_HEIGHT * 0.15; // 15% of screen is ground

// Game State Enum
const GameState = {
    MENU: 0,
    PLAYING: 1,
    GAMEOVER: 2
};

let currentState = GameState.MENU;
let gameSpeed = 5;
let score = 0;
let highScore = parseInt(localStorage.getItem('rioRacerHighScore')) || 0;
let highScoreBroken = false; // Track if we broke it this run
let highScoreAlertShown = false;
let frameCount = 0;
let timeSinceStart = 0; // Track time for speed increase

// Assets
const heroImg = new Image();
heroImg.src = 'graphics/hero.jpg';

const heroStartImg = new Image();
heroStartImg.src = 'graphics/hero start.png';

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

    playShiny() {
        if (!this.enabled || !this.ctx) return;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        // Shiny magical sound (High Sine wave sweep + glissando sort of)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, this.ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1800, this.ctx.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.start();
        oscillator.stop(this.ctx.currentTime + 0.4);
    }

    playCrash() {
        if (!this.enabled || !this.ctx) return;
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, this.ctx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.start();
        oscillator.stop(this.ctx.currentTime + 0.3);
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
                if (currentState === GameState.GAMEOVER && e.code === 'Space') resetGame();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                this.jumpPressed = false;
            }
        });

        window.addEventListener('touchstart', (e) => {
            this.jumpPressed = true;
            if (currentState === GameState.MENU) startGame();
            if (currentState === GameState.GAMEOVER) resetGame(); // Simple tap to restart
        });

        window.addEventListener('touchend', () => {
            this.jumpPressed = false;
        });

        // Mouse click for desktop testing without keyboard
        window.addEventListener('mousedown', () => {
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
        // Player height = 15% of screen height?
        this.height = CANVAS_HEIGHT * 0.15;
        this.width = this.height; // Square for now

        this.x = CANVAS_WIDTH * 0.1; // 10% from left
        // Y position is calculated from bottom
        this.y = CANVAS_HEIGHT - GROUND_HEIGHT - this.height;
        this.vy = 0;
        this.grounded = true;

        // Sprite animation (simple toggle or just static for now since we have 1 image)
        this.image = heroStartImg;

        this.jumpCount = 0; // Track jumps
        this.maxJumps = 2;
    }

    update(input) {
        // Recalculate forces if screen resized? Ideally yes in resize handler.

        // Jumping
        if (input.jumpPressed) {
            if (this.grounded) {
                // First Jump
                this.vy = -Math.abs(CANVAS_HEIGHT * 0.022);
                this.grounded = false;
                this.jumpCount = 1;
                audio.playJump();
                input.jumpPressed = false; // Prevent holding
            } else if (this.jumpCount < this.maxJumps) {
                // Double Jump - Higher force for "double distance" feel
                this.vy = -Math.abs(CANVAS_HEIGHT * 0.022 * 1.3); // 1.3x force provides significant airtime boost
                this.jumpCount++;
                audio.playDoubleJump();
                input.jumpPressed = false;
            }
        }

        // Integrity check: Apply Gravity
        this.y += this.vy;

        if (!this.grounded) {
            // Gravity relative to screen height? 
            // let's say gravity is constant acceleration.
            this.vy += (CANVAS_HEIGHT * 0.0012); // Gravity scaled
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

    update() {
        // Scroll speed proportional to screen width
        let currentRealSpeed = (CANVAS_WIDTH * 0.005) * (gameSpeed / 5);

        this.x -= currentRealSpeed * 0.5; // Parallax effect

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

            // Calculate how many tiles we need to cover the screen
            // We need to cover CANVAS_WIDTH + the bit that scrolled off (Math.abs(this.x))
            // Since this.x is negative, we need ensures width * count > CANVAS_WIDTH - this.x
            // Simply put: draw until we are off screen.

            // Safety check for scale infinity
            if (!isFinite(this.width) || this.width <= 0) this.width = CANVAS_WIDTH;

            let numTiles = Math.ceil(CANVAS_WIDTH / this.width) + 1;

            for (let i = 0; i < numTiles; i++) {
                ctx.drawImage(bgImg, this.x + (i * this.width), 0, this.width, CANVAS_HEIGHT);
            }
        } else {
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
    }
}

// --- Obstacle Class ---
class Obstacle {
    constructor(xOffset) {
        // Dynamic size 10-15% of screen height
        let sizeFactor = CANVAS_HEIGHT * 0.10 + Math.random() * (CANVAS_HEIGHT * 0.05);
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

    update() {
        // Move left based on screen width percentage? 
        // gameSpeed is basically pixels per frame.
        // It should be proportional to screen width to keep "time to cross screen" constant.

        // Recalculate real speed
        let currentRealSpeed = (CANVAS_WIDTH * 0.005) * (gameSpeed / 5); // 0.5% width per frame at base speed

        this.x -= (currentRealSpeed + this.speedOffset);

        if (this.x < -this.width) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        if (this.image.complete && this.image.naturalWidth > 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.type === 'cat' ? 'orange' : 'brown';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// --- Game Logic ---
const input = new InputHandler();
const player = new Player();
const background = new Background();
let obstacles = [];

let spawnTimer = 0;
let nextSpawnDelay = 0; // Frames to wait

function handleObstacles(deltaTime) {
    // Determine Jump Physics properties to calculate safe gap
    // Jump time (time in air) = 2 * vy / g. 
    // This is approximate because vy is initial velocity.
    // Note: Variables scale dynamically, so we calculate fresh.
    let jf = Math.abs(JUMP_FORCE);
    let g = GRAVITY;

    // Let's use the Values actually used in Player.update:
    let usedGravity = (CANVAS_HEIGHT * 0.0012);
    let usedJumpForce = Math.abs(CANVAS_HEIGHT * 0.022);

    let timeInAir = (2 * usedJumpForce) / usedGravity; // frames

    // Horizontal distance covered during a full jump
    let currentRealSpeed = (CANVAS_WIDTH * 0.005) * (gameSpeed / 5);
    let jumpDistance = timeInAir * currentRealSpeed;

    // Safety buffer (user can't frame-perfect jump every time)
    let minSafeGap = jumpDistance * 1.5;

    // Spawning Strategy: Random timer + Distance Check
    spawnTimer++;

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
            obstacles.push(new Obstacle());
            spawnTimer = 0;
            // Next delay: Randomize to create rhythm, but ensure it's not too long either.
            // 40 to 120 frames?
            nextSpawnDelay = 60 + Math.random() * 60;
        }
    }

    obstacles.forEach(obs => {
        obs.update();
        obs.draw();

        // Collision Detection
        // Use a smaller hitbox (padding) to be more forgiving
        const paddingX = obs.width * 0.3; // Increased padding to 30% for even fairer play
        const paddingY = obs.height * 0.3;

        if (
            player.x + paddingX < obs.x + obs.width - paddingX &&
            player.x + player.width - paddingX > obs.x + paddingX &&
            player.y + paddingY < obs.y + obs.height - paddingY &&
            player.y + player.height - paddingY > obs.y + paddingY
        ) {
            // Collision!
            gameOver();
        }
    });

    obstacles = obstacles.filter(obs => !obs.markedForDeletion);
}

function displayScore() {
    scoreEl.innerText = Math.floor(score);
}

function updateDifficulty() {
    // Increase speed every 500 points
    score += 0.1; // Slow score increment

    // Dynamic Hero Switch Logic
    // Only if we have a valid high score to beat (>0)
    if (highScore > 0 && score > highScore && !highScoreBroken) {
        highScoreBroken = true;
        player.image = heroImg; // Switch to "Strong" dog
        audio.playShiny();

        // Visual flare?
        highScoreAlert.innerText = "RECORD BROKEN!";
        highScoreAlert.style.color = "cyan";
        highScoreAlertShown = false; // Trigger UI animation if handled
    }

    // Time-based Speed Increase (Every 10s approx)
    // 60fps * 10s = 600 frames
    if (frameCount % 600 === 0 && frameCount > 0) {
        gameSpeed += 1; // Aggressive increase
    }

    // Still keep score-based increase or replace?
    // User asked for "Every 40 seconds", implies time-based is primary.
    // Let's cap max speed
    if (gameSpeed > 25) gameSpeed = 25;
}

function animate() {
    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Resize fix
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        CANVAS_WIDTH = window.innerWidth;
        CANVAS_HEIGHT = window.innerHeight;
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        calculateScale(); // Recalculate physics constants

        // Fix player Y if on ground
        if (player.grounded) player.y = CANVAS_HEIGHT - GROUND_HEIGHT - player.height;
    }

    if (currentState === GameState.PLAYING) {
        // Update
        background.update();
        player.update(input);

        updateDifficulty();
        frameCount++;

        // Draw Background First
        background.draw();

        // Draw Ground (Simple rect for now to clearly define "Street")
        ctx.fillStyle = '#555'; // Asphalt color
        ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
        // Dashed line
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 5;
        ctx.setLineDash([40, 40]);
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT + 20);
        ctx.lineTo(CANVAS_WIDTH + (frameCount * gameSpeed) % 80, CANVAS_HEIGHT - GROUND_HEIGHT + 20); // Moving line effect
        ctx.stroke();

        // Draw Player
        player.draw();

        // Handle Obstacles
        handleObstacles();

        // UI
        displayScore();

        requestAnimationFrame(animate);
    } else if (currentState === GameState.MENU) {
        // Just draw background static
        background.draw();
        // Ground
        ctx.fillStyle = '#555';
        ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
        // Prompt
        // UI overlay covers this
    }
}

// --- Leaderboard Logic ---
const scoresCollectionRef = collection(db, "scores");

let lowestTop10Score = 0;

async function fetchLeaderboard() {
    try {
        const q = query(scoresCollectionRef, orderBy("score", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        leaderboardList.innerHTML = ""; // Clear existing
        let count = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `<span>${count + 1}. ${data.name}</span> <span>${data.score}</span>`;
            leaderboardList.appendChild(li);

            // Sync Start Screen with Global Best
            if (count === 0) {
                startHighScoreEl.innerText = `${data.score}`;
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

    try {
        submitScoreBtn.disabled = true;
        submitScoreBtn.innerText = "SAVING...";

        await addDoc(scoresCollectionRef, {
            name: name,
            score: newScore,
            timestamp: new Date()
        });

        // Success
        newRecordSection.classList.add('hidden'); // Hide input
        fetchLeaderboard(); // Refresh list

        // Save to local storage too
        localStorage.setItem('rioRacerPlayerName', name);

    } catch (e) {
        console.error("Error saving score:", e);
        submitScoreBtn.innerText = "ERROR";
        submitScoreBtn.disabled = false;
    }
}

// Bind Submit Button
submitScoreBtn.addEventListener('click', submitScore);

// Initialize
fetchLeaderboard();

function startGame() {
    audio.init();

    currentState = GameState.PLAYING;
    startScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    // Ensure HUD shows current high score
    highScoreEl.innerText = Math.floor(highScore);

    gameSpeed = 5;
    score = 0;
    highScoreBroken = false;
    highScoreAlertShown = false;
    highScoreAlert.innerText = "NEW HIGH SCORE!";
    highScoreAlert.style.color = "yellow";

    obstacles = [];
    frameCount = 0;

    animate();
}

function gameOver() {
    currentState = GameState.GAMEOVER;
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');

    finalScoreEl.innerText = "Score: " + Math.floor(score);
    audio.playCrash();

    // Hide input by default
    newRecordSection.classList.add('hidden');

    // Local High Score
    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem('rioRacerHighScore', highScore);
    }

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

    // Draw initial state
    background.draw();
    ctx.fillStyle = '#555';
    ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
    fetchLeaderboard(); // Refresh
}

// Event Listeners for Buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);

// Reset Score Logic
const resetScoreBtn = document.getElementById('reset-score-btn');
resetScoreBtn.addEventListener('click', () => {
    localStorage.removeItem('rioRacerHighScore');
    highScore = 0;
    startHighScoreEl.innerText = "0";
    highScoreEl.innerText = "0";
    alert("Local High Score Reset to 0!");
});

// Initial Draw & Setup
startHighScoreEl.innerText = Math.floor(highScore);
background.draw();
ctx.fillStyle = '#555';
ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
highScoreEl.innerText = Math.floor(highScore);
