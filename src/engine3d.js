import * as THREE from './vendor/three.module.min.js';

export class Engine3D {
    constructor(canvas) {
        this.canvas = canvas;

        this.scene = new THREE.Scene();
        this.baseSkyColor = new THREE.Color(0x0b071e);
        this.hardSkyColor = new THREE.Color(0x16072b);
        this.expertSkyColor = new THREE.Color(0x2d0528);

        this.scene.background = this.baseSkyColor.clone();
        this.scene.fog = new THREE.FogExp2(0x0b071e, 0.0115);

        this.camera = new THREE.PerspectiveCamera(
            62,
            window.innerWidth / window.innerHeight,
            0.1,
            260
        );

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.setupLights();

        this.camCurrentPos = new THREE.Vector3(0, 4.2, 8.2);
        this.camLookTarget = new THREE.Vector3(0, 1.5, -14);

        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    setupLights() {
        // Warm/Cool Anime Hemisphere Light
        this.hemiLight = new THREE.HemisphereLight(0x88d4ff, 0x2b0938, 1.25);
        this.hemiLight.position.set(0, 30, 0);
        this.scene.add(this.hemiLight);

        // Key Directional Light for crisp cel-shaded bands and shadows
        this.dirLight = new THREE.DirectionalLight(0xfff0dd, 1.8);
        this.dirLight.position.set(12, 24, 16);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;
        this.dirLight.shadow.camera.near = 1;
        this.dirLight.shadow.camera.far = 85;
        const d = 16;
        this.dirLight.shadow.camera.left = -d;
        this.dirLight.shadow.camera.right = d;
        this.dirLight.shadow.camera.top = d;
        this.dirLight.shadow.camera.bottom = -d;
        this.scene.add(this.dirLight);

        // Rim / Back Neon Accent Light from the Neo-Tokyo horizon
        this.rimLight = new THREE.DirectionalLight(0xff2e63, 1.1);
        this.rimLight.position.set(0, 8, -30);
        this.scene.add(this.rimLight);
    }

    handleResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const aspect = w / h;

        this.camera.aspect = aspect;

        // Adapt FOV & third-person distance for both Landscape and Portrait
        if (aspect < 1.0) {
            // Portrait mobile: wider vertical view & slightly further back so all 3 lanes stay clearly visible
            this.baseFov = 72;
            this.baseCamZ = 9.8;
            this.baseCamY = 4.9;
        } else {
            // Landscape desktop/mobile
            this.baseFov = 60;
            this.baseCamZ = 7.6;
            this.baseCamY = 3.9;
        }

        this.camera.fov = this.baseFov;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    updateAtmosphere(isHardMode, isExpertMode, isSuper) {
        const targetColor = isExpertMode
            ? this.expertSkyColor
            : (isHardMode ? this.hardSkyColor : this.baseSkyColor);

        this.scene.background.lerp(targetColor, 0.03);
        this.scene.fog.color.copy(this.scene.background);

        if (isSuper) {
            this.rimLight.color.setHex(0xffd700);
            this.rimLight.intensity = 1.8;
        } else if (isExpertMode) {
            this.rimLight.color.setHex(0xb5179e);
            this.rimLight.intensity = 1.4;
        } else {
            this.rimLight.color.setHex(0xff2e63);
            this.rimLight.intensity = 1.1;
        }
    }

    updateChaseCamera({ playerX, playerY, gameSpeed, isSuper, isMenu, shakeOffset, timeScale }) {
        if (isMenu) {
            // Cinematic Hero Showcase angle on Start Screen
            const t = performance.now() * 0.0007;
            const targetPos = new THREE.Vector3(
                Math.sin(t) * 2.2,
                2.8,
                6.2
            );
            this.camCurrentPos.lerp(targetPos, 0.06);
            this.camera.position.copy(this.camCurrentPos);
            this.camLookTarget.set(0, 1.3, -10);
            this.camera.lookAt(this.camLookTarget);
            return;
        }

        // Dynamic Speed FOV boost
        const speedBoostFov = Math.min((gameSpeed - 8) * 0.65, 14) + (isSuper ? 5 : 0);
        const targetFov = this.baseFov + Math.max(0, speedBoostFov);
        if (Math.abs(this.camera.fov - targetFov) > 0.05) {
            this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.08 * timeScale);
            this.camera.updateProjectionMatrix();
        }

        // Follow Rio laterally (62% of lane offset so all 3 lanes stay framed) and vertically (35% of jump height)
        const desiredX = playerX * 0.62 + (shakeOffset ? shakeOffset.x : 0);
        const desiredY = this.baseCamY + playerY * 0.32 + (shakeOffset ? shakeOffset.y : 0);
        const desiredZ = this.baseCamZ + (isSuper ? 0.65 : 0);

        this.camCurrentPos.x = THREE.MathUtils.lerp(this.camCurrentPos.x, desiredX, 0.14 * timeScale);
        this.camCurrentPos.y = THREE.MathUtils.lerp(this.camCurrentPos.y, desiredY, 0.14 * timeScale);
        this.camCurrentPos.z = THREE.MathUtils.lerp(this.camCurrentPos.z, desiredZ, 0.1 * timeScale);

        this.camera.position.copy(this.camCurrentPos);

        // Look slightly ahead of Rio down the Neo-Tokyo highway
        const lookX = playerX * 0.35;
        const lookY = 1.4 + playerY * 0.18;
        this.camLookTarget.set(lookX, lookY, -16);
        this.camera.lookAt(this.camLookTarget);

        // Subtle Dutch tilt when weaving across lanes
        const lateralDelta = desiredX - this.camCurrentPos.x;
        this.camera.rotation.z = THREE.MathUtils.clamp(-lateralDelta * 0.08, -0.06, 0.06);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
