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

interface Shockwave {
    mesh: THREE.Mesh;
    maxScale: number;
    lifetime: number;
    initialLifetime: number;
}

interface FillingFace {
    mesh: THREE.Mesh;
    lifetime: number;
    initialLifetime: number;
}

export class VFXManager {
    
    private shatterParticles: ShatterParticle[] = [];
    private moveRings: THREE.Mesh[] = [];
    private captureExplosions: ExplosionParticleSystem[] = [];
    private shockwaves: Shockwave[] = [];
    private fillingFaces: FillingFace[] = [];

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
        const normal = position.clone().normalize();

        // 1. Double Concentric Rings!
        const ringGeom1 = new THREE.RingGeometry(0.4, 0.48, 32);
        const ringMat1 = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
        const ring1 = new THREE.Mesh(ringGeom1, ringMat1);
        ring1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        ring1.position.copy(position);
        ring1.userData.lifetime = 0.8;
        ring1.userData.speed = 8.0;
        this.moveRings.push(ring1);
        this.parentGroup.add(ring1);

        const ringGeom2 = new THREE.RingGeometry(0.2, 0.25, 32);
        const ringMat2 = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
        const ring2 = new THREE.Mesh(ringGeom2, ringMat2);
        ring2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        ring2.position.copy(position);
        ring2.userData.lifetime = 1.2;
        ring2.userData.speed = 4.0;
        this.moveRings.push(ring2);
        this.parentGroup.add(ring2);

        // 2. Sparkling burst particles!
        const sparkCount = 10;
        const positions = new Float32Array(sparkCount * 3);
        const velocities: THREE.Vector3[] = [];
        for (let i = 0; i < sparkCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            // Shoot out randomly on the plane of the normal
            const tangent = new THREE.Vector3(1, 0, 0).cross(normal);
            if (tangent.lengthSq() < 0.01) tangent.set(0, 1, 0).cross(normal);
            tangent.normalize();
            const bitangent = normal.clone().cross(tangent).normalize();
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 3;
            const vel = tangent.clone().multiplyScalar(Math.cos(angle)).add(bitangent.clone().multiplyScalar(Math.sin(angle))).multiplyScalar(speed);
            vel.add(normal.clone().multiplyScalar(Math.random() * 2)); // slight push outward
            velocities.push(vel);
        }

