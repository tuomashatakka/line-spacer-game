
import * as THREE from 'three'
import type { Level } from '../levels/Level'
import type { PlayerState } from './GameLogicController'


export class CameraManager {
    
    private perspectiveCamera: THREE.PerspectiveCamera
    private orthographicCamera: THREE.OrthographicCamera
    private activeCamera: THREE.Camera

    private orbitControls = {
        theta: Math.PI / 4,
        phi: Math.PI / 3,
        radius: 1,
        minRadius: 1,
        maxRadius: 1,
    }
    private cameraZoomLevel = 1.0
    private gridBoundingSphere: THREE.Sphere
    private parallaxOffset = new THREE.Vector3();
    
    private shakeInfo = {
        active: false,
        duration: 0,
        intensity: 0,
        timer: 0,
    }


    constructor(
        private mount: HTMLDivElement,
        private scene: THREE.Scene,
        private level: Level,
        gridBoundingSphere: THREE.Sphere
    ) {
        this.gridBoundingSphere = gridBoundingSphere
        const aspect = this.mount.clientWidth / this.mount.clientHeight
        
        const fov = 60;
        this.perspectiveCamera = new THREE.PerspectiveCamera(fov, aspect, 0.1, this.gridBoundingSphere.radius * 30)
        
        const orthoSize = this.gridBoundingSphere.radius * 1.2
        this.orthographicCamera = new THREE.OrthographicCamera(orthoSize * aspect / -2, orthoSize * aspect / 2, orthoSize / 2, orthoSize / -2, 1, this.gridBoundingSphere.radius * 30)
        
        this.activeCamera = this.level.cameraType === '3D' ? this.perspectiveCamera : this.orthographicCamera
        
        this.orbitControls.minRadius = this.gridBoundingSphere.radius * 0.8
        this.orbitControls.maxRadius = this.gridBoundingSphere.radius * 5
        this.orbitControls.radius = this.gridBoundingSphere.radius * 2.5

        if (this.level.cameraType === '2D') {
            this.orthographicCamera.position.z = this.orbitControls.radius;
        }

        this.scene.add(this.perspectiveCamera, this.orthographicCamera)
    }


    public update(deltaTime: number, turnState: string, activePlayer: PlayerState, focusPoint: THREE.Vector3) {
        const targetFocus = new THREE.Vector3();
        let desiredPos = new THREE.Vector3();
        let lerpFactor = 0.05;

        // Determine camera target and position based on game state
        if (turnState === 'coloring_loop' || turnState === 'shattering') {
            targetFocus.copy(focusPoint); // focusPoint is the animation focus point
            if (this.level.cameraType === '2D') {
                desiredPos.copy(targetFocus).add(new THREE.Vector3(0, 0, this.orbitControls.radius));
            } else {
                const offset = new THREE.Vector3().setFromSphericalCoords(
                    this.orbitControls.radius * 0.8, // Zoom in a bit for the action
                    this.orbitControls.phi,
                    this.orbitControls.theta
                );
                desiredPos.copy(targetFocus).add(offset);
            }
            lerpFactor = 0.08;
        } else if (turnState === 'game_over' || turnState === 'between_turns') {
            targetFocus.copy(this.gridBoundingSphere.center);
            const angle = Date.now() * 0.0002;
            const orbitRadius = this.gridBoundingSphere.radius * 2.5; // Zoom out a bit more between turns
            desiredPos.set(
                Math.sin(angle) * orbitRadius,
                orbitRadius * 0.4,
                Math.cos(angle) * orbitRadius
            ).add(targetFocus);
            lerpFactor = 0.02;

        } else { // 'playing' state
            targetFocus.copy(activePlayer.headMesh.position);
            if (this.level.cameraType === '2D') {
                 desiredPos.copy(targetFocus).add(new THREE.Vector3(0, 0, this.orbitControls.radius));
            } else {
                 const offset = new THREE.Vector3().setFromSphericalCoords(
                    this.orbitControls.radius,
                    this.orbitControls.phi,
                    this.orbitControls.theta
                );
                desiredPos.copy(targetFocus).add(offset);
            }
        }
        
        // Apply parallax and smoothly move camera
        desiredPos.add(this.parallaxOffset);
        this.activeCamera.position.lerp(desiredPos, lerpFactor);
        
        // Handle camera shake
        if (this.shakeInfo.active) {
            this.shakeInfo.timer -= deltaTime;
            if (this.shakeInfo.timer <= 0) {
                this.shakeInfo.active = false;
            } else {
                const shakeAmount = this.shakeInfo.intensity * (this.shakeInfo.timer / this.shakeInfo.duration);
                this.activeCamera.position.x += (Math.random() - 0.5) * shakeAmount;
                this.activeCamera.position.y += (Math.random() - 0.5) * shakeAmount;
                this.activeCamera.position.z += (Math.random() - 0.5) * shakeAmount;
            }
        }

        // Smoothly look at the target
        const currentLookAt = new THREE.Vector3();
        this.activeCamera.getWorldDirection(currentLookAt);
        currentLookAt.add(this.activeCamera.position);

        const targetLookAt = targetFocus.clone();
        const finalLookAt = currentLookAt.lerp(targetLookAt, 0.1);
        this.activeCamera.lookAt(finalLookAt);
    }


    public onWindowResize = () => {
        const aspect = this.mount.clientWidth / this.mount.clientHeight
        
        this.perspectiveCamera.aspect = aspect
        this.perspectiveCamera.updateProjectionMatrix()

        const orthoSize = this.gridBoundingSphere.radius * 1.2 * this.cameraZoomLevel;
        this.orthographicCamera.left = orthoSize * aspect / -2
        this.orthographicCamera.right = orthoSize * aspect / 2
        this.orthographicCamera.top = orthoSize / 2
        this.orthographicCamera.bottom = orthoSize / -2
        this.orthographicCamera.updateProjectionMatrix()
    }


    public orbit(dx: number, dy: number) {
        if (this.level.cameraType !== '3D') return
        this.orbitControls.theta -= dx * 0.01;
        this.orbitControls.phi = THREE.MathUtils.clamp(this.orbitControls.phi - dy * 0.01, 0.2, Math.PI - 0.2);
    }
    
    public slightOrbit(dx: number, dy: number) {
        if (this.level.cameraType !== '3D') return
        const orbitFactor = this.gridBoundingSphere.radius * 0.05;
        this.parallaxOffset.x = dx * orbitFactor;
        this.parallaxOffset.y = -dy * orbitFactor;
    }


    public zoom(delta: number) {
        if (this.level.cameraType === '3D') {
            const zoomFactor = 1.0 + delta * 0.1
            this.orbitControls.radius = THREE.MathUtils.clamp(this.orbitControls.radius * zoomFactor, this.orbitControls.minRadius, this.orbitControls.maxRadius)
        } else {
            this.cameraZoomLevel = Math.max(0.3, Math.min(3.0, this.cameraZoomLevel + delta * 0.1))
            this.onWindowResize()
        }
    }
    
    public shake(intensity: number, duration: number) {
        this.shakeInfo.active = true;
        this.shakeInfo.intensity = intensity;
        this.shakeInfo.duration = duration;
        this.shakeInfo.timer = duration;
    }

    public getNormalizedZoom(): number {
        if (this.level.cameraType === '3D') {
            return (this.orbitControls.radius - this.orbitControls.minRadius) / (this.orbitControls.maxRadius - this.orbitControls.minRadius);
        } else {
            return (this.cameraZoomLevel - 0.3) / (3.0 - 0.3);
        }
    }


    public getActiveCamera = () => this.activeCamera
    public getCamera = () => this.activeCamera
}
