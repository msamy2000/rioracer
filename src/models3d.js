import * as THREE from './vendor/three.module.min.js';

// Shared 4-band anime cel-shading gradient texture
let sharedGradientMap = null;

export function getToonGradientMap() {
    if (sharedGradientMap) return sharedGradientMap;
    const colors = new Uint8Array([
        75, 75, 95, 255,     // Deep anime shadow (cool tint)
        145, 145, 165, 255,  // Mid-shadow band
        220, 220, 235, 255,  // Lit band
        255, 255, 255, 255   // Crisp highlight band
    ]);
    const texture = new THREE.DataTexture(colors, 4, 1, THREE.RGBAFormat);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    sharedGradientMap = texture;
    return sharedGradientMap;
}

export function createToonMaterial(colorHex, options = {}) {
    return new THREE.MeshToonMaterial({
        color: new THREE.Color(colorHex),
        gradientMap: getToonGradientMap(),
        emissive: options.emissive ? new THREE.Color(options.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: options.emissiveIntensity ?? 0,
        transparent: options.transparent ?? false,
        opacity: options.opacity ?? 1.0,
        side: options.side ?? THREE.FrontSide
    });
}

const outlineMaterialCache = new Map();
function getOutlineMaterial(colorHex = 0x0b0914) {
    if (!outlineMaterialCache.has(colorHex)) {
        outlineMaterialCache.set(
            colorHex,
            new THREE.MeshBasicMaterial({
                color: colorHex,
                side: THREE.BackSide
            })
        );
    }
    return outlineMaterialCache.get(colorHex);
}

/**
 * Adds an inverted-hull anime ink outline child mesh
 */
export function addInkOutline(mesh, scaleOffset = 1.07, colorHex = 0x0b0914) {
    const outline = new THREE.Mesh(mesh.geometry, getOutlineMaterial(colorHex));
    outline.scale.setScalar(scaleOffset);
    outline.name = 'inkOutline';
    mesh.add(outline);
    return outline;
}

/**
 * Creates a cel-shaded mesh with automatic anime ink outline
 */
function createCelPart(geometry, material, outlineScale = 1.07) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (outlineScale > 1.0) {
        addInkOutline(mesh, outlineScale);
    }
    return mesh;
}

/**
 * Builds the 3D articulated model of Rio the Dog:
 * - Fluffy white Bichon/Maltese fur
 * - Signature Akira-style bright red tracksuit jacket with white double stripes
 * - Toggleable Overdrive (Record-Breaker red sneakers + cyan aura)
 * - Toggleable Super Rio (Golden-Red flowing cape + Golden Anime Hero Visor)
 */
