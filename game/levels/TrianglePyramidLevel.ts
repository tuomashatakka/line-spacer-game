import { Level } from './Level'
import { createTrianglePyramidGrid } from '../grids/triangle_pyramid'
import type { GridData } from '../engine/GameLogicController'
import * as C from '../config'


export class TrianglePyramidLevel extends Level {
    
    public gridType = 'triangle_pyramid' as const
    public cameraType = '3D' as const

    constructor() {
        super()
        this.gridShells = 4; // Height/layers of the pyramid (perfect size!)
        this.cubeSpacing = C.UNIFIED_EDGE_LENGTH;
    }

    public get playerStartPositions() {
        const H = this.gridShells;
        return {
            p1: '0_0_0', // One corner of the base
            p2: `0_${H - 1}_0` // Symmetrical opposite corner of the base
        }
    }

    public getGridData(): GridData {
        return createTrianglePyramidGrid(this)
    }
}
