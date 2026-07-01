
import * as THREE from 'three'
import { GoogleGenAI, Type } from '@google/genai'
import type { DebugInfo, GridType, GameMode } from '../../App'
import type { Score, TurnInfo } from '../../components/TronCaptureGame'
import * as C from '../config'
import type { Level } from '../levels/Level'
import type { SceneManager } from './SceneManager'
import type { VFXManager } from './VFXManager'
import type { CameraManager } from './CameraManager'
import type { ThemeConfig } from '../theme'


export interface GridData {
  gridType: GridType
  is2D: boolean
  edges: { k1: string, k2: string }[]
  gridPoints: THREE.Points
  vertices: Map<string, THREE.Vector3>
  adjacency: Map<string, string[]>
  faces: Map<string, { key: string; vertices: string[] }>
  vertexToFaces: Map<string, string[]>
  tetrahedra: Map<string, { key: string; faces: string[] }>
  faceToTetras: Map<string, string[]>
  shellGeometries: THREE.BufferGeometry[]
  unitCubeData?: Map<string, string[]>
  unitSquareData?: Map<string, string[]>
}


export interface PlayerState {
    id: number
    headMesh: THREE.Mesh
    material: THREE.MeshBasicMaterial
    solidMaterial: THREE.MeshStandardMaterial
    highlightMaterial: THREE.MeshStandardMaterial
    currentVertexKey: string
    currentPath: string[]
    pathEdgeMeshes: Map<string, THREE.Mesh>
    claimedEdges: Set<string>
    claimedFaces: Set<string>
    claimedTetras: Set<string>
    solidMesh: THREE.Mesh | null
    movesLeft: number
    moves: number
    isOutOfPlay: boolean
}