export function createRioMesh() {
    const root = new THREE.Group();
    root.name = 'RioCharacter';

    // Materials
    const whiteFurMat = createToonMaterial(0xf8fbff);
    const jacketRedMat = createToonMaterial(0xff2e43, { emissive: 0x3a000b, emissiveIntensity: 0.2 });
    const stripeWhiteMat = createToonMaterial(0xffffff, { emissive: 0x223344, emissiveIntensity: 0.25 });
    const darkInkMat = createToonMaterial(0x141622);
    const pinkTongueMat = createToonMaterial(0xff6b8b);
    const sneakerRedMat = createToonMaterial(0xff1e38, { emissive: 0xff1e38, emissiveIntensity: 0.35 });
    const goldMetalMat = createToonMaterial(0xffd700, { emissive: 0xff8800, emissiveIntensity: 0.55 });
    const superCapeMat = createToonMaterial(0xd62828, { emissive: 0xff6b00, emissiveIntensity: 0.35, side: THREE.DoubleSide });
    const zipperMat = createToonMaterial(0xd0e2ff, { emissive: 0x00d9ff, emissiveIntensity: 0.3 });

    const bodyPivot = new THREE.Group();
    bodyPivot.position.y = 0.85;
    root.add(bodyPivot);

    // 1. Torso in Red Track Jacket
    const torsoGeo = new THREE.CapsuleGeometry(0.46, 0.72, 8, 16);
    torsoGeo.rotateX(Math.PI / 2);
    const torso = createCelPart(torsoGeo, jacketRedMat, 1.06);
    bodyPivot.add(torso);

    // Fluffy White Rear / Hindquarters peeking out of jacket
    const rearFurGeo = new THREE.SphereGeometry(0.43, 14, 12);
    const rearFur = createCelPart(rearFurGeo, whiteFurMat, 1.06);
    rearFur.position.set(0, -0.02, 0.42);
    bodyPivot.add(rearFur);

    // Jacket Collar (Fluffy white + Red high-tech collar)
    const collarGeo = new THREE.TorusGeometry(0.4, 0.11, 10, 20);
    const collar = createCelPart(collarGeo, jacketRedMat, 1.05);
    collar.rotation.x = Math.PI / 2.4;
    collar.position.set(0, 0.12, -0.42);
    bodyPivot.add(collar);

    // Double White Racing Stripes along back/sides of jacket
    const stripeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.82);
    const stripeL = new THREE.Mesh(stripeGeo, stripeWhiteMat);
    stripeL.position.set(-0.34, 0.25, -0.02);
    const stripeR = new THREE.Mesh(stripeGeo, stripeWhiteMat);
    stripeR.position.set(0.34, 0.25, -0.02);
    bodyPivot.add(stripeL, stripeR);

    // Cyber Zipper on Chest
    const zipperGeo = new THREE.BoxGeometry(0.1, 0.22, 0.08);
    const zipper = new THREE.Mesh(zipperGeo, zipperMat);
    zipper.position.set(0, -0.18, -0.58);
    bodyPivot.add(zipper);

    // 2. Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.56, -0.52);
    bodyPivot.add(headGroup);

    const skullGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const skull = createCelPart(skullGeo, whiteFurMat, 1.07);
    skull.scale.set(1.08, 0.96, 1.02);
    headGroup.add(skull);

    // Fluffy Cheeks & Top Tuft
    const cheekGeo = new THREE.SphereGeometry(0.26, 12, 12);
    const cheekL = createCelPart(cheekGeo, whiteFurMat, 1.06);
    cheekL.position.set(-0.36, -0.08, -0.12);
    const cheekR = createCelPart(cheekGeo, whiteFurMat, 1.06);
    cheekR.position.set(0.36, -0.08, -0.12);
    const topTuft = createCelPart(new THREE.SphereGeometry(0.24, 10, 10), whiteFurMat, 1.06);
    topTuft.position.set(0, 0.42, -0.05);
    headGroup.add(cheekL, cheekR, topTuft);

    // Muzzle & Nose
    const muzzleGeo = new THREE.SphereGeometry(0.25, 12, 12);
    const muzzle = createCelPart(muzzleGeo, whiteFurMat, 1.05);
    muzzle.scale.set(1.15, 0.85, 1.1);
    muzzle.position.set(0, -0.1, -0.4);
    headGroup.add(muzzle);

    const noseGeo = new THREE.SphereGeometry(0.09, 10, 10);
    const nose = new THREE.Mesh(noseGeo, darkInkMat);
    nose.scale.set(1.2, 0.9, 0.9);
    nose.position.set(0, -0.03, -0.62);
    headGroup.add(nose);

    // Tongue (visible in Overdrive / Super mode or during jumps)
    const tongueGeo = new THREE.BoxGeometry(0.13, 0.05, 0.18);
    const tongue = new THREE.Mesh(tongueGeo, pinkTongueMat);
    tongue.position.set(0.04, -0.2, -0.56);
    tongue.rotation.x = 0.45;
    tongue.visible = false;
    headGroup.add(tongue);

    // Eyes & Fierce Anime Eyebrows
    const eyeGeo = new THREE.SphereGeometry(0.085, 12, 12);
    const highlightGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    [-1, 1].forEach((dir) => {
        const eye = new THREE.Mesh(eyeGeo, darkInkMat);
        eye.position.set(dir * 0.2, 0.08, -0.44);
        const catchlight = new THREE.Mesh(highlightGeo, highlightMat);
        catchlight.position.set(dir * 0.025, 0.03, -0.07);
        eye.add(catchlight);
        headGroup.add(eye);

        // Determined Anime Brow
        const browGeo = new THREE.BoxGeometry(0.22, 0.055, 0.06);
        const brow = new THREE.Mesh(browGeo, darkInkMat);
        brow.position.set(dir * 0.2, 0.21, -0.46);
        brow.rotation.z = dir * 0.28; // Angled inward fiercely
        headGroup.add(brow);
    });

    // Floppy Fluffy Ears
    const earGeo = new THREE.CapsuleGeometry(0.16, 0.36, 6, 12);
    const earL = createCelPart(earGeo, whiteFurMat, 1.07);
    earL.position.set(-0.48, 0.08, 0.0);
    earL.rotation.z = 0.45;
    earL.rotation.x = 0.2;

    const earR = createCelPart(earGeo, whiteFurMat, 1.07);
    earR.position.set(0.48, 0.08, 0.0);
    earR.rotation.z = -0.45;
    earR.rotation.x = 0.2;
    headGroup.add(earL, earR);

    // 3. Super Hero Golden Mask/Visor (Hidden until Golden Bone collected)
    const superVisor = new THREE.Group();
    const visorMainGeo = new THREE.BoxGeometry(0.82, 0.24, 0.26);
    const visorMain = createCelPart(visorMainGeo, goldMetalMat, 1.06);
    visorMain.position.set(0, 0.1, -0.39);
    const visorCrestGeo = new THREE.ConeGeometry(0.14, 0.32, 4);
    const visorCrest = new THREE.Mesh(visorCrestGeo, goldMetalMat);
    visorCrest.position.set(0, 0.26, -0.48);
    visorCrest.rotation.x = -0.3;
    superVisor.add(visorMain, visorCrest);
    superVisor.visible = false;
    headGroup.add(superVisor);

    // 4. Fluffy Wagging Tail
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.22, 0.68);
    bodyPivot.add(tailPivot);
    const tailGeo = new THREE.CapsuleGeometry(0.14, 0.34, 6, 12);
    const tailMesh = createCelPart(tailGeo, whiteFurMat, 1.07);
    tailMesh.position.set(0, 0.2, 0.12);
    tailMesh.rotation.x = -0.6;
    tailPivot.add(tailMesh);

    // 5. Four Articulated Legs (Front legs have red jacket sleeves; paws can switch to Red Sneakers)
    const legGeo = new THREE.CapsuleGeometry(0.13, 0.32, 6, 10);
    const pawGeo = new THREE.SphereGeometry(0.15, 10, 10);

    function createLeg(x, z, isFront) {
        const legPivot = new THREE.Group();
        legPivot.position.set(x, -0.22, z);
        const upperMat = isFront ? jacketRedMat : whiteFurMat;
        const limb = createCelPart(legGeo, upperMat, 1.06);
        limb.position.y = -0.18;
        legPivot.add(limb);

        const paw = createCelPart(pawGeo, whiteFurMat, 1.06);
        paw.scale.set(1.0, 0.75, 1.25);
        paw.position.set(0, -0.42, -0.05);
        legPivot.add(paw);

        bodyPivot.add(legPivot);
        return { legPivot, paw };
    }

    const frontL = createLeg(-0.28, -0.34, true);
    const frontR = createLeg(0.28, -0.34, true);
    const backL = createLeg(-0.28, 0.36, false);
    const backR = createLeg(0.28, 0.36, false);
    const paws = [frontL.paw, frontR.paw, backL.paw, backR.paw];

    // 6. Super Rio Flowing Golden-Red Cape (Multi-segment for wave animation)
    const superCapeGroup = new THREE.Group();
    superCapeGroup.position.set(0, 0.38, -0.25);
    const capeSegments = [];
    const numSegments = 4;
    for (let i = 0; i < numSegments; i++) {
        const segWidth = 0.75 + i * 0.14;
        const segGeo = new THREE.BoxGeometry(segWidth, 0.05, 0.34);
        const segMat = i % 2 === 0 ? superCapeMat : goldMetalMat;
        const seg = createCelPart(segGeo, segMat, 1.04);
        seg.position.set(0, 0.05 - i * 0.03, 0.2 + i * 0.3);
        superCapeGroup.add(seg);
        capeSegments.push(seg);
    }
    superCapeGroup.visible = false;
    bodyPivot.add(superCapeGroup);

    // 7. Neon Cyber Ring Aura under Rio (for Overdrive / Super modes)
    const auraGeo = new THREE.RingGeometry(0.65, 0.85, 24);
    auraGeo.rotateX(-Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
    });
    const auraRing = new THREE.Mesh(auraGeo, auraMat);
    auraRing.position.y = 0.03;
    auraRing.visible = false;
    root.add(auraRing);

    // State Helpers attached to userData
    root.userData = {
        bodyPivot,
        headGroup,
        earL,
        earR,
        tailPivot,
        frontL: frontL.legPivot,
        frontR: frontR.legPivot,
        backL: backL.legPivot,
        backR: backR.legPivot,
        paws,
        tongue,
        superVisor,
        superCapeGroup,
        capeSegments,
        auraRing,
        auraMat,
        whiteFurMat,
        sneakerRedMat,
        runCycle: 0,
        flipAngle: 0,
        isSuper: false,
        isOverdrive: false,

        setSuperMode(enabled) {
            this.isSuper = enabled;
            superVisor.visible = enabled;
            superCapeGroup.visible = enabled;
            tongue.visible = enabled || this.isOverdrive;
            auraRing.visible = enabled || this.isOverdrive;
            if (enabled) {
                auraMat.color.setHex(0xffd700);
                paws.forEach(p => { p.material = sneakerRedMat; });
            } else if (this.isOverdrive) {
                auraMat.color.setHex(0x00f0ff);
                paws.forEach(p => { p.material = sneakerRedMat; });
            } else {
                paws.forEach(p => { p.material = whiteFurMat; });
            }
        },

        setOverdriveMode(enabled) {
            this.isOverdrive = enabled;
            tongue.visible = enabled || this.isSuper;
            auraRing.visible = enabled || this.isSuper;
            if (enabled) {
                if (!this.isSuper) auraMat.color.setHex(0x00f0ff);
                paws.forEach(p => { p.material = sneakerRedMat; });
            } else if (!this.isSuper) {
                paws.forEach(p => { p.material = whiteFurMat; });
            }
        }
    };

    return root;
}

