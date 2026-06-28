
import * as THREE from 'three'
import { SceneManager } from './SceneManager'
import { GameLogicController } from './GameLogicController'
import { CameraManager } from './CameraManager'
import { InputController } from './InputController'
import { VFXManager } from './VFXManager'
import type { Level } from '../levels/Level'
import type { Score, TurnInfo } from '../../components/TronCaptureGame'
import type { DebugInfo, GameMode } from '../../App'
import { THEMES } from '../theme'
import type { ThemeType } from '../theme'
import * as C from '../config'


export class GameEngine {
    
    private sceneManager: SceneManager
    private logicController: GameLogicController
    private cameraManager: CameraManager
    private inputController: InputController
    private vfxManager: VFXManager

    private isRunning = false
    private raycaster: THREE.Raycaster


    constructor(
        private mount: HTMLDivElement,
        private level: Level,
        private gameMode: GameMode,
        private scoreCallbacks: { p1: (s: Score) => void, p2: (s: Score) => void },
        private setTurnInfo: React.Dispatch<React.SetStateAction<TurnInfo>>,
        private setDebugInfo: React.Dispatch<React.SetStateAction<DebugInfo>>
    ) {
        this.sceneManager = new SceneManager(mount)
        this.vfxManager = new VFXManager(this.sceneManager.getGridGroup())

        this.logicController = new GameLogicController(
            level, 
            gameMode,
            this.sceneManager, 
            this.vfxManager,
            null, // CameraManager is not created yet.
            scoreCallbacks, 
            setTurnInfo,
            setDebugInfo
        )
        
        const gridData = this.logicController.getGridData();
        const boundingSphere = gridData.gridPoints.geometry.boundingSphere;

        if (!boundingSphere) {
             console.error("Bounding sphere is null! Defaulting to a fallback sphere.");
             this.cameraManager = new CameraManager(mount, this.sceneManager.getScene(), level, new THREE.Sphere(new THREE.Vector3(0,0,0), 10));
        } else {
             this.cameraManager = new CameraManager(mount, this.sceneManager.getScene(), level, boundingSphere);
        }
        
        this.logicController.setCameraManager(this.cameraManager);
        
        this.inputController = new InputController(mount)
        this.raycaster = new THREE.Raycaster()
        this.raycaster.params.Points.threshold = 0.5;
    }


    init() {
        const gridData = this.logicController.getGridData()
        const boundingSphere = gridData.gridPoints.geometry.boundingSphere!;

        this.onWindowResize();

        this.sceneManager.init(this.cameraManager.getActiveCamera(), boundingSphere);
        this.logicController.init();
        
        this.sceneManager.setGrid(gridData);
        this.sceneManager.setPlayers(this.logicController.getPlayers());
        this.sceneManager.createScenery(boundingSphere);

        this.setupEventListeners();

        this.isRunning = true;
        this.animate();
        
        this.logicController.startNextTurn();
        this.logicController.updateHighlight(this.cameraManager.getActiveCamera());
    }


    private setupEventListeners() {
        const emitter = this.inputController.getEmitter()
        
        emitter.on('debug_select', (vertexKey: string) => {
            this.logicController.selectMoveFromDebug(vertexKey)
        })

        emitter.on('tap_input', (coords: {x: number, y: number}) => {
            if (this.logicController.getTurnState() !== 'playing') {
                this.handlePrimaryAction();
                return;
            }
        
            this.raycaster.setFromCamera(new THREE.Vector2(coords.x, coords.y), this.cameraManager.getActiveCamera());
            const activePlayerHead = this.logicController.getActivePlayer().headMesh;
            const intersects = this.raycaster.intersectObject(activePlayerHead);
        
            if (intersects.length > 0) {
                this.logicController.confirmMove();
            } else {
                this.logicController.updateHighlight(this.cameraManager.getActiveCamera(), new THREE.Vector2(coords.x, coords.y));
            }
        });

        emitter.on('primary_action', this.handlePrimaryAction)
        emitter.on('undo', () => this.logicController.undoLastMove())
        
        emitter.on('orbit', (data: { dx: number, dy: number }) => {
            this.cameraManager.orbit(data.dx, data.dy)
            this.logicController.updateHighlight(this.cameraManager.getActiveCamera())
        })
        
        emitter.on('zoom', (delta) => this.cameraManager.zoom(delta))
        emitter.on('slight_orbit', (data: { dx: number, dy: number }) => this.cameraManager.slightOrbit(data.dx, data.dy))

        window.addEventListener('resize', this.onWindowResize)
    }

    private handlePrimaryAction = () => {
        const wasBetweenTurns = this.logicController.getTurnState() === 'between_turns';
        this.logicController.handlePrimaryAction();
        if (wasBetweenTurns && this.logicController.getTurnState() === 'playing') {
            this.logicController.updateHighlight(this.cameraManager.getActiveCamera());
        }
    }


    private onWindowResize = () => {
        this.sceneManager.onWindowResize()
        this.cameraManager.onWindowResize()
    }


    private animate = () => {
        if (!this.isRunning) return

        requestAnimationFrame(this.animate)

        const deltaTime = this.sceneManager.getDeltaTime()
        const elapsedTime = this.sceneManager.getElapsedTime()

        const activePlayer = this.logicController.getActivePlayer()
        const turnState = this.logicController.getTurnState()

        this.logicController.update(deltaTime)
        this.vfxManager.update(deltaTime)
        
        this.cameraManager.update(
            deltaTime,
            turnState,
            activePlayer,
            turnState === 'coloring_loop' || turnState === 'shattering'
                ? this.logicController.getAnimationFocusPoint()
                : this.logicController.getTurnEndFocusPoint()
        )
        
        this.sceneManager.update(elapsedTime, this.cameraManager.getActiveCamera(), this.cameraManager.getNormalizedZoom())
    }


    public applyTheme(theme: ThemeType) {
        const config = THEMES[theme]
        if (!config) return

        C.PLAYER_1_COLOR.setHex(config.player1Color)
        C.PLAYER_1_COLOR_DARK.setHex(config.player1ColorDark)
        C.PLAYER_2_COLOR.setHex(config.player2Color)
        C.PLAYER_2_COLOR_DARK.setHex(config.player2ColorDark)
        C.UNCLAIMED_PATH_MATERIAL.color.setHex(config.unclaimedPathColor)
        
        C.SOLID_MATERIAL_P1.color.setHex(config.player1Color)
        C.SOLID_MATERIAL_P1.emissive.setHex(config.player1Color)
        C.SOLID_MATERIAL_P2.color.setHex(config.player2Color)
        C.SOLID_MATERIAL_P2.emissive.setHex(config.player2Color)
        
        C.HIGHLIGHT_SOLID_MATERIAL_P1.color.setHex(config.player1Color)
        C.HIGHLIGHT_SOLID_MATERIAL_P1.emissive.setHex(config.player1Color)
        C.HIGHLIGHT_SOLID_MATERIAL_P2.color.setHex(config.player2Color)
        C.HIGHLIGHT_SOLID_MATERIAL_P2.emissive.setHex(config.player2Color)

        this.sceneManager.applyTheme(config)
        this.logicController.applyTheme(config)
    }


    public applyEffect(effect: EffectType) {
        this.sceneManager.applyEffect(effect)
    }


    destroy() {
        this.isRunning = false
        this.inputController.destroy()
        this.sceneManager.destroy()
        this.vfxManager.destroy()
        window.removeEventListener('resize', this.onWindowResize)
    }
}