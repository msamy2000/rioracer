import * as THREE from './vendor/three.module.min.js';
import { createToonMaterial, addInkOutline } from './models3d.js';

export const LANE_WIDTH = 3.1;
export const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH];

/**
 * Generates a glowing Japanese Anime Neon Sign texture using offscreen HTML5 Canvas
 */
function createNeonSignTexture(text, subtext, bgColor, borderColor, textColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark cyber panel background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Neon border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    // Inner accent line
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

    // Vertical Japanese / Cyber lettering
    ctx.fillStyle = textColor;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 18;
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px sans-serif';

    const chars = Array.from(text);
    const startY = 105;
    const stepY = Math.min(72, 320 / Math.max(chars.length, 1));
    chars.forEach((ch, idx) => {
        ctx.fillText(ch, canvas.width / 2, startY + idx * stepY);
    });

    // Bottom English subtext
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtext, canvas.width / 2, canvas.height - 46);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

/**
 * Generates a pixelated glowing window grid texture for Neo-Tokyo skyscrapers
 */
function createBuildingWindowTexture(accentHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0c0e1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cols = 4;
    const rows = 10;
    const padX = 8;
    const padY = 8;
    const w = (canvas.width - padX * (cols + 1)) / cols;
    const h = (canvas.height - padY * (rows + 1)) / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const rand = Math.random();
            if (rand > 0.32) {
                ctx.fillStyle = rand > 0.82 ? accentHex : '#2a3966';
                ctx.fillRect(padX + c * (w + padX), padY + r * (h + padY), w, h);
            }
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

export class NeoTokyoWorld {
    constructor(scene) {
        this.scene = scene;
        this.root = new THREE.Group();
        this.root.name = 'NeoTokyoWorld';
        this.scene.add(this.root);

        this.scrollSegments = [];
        this.buildings = [];
        this.toriiGates = [];
        this.chevrons = [];
        this.speedLines3D = [];

        this.expertOverlayIntensity = 0;

        this.buildHighway();
        this.buildSkyBackdrop();
        this.buildCityscape();
        this.buildToriiArches();
        this.build3DSpeedParticles();
    }

    buildHighway() {
        // Main Road Deck
        const roadLength = 240;
        const roadWidth = LANE_WIDTH * 3 + 2.4;
        const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
        roadGeo.rotateX(-Math.PI / 2);

        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x121324,
            roughness: 0.35,
            metalness: 0.45
        });
        const roadMesh = new THREE.Mesh(roadGeo, roadMat);
        roadMesh.position.set(0, 0, -90);
        roadMesh.receiveShadow = true;
        this.root.add(roadMesh);

        // Glowing Neon Side Curbs (Left & Right)
        const curbGeo = new THREE.BoxGeometry(0.55, 0.45, roadLength);
        const curbLeftMat = createToonMaterial(0xff2e55, { emissive: 0xff1e42, emissiveIntensity: 0.55 });
        const curbRightMat = createToonMaterial(0x00f0ff, { emissive: 0x00d0ff, emissiveIntensity: 0.55 });

        const leftCurb = new THREE.Mesh(curbGeo, curbLeftMat);
        leftCurb.position.set(-roadWidth / 2 - 0.2, 0.22, -90);
        addInkOutline(leftCurb, 1.03);

        const rightCurb = new THREE.Mesh(curbGeo, curbRightMat);
        rightCurb.position.set(roadWidth / 2 + 0.2, 0.22, -90);
        addInkOutline(rightCurb, 1.03);

        this.root.add(leftCurb, rightCurb);

        // Continuous Neon Lane Divider Strips
        const dividerGeo = new THREE.PlaneGeometry(0.12, roadLength);
        dividerGeo.rotateX(-Math.PI / 2);
        const dividerMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.55
        });

        [-LANE_WIDTH / 2, LANE_WIDTH / 2].forEach((xPos) => {
            const divLine = new THREE.Mesh(dividerGeo, dividerMat);
            divLine.position.set(xPos, 0.015, -90);
            this.root.add(divLine);
        });

        // Scrolling Neon Road Chevrons & Dashed Lane Markers
        const chevronGeo = new THREE.PlaneGeometry(0.85, 2.2);
        chevronGeo.rotateX(-Math.PI / 2);
        const chevronMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.45 });
        const chevronMatPink = new THREE.MeshBasicMaterial({ color: 0xff2e63, transparent: true, opacity: 0.45 });

        const numRows = 22;
        this.roadLoopLength = 176; // 22 * 8 units
        for (let i = 0; i < numRows; i++) {
            const zPos = 16 - i * 8;
            const rowGroup = new THREE.Group();
            rowGroup.position.z = zPos;

            // Center and side lane boost markers
            LANE_X.forEach((lx, laneIdx) => {
                const mat = laneIdx === 1 ? chevronMatCyan : chevronMatPink;
                const marker = new THREE.Mesh(chevronGeo, mat);
                marker.position.set(lx, 0.02, 0);
                rowGroup.add(marker);
            });

            // Side guardrail posts
            const postGeo = new THREE.BoxGeometry(0.3, 1.1, 0.3);
            const postMat = createToonMaterial(0x282c44);
            const postL = new THREE.Mesh(postGeo, postMat);
            postL.position.set(-roadWidth / 2 - 0.2, 0.7, 0);
            const postR = new THREE.Mesh(postGeo, postMat);
            postR.position.set(roadWidth / 2 + 0.2, 0.7, 0);
            rowGroup.add(postL, postR);

            this.root.add(rowGroup);
            this.chevrons.push(rowGroup);
        }
    }

    buildSkyBackdrop() {
        // Giant Retro-Futuristic Anime Cyber Sun / Moon on the horizon
        const sunGeo = new THREE.CircleGeometry(38, 40);
        const sunCanvas = document.createElement('canvas');
        sunCanvas.width = 256;
        sunCanvas.height = 256;
        const ctx = sunCanvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0.0, '#ff2e63');
        grad.addColorStop(0.55, '#ff9f1c');
        grad.addColorStop(1.0, '#7209b7');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);

        // Synthwave / Anime horizontal scanline cutouts
        ctx.fillStyle = '#0b071a';
        for (let y = 140; y < 256; y += 16) {
            const h = Math.floor((y - 130) * 0.08) + 2;
            ctx.fillRect(0, y, 256, h);
        }

        const sunTex = new THREE.CanvasTexture(sunCanvas);
        const sunMat = new THREE.MeshBasicMaterial({ map: sunTex, fog: false });
        this.cyberSun = new THREE.Mesh(sunGeo, sunMat);
        this.cyberSun.position.set(0, 26, -185);
        this.root.add(this.cyberSun);

        // Distant Neo-Tokyo Hologram Ring behind the sun
        const ringGeo = new THREE.RingGeometry(42, 43.5, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.45,
            fog: false
        });
        this.horizonRing = new THREE.Mesh(ringGeo, ringMat);
        this.horizonRing.position.set(0, 26, -186);
        this.root.add(this.horizonRing);
    }

    buildCityscape() {
        const signConfigs = [
            { text: 'リオ疾走', sub: 'RIO RACER', bg: '#140824', border: '#ff2e63', color: '#00f0ff' },
            { text: '超音速犬', sub: 'SONIC DOG', bg: '#05192d', border: '#00f0ff', color: '#ffd700' },
            { text: '新東京道', sub: 'NEO TOKYO', bg: '#1e051e', border: '#ffbe0b', color: '#ff2e63' },
            { text: '黄金の骨', sub: 'GOLD BONE', bg: '#191204', border: '#ffd700', color: '#ffffff' }
        ];
        const signTextures = signConfigs.map(cfg =>
            createNeonSignTexture(cfg.text, cfg.sub, cfg.bg, cfg.border, cfg.color)
        );
        const winTextures = [
            createBuildingWindowTexture('#00f0ff'),
            createBuildingWindowTexture('#ff2e63'),
            createBuildingWindowTexture('#ffd700')
        ];

        const numPairs = 16;
        this.cityLoopLength = 192; // 16 * 12 units

        for (let i = 0; i < numPairs; i++) {
            const zPos = 15 - i * 12;
            [-1, 1].forEach((side, sIdx) => {
                const bGroup = new THREE.Group();
                const width = 5.5 + (i % 3) * 1.5;
                const depth = 6.5 + ((i + sIdx) % 2) * 2.0;
                const height = 16 + ((i * 7 + sIdx * 5) % 24);

                const winTex = winTextures[(i + sIdx) % winTextures.length];
                const bMat = new THREE.MeshLambertMaterial({
                    color: 0xffffff,
                    map: winTex,
                    emissive: 0x101830,
                    emissiveIntensity: 0.5
                });

                const bMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bMat);
                bMesh.position.y = height / 2 - 2;
                addInkOutline(bMesh, 1.03, 0x05050c);
                bGroup.add(bMesh);

                // Neon Rooftop Trim
                const trimColor = (i + sIdx) % 2 === 0 ? 0x00f0ff : 0xff2e63;
                const trim = new THREE.Mesh(
                    new THREE.BoxGeometry(width + 0.3, 0.4, depth + 0.3),
                    new THREE.MeshBasicMaterial({ color: trimColor })
                );
                trim.position.y = height - 2;
                bGroup.add(trim);

                // Attach Vertical Japanese Anime Neon Signboard facing the street
                if (i % 2 === 0) {
                    const signTex = signTextures[(i + sIdx) % signTextures.length];
                    const signMat = new THREE.MeshBasicMaterial({
                        map: signTex,
                        side: THREE.DoubleSide
                    });
                    const signPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5.2), signMat);
                    signPlane.position.set(
                        -side * (width / 2 + 0.8),
                        Math.min(height * 0.55, 11),
                        0
                    );
                    signPlane.rotation.y = side * (Math.PI / 6);
                    bGroup.add(signPlane);
                }

                const xOffset = side * (LANE_WIDTH * 1.5 + 4.8 + width / 2);
                bGroup.position.set(xOffset, 0, zPos);
                this.root.add(bGroup);
                this.buildings.push(bGroup);
            });
        }
    }

    buildToriiArches() {
        // Futuristic Japanese Torii Highway Gates spanning across the 3 lanes
        const pillarMat = createToonMaterial(0xff2040, { emissive: 0x660015, emissiveIntensity: 0.4 });
        const beamMat = createToonMaterial(0x181b2e);
        const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const neonGoldMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

        const spanX = LANE_WIDTH * 1.5 + 1.85;
        const numGates = 4;
        this.gateLoopLength = 180; // 4 * 45 units

        for (let i = 0; i < numGates; i++) {
            const gate = new THREE.Group();
            gate.position.z = -25 - i * 45;

            // Left & Right Torii Pillars
            const pillarGeo = new THREE.CylinderGeometry(0.28, 0.35, 8.2, 10);
            [-1, 1].forEach((dir) => {
                const pillar = new THREE.Mesh(pillarGeo, pillarMat);
                pillar.position.set(dir * spanX, 4.1, 0);
                addInkOutline(pillar, 1.06);
                gate.add(pillar);
            });

            // Top Kasagi (Curved/Angled Upper Crossbeam)
            const topBeam = new THREE.Mesh(new THREE.BoxGeometry(spanX * 2 + 3.2, 0.55, 0.7), pillarMat);
            topBeam.position.set(0, 8.1, 0);
            addInkOutline(topBeam, 1.04);
            gate.add(topBeam);

            // Lower Nuki Crossbeam with Neon Strip
            const lowerBeam = new THREE.Mesh(new THREE.BoxGeometry(spanX * 2 + 1.4, 0.38, 0.5), beamMat);
            lowerBeam.position.set(0, 6.7, 0);
            gate.add(lowerBeam);

            const neonStrip = new THREE.Mesh(
                new THREE.BoxGeometry(spanX * 2, 0.14, 0.56),
                i % 2 === 0 ? neonCyanMat : neonGoldMat
            );
            neonStrip.position.set(0, 6.7, 0);
            gate.add(neonStrip);

            this.root.add(gate);
            this.toriiGates.push(gate);
        }
    }

    build3DSpeedParticles() {
        // Floating cyber-sakura / neon energy streaks rushing past the camera
        const streakGeo = new THREE.BoxGeometry(0.06, 0.06, 2.8);
        const cyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65 });
        const pinkMat = new THREE.MeshBasicMaterial({ color: 0xff2e63, transparent: true, opacity: 0.65 });

        for (let i = 0; i < 36; i++) {
            const mesh = new THREE.Mesh(streakGeo, i % 2 === 0 ? cyanMat : pinkMat);
            mesh.position.set(
                (Math.random() < 0.5 ? -1 : 1) * (5.2 + Math.random() * 8),
                1.0 + Math.random() * 9,
                10 - Math.random() * 140
            );
            this.root.add(mesh);
            this.speedLines3D.push(mesh);
        }
    }

    update(worldSpeedZ, timeScale, isExpertMode, isHardMode) {
        const dz = worldSpeedZ * timeScale;

        // 1. Scroll Road Chevrons
        for (const row of this.chevrons) {
            row.position.z += dz;
            if (row.position.z > 24) {
                row.position.z -= this.roadLoopLength;
            }
        }

        // 2. Scroll City Buildings
        for (const b of this.buildings) {
            b.position.z += dz;
            if (b.position.z > 27) {
                b.position.z -= this.cityLoopLength;
            }
        }

        // 3. Scroll Torii Highway Arches
        for (const gate of this.toriiGates) {
            gate.position.z += dz;
            if (gate.position.z > 25) {
                gate.position.z -= this.gateLoopLength;
            }
        }

        // 4. Scroll 3D Speed Streaks
        const streakMultiplier = isExpertMode ? 1.8 : (isHardMode ? 1.35 : 1.0);
        for (const streak of this.speedLines3D) {
            streak.position.z += dz * 1.4 * streakMultiplier;
            streak.scale.z = streakMultiplier;
            if (streak.position.z > 20) {
                streak.position.z -= 150;
            }
        }

        // 5. Rotate distant horizon ring slowly
        if (this.horizonRing) {
            this.horizonRing.rotation.z += 0.004 * timeScale;
        }
    }
}