// Helper functions for geometry keys
export const getEdgeKey = (k1: string, k2: string) => k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`
export const getFaceKey = (k1: string, k2: string, k3: string) => [k1, k2, k3].sort().join('|')
export const getTetraKey = (k1: string, k2: string, k3: string, k4: string) => [k1, k2, k3, k4].sort().join('|')


export class GameLogicController {
    
    private gridData: GridData
    private players: PlayerState[] = []
    private activePlayerIndex = 1
    private turnState: TurnInfo['status'] = 'between_turns'
    private totalTurns = -1
    private currentGridBoundary: number
    private allClaimedEdgeKeys = new Set<string>()
    private newlyClaimedEdgeKeys = new Set<string>()
    private turnEndFocusPoint = new THREE.Vector3(0, 0, 0)
    
    private isMoving = false
    private moveStartPos = new THREE.Vector3()
    private moveEndPos = new THREE.Vector3()
    private moveAlpha = 0

    private selection = {
        highlightedVertexKey: null as string | null,
    }

    private loopAnimationState = {
        isActive: false,
        player: null as PlayerState | null,
        queue: [] as { edgeKey: string, k1: string, k2: string, distance: number }[],
        boundarySet: new Set<string>(),
        processedIndex: 0,
        timer: 0,
        timePerLevel: 0.05,
        animationFocusPoint: new THREE.Vector3(),
    }
    
    private shatterState: { geometries: THREE.BufferGeometry[]; player: PlayerState | null; focusPoint: THREE.Vector3; } = {
        geometries: [],
        player: null,
        focusPoint: new THREE.Vector3(),
    }
    
    private cameraManager: CameraManager | null;
    private ai: GoogleGenAI | null = null;


    constructor(
        private level: Level,
        private gameMode: GameMode,
        private sceneManager: SceneManager,
        private vfxManager: VFXManager,
        cameraManager: CameraManager | null,
        private scoreCallbacks: { p1: (s: Score) => void, p2: (s: Score) => void },
        private setTurnInfo: React.Dispatch<React.SetStateAction<TurnInfo>>,
        private setDebugInfo: React.Dispatch<React.SetStateAction<DebugInfo>>
    ) {
        this.gridData = this.level.getGridData()
        this.currentGridBoundary = this.level.gridShells - 1
        this.cameraManager = cameraManager
        if (this.gameMode === 'pva') {
            this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        }
    }
    
    public setCameraManager(cameraManager: CameraManager) {
        this.cameraManager = cameraManager;
    }


    public init() {
        this.initPlayers()
    }

    public handlePrimaryAction = () => {
        if (this.isMoving || this.loopAnimationState.isActive || this.turnState === 'shattering' || this.turnState === 'thinking') return

        switch (this.turnState) {
            case 'playing':
                if (this.getActivePlayer().id === 1 || this.gameMode === 'pvp') {
                    if (this.selection.highlightedVertexKey) {
                        this.confirmMove()
                    } else {
                        this.endTurn()
                    }
                }
                break
            case 'between_turns':
                this.startNextTurn()
                break
            case 'game_over':
                // Do nothing
                break
        }
    }


    private initPlayers() {
        const p1_material = new THREE.MeshBasicMaterial({ color: C.PLAYER_1_COLOR })
        const p2_material = new THREE.MeshBasicMaterial({ color: C.PLAYER_2_COLOR })
        
        const headGeom = new THREE.IcosahedronGeometry(0.8, 1);
        const p1_head_mat = new THREE.MeshStandardMaterial({ color: C.PLAYER_1_COLOR, emissive: C.PLAYER_1_COLOR, emissiveIntensity: 0.5, roughness: 0.4, metalness: 0.6 });
        const p2_head_mat = new THREE.MeshStandardMaterial({ color: C.PLAYER_2_COLOR, emissive: C.PLAYER_2_COLOR, emissiveIntensity: 0.5, roughness: 0.4, metalness: 0.6 });

        this.players = [
            { id: 1, headMesh: new THREE.Mesh(headGeom, p1_head_mat), material: p1_material, solidMaterial: C.SOLID_MATERIAL_P1, highlightMaterial: C.HIGHLIGHT_SOLID_MATERIAL_P1, currentVertexKey: this.level.playerStartPositions.p1, currentPath: [], pathEdgeMeshes: new Map(), claimedEdges: new Set(), claimedFaces: new Set(), claimedTetras: new Set(), solidMesh: null, movesLeft: 0, moves: 0, isOutOfPlay: false },
            { id: 2, headMesh: new THREE.Mesh(headGeom, p2_head_mat), material: p2_material, solidMaterial: C.SOLID_MATERIAL_P2, highlightMaterial: C.HIGHLIGHT_SOLID_MATERIAL_P2, currentVertexKey: this.level.playerStartPositions.p2, currentPath: [], pathEdgeMeshes: new Map(), claimedEdges: new Set(), claimedFaces: new Set(), claimedTetras: new Set(), solidMesh: null, movesLeft: 0, moves: 0, isOutOfPlay: false },
        ]
        
        this.players.forEach(p => {
            const startPos = this.gridData.vertices.get(p.currentVertexKey)
            if (startPos) p.headMesh.position.copy(startPos)
        })
    }

    public applyTheme(config: ThemeConfig) {
        this.players.forEach(p => {
            const colorVal = p.id === 1 ? config.player1Color : config.player2Color;
            const darkColorVal = p.id === 1 ? config.player1ColorDark : config.player2ColorDark;
            
            const headMat = p.headMesh.material as THREE.MeshStandardMaterial;
            if (headMat) {
                headMat.color.setHex(colorVal);
                headMat.emissive.setHex(colorVal);
                headMat.needsUpdate = true;
            }
            if (p.material) {
                p.material.color.setHex(colorVal);
                p.material.needsUpdate = true;
            }
            if (p.solidMaterial) {
                p.solidMaterial.color.setHex(colorVal);
                p.solidMaterial.emissive.setHex(darkColorVal);
                p.solidMaterial.needsUpdate = true;
            }
            if (p.highlightMaterial) {
                p.highlightMaterial.color.setHex(colorVal);
                p.highlightMaterial.emissive.setHex(colorVal);
                p.highlightMaterial.needsUpdate = true;
            }
            p.pathEdgeMeshes.forEach(mesh => {
                const mat = mesh.material as THREE.MeshBasicMaterial;
                if (mat) {
                    mat.color.setHex(colorVal);
                    mat.needsUpdate = true;
                }
            });
        });
    }


    public startNextTurn = () => {
        if (this.turnState === 'game_over') return

        this.newlyClaimedEdgeKeys.forEach(key => {
            const mesh = this.getActivePlayer().claimedEdges.has(key) ? this.getActivePlayer().solidMesh : this.getOpponentPlayer().solidMesh
            if(mesh) {
                // The visual effect of flashing is now handled in SceneManager
            }
        })
        this.newlyClaimedEdgeKeys.clear()
        this.sceneManager.solidTerritoryGroup.children.forEach(c => c.userData.isHighlight = false)

        this.totalTurns++
        this.activePlayerIndex = 1 - this.activePlayerIndex
        
        const activePlayer = this.getActivePlayer()
        if (activePlayer.isOutOfPlay) {
            this.endTurn()
            return
        }

        this.turnState = 'playing'
        activePlayer.movesLeft += C.INITIAL_MOVES_PER_TURN
        
        const totalMovesForTurn = activePlayer.movesLeft
        const currentRound = Math.floor(this.totalTurns / 2) + 1
        const isSuddenDeath = currentRound > C.SUDDEN_DEATH_ROUND_START

        this.setTurnInfo({ 
            activePlayer: activePlayer.id, 
            status: 'playing', 
            movesLeft: activePlayer.movesLeft, 
            totalMoves: totalMovesForTurn, 
            suddenDeath: isSuddenDeath, 
            round: currentRound 
        })
        
        this.updateDebugDisplay();
        
        if (this.getValidMoves(activePlayer).length === 0) {
            activePlayer.isOutOfPlay = true
            setTimeout(() => this.endTurn(), 1000)
        } else if (this.gameMode === 'pva' && activePlayer.id === 2) {
            this.executeAITurn();
        }
    }


    public endTurn = () => {
        if (this.players.every(p => p.isOutOfPlay)) {
            this.turnState = 'game_over'
            this.setTurnInfo(prev => ({...prev, status: 'game_over'}))
            return
        }
        
        this.setTurnInfo(prev => ({ ...prev, status: 'between_turns' }))
        this.turnState = 'between_turns'
        this.updateDebugDisplay();
    }


    public update(deltaTime: number) {
      if (this.loopAnimationState.isActive) {
          this.updateLoopAnimation(deltaTime)
      }

      if (this.turnState === 'shattering' && !this.vfxManager.isAnimationRunning()) {
            this.finalizeShatter();
      }

      if (this.isMoving) {
        this.moveAlpha = Math.min(1, this.moveAlpha + 10 * deltaTime)
        this.getActivePlayer().headMesh.position.lerpVectors(this.moveStartPos, this.moveEndPos, this.moveAlpha)
        if (this.moveAlpha >= 1) this.isMoving = false
      }
    }


    private updateLoopAnimation(deltaTime: number) {
        const state = this.loopAnimationState
        if (!state.isActive || !state.player) return

        state.timer += deltaTime
        const currentLevel = Math.floor(state.timer / state.timePerLevel)

        while (state.processedIndex < state.queue.length && state.queue[state.processedIndex].distance <= currentLevel) {
            const { k1, k2 } = state.queue[state.processedIndex]
            const posA = this.gridData.vertices.get(k1)!
            const posB = this.gridData.vertices.get(k2)!
            const edgeMesh = this.sceneManager.createEdgeMesh(posA, posB, state.player.material, 0.12)
            this.sceneManager.claimedEdgesGroup.add(edgeMesh)
            
            state.animationFocusPoint.copy(posA).lerp(posB, 0.5)
            state.processedIndex++
        }

        if (state.processedIndex >= state.queue.length) {
            this.finishLoopClaim()
        }
    }


    public confirmMove = () => {
        if (this.selection.highlightedVertexKey) {
            this.handlePlayerMove(this.selection.highlightedVertexKey)
            this.clearHighlight()
        }
    }


    public undoLastMove = () => {
        if (this.isMoving || this.turnState !== 'playing') return
        const player = this.getActivePlayer()
        if (player.currentPath.length === 0) return
    
        const previousVertexKey = player.currentVertexKey
        const targetVertexKey = player.currentPath.pop()!
        const edgeKey = getEdgeKey(previousVertexKey, targetVertexKey)
    
        const edgeMesh = player.pathEdgeMeshes.get(edgeKey)
        if (edgeMesh) {
            this.sceneManager.pathEdgesGroup.remove(edgeMesh)
            edgeMesh.geometry.dispose()
            player.pathEdgeMeshes.delete(edgeKey)
        }
        
        player.movesLeft++
        this.setTurnInfo(prev => ({...prev, movesLeft: player.movesLeft}))
    
        this.moveStartPos.copy(this.gridData.vertices.get(previousVertexKey)!)
        this.moveEndPos.copy(this.gridData.vertices.get(targetVertexKey)!)
        player.headMesh.lookAt(this.moveEndPos)
        player.currentVertexKey = targetVertexKey
        this.moveAlpha = 0
        this.isMoving = true
    
        this.clearHighlight()
        this.updateDebugDisplay();
    }


    private highlightMove(targetVertexKey: string) {
        this.clearHighlight()
        
        const player = this.getActivePlayer()
        const posA = this.gridData.vertices.get(player.currentVertexKey)!
        const posB = this.gridData.vertices.get(targetVertexKey)!

        const edgeMesh = this.sceneManager.createEdgeMesh(posA, posB, C.HIGHLIGHT_MATERIAL, 0.1)
        this.sceneManager.highlightedEdgeGroup.add(edgeMesh)
        this.selection.highlightedVertexKey = targetVertexKey;
        this.setDebugInfo(prev => ({...prev, highlighted: targetVertexKey}));
    }

    private clearHighlight() {
        this.sceneManager.highlightedEdgeGroup.clear()
        this.sceneManager.previewGroup.clear()
        this.selection.highlightedVertexKey = null
        this.setDebugInfo(prev => ({...prev, highlighted: null}));
    }

    private handlePlayerMove(targetVertexKey: string) {
        if (this.isMoving) return
        
        this.cameraManager?.shake(0.2, 0.25);
        const player = this.getActivePlayer()
        
        if (!this.getValidMoves(player).includes(targetVertexKey)) return
        const targetPos = this.gridData.vertices.get(targetVertexKey)!;
        this.vfxManager.triggerMoveVFX(targetPos, player.solidMaterial.color);

        const currentVertexKey = player.currentVertexKey
        const potentialLoops = this.findAllLoops(player, targetVertexKey)
        
        if (potentialLoops.length > 0) {
            this.clearHighlight()
            this.initiateLoopClaim(player, potentialLoops, targetVertexKey)
        } else {
            player.currentPath.push(currentVertexKey)
            const edgeKey = getEdgeKey(currentVertexKey, targetVertexKey)
            const posA = this.gridData.vertices.get(currentVertexKey)!
            const posB = this.gridData.vertices.get(targetVertexKey)!
            const edgeMesh = this.sceneManager.createEdgeMesh(posA, posB, C.UNCLAIMED_PATH_MATERIAL, 0.08)
            this.sceneManager.pathEdgesGroup.add(edgeMesh)
            player.pathEdgeMeshes.set(edgeKey, edgeMesh)
            
            player.movesLeft--
            this.setTurnInfo(prev => ({ ...prev, movesLeft: player.movesLeft }))
            
            this.moveStartPos.copy(this.gridData.vertices.get(currentVertexKey)!)
            this.moveEndPos.copy(this.gridData.vertices.get(targetVertexKey)!)
            player.headMesh.lookAt(this.moveEndPos)
            player.currentVertexKey = targetVertexKey
            this.moveAlpha = 0
            this.isMoving = true

            this.updateDebugDisplay();

            if (player.movesLeft <= 0) {
                this.endTurn()
            }
        }
    }

    private initiateLoopClaim(player: PlayerState, loops: string[][], startNode: string) {
        const allBoundaryVertices = new Set<string>()
        loops.forEach(loop => loop.forEach(v => allBoundaryVertices.add(v)))

        const boundaryEdges = new Map<string, string[]>()
        allBoundaryVertices.forEach(v => boundaryEdges.set(v, []))
        const allEdgesForQueue: { edgeKey: string, k1: string, k2: string }[] = []

        for (const k1 of allBoundaryVertices) {
            const neighbors = this.gridData.adjacency.get(k1) || []
            for (const k2 of neighbors) {
                if (k1 < k2 && allBoundaryVertices.has(k2)) {
                    boundaryEdges.get(k1)!.push(k2)
                    boundaryEdges.get(k2)!.push(k1)
                    allEdgesForQueue.push({ edgeKey: getEdgeKey(k1, k2), k1, k2 })
                }
            }
        }
        
        const distances = new Map<string, number>()
        const q: string[] = [startNode]
        distances.set(startNode, 0)
        let head = 0
        while (head < q.length) {
            const u = q[head++]
            const u_dist = distances.get(u)!
            const neighbors = boundaryEdges.get(u) || []
            for (const v of neighbors) {
                if (!distances.has(v)) {
                    distances.set(v, u_dist + 1)
                    q.push(v)
                }
            }
        }

        const animationQueue = allEdgesForQueue.map(({ edgeKey, k1, k2 }) => {
            const dist1 = distances.get(k1) ?? Infinity
            const dist2 = distances.get(k2) ?? Infinity
            return { edgeKey, k1, k2, distance: Math.min(dist1, dist2) }
        }).sort((a, b) => a.distance - b.distance)

        this.loopAnimationState = {
            isActive: true, player, queue: animationQueue, boundarySet: allBoundaryVertices,
            processedIndex: 0, timer: 0, timePerLevel: 0.05,
            animationFocusPoint: this.gridData.vertices.get(startNode)!.clone(),
        }
        
        this.turnState = 'coloring_loop'
        this.setTurnInfo(prev => ({ ...prev, status: 'between_turns' }))
        
        player.pathEdgeMeshes.forEach(mesh => { this.sceneManager.pathEdgesGroup.remove(mesh); mesh.geometry.dispose() })
        player.pathEdgeMeshes.clear()
        player.currentPath = []
        
        this.moveStartPos.copy(this.gridData.vertices.get(player.currentVertexKey)!)
        this.moveEndPos.copy(this.gridData.vertices.get(startNode)!)
        player.headMesh.lookAt(this.moveEndPos)
        player.currentVertexKey = startNode
        this.moveAlpha = 0
        this.isMoving = true

        this.updateDebugDisplay();
    }

    private finishLoopClaim() {
        const { player, boundarySet, queue } = this.loopAnimationState
        if (!player) return

        this.loopAnimationState.isActive = false // Stop animation loop

        queue.forEach(({ edgeKey }) => {
            if (!this.allClaimedEdgeKeys.has(edgeKey)) {
                this.allClaimedEdgeKeys.add(edgeKey)
                player.claimedEdges.add(edgeKey)
                this.newlyClaimedEdgeKeys.add(edgeKey)
            }
        })

        const shattered = this.claimTerritoryFromBoundary(player, boundarySet)

        this.loopAnimationState.player = null
        this.loopAnimationState.queue = []

        if (!shattered) {
            this.endTurn()
        }
    }


    private claimTerritoryFromBoundary(player: PlayerState, boundaryVerticesSet: Set<string>): boolean {
        const newlyClaimedFaces = new Set<string>()
        
        for (const vertexKey of boundaryVerticesSet) {
            const adjacentFaces = this.gridData.vertexToFaces.get(vertexKey) || []
            for (const faceKey of adjacentFaces) {
                if (player.claimedFaces.has(faceKey)) continue
                const face = this.gridData.faces.get(faceKey)
                if (!face) continue
                const faceIsClaimed = face.vertices.every((v, idx) => {
                    const v_next = face.vertices[(idx + 1) % face.vertices.length]
                    return player.claimedEdges.has(getEdgeKey(v, v_next))
                })
                if(faceIsClaimed) {
                    player.claimedFaces.add(faceKey)
                    newlyClaimedFaces.add(faceKey)
                }
            }
        }
        
        const newSolidGeometries: THREE.BufferGeometry[] = []
        const focusPoints: THREE.Vector3[] = []

        if (this.gridData.is2D) {
             newlyClaimedFaces.forEach(faceKey => {
                 const face = this.gridData.faces.get(faceKey)!
                 const points = face.vertices.map(v => this.gridData.vertices.get(v)!)
                 if (points.length === 3) { // All 2D faces are now triangles
                     newSolidGeometries.push(new THREE.BufferGeometry().setFromPoints(points))
                     focusPoints.push(...points)
                 }
             })
        } else { // 3D
            if (this.gridData.tetrahedra.size === 0) {
                // 3D level made of 3D triangles (like surface Icosahedron) - claim faces directly!
                newlyClaimedFaces.forEach(faceKey => {
                    const face = this.gridData.faces.get(faceKey)!
                    const points = face.vertices.map(v => this.gridData.vertices.get(v)!)
                    if (points.length === 3) {
                        const [v1, v2, v3] = points
                        focusPoints.push(v1, v2, v3)
                        // Render with both orientations to prevent backface culling issues in 3D
                        const faceGeom = new THREE.BufferGeometry().setFromPoints([v1, v2, v3, v1, v3, v2])
                        faceGeom.computeVertexNormals()
                        newSolidGeometries.push(faceGeom)
                    }
                })
            } else {
                for (const faceKey of newlyClaimedFaces) {
                    const tetras = this.gridData.faceToTetras.get(faceKey) || []
                    for (const tetraKey of tetras) {
                        if (player.claimedTetras.has(tetraKey)) continue
                        const tetra = this.gridData.tetrahedra.get(tetraKey)!
                        if (tetra.faces.every(fKey => player.claimedFaces.has(fKey))) {
                            player.claimedTetras.add(tetraKey)
                            const allVerts = [...new Set(tetra.faces.flatMap(f => this.gridData.faces.get(f)!.vertices))]
                            const positions = allVerts.map(k=>this.gridData.vertices.get(k)!)
                            
                            if (positions.length === 4) {
                                const [v1,v2,v3,v4] = positions
                                focusPoints.push(v1,v2,v3,v4)
                                const tetraGeom = new THREE.BufferGeometry().setFromPoints([v1,v2,v3, v1,v3,v4, v1,v4,v2, v2,v4,v3])
                                tetraGeom.computeVertexNormals()
                                newSolidGeometries.push(tetraGeom)
                            }
                        }
                    }
                }
            }
        }

        player.moves += player.movesLeft
        player.movesLeft = 0
        this.updateScore(player)

        if (newSolidGeometries.length > 0) {
            const center = new THREE.Vector3()
            if (focusPoints.length > 0) {
                focusPoints.forEach(p => center.add(p))
                center.divideScalar(focusPoints.length)
            }
            this.turnEndFocusPoint.copy(center)
            
            this.vfxManager.triggerShatterEffect(newSolidGeometries, center);
            this.vfxManager.triggerCaptureExplosion(center, player.material.color);
            
            this.shatterState = { geometries: newSolidGeometries, player: player, focusPoint: center };
            this.turnState = 'shattering';
            this.setTurnInfo(prev => ({...prev, status: 'shattering'}))
            return true; // Shatter effect started
        }
        
        return false; // No new territory, no shatter
    }

    private finalizeShatter() {
        const { geometries, player, focusPoint } = this.shatterState;
        if (!player || geometries.length === 0) {
            this.endTurn();
            return;
        }

        this.turnEndFocusPoint.copy(focusPoint);

        const allGeometries = [...geometries];
        if (player.solidMesh) {
            allGeometries.push(player.solidMesh.geometry);
        }
        
        const mergedGeometry = this.sceneManager.createSolidMesh(allGeometries, player.solidMaterial);
        if(mergedGeometry) {
            if (player.solidMesh) this.sceneManager.solidTerritoryGroup.remove(player.solidMesh);
            player.solidMesh = mergedGeometry;
            this.sceneManager.solidTerritoryGroup.add(player.solidMesh);

            const highlightMesh = this.sceneManager.createSolidMesh(geometries, player.highlightMaterial);
            if (highlightMesh) {
                highlightMesh.userData.isHighlight = true;
                this.sceneManager.solidTerritoryGroup.add(highlightMesh);
            }
        }
        
        this.shatterState = { geometries: [], player: null, focusPoint: new THREE.Vector3() };
        this.endTurn();
    }


    private findAllLoops(player: PlayerState, targetVertexKey: string): string[][] {
        const loops: string[][] = []
        const pathSet = new Set(player.currentPath)

        const simpleLoopIndex = player.currentPath.lastIndexOf(targetVertexKey)
        if (simpleLoopIndex !== -1) {
            const loopVertices = [player.currentVertexKey, ...player.currentPath.slice(simpleLoopIndex)]
            loops.push(loopVertices)
        }

        const visitedClaimed = new Set<string>([targetVertexKey])
        const q: [string, string[]][] = [[targetVertexKey, [targetVertexKey]]]
        let head = 0

        while(head < q.length){
            const [u, currentClaimedPath] = q[head++]
            if (pathSet.has(u) || u === player.currentVertexKey) {
                const connectIndex = player.currentPath.lastIndexOf(u)
                const mainPathSegment = u === player.currentVertexKey ? [] : player.currentPath.slice(connectIndex)
                const boundaryVertices = new Set([...mainPathSegment, player.currentVertexKey, ...currentClaimedPath])
                loops.push(Array.from(boundaryVertices))
                continue // Found one bridge, don't search further from this branch
            }

            const neighbors = this.gridData.adjacency.get(u) || []
            for (const v of neighbors){
                if(!visitedClaimed.has(v) && player.claimedEdges.has(getEdgeKey(u,v))){
                    visitedClaimed.add(v)
                    q.push([v, [...currentClaimedPath, v]])
                }
            }
        }
        return loops
    }


    private getValidMoves(player: PlayerState): string[] {
        if (player.isOutOfPlay) return []
        const opponent = this.getOpponentPlayer()
        const neighbors = this.gridData.adjacency.get(player.currentVertexKey)
        if (!neighbors) return []
        return neighbors.filter(n => 
            !this.allClaimedEdgeKeys.has(getEdgeKey(player.currentVertexKey, n)) &&
            n !== opponent.currentVertexKey
        )
    }

    public updateHighlight(camera: THREE.Camera, screenTapPos?: THREE.Vector2) {
        if (this.turnState !== 'playing' || (this.gameMode === 'pva' && this.getActivePlayer().id === 2)) {
            this.clearHighlight();
            return;
        };
    
        const player = this.getActivePlayer();
        const validMoves = this.getValidMoves(player);
    
        if (validMoves.length === 0) {
            this.clearHighlight();
            return;
        }
    
        const playerPos3D = this.gridData.vertices.get(player.currentVertexKey)!;
        let bestMove: string | null = null;
        let maxScore = -Infinity;
    
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
    
        if (screenTapPos) {
            // First check if the tap is directly close to any of the valid move vertices on screen
            let closestMoveKey: string | null = null;
            let minDistance = 0.25; // threshold in NDC coordinates (which span -1 to 1)

            validMoves.forEach(moveKey => {
                const movePos3D = this.gridData.vertices.get(moveKey)!;
                const movePosNDC = movePos3D.clone().project(camera);
                
                if (!this.gridData.is2D && movePosNDC.z > 1) return; // Behind camera
                
                const dist = screenTapPos.distanceTo(new THREE.Vector2(movePosNDC.x, movePosNDC.y));
                if (dist < minDistance) {
                    minDistance = dist;
                    closestMoveKey = moveKey;
                }
            });

            if (closestMoveKey) {
                bestMove = closestMoveKey;
            } else {
                // Screen-space direction fallback logic for taps/drags
                const playerPosNDC = playerPos3D.clone().project(camera);
                const inputDirection2D = screenTapPos.clone().sub(new THREE.Vector2(playerPosNDC.x, playerPosNDC.y));
                
                if (inputDirection2D.lengthSq() > 0.0001) {
                    inputDirection2D.normalize();
            
                    validMoves.forEach(moveKey => {
                        const movePos3D = this.gridData.vertices.get(moveKey)!;
                        const movePosNDC = movePos3D.clone().project(camera);
                        
                        if (!this.gridData.is2D && movePosNDC.z > 1) return; // Move is behind the camera
            
                        const moveDirection2D = new THREE.Vector2(movePosNDC.x, movePosNDC.y).sub(new THREE.Vector2(playerPosNDC.x, playerPosNDC.y));
                        if (moveDirection2D.lengthSq() === 0) return;
                        moveDirection2D.normalize();
                        
                        const score = inputDirection2D.dot(moveDirection2D);
                        if (score > maxScore) {
                            maxScore = score;
                            bestMove = moveKey;
                        }
                    });
                }
            }
        } else {
            // World-space camera direction logic for orbits
            validMoves.forEach(moveKey => {
                const movePos3D = this.gridData.vertices.get(moveKey)!;
                const moveDirection3D = movePos3D.clone().sub(playerPos3D).normalize();
                
                // Score is how much the move points "out of the screen" (opposite to camera's gaze)
                const score = -moveDirection3D.dot(cameraDirection);
                if (score > maxScore) {
                    maxScore = score;
                    bestMove = moveKey;
                }
            });
        }
        
        if (bestMove) {
            this.highlightMove(bestMove);
        } else if (validMoves.length > 0) {
            // Fallback: if no 'best' move was found, highlight the first valid one.
            this.highlightMove(validMoves[0]);
        }
    }

    private updateScore(player: PlayerState) {
        const newScore: Score = { moves: player.moves, total: 0 };
    
        if (this.gridData.is2D) {
            // Square grid is now made of triangles, so we always score triangles for 2D maps.
            newScore['triangles'] = player.claimedFaces.size;
        } else { // 3D
            // For UI purposes, we'll call volumetric captures on complex maps "pyramids".
            const scoreKey = (this.gridData.gridType === 'icosahedron' || this.gridData.gridType === 'cube' || this.gridData.gridType === 'octahedron') ? 'pyramids' : 'tetrahedra';
            if (player.claimedTetras.size > 0) {
                newScore[scoreKey] = player.claimedTetras.size;
            }
    
            const facesInPyramids = new Set<string>();
            player.claimedTetras.forEach(tetraKey => this.gridData.tetrahedra.get(tetraKey)!.faces.forEach(faceKey => facesInPyramids.add(faceKey)));
            newScore.triangles = Array.from(player.claimedFaces).filter(f => !facesInPyramids.has(f)).length;
        }
    
        const edgesInShapes = new Set<string>();
        player.claimedFaces.forEach(faceKey => {
            const face = this.gridData.faces.get(faceKey)!;
            for (let i = 0; i < face.vertices.length; i++) {
                edgesInShapes.add(getEdgeKey(face.vertices[i], face.vertices[(i + 1) % face.vertices.length]));
            }
        });
        newScore.lines = Array.from(player.claimedEdges).filter(edgeKey => !edgesInShapes.has(edgeKey)).length;
    
        const total = (newScore.pyramids || 0) * C.SCORE_PER_PYRAMID +
                      (newScore.tetrahedra || 0) * C.SCORE_PER_PYRAMID + // Use same score value for both pyramid types
                      (newScore.triangles || 0) * C.SCORE_PER_TRIANGLE +
                      (newScore.lines || 0) * C.SCORE_PER_LINE +
                      (newScore.moves || 0) * C.SCORE_PER_REMAINING_MOVE;
        newScore.total = total;
    
        if (player.id === 1) this.scoreCallbacks.p1(newScore); else this.scoreCallbacks.p2(newScore);
    }
    
    private updateDebugDisplay() {
        if (this.turnState === 'playing') {
            const validMoves = this.getValidMoves(this.getActivePlayer());
            this.setDebugInfo(prev => ({ ...prev, moves: validMoves }));
        } else {
            this.setDebugInfo(prev => ({ ...prev, moves: [] }));
        }
    }
    
    public selectMoveFromDebug(targetVertexKey: string) {
        if (this.isMoving || this.turnState !== 'playing') return;
        const player = this.getActivePlayer();
        const validMoves = this.getValidMoves(player);
        if (validMoves.includes(targetVertexKey)) {
            this.highlightMove(targetVertexKey);
        }
    }

    // --- AI LOGIC ---

    private constructAIPrompt(): string {
        const player = this.getActivePlayer();
        const opponent = this.getOpponentPlayer();
        const validMoves = this.getValidMoves(player);

        return `
