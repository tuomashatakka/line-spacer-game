
import * as THREE from 'three'
import * as C from '../config'
import type { GridData } from '../engine/GameLogicController'
import type { GridType } from '../../App'


export abstract class Level {
    
    abstract gridType: GridType
    abstract cameraType: '2D' | '3D'
    abstract playerStartPositions: { p1: string; p2: string }

    public gridSize!: number
    public gridShells: number = C.GRID_SHELLS
    public shellSpacing!: number
    public cubeSpacing!: number
    public gridSubdivisions: number = 0

    public abstract getGridData(): GridData
}