/**
 * Updates Rio's 3D skeletal/procedural animation every frame
 */
export function animateRioMesh(rioRoot, { timeScale, gameSpeed, grounded, vy, jumpCount, laneVelocityX }) {
    const ud = rioRoot.userData;
    if (!ud) return;

    const cycleSpeed = 0.24 * (gameSpeed / 8) * timeScale;
    ud.runCycle += cycleSpeed;

    if (grounded) {
        // Gallop leg swing
        const swing = Math.sin(ud.runCycle) * 0.75;
        const oppSwing = Math.sin(ud.runCycle + Math.PI) * 0.75;
        ud.frontL.rotation.x = swing;
        ud.backR.rotation.x = swing;
        ud.frontR.rotation.x = oppSwing;
        ud.backL.rotation.x = oppSwing;

        // Energetic bounce
        ud.bodyPivot.position.y = 0.85 + Math.abs(Math.cos(ud.runCycle)) * 0.12;
        ud.flipAngle = 0;
        ud.bodyPivot.rotation.x = THREE.MathUtils.lerp(ud.bodyPivot.rotation.x, 0.06, 0.2);
    } else {
        // Airborne pose
        ud.frontL.rotation.x = -0.65;
        ud.frontR.rotation.x = -0.65;
        ud.backL.rotation.x = 0.65;
        ud.backR.rotation.x = 0.65;

        if (jumpCount >= 2) {
            // Double-jump anime somersault spin!
            ud.flipAngle -= 0.26 * timeScale;
            ud.bodyPivot.rotation.x = ud.flipAngle;
        } else {
            // Single jump dynamic pitch based on vertical velocity
            const targetPitch = THREE.MathUtils.clamp(vy * 0.9, -0.55, 0.55);
            ud.bodyPivot.rotation.x = THREE.MathUtils.lerp(ud.bodyPivot.rotation.x, targetPitch, 0.25);
        }
    }

    // Lateral banking when weaving between lanes
    const targetBank = THREE.MathUtils.clamp(-laneVelocityX * 1.4, -0.42, 0.42);
    ud.bodyPivot.rotation.z = THREE.MathUtils.lerp(ud.bodyPivot.rotation.z, targetBank, 0.22);
    ud.bodyPivot.rotation.y = THREE.MathUtils.lerp(ud.bodyPivot.rotation.y, -laneVelocityX * 0.9, 0.22);

    // Floppy Ears & Wagging Tail
    const earFlap = Math.abs(Math.sin(ud.runCycle)) * 0.25 + (grounded ? 0 : 0.35);
    ud.earL.rotation.z = 0.45 + earFlap;
    ud.earR.rotation.z = -0.45 - earFlap;
    ud.tailPivot.rotation.z = Math.sin(ud.runCycle * 1.5) * 0.38;

    // Super Cape wave animation
    if (ud.isSuper) {
        ud.capeSegments.forEach((seg, idx) => {
            seg.position.y = 0.05 - idx * 0.02 + Math.sin(ud.runCycle * 1.8 - idx * 0.9) * 0.07;
            seg.rotation.x = Math.cos(ud.runCycle * 1.8 - idx * 0.9) * 0.18;
        });
    }

    // Aura ring pulse
    if (ud.auraRing.visible) {
        ud.auraRing.rotation.z += 0.06 * timeScale;
        const s = 1 + Math.sin(ud.runCycle * 0.8) * 0.08;
        ud.auraRing.scale.set(s, s, 1);
    }
}

