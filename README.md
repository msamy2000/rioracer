# Dog vs. Street - Endless Runner Game

![Version](https://img.shields.io/badge/version-1.6.3-blue)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Chrome%20Extension-green)

**Play Now**: [https://msamy2000.github.io/rioracer/](https://msamy2000.github.io/rioracer/)

An intense HTML5 endless runner where you control a determined dog navigating through an obstacle-filled street. Master the double-jump mechanic, survive increasingly brutal difficulty spikes, and compete on the global leaderboard!

---

## 🎮 Game Overview

In *Dog vs. Street*, you play as a scrappy street dog running through an endless urban landscape. Dodge cats, other dogs, and various obstacles while the game progressively becomes more challenging. With no speed cap and multi-obstacle patterns emerging after 1 minute, only the most skilled players will achieve high scores.

### Key Features

- **Progressive Difficulty**: Game speed starts at 8 and increases every 10 seconds with NO CAP
- **Advanced Mechanics**: Double-jump system for navigating tight obstacle patterns
- **Hardcore Mode**: After 1 minute, 2-3 consecutive obstacles spawn requiring frame-perfect timing
- **Global Leaderboard**: Real-time Firebase integration - compete with players worldwide
- **Responsive Design**: Optimized for landscape play on mobile, tablet, and desktop
- **Platform Agnostic**: Play on web or install as Chrome extension

---

## 🕹️ How to Play

### Controls

| Input | Action |
|-------|--------|
| **Spacebar** | Jump |
| **Touch/Click** | Jump (mobile & desktop) |
| **W Key** | Jump (alternative) |

### Jump Mechanics

#### Single Jump
- Press jump once to leap over standard obstacles
- Jump height and duration are calibrated for single-obstacle gaps

#### Double Jump
- Press jump **again while in mid-air** to perform a second jump
- Second jump has 1.5x the force of the first jump
- Essential for surviving multi-obstacle patterns after 1 minute
- Requires precise timing - practice makes perfect!

---

## 📊 Gameplay Progression

### Difficulty Timeline

| Time | Speed | Obstacles | Challenge Level |
|------|-------|-----------|----------------|
| 0:00 | 8 | Single | **Easy** - Learn controls |
| 0:30 | 11 | Multi (Double-Jump) | **HARD MODE** (30s Start) |
| 1:00 | 14 | Randomized Gaps | Pattern memorization impossible |
| **1:30** | **17** | **CHAOS PATTERNS** | **EXPERT MODE ACTIVATED** |
| 2:30 | 25 | High Speed | 1.5x Acceleration Rate |

### Expert Mode (The "Timmy Special")

At **1 minute 30 seconds**, the game evolves again with randomized **Chaos Patterns**. The game randomly selects one of these for every spawn:

1. **The Gap Trap** (33%): `[Block] ...gap... [Block]`. The gap is just big enough to land in. You *must* Jump -> Land -> Jump. Double-jumping over it will kill you.
2. **The Triple Threat** (33%): `[Block] [Block] [Block]`. Three obstacles with very tight, random spacing. Requires rapid, precise tapping.
3. **The Fake-Out** (33%): `[Block] ... ... ... [Fast Pair]`. One obstacle, a long safe pause to lower your guard, then a sudden fast double-spawn.

**Speed Note**: Speed increases every **7 seconds** (Standard is 10s), accelerating the chaos.

### Hard Mode (Adjusted)

Now starts at **45 seconds** (was 60s) to ramp up excitement earlier. Features randomized spacing between consecutive obstacles.

### Obstacle Types

- **Cat** (Orange): Standard enemy, moderate size
- **Dog** (Brown): Slightly larger, requires precise timing
- **Dog 2** (Variant): Dynamic sizing based on difficulty

All obstacles have **30% hitbox padding** for fair collision detection.

---

## 🏆 Scoring System

- **Score Increment**: +0.1 per frame (approximately 6 points per second)
- **High Score Celebration**: 
  - Hero transforms to "buffed" version when breaking global record
  - Screen flashes with fanfare audio
  - "RECORD BROKEN!" message appears
- **Leaderboard**: Top 10 players saved globally via Firebase
- **Name Entry**: Type your name when achieving Top 10 (max 10 characters)

### Current Top Score Strategy

To maximize your score:
1. **Survive the first minute** - Practice single jumps on standard obstacles
2. **Master double-jumping** - Essential for multi-patterns after 1:00
3. **Stay calm at high speeds** - Muscle memory > panic reactions
4. **Use visual cues** - Watch the edge of the screen for incoming obstacles

---

## 🎨 Visual Design

### Responsive Scaling

The game uses dynamic viewport-based scaling:

- **Landscape Mode** (Desktop/Laptop):
  - Game elements scaled to `vh` units for consistent sizing
  - Ultra-compact UI on screens < 600px height
  - Optimal for 16:9 monitors

- **Mobile Landscape**:
  - Device-aware scaling (detected via user agent)
  - Larger characters and ground height for small screens
  - Safety buffers for curved displays (Samsung S22 Ultra, etc.)
  - Version tag displayed on welcome screen

### UI States

1. **Welcome Screen**: Game cover, high score display, Play button
2. **In-Game HUD**: Current score (top-left), global high score (top-right)
3. **Game Over**: Final score, leaderboard, name entry (if Top 10), Try Again button
4. **Leaderboard**: Real-time Top 10 with player names and scores

---

## 🔧 Technical Details

### Technology Stack

- **Frontend**: Vanilla HTML5 Canvas + JavaScript (ES6+)
- **Styling**: Custom CSS with mobile-first responsive design
- **Backend**: Firebase Firestore for global leaderboard
- **Audio**: Web Audio API (synthesized sound effects)
- **Deployment**: GitHub Pages + Chrome Extension

### Architecture

```
RioRacer/
├── index.html          # Game page structure
├── style.css           # Responsive styles, UI themes
├── script.js           # Game logic, physics, Firebase
├── graphics/           # Game assets (hero, obstacles, backgrounds)
│   ├── hero_start.png  # Default dog sprite
│   ├── hero.jpg        # "Buffed" dog (high score mode)
│   ├── obst_Cat.jpg
│   ├── obst_Dog.jpg
│   ├── obst_dog2.png
│   └── background_*.png
└── extension/          # Chrome extension build
    ├── manifest.json
    ├── background.js
    └── [all game files]
```

### Physics Engine

- **Gravity**: Dynamically scaled to canvas height
- **Jump Force**: Calculated to ensure fair obstacle gaps
- **Speed Calculation**: `(CANVAS_WIDTH * 0.005) * (gameSpeed / 5)`
- **Collision Detection**: AABB with 30% padding for forgiving hitboxes

### Performance

- **Frame Rate**: 60 FPS via `requestAnimationFrame`
- **Canvas Size**: Matches window dimensions (fully responsive)
- **Asset Loading**: Preloaded images with fallback colored rectangles
- **Optimization**: Single animation loop, efficient collision checks

---

## 🚀 Installation & Play

### Option 1: Play on Web (Instant)

1. Visit: **[https://msamy2000.github.io/rioracer/](https://msamy2000.github.io/rioracer/)**
2. Rotate device to landscape (mobile)
3. Click **PLAY!**
4. Enjoy!

### Option 2: Chrome Extension

#### Quick Install
1. Download `extension.crx` from releases
2. Open Chrome: `chrome://extensions/`
3. Drag `.crx` file onto the page
4. Click extension icon to play
---

## 🛠️ How to Run Locally

Because this game uses JavaScript Modules (ES6), you cannot simply open `index.html` in your browser due to CORS security policies.

### The Problem
If you see this error:
> `Access to script at '...' from origin 'null' has been blocked by CORS policy`

### The Solution

**Option 1: Double-Click Script (Easiest)**
1.  Double-click **`start-game.bat`**.
2.  It will automatically find Python or Node.js on your computer and start a local server.
3.  The game will open in your browser automatically.
4.  If it fails, the window will stay open so you can see why.

**Option 2: PowerShell Script**
If you prefer PowerShell, you can right-click `start-game.ps1` and choose "Run with PowerShell". If it closes immediately, try Option 1.
If you prefer the command line:
```bash
# Using Python 3
python -m http.server

# Using Node.js
npx http-server .
```
Then open `http://localhost:8000` or `http://localhost:8080`.
 in new tab

#### Build Extension Yourself
```powershell
# Windows PowerShell
.\build-extension.ps1

# Creates: rioracer-extension-v1.4.5.zip
```

See [EXTENSION-README.md](EXTENSION-README.md) and [TESTING-GUIDE.md](TESTING-GUIDE.md) for detailed instructions.

---

## 🎯 Gameplay Tips & Strategies

### Beginner Tips
- **Practice timing**: Jump just before reaching obstacles, not when touching them
- **Use sound cues**: Audio feedback helps build muscle memory
- **Watch spawn patterns**: Obstacles appear at screen edge - anticipate early
- **Don't panic**: Smooth, rhythmic jumps > frantic button mashing

### Advanced Tactics
- **Pre-jump multi-patterns**: Start first jump slightly early to position for double-jump
- **Speed reading**: At high speeds, rely on peripheral vision for edge-of-screen warnings
- **Rhythm maintenance**: Establish a mental cadence for timed double-jumps
- **Risk management**: After 1 minute, assume every obstacle is a pattern until proven otherwise

### Record-Breaking Strategies
1. **Survive to 1:00** - This is the minimum for competitive scores
2. **Perfect double-jump timing** - Practice the 60% gap in training runs
3. **Stay in the zone** - Minimize distractions, focus on flow state
4. **Learn pattern recognition** - Identify 2-obstacle vs 3-obstacle formations quickly
5. **Endurance mindset** - Games can last 5+ minutes at elite levels

---

## 🌐 Firebase Leaderboard

### How It Works
- All players share a **single global database**
- Top 10 scores persist across sessions
- Name entry required only for Top 10 finishes
- Real-time updates (see others' scores immediately)

### Privacy
- Only name (10 chars max) and score are stored
- No personal data collected
- Firestore rules allow public read/create access

### Synced Across Platforms
- Website players compete with extension users
- Same leaderboard on all devices
- Version-agnostic (v1.4.5 plays with older versions)

---

## 📱 Mobile Optimization

### Supported Devices
- ✅ iPhone (12-17 series) - Perfect scaling
- ✅ Samsung Galaxy (A-series, S22 Ultra) - Curve-screen optimized
- ✅ iPad (landscape mode)
- ✅ Android tablets
- ✅ Any modern smartphone in landscape

### S22 Ultra Specific Optimizations
- `vh`-based font scaling for ultra-wide aspect ratio (2.3:1)
- Bottom padding for curved screen edges
- Compact UI to prevent overflow on short viewports
- Tested and verified on 600px height displays

### Landscape-Only Design
- **Portrait Warning**: Displays rotating icon message
- **Why landscape?** Side-scrolling requires horizontal space
- **Auto-detection**: CSS media queries handle orientation

---

## 🛠️ Development

### Version History

- **v1.6.3** (Current - Faster Pace)
  - **Hard Mode** starts at 30s (was 50s)
  - **Expert Mode** starts at 1m 30s (was 1m 40s)
  - **Chaos Patterns**: Randomized Gap Traps, Triple Threats, Fake-Outs

- **v1.6.0 - v1.6.2**

- **v1.5.0**
  - Multi-obstacle patterns after 1 minute
  - Starting speed increased to 8
  - Removed speed cap (infinite difficulty)
  - Chrome extension support
  
- **v1.4.0-v1.4.4**
  - Mobile-specific scaling
  - S22 Ultra optimizations
  - VH-based UI for landscape
  
- **v1.3.x**
  - Animation loop stability fixes
  - Hero sprite reset on restart
  - Landscape-first refinements

- **v1.0-v1.2**
  - Initial release
  - Firebase integration
  - Double-jump mechanic

### Contributing

This is a personal project, but feedback is welcome! Open issues for bugs or suggestions on the [GitHub repository](https://github.com/msamy2000/rioracer).

### Future Ideas
- Power-ups (shields, slow-motion)
- Multiple difficulty modes (casual/hardcore toggles)
- Daily challenges
- Achievements system
- Customizable dog skins

---

## 📄 License

This project is open-source for educational purposes. Feel free to fork and modify!

---

## 🙏 Credits

- **Design Inspiration**: Classic Chrome Dino game
- **Feedback**: "Timmy" (age 10) - UX consultant for kid-friendly gameplay
- **Audio**: Web Audio API synthesized sounds
- **Hosting**: GitHub Pages
- **Database**: Firebase Firestore

---

## 📞 Support

- **Play the game**: [msamy2000.github.io/rioracer](https://msamy2000.github.io/rioracer/)
- **Report bugs**: GitHub Issues
- **Questions**: Check [TESTING-GUIDE.md](TESTING-GUIDE.md) and [EXTENSION-README.md](EXTENSION-README.md)

---

**Good luck, and may your double-jumps be ever-perfect!** 🐕🏁🚀