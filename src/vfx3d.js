import * as THREE from './vendor/three.module.min.js';

export class VFXSystem3D {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.shakeTimer = 0;
        this.shakeMagnitude = 0;

        this.boxGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
        this.trailGeo = new THREE.OctahedronGeometry(0.18, 0);
    }

    triggerShake(magnitude = 0.35, durationFrames = 18) {
        this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
        this.shakeTimer = Math.max(this.shakeTimer, durationFrames);
    }

    createExplosion(x, y, z, colorChoice = 'gold') {
        const palette = {
            gold: [0xffd700, 0xffaa00, 0xffffff, 0xff2e63],
            orange: [0xff5500, 0xffaa00, 0xff2e43, 0xffe600],
            cyan: [0x00f0ff, 0x7209b7, 0xff2e63, 0xffffff]
        };
        const colors = palette[colorChoice] || palette.gold;

        for (let i = 0; i < 32; i++) {
            const hex = colors[i % colors.length];
            const mat = new THREE.MeshBasicMaterial({
                color: hex,
                transparent: true,
                opacity: 1.0
            });
            const mesh = new THREE.Mesh(this.boxGeo, mat);
            mesh.position.set(x, y, z);

            const angle = Math.random() * Math.PI * 2;
            const speed = 0.08 + Math.random() * 0.28;
            this.scene.add(mesh);

            this.particles.push({
                mesh,
                vx: Math.cos(angle) * speed,
                vy: 0.1 + Math.random() * 0.28,
                vz: Math.sin(angle) * speed,
                rx: (Math.random() - 0.5) * 0.3,
                ry: (Math.random() - 0.5) * 0.3,
                gravity: -0.012,
                life: 1.0,
                decay: 0.025 + Math.random() * 0.015
            });
        }
    }

    createTrail(x, y, z, isSuper = true) {
        const mat = new THREE.MeshBasicMaterial({
            color: isSuper ? 0xffd700 : 0x00f0ff,
            transparent: true,
            opacity: 0.85
        });
        const mesh = new THREE.Mesh(this.trailGeo, mat);
        mesh.position.set(
            x + (Math.random() - 0.5) * 0.5,
            y + (Math.random() - 0.5) * 0.3,
            z + 0.55
        );
        this.scene.add(mesh);

        this.particles.push({
            mesh,
            vx: (Math.random() - 0.5) * 0.03,
            vy: (Math.random() - 0.5) * 0.03,
            vz: 0.22,
            rx: 0.15,
            ry: 0.15,
            gravity: 0,
            life: 0.65,
            decay: 0.045
        });
    }

    createFloatingText(text, color = '#00f0ff') {
        const container = document.getElementById('game-container');
        if (!container) return;

        const el = document.createElement('div');
        el.className = 'anime-callout';
        el.innerText = text;
        el.style.color = color;
        el.style.textShadow = `0 0 12px ${color}, 3px 3px 0 #000`;
        container.appendChild(el);

        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 1250);
    }

    update(timeScale) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.x += p.vx * timeScale;
            p.mesh.position.y += p.vy * timeScale;
            p.mesh.position.z += p.vz * timeScale;
            p.vy += p.gravity * timeScale;

            p.mesh.rotation.x += p.rx * timeScale;
            p.mesh.rotation.y += p.ry * timeScale;

            p.life -= p.decay * timeScale;
            const s = Math.max(0.01, p.life);
            p.mesh.scale.setScalar(s);
            p.mesh.material.opacity = Math.min(1, p.life * 1.4);

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }

        if (this.shakeTimer > 0) {
            this.shakeTimer -= timeScale;
            if (this.shakeTimer <= 0) {
                this.shakeTimer = 0;
                this.shakeMagnitude = 0;
            }
        }
    }

    getShakeOffset() {
        if (this.shakeTimer <= 0) return { x: 0, y: 0 };
        const factor = Math.min(1, this.shakeTimer / 10);
        return {
            x: (Math.random() - 0.5) * this.shakeMagnitude * factor,
            y: (Math.random() - 0.5) * this.shakeMagnitude * factor
        };
    }

    clear() {
        for (const p of this.particles) {
            this.scene.remove(p.mesh);
            p.mesh.material.dispose();
        }
        this.particles = [];
        this.shakeTimer = 0;
        this.shakeMagnitude = 0;
    }
}