        const sparkGeom = new THREE.BufferGeometry();
        sparkGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const sparkMat = new THREE.PointsMaterial({
            size: 0.25,
            color: color,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const sparkPoints = new THREE.Points(sparkGeom, sparkMat);
        this.parentGroup.add(sparkPoints);

        const sparkLifetime = 0.8;
        this.captureExplosions.push({
            points: sparkPoints,
            geometry: sparkGeom,
            material: sparkMat,
            positions,
            velocities,
            lifetime: sparkLifetime,
            initialLifetime: sparkLifetime,
        });
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


    public triggerFillingAnimation(geometries: THREE.BufferGeometry[], playerColor: THREE.Color) {
        geometries.forEach(geom => {
            // Find geometry center so we can scale from center
            const center = new THREE.Vector3();
            const posAttr = geom.getAttribute('position');
            if (!posAttr) return;

            for (let i = 0; i < posAttr.count; i++) {
                center.add(new THREE.Vector3().fromBufferAttribute(posAttr, i));
            }
            center.divideScalar(posAttr.count);

            const localGeom = geom.clone();
            localGeom.translate(-center.x, -center.y, -center.z);

            const fillMat = new THREE.MeshStandardMaterial({
                color: playerColor,
                emissive: playerColor,
                emissiveIntensity: 3.5, // Bright flash!
                transparent: true,
                opacity: 0.95,
                side: THREE.DoubleSide,
                metalness: 0.2,
                roughness: 0.2,
            });

            const mesh = new THREE.Mesh(localGeom, fillMat);
            mesh.position.copy(center);
            mesh.scale.set(0.01, 0.01, 0.01);

            this.parentGroup.add(mesh);

            const lifetime = 0.9; // Smooth spring over 0.9 seconds
            this.fillingFaces.push({
                mesh,
                lifetime,
                initialLifetime: lifetime,
            });
        });
    }


    public triggerCaptureExplosion(center: THREE.Vector3, baseColor: THREE.Color) {
        // 1. Spawning glowing explosion particles
        const particleCount = 220;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities: THREE.Vector3[] = [];

        for (let i = 0; i < particleCount; i++) {
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
            const speed = Math.random() * 11 + 5; // speed range 5 - 16 (faster!)
            const velocity = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta),
                Math.sin(phi) * Math.sin(theta),
                Math.cos(phi)
            ).multiplyScalar(speed);

            velocity.y += Math.random() * 4 + 1.5; // slight upward burst force
            velocities.push(velocity);

            // Set beautiful glowing particle color
            const pColor = baseColor.clone();
            const rand = Math.random();
            if (rand > 0.75) {
                pColor.lerp(new THREE.Color(0xffffff), 0.95); // White hot core
            } else if (rand > 0.4) {
                pColor.lerp(new THREE.Color(0xffffff), 0.4); // Bright spark
            } else {
                pColor.multiplyScalar(Math.random() * 0.3 + 0.85); // Pure saturated hue
            }

            colors[i * 3] = pColor.r;
            colors[i * 3 + 1] = pColor.g;
            colors[i * 3 + 2] = pColor.b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.4,
            sizeAttenuation: true,
            transparent: true,
            opacity: 1.0,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        this.parentGroup.add(points);

        const lifetime = Math.random() * 0.4 + 1.3;
        this.captureExplosions.push({
            points,
            geometry,
            material,
            positions,
            velocities,
            lifetime,
            initialLifetime: lifetime,
        });

        // 2. Glowing Expandable Ring/Shockwave!
        const shockGeom = new THREE.RingGeometry(0.1, 0.15, 64);
        const shockMat = new THREE.MeshBasicMaterial({
            color: baseColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const shockMesh = new THREE.Mesh(shockGeom, shockMat);
        
        // Orient ring randomly but nicely (facing outwards from grid center)
        const normal = center.clone().normalize();
        shockMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        shockMesh.position.copy(center);

        this.parentGroup.add(shockMesh);
        this.shockwaves.push({
            mesh: shockMesh,
            maxScale: 35.0, // Large dramatic expander
            lifetime: 0.7,
            initialLifetime: 0.7,
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
            const scaleSpeed = ring.userData.speed || 5.0;
            const scale = 1.0 + (1.0 - ring.userData.lifetime) * scaleSpeed;
            ring.scale.set(scale, scale, scale);
            (ring.material as THREE.MeshBasicMaterial).opacity = ring.userData.lifetime;
            return true;
        });

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
                velocities[i].multiplyScalar(Math.max(0.91, 1 - 0.18 * deltaTime)); // drag
                velocities[i].y -= 5 * deltaTime; // minor gravity drift

                positions[i * 3] += velocities[i].x * deltaTime;
                positions[i * 3 + 1] += velocities[i].y * deltaTime;
                positions[i * 3 + 2] += velocities[i].z * deltaTime;
            }

            exp.geometry.attributes.position.needsUpdate = true;

            exp.material.opacity = ratio;
            exp.material.size = 0.4 * Math.sin(ratio * Math.PI / 2); // organic scale-down

            return true;
        });

        // Update shockwaves
        this.shockwaves = this.shockwaves.filter(sw => {
            sw.lifetime -= deltaTime;
            if (sw.lifetime <= 0) {
                this.parentGroup.remove(sw.mesh);
                sw.mesh.geometry.dispose();
                (sw.mesh.material as THREE.Material).dispose();
                return false;
            }

            const progress = 1.0 - (sw.lifetime / sw.initialLifetime);
            // Quick linear or quad out expander
            const currentScale = 1.0 + progress * sw.maxScale;
            sw.mesh.scale.set(currentScale, currentScale, currentScale);
            
            const mat = sw.mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = Math.max(0, 1.0 - progress);
            return true;
        });

        // Update filling face animations (with beautiful elastic out spring bounce!)
        this.fillingFaces = this.fillingFaces.filter(ff => {
            ff.lifetime -= deltaTime;
            if (ff.lifetime <= 0) {
                this.parentGroup.remove(ff.mesh);
                ff.mesh.geometry.dispose();
                (ff.mesh.material as THREE.Material).dispose();
                return false;
            }

            const progress = 1.0 - (ff.lifetime / ff.initialLifetime);
            
            // Elastic out spring bounce equation
            // f(t) = -2^(-8t) * sin((8t - 0.75) * 2pi/3) + 1
            const elasticScale = -Math.pow(2, -8 * progress) * Math.sin((progress * 8 - 0.75) * ((2 * Math.PI) / 3)) + 1;
            
            ff.mesh.scale.set(elasticScale, elasticScale, elasticScale);

            const mat = ff.mesh.material as THREE.MeshStandardMaterial;
            // Fade emissive intensity down to a steady 0.3 matching normal claims
            mat.emissiveIntensity = THREE.MathUtils.lerp(3.5, 0.3, progress);
            mat.opacity = THREE.MathUtils.lerp(0.95, 0.8, progress);

            return true;
        });
    }
    
    public isAnimationRunning = () => 
        this.isShattering || 
        this.captureExplosions.length > 0 || 
        this.shockwaves.length > 0 || 
        this.fillingFaces.length > 0;


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

        this.shockwaves.forEach(sw => {
            if (this.parentGroup.children.includes(sw.mesh)) {
                this.parentGroup.remove(sw.mesh);
            }
            sw.mesh.geometry.dispose();
            (sw.mesh.material as THREE.Material).dispose();
        });

        this.fillingFaces.forEach(ff => {
            if (this.parentGroup.children.includes(ff.mesh)) {
                this.parentGroup.remove(ff.mesh);
            }
            ff.mesh.geometry.dispose();
            (ff.mesh.material as THREE.Material).dispose();
        });

        this.shatterParticles = [];
        this.moveRings = [];
        this.captureExplosions = [];
        this.shockwaves = [];
        this.fillingFaces = [];
        this.shatterMaterial.dispose();
    }
}