GAME STATE:
- Your Player ID: ${player.id}
- Your Position: "${player.currentVertexKey}"
- Your Current Path: [${player.currentPath.map(p => `"${p}"`).join(', ')}]
- Your Moves Left: ${player.movesLeft}
- Your Claimed Edges: [${Array.from(player.claimedEdges).map(e => `"${e}"`).join(', ')}]
- Opponent Position: "${opponent.currentVertexKey}"
- Opponent's Current Path: [${opponent.currentPath.map(p => `"${p}"`).join(', ')}]
- Opponent's Claimed Edges: [${Array.from(opponent.claimedEdges).map(e => `"${e}"`).join(', ')}]
- ALL claimed edges on board: [${Array.from(this.allClaimedEdgeKeys).map(e => `"${e}"`).join(', ')}]
- Valid Moves from your current position: [${validMoves.map(m => `"${m}"`).join(', ')}]

TASK:
Return the optimal sequence of moves for this turn. You can make up to ${player.movesLeft} moves.
`;
    }

    private async executeAITurn() {
        if (!this.ai) return;

        this.turnState = 'thinking';
        this.setTurnInfo(prev => ({ ...prev, status: 'thinking' }));
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

        try {
            const userPrompt = this.constructAIPrompt();
            const systemInstruction = `You are a grandmaster-level strategic AI for a 3D Tron-like game. Your goal is to choose a sequence of moves to enclose territory and maximize your score. You must only choose from the list of valid moves provided. Creating a loop is the primary way to score. Ending a turn with remaining moves gives bonus points. If no move is beneficial, return an empty list to end your turn.`;
            const responseSchema = {
                type: Type.OBJECT,
                properties: { moves: { type: Type.ARRAY, items: { type: Type.STRING } } },
                required: ['moves']
            };

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: userPrompt,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                    temperature: 0.4,
                },
            });
            
            const resultJson = JSON.parse(response.text);
            const moves = resultJson.moves as string[] || [];

            if (moves.length > 0) {
                this.executeMoveSequence(moves);
            } else {
                this.endTurn();
            }

        } catch (error) {
            console.error("AI Error:", error);
            this.endTurn();
        }
    }
    
    private executeMoveSequence(moves: string[]) {
        const move = moves.shift();
        if (!move || this.turnState !== 'playing') {
            if (this.turnState === 'playing') this.endTurn();
            return;
        }

        const validMoves = this.getValidMoves(this.getActivePlayer());
        if (validMoves.includes(move)) {
            this.handlePlayerMove(move);

            const checkCompletion = () => {
                if (!this.isMoving && !this.loopAnimationState.isActive && this.turnState !== 'shattering' && this.turnState !== 'thinking') {
                     if (moves.length > 0 && this.turnState === 'playing') {
                        setTimeout(() => this.executeMoveSequence(moves), 600);
                    } else if (this.turnState === 'playing') {
                        this.endTurn();
                    }
                } else {
                    setTimeout(checkCompletion, 100);
                }
            };
            checkCompletion();
        } else {
            console.warn(`AI suggested an invalid move: ${move}. Ending turn.`);
            this.endTurn();
        }
    }


    // Getters for other modules
    public getPlayers = () => this.players
    public getActivePlayer = () => this.players[this.activePlayerIndex]
    public getOpponentPlayer = () => this.players[1 - this.activePlayerIndex]
    public getGridData = () => this.gridData
    public getTurnState = () => this.turnState
    public getTurnEndFocusPoint = () => this.turnState === 'shattering' ? this.shatterState.focusPoint : this.turnEndFocusPoint
    public getAnimationFocusPoint = () => this.loopAnimationState.animationFocusPoint
}