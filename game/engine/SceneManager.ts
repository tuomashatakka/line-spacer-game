
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { PlayerState, GridData } from './GameLogicController'
import * as C from '../config'
import type { ThemeConfig, EffectType } from '../theme'

const AberrationShader = {
    name: 'AberrationShader',
    uniforms: {
        'tDiffuse': { value: null },
        'amount': { value: 0.003 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        varying vec2 vUv;
        void main() {
            vec2 uv = vUv;
            vec2 offset = vec2(amount * (uv.x - 0.5), amount * (uv.y - 0.5));
            vec4 cr = texture2D(tDiffuse, uv + offset);
            vec4 cg = texture2D(tDiffuse, uv);
            vec4 cb = texture2D(tDiffuse, uv - offset);
            gl_FragColor = vec4(cr.r, cg.g, cb.b, cg.a);
        }
    `
};

const CRTShader = {
    name: 'CRTShader',
    uniforms: {
        'tDiffuse': { value: null },
        'time': { value: 0 },
        'resolution': { value: new THREE.Vector2(800, 600) }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform vec2 resolution;
        varying vec2 vUv;

        void main() {
            vec2 uv = vUv;
            
            // Subtle lens distortion
            vec2 centeredUv = uv - 0.5;
            float dist = dot(centeredUv, centeredUv);
            centeredUv *= 1.0 + dist * 0.09;
            vec2 crtUv = centeredUv + 0.5;
            
            vec4 color;
            if (crtUv.x < 0.0 || crtUv.x > 1.0 || crtUv.y < 0.0 || crtUv.y > 1.0) {
                color = vec4(0.0, 0.0, 0.0, 1.0);
            } else {
                color = texture2D(tDiffuse, crtUv);
                
                // Fine scanlines
                float scanline = sin(crtUv.y * resolution.y * 1.6) * 0.05;
                color.rgb -= scanline;
                
                // Rolling flicker bar
                float flicker = sin(time * 3.0 + crtUv.y * 8.0) * 0.01;
                color.rgb += flicker;
                
                // Elegant vignette
                float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
                vignette = clamp(pow(16.0 * vignette, 0.28), 0.0, 1.0);
                color.rgb *= vignette;
            }
            
            gl_FragColor = color;
        }
    `
};


export class SceneManager {
    private scene: THREE.Scene
    private renderer: THREE.WebGLRenderer
    private composer: EffectComposer
    private clock: THREE.Clock
    private bloomPass!: UnrealBloomPass
    private crtPass!: ShaderPass
    private aberrationPass!: ShaderPass
    private activeEffect: EffectType = 'bloom'
    
    private gridGroup: THREE.Group

    public pathEdgesGroup: THREE.Group
    public claimedEdgesGroup: THREE.Group
    public highlightedEdgeGroup: THREE.Group
    public solidTerritoryGroup: THREE.Group
    public previewGroup: THREE.Group
    public sceneryGroup: THREE.Group

    private gridMaterial: THREE.MeshBasicMaterial | null = null
    private starMaterial: THREE.PointsMaterial | null = null
    private gridPointsMaterial: THREE.PointsMaterial | null = null


    constructor(private mount: HTMLDivElement) {
        this.scene = new THREE.Scene()
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.composer = new EffectComposer(this.renderer)
        this.clock = new THREE.Clock()
        
        this.gridGroup = new THREE.Group()
        this.pathEdgesGroup = new THREE.Group()
        this.claimedEdgesGroup = new THREE.Group()
        this.highlightedEdgeGroup = new THREE.Group()
        this.solidTerritoryGroup = new THREE.Group()
        this.previewGroup = new THREE.Group()
        this.sceneryGroup = new THREE.Group()
    }


    public init(camera: THREE.Camera, gridBoundingSphere: THREE.Sphere) {
        this.renderer.setSize(this.mount.clientWidth, this.mount.clientHeight)
        this.renderer.setPixelRatio(window.devicePixelRatio)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        this.mount.appendChild(this.renderer.domElement)

        this.setupScene()
        this.setupPostProcessing(camera)
    }


    private setupScene() {
        this.scene.background = new THREE.Color(0x000011) // Deep space blue
        
        const ambient = new THREE.AmbientLight(0xffffff, 2.0)
        this.scene.add(ambient)

        this.scene.add(this.gridGroup, this.sceneryGroup)

        this.gridGroup.add(
            this.pathEdgesGroup, 
            this.claimedEdgesGroup, 
            this.highlightedEdgeGroup, 
            this.solidTerritoryGroup, 
            this.previewGroup
        )
    }


    private setupPostProcessing(camera: THREE.Camera) {
        const renderPass = new RenderPass(this.scene, camera)
        this.composer.addPass(renderPass)

        // strength, radius, threshold
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(this.mount.clientWidth, this.mount.clientHeight), 1.2, 0.8, 0.1)
        this.composer.addPass(this.bloomPass)

        this.crtPass = new ShaderPass(CRTShader)
        this.crtPass.enabled = false
        this.composer.addPass(this.crtPass)

        this.aberrationPass = new ShaderPass(AberrationShader)
        this.aberrationPass.enabled = false
        this.composer.addPass(this.aberrationPass)
        
        const outputPass = new OutputPass()
        this.composer.addPass(outputPass)
    }
    
    public createScenery(gridBoundingSphere: THREE.Sphere) {
        const starVertices = [];
        for (let i = 0; i < 10000; i++) {
            const x = THREE.MathUtils.randFloatSpread(2000);
            const y = THREE.MathUtils.randFloatSpread(2000);
            const z = THREE.MathUtils.randFloatSpread(2000);
            starVertices.push(x, y, z);
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        this.starMaterial = new THREE.PointsMaterial({ color: 0x888888, size: 1.5, sizeAttenuation: false });
        const starField = new THREE.Points(starGeometry, this.starMaterial);
        this.sceneryGroup.add(starField);

        // Center the grid in the world
        this.gridGroup.position.copy(gridBoundingSphere.center).multiplyScalar(-1);
    }


    public update(elapsedTime: number, camera: THREE.Camera, zoom: number) {
        // Update any shaders or animated objects
        this.solidTerritoryGroup.children.forEach(mesh => {
            if (mesh.userData.isHighlight) {
                const mat = (mesh as THREE.Mesh).material as THREE.MeshStandardMaterial
                mat.emissiveIntensity = 1.5 + Math.sin(elapsedTime * 10) * 0.5
            }
        })

        if (this.crtPass && this.crtPass.enabled) {
            this.crtPass.uniforms['time'].value = elapsedTime
            this.crtPass.uniforms['resolution'].value.set(this.mount.clientWidth, this.mount.clientHeight)
        }
        
        // Adjust bloom based on zoom
        const baseStrength = this.activeEffect === 'hyper_glow' ? 2.2 : this.activeEffect === 'crt' ? 0.6 : this.activeEffect === 'aberration' ? 0.9 : 1.0;
        this.bloomPass.strength = THREE.MathUtils.lerp(baseStrength, baseStrength * 1.8, zoom);

        this.composer.render()
    }

    public applyEffect(effect: EffectType) {
        this.activeEffect = effect
        if (!this.bloomPass || !this.crtPass || !this.aberrationPass) return

        this.bloomPass.enabled = true
        this.crtPass.enabled = false
        this.aberrationPass.enabled = false

        if (effect === 'bloom') {
            this.bloomPass.strength = 1.2
        } else if (effect === 'hyper_glow') {
            this.bloomPass.strength = 2.4
        } else if (effect === 'crt') {
            this.bloomPass.strength = 0.6
            this.crtPass.enabled = true
        } else if (effect === 'aberration') {
            this.bloomPass.strength = 1.0
            this.aberrationPass.enabled = true
        }
    }
    

    public onWindowResize = () => {
        this.renderer.setSize(this.mount.clientWidth, this.mount.clientHeight)
        this.composer.setSize(this.mount.clientWidth, this.mount.clientHeight)
    }

    public getScene = () => this.scene
    public getGridGroup = () => this.gridGroup
    public getDeltaTime = () => this.clock.getDelta()
    public getElapsedTime = () => this.clock.getElapsedTime()

    private createBranchGeometry(posA: THREE.Vector3, posB: THREE.Vector3, thickness: number): THREE.BufferGeometry {
        const curve = new THREE.LineCurve3(posA, posB);
        return new THREE.TubeGeometry(curve, 1, thickness, 5, false);
    }


    public setGrid(gridData: GridData) {
        // Create the main grid mesh from branch geometries
        if (gridData.edges.length > 0) {
            const gridGeometries = gridData.edges.map(edge => {
                const posA = gridData.vertices.get(edge.k1)!
                const posB = gridData.vertices.get(edge.k2)!
                return this.createBranchGeometry(posA, posB, 0.05)
            })
            const mergedGridGeom = mergeGeometries(gridGeometries)
            this.gridMaterial = new THREE.MeshBasicMaterial({ color: 0x333377, transparent: true, opacity: 0.3 })
            const gridMesh = new THREE.Mesh(mergedGridGeom, this.gridMaterial)
            this.gridGroup.add(gridMesh)
        }

        this.gridPointsMaterial = new THREE.PointsMaterial({ color: 0x5555aa, size: 0.25, sizeAttenuation: true, transparent: true, opacity: 0.5 });
        gridData.gridPoints.material = this.gridPointsMaterial;
        this.gridGroup.add(gridData.gridPoints)
    }

    private createFlareTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 32;
        const context = canvas.getContext('2d')!;
        const gradient = context.createLinearGradient(0, 0, 256, 0);
        gradient.addColorStop(0, 'rgba(255,255,255,0)');
        gradient.addColorStop(0.3, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.7, 'rgba(255,255,255,1)');
        gradient.addColorStop(1.0, 'rgba(255,255,255,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 32);
        return new THREE.CanvasTexture(canvas);
    }

    public setPlayers(players: PlayerState[]) {
        const flareTexture = this.createFlareTexture();
        players.forEach(p => {
            this.gridGroup.add(p.headMesh)
            
            const lensflare = new Lensflare();
            const flareColor = p.id === 1 ? C.PLAYER_1_COLOR : C.PLAYER_2_COLOR;
            lensflare.addElement( new LensflareElement( flareTexture, 150, 0, flareColor, THREE.AdditiveBlending ) );
            p.headMesh.add(lensflare);
        })
    }


    public createEdgeMesh(posA: THREE.Vector3, posB: THREE.Vector3, material: THREE.Material, thickness: number) {
        const geometry = this.createBranchGeometry(posA, posB, thickness)
        const mesh = new THREE.Mesh(geometry, material)
        return mesh
    }


    public createSolidMesh(geometries: THREE.BufferGeometry[], material: THREE.Material) {
        if (geometries.length === 0) return null
        const merged = mergeGeometries(geometries)
        if (!merged) return null
        return new THREE.Mesh(merged, material)
    }


    public applyTheme(config: ThemeConfig) {
        if (this.scene) {
            this.scene.background = new THREE.Color(config.backgroundColor)
        }
        if (this.gridMaterial) {
            this.gridMaterial.color.setHex(config.gridColor)
            this.gridMaterial.needsUpdate = true
        }
        if (this.starMaterial) {
            this.starMaterial.color.setHex(config.starColor)
            this.starMaterial.needsUpdate = true
        }
        if (this.gridPointsMaterial) {
            this.gridPointsMaterial.color.setHex(config.gridPointsColor)
            this.gridPointsMaterial.needsUpdate = true
        }
    }


    public destroy() {
        this.renderer.dispose()
        if (this.mount && this.renderer.domElement) {
             try { this.mount.removeChild(this.renderer.domElement) } catch(e) {}
        }
    }
}