/**
 * Builds the 3D Cel-Shaded Obstacle Rivals facing toward Rio (+Z):
 * - 'cat': Cyber-Tabby Orange Cat with tiger stripes & glowing yellow anime eyes
 * - 'dog': Golden Retriever Street Cruiser with neon holo-collar
 * - 'dog2': Yakuza Brawler Buff Bulldog with spiked red collar & crossed muscular arms
 */
export function createObstacleMesh(type) {
    const group = new THREE.Group();
    group.name = `Obstacle_${type}`;

    if (type === 'cat') {
        const orangeMat = createToonMaterial(0xff8c24);
        const stripeMat = createToonMaterial(0x9e3d00);
        const eyeMat = createToonMaterial(0xffe600, { emissive: 0xffaa00, emissiveIntensity: 0.6 });
        const earPinkMat = createToonMaterial(0xff7eb3);

        // Agile feline body
        const body = createCelPart(new THREE.CapsuleGeometry(0.34, 0.55, 8, 12), orangeMat, 1.07);
        body.rotation.x = Math.PI / 2;
        body.position.y = 0.55;
        group.add(body);

        // Tiger stripes on back
        for (let i = -1; i <= 1; i++) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.12, 0.12), stripeMat);
            stripe.position.set(0, 0.72, i * 0.22);
            group.add(stripe);
        }

        // Cat Head
        const head = createCelPart(new THREE.SphereGeometry(0.38, 14, 14), orangeMat, 1.07);
        head.scale.set(1.1, 0.95, 0.95);
        head.position.set(0, 0.98, 0.38);
        group.add(head);

        // Pointed Cat Ears
        const earGeo = new THREE.ConeGeometry(0.16, 0.34, 4);
        [-1, 1].forEach((dir) => {
            const ear = createCelPart(earGeo, orangeMat, 1.06);
            ear.position.set(dir * 0.24, 1.32, 0.36);
            ear.rotation.z = -dir * 0.25;
            group.add(ear);

            const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), earPinkMat);
            innerEar.position.set(dir * 0.24, 1.3, 0.42);
            innerEar.rotation.z = -dir * 0.25;
            group.add(innerEar);

            // Glowing Anime Yellow Eyes
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), eyeMat);
            eye.scale.set(1.1, 1.3, 0.7);
            eye.position.set(dir * 0.15, 1.02, 0.7);
            group.add(eye);
        });

        // Tall S-curve Cat Tail
        const tail = createCelPart(new THREE.CapsuleGeometry(0.09, 0.65, 6, 10), orangeMat, 1.07);
        tail.position.set(0, 0.95, -0.45);
        tail.rotation.x = -0.35;
        group.add(tail);

        // 4 Legs
        const legGeo = new THREE.CapsuleGeometry(0.1, 0.34, 6, 8);
        [[-0.2, 0.28], [0.2, 0.28], [-0.2, -0.25], [0.2, -0.25]].forEach(([lx, lz]) => {
            const leg = createCelPart(legGeo, orangeMat, 1.06);
            leg.position.set(lx, 0.25, lz);
            group.add(leg);
        });

        group.userData = { animPhase: Math.random() * Math.PI * 2, tail };
    } else if (type === 'dog') {
        // Golden Retriever Street Cruiser
        const goldFurMat = createToonMaterial(0xf2b441);
        const creamFurMat = createToonMaterial(0xffe599);
        const darkMat = createToonMaterial(0x1b1924);
        const collarMat = createToonMaterial(0x00f0ff, { emissive: 0x00f0ff, emissiveIntensity: 0.6 });

        const body = createCelPart(new THREE.CapsuleGeometry(0.44, 0.72, 8, 14), goldFurMat, 1.07);
        body.rotation.x = Math.PI / 2;
        body.position.y = 0.74;
        group.add(body);

        // Fluffy chest mane
        const chest = createCelPart(new THREE.SphereGeometry(0.42, 12, 12), creamFurMat, 1.06);
        chest.position.set(0, 0.78, 0.42);
        group.add(chest);

        // Holo-Collar
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 8, 20), collarMat);
        collar.rotation.x = Math.PI / 2.2;
        collar.position.set(0, 0.98, 0.46);
        group.add(collar);

        // Head & Snout
        const head = createCelPart(new THREE.SphereGeometry(0.42, 14, 14), goldFurMat, 1.07);
        head.position.set(0, 1.24, 0.48);
        group.add(head);

        const snout = createCelPart(new THREE.CapsuleGeometry(0.19, 0.22, 6, 10), creamFurMat, 1.06);
        snout.rotation.x = Math.PI / 2;
        snout.position.set(0, 1.15, 0.82);
        group.add(snout);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), darkMat);
        nose.position.set(0, 1.21, 0.98);
        group.add(nose);

        // Ears & Eyes
        const earGeo = new THREE.CapsuleGeometry(0.13, 0.32, 6, 10);
        [-1, 1].forEach((dir) => {
            const ear = createCelPart(earGeo, goldFurMat, 1.06);
            ear.position.set(dir * 0.38, 1.2, 0.44);
            ear.rotation.z = dir * 0.35;
            group.add(ear);

            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), darkMat);
            eye.position.set(dir * 0.16, 1.32, 0.82);
            group.add(eye);
        });

        // Plumed Tail
        const tail = createCelPart(new THREE.CapsuleGeometry(0.13, 0.5, 6, 10), creamFurMat, 1.06);
        tail.position.set(0, 0.95, -0.58);
        tail.rotation.x = -0.6;
        group.add(tail);

        // 4 Legs
        const legGeo = new THREE.CapsuleGeometry(0.13, 0.45, 6, 10);
        [[-0.25, 0.34], [0.25, 0.34], [-0.25, -0.34], [0.25, -0.34]].forEach(([lx, lz]) => {
            const leg = createCelPart(legGeo, goldFurMat, 1.06);
            leg.position.set(lx, 0.32, lz);
            group.add(leg);
        });

        group.userData = { animPhase: Math.random() * Math.PI * 2, tail };
    } else {
        // 'dog2': Buff Bulldog Brawler (Spiked Red Collar & Crossed Muscular Arms)
        const brownMat = createToonMaterial(0xb5652d);
        const bellyMat = createToonMaterial(0xe6e8ef);
        const collarRedMat = createToonMaterial(0xd61f2c);
        const spikeChromeMat = createToonMaterial(0xf0f4ff, { emissive: 0x88aaff, emissiveIntensity: 0.3 });
        const darkMat = createToonMaterial(0x14141d);

        // Muscular upright brawler torso
        const torso = createCelPart(new THREE.CylinderGeometry(0.68, 0.54, 1.15, 14), brownMat, 1.07);
        torso.position.y = 0.85;
        group.add(torso);

        // White/Grey Chest Plate
        const chestPlate = new THREE.Mesh(new THREE.SphereGeometry(0.54, 12, 12), bellyMat);
        chestPlate.scale.set(0.95, 1.05, 0.55);
        chestPlate.position.set(0, 0.82, 0.35);
        group.add(chestPlate);

        // Crossed Muscular Arms in front of chest!
        const armGeo = new THREE.CapsuleGeometry(0.22, 0.58, 8, 12);
        const armL = createCelPart(armGeo, brownMat, 1.06);
        armL.position.set(-0.22, 0.85, 0.55);
        armL.rotation.z = Math.PI / 2.5;
        armL.rotation.y = 0.35;

        const armR = createCelPart(armGeo, brownMat, 1.06);
        armR.position.set(0.22, 0.82, 0.58);
        armR.rotation.z = -Math.PI / 2.5;
        armR.rotation.y = -0.35;
        group.add(armL, armR);

        // Spiked Red Collar
        const collar = createCelPart(new THREE.TorusGeometry(0.56, 0.11, 10, 20), collarRedMat, 1.05);
        collar.rotation.x = Math.PI / 2.1;
        collar.position.set(0, 1.38, 0.08);
        group.add(collar);

        // Chrome Spikes around Collar
        const spikeGeo = new THREE.ConeGeometry(0.08, 0.24, 6);
        for (let i = 0; i < 7; i++) {
            const angle = -Math.PI * 0.15 + (i / 6) * Math.PI * 1.3;
            const spike = new THREE.Mesh(spikeGeo, spikeChromeMat);
            spike.position.set(Math.cos(angle) * 0.64, 1.38, Math.sin(angle) * 0.64 + 0.08);
            spike.rotation.z = -Math.cos(angle) * 1.2;
            spike.rotation.x = Math.sin(angle) * 1.2;
            group.add(spike);
        }

        // Bulldog Head & Heavy Jowls
        const head = createCelPart(new THREE.SphereGeometry(0.52, 14, 14), brownMat, 1.07);
        head.scale.set(1.15, 0.95, 1.0);
        head.position.set(0, 1.72, 0.18);
        group.add(head);

        const jowlGeo = new THREE.SphereGeometry(0.36, 12, 12);
        const jowls = createCelPart(jowlGeo, bellyMat, 1.06);
        jowls.scale.set(1.35, 0.85, 0.95);
        jowls.position.set(0, 1.58, 0.48);
        group.add(jowls);

        // Lower Underbite Fangs
        const fangGeo = new THREE.ConeGeometry(0.055, 0.16, 5);
        [-1, 1].forEach((dir) => {
            const fang = new THREE.Mesh(fangGeo, spikeChromeMat);
            fang.position.set(dir * 0.18, 1.68, 0.78);
            group.add(fang);

            // Angry Glowing Eyes & Heavy Brow
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), spikeChromeMat);
            eye.position.set(dir * 0.2, 1.82, 0.62);
            group.add(eye);

            const brow = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.1), darkMat);
            brow.position.set(dir * 0.2, 1.92, 0.64);
            brow.rotation.z = -dir * 0.32;
            group.add(brow);
        });

        // Stance Legs
        const legGeo = new THREE.CapsuleGeometry(0.18, 0.35, 6, 10);
        [-0.32, 0.32].forEach((lx) => {
            const leg = createCelPart(legGeo, brownMat, 1.06);
            leg.position.set(lx, 0.26, 0);
            group.add(leg);
        });

        group.userData = { animPhase: Math.random() * Math.PI * 2 };
    }

    return group;
}

