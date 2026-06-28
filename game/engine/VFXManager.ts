
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

interface ShatterParticle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotationAxis: THREE.Vector3;
    rotationSpeed: number;
    lifetime: number;
    initialLifetime: number;
}

interface ExplosionParticleSystem {
    points: THREE.Points;
    geometry: THREE.BufferGeometry;
    material: THREE.PointsMaterial;
    positions: Float32Array;
    velocities: THREE.Vector3[];
    lifetime: number;
    initialLifetime: number;
}

export class VFXManager {
    
    private shatterParticles: ShatterParticle[] = [];
    private moveRings: THREE.Mesh[] = [];
    private captureExplosions: ExplosionParticleSystem[] = [];

    private shatterMaterial: THREE.MeshStandardMaterial;
    public isShattering = false;


    constructor(private parentGroup: THREE.Group) {
        this.shatterMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, // "Black mirror"
            metalness: 0.95,
            roughness: 0.1,
            side: THREE.DoubleSide,
            transparent: true,
        });
    }


    public triggerMoveVFX(position: THREE.Vector3, color: THREE.Color) {
        const ringGeom = new THREE.RingGeometry(0.5, 0.6, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        
        // Orient the ring to face away from the grid center, approximating facing the camera
        const normal = position.clone().normalize();
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        ring.position.copy(position);

        ring.userData.lifetime = 1.0;
        this.moveRings.push(ring);
        this.parentGroup.add(ring);
    }


    public triggerShatterEffect(geometries: THREE.BufferGeometry[], origin: THREE.Vector3) {
        if (geometries.length === 0) return;
        this.isShattering = true;
        const mergedGeom = mergeGeometries(geometries);
        if (!mergedGeom) return;

        const positionAttribute = mergedGeom.getAttribute('position');
        const indexAttribute = mergedGeom.index;

        const triangles = [];
        if (indexAttribute) {
            for (let i = 0; i < indexAttribute.count; i += 3) {
                const iA = indexAttribute.getX(i);
                const iB = indexAttribute.getX(i + 1);
                const iC = indexAttribute.getX(i + 2);
                triangles.push([iA, iB, iC]);
            }
        } else {
             for (let i = 0; i < positionAttribute.count; i += 3) {
                triangles.push([i, i + 1, i + 2]);
            }
        }

        triangles.forEach(indices => {
            const [iA, iB, iC] = indices;
            const vA = new THREE.Vector3().fromBufferAttribute(positionAttribute, iA);
            const vB = new THREE.Vector3().fromBufferAttribute(positionAttribute, iB);
            const vC = new THREE.Vector3().fromBufferAttribute(positionAttribute, iC);

            const triGeom = new THREE.BufferGeometry();
            triGeom.setAttribute('position', new THREE.Float32BufferAttribute([vA.x, vA.y, vA.z, vB.x, vB.y, vB.z, vC.x, vC.y, vC.z], 3));
            triGeom.computeVertexNormals();

            const mesh = new THREE.Mesh(triGeom, this.shatterMaterial);
            
            const center = new THREE.Vector3().add(vA).add(vB).add(vC).divideScalar(3);
            mesh.position.copy(center);
            triGeom.translate(-center.x, -center.y, -center.z);

            const velocity = center.clone().sub(origin).normalize().multiplyScalar(Math.random() * 25 + 20);
            velocity.add(new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(8));
            const rotationAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
            const rotationSpeed = Math.random() * 5 + 2;
            const lifetime = Math.random() * 1.5 + 1.0;

            this.shatterParticles.push({ mesh, velocity, rotationAxis, rotationSpeed, lifetime, initialLifetime: lifetime });
            this.parentGroup.add(mesh);
        });

        mergedGeom.dispose();
    }


    public triggerCaptureExplosion(center: THREE.Vector3, baseColor: THREE.Color) {
        const particleCount = 200;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities: THREE.Vector3[] = [];

        for (let i = 0; i < particleCount; i++) {
            // Start very close to center
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            );
            positions[i * 3] = center.x + offset.x;
            positions[i * 3 + 1] = center.y + offset.y;
            positions[i * 3 + 2] = center.z + offset.z;

            // Explode spherically
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const speed = Math.random() * 8 + 4; // speed range 4 - 12
            const velocity = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta),
                Math.sin(phi) * Math.sin(theta),
                Math.cos(phi)
            ).multiplyScalar(speed);

            // Add a slight upward burst force
            velocity.y += Math.random() * 3 + 1;
            velocities.push(velocity);

            // Set beautiful glowing particle color
            const pColor = baseColor.clone();
            const rand = Math.random();
            if (rand > 0.8) {
                // Bright spark (white)
                pColor.lerp(new THREE.Color(0xffffff), 0.95);
            } else if (rand > 0.4) {
                // Mid-bright accent
                pColor.lerp(new THREE.Color(0xffffff), 0.4);
            } else {
                // Deeper player hue
                pColor.multiplyScalar(Math.random() * 0.2 + 0.8);
            }

            colors[i * 3] = pColor.r;
            colors[i * 3 + 1] = pColor.g;
            colors[i * 3 + 2] = pColor.b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.35,
            sizeAttenuation: true,
            transparent: true,
            opacity: 1.0,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        this.parentGroup.add(points);

        const lifetime = Math.random() * 0.5 + 1.2; // 1.2 to 1.7 seconds
        this.captureExplosions.push({
            points,
            geometry,
            material,
            positions,
            velocities,
            lifetime,
            initialLifetime: lifetime,
        });
    }


    public update(deltaTime: number) {
        // Update shatter particles
        if (this.shatterParticles.length > 0) {
            this.shatterParticles = this.shatterParticles.filter(p => {
                p.lifetime -= deltaTime;
                if (p.lifetime <= 0) {
                    this.parentGroup.remove(p.mesh);
                    p.mesh.geometry.dispose();
                    return false;
                }
                p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));
                p.velocity.y -= 20 * deltaTime; // gravity
                p.mesh.rotateOnAxis(p.rotationAxis, p.rotationSpeed * deltaTime);
                (p.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, p.lifetime / (p.initialLifetime * 0.5));
                return true;
            });

            if (this.shatterParticles.length === 0) {
                this.isShattering = false;
            }
        }


        // Update move rings
        this.moveRings = this.moveRings.filter(ring => {
            ring.userData.lifetime -= deltaTime;
             if (ring.userData.lifetime <= 0) {
                this.parentGroup.remove(ring);
                ring.geometry.dispose();
                (ring.material as THREE.Material).dispose();
                return false;
            }
            const scale = 1.0 + (1.0 - ring.userData.lifetime) * 5;
            ring.scale.set(scale, scale, scale);
            (ring.material as THREE.MeshBasicMaterial).opacity = ring.userData.lifetime;
            return true;
        })

        // Update capture explosions (Three.js Points)
        this.captureExplosions = this.captureExplosions.filter(exp => {
            exp.lifetime -= deltaTime;
            if (exp.lifetime <= 0) {
                this.parentGroup.remove(exp.points);
                exp.geometry.dispose();
                exp.material.dispose();
                return false;
            }

            const positions = exp.positions;
            const velocities = exp.velocities;
            const ratio = exp.lifetime / exp.initialLifetime;

            for (let i = 0; i < velocities.length; i++) {
                // Apply drag
                velocities[i].multiplyScalar(Math.max(0.92, 1 - 0.15 * deltaTime));
                // Minor gravity drift
                velocities[i].y -= 6 * deltaTime;

                // Update particle positions
                positions[i * 3] += velocities[i].x * deltaTime;
                positions[i * 3 + 1] += velocities[i].y * deltaTime;
                positions[i * 3 + 2] += velocities[i].z * deltaTime;
            }

            exp.geometry.attributes.position.needsUpdate = true;

            // Fade opacity and shrink size over lifetime
            exp.material.opacity = ratio;
            exp.material.size = 0.35 * Math.sin(ratio * Math.PI / 2); // organic scale-down

            return true;
        });
    }
    
    public isAnimationRunning = () => this.isShattering || this.captureExplosions.length > 0;


    public destroy() {
        [...this.shatterParticles.map(p => p.mesh), ...this.moveRings].forEach(obj => {
            if (this.parentGroup.children.includes(obj)) {
                this.parentGroup.remove(obj);
            }
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
        });

        this.captureExplosions.forEach(exp => {
            if (this.parentGroup.children.includes(exp.points)) {
                this.parentGroup.remove(exp.points);
            }
            exp.geometry.dispose();
            exp.material.dispose();
        });

        this.shatterParticles = [];
        this.moveRings = [];
        this.captureExplosions = [];
        this.shatterMaterial.dispose();
    }
}