/**
 * Builds the 3D Holographic Golden Bone Power-Up
 */
export function createGoldenBoneMesh() {
    const group = new THREE.Group();
    group.name = 'GoldenBone3D';

    const goldMat = createToonMaterial(0xffd700, { emissive: 0xff9900, emissiveIntensity: 0.7 });
    const boneGroup = new THREE.Group();

    const shaft = createCelPart(new THREE.CylinderGeometry(0.13, 0.13, 0.9, 10), goldMat, 1.08);
    shaft.rotation.z = Math.PI / 2;
    boneGroup.add(shaft);

    const knobGeo = new THREE.SphereGeometry(0.2, 10, 10);
    [
        [-0.45, 0.12, 0],
        [-0.45, -0.12, 0],
        [0.45, 0.12, 0],
        [0.45, -0.12, 0]
    ].forEach(([x, y, z]) => {
        const knob = createCelPart(knobGeo, goldMat, 1.06);
        knob.position.set(x, y, z);
        boneGroup.add(knob);
    });

    group.add(boneGroup);

    // Anime Holographic Ring around the Golden Bone
    const ringGeo = new THREE.TorusGeometry(0.75, 0.04, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
    const holoRing = new THREE.Mesh(ringGeo, ringMat);
    group.add(holoRing);

    group.userData = { boneGroup, holoRing };
    return group;
}
