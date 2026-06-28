import { Level } from './Level'
import { createTriangleGrid } from '../grids/triangle'
import type { GridData } from '../engine/GameLogicController'
import * as C from '../config'


export class TriangleLevel extends Level {
    
    public gridType = 'triangle' as const
    public cameraType = '2D' as const

    constructor() {
        super();
        // In the triangular grid generation, the distance between vertices is spacing * sqrt(3).
        // To make the final edge length equal to UNIFIED_EDGE_LENGTH, we must set the base spacing accordingly.
        this.cubeSpacing = C.UNIFIED_EDGE_LENGTH / Math.sqrt(3);
    }

    public get playerStartPositions() {
        const extent = this.gridShells - 1
        return {
            p1: `${extent}_0`, // Right side
            p2: `${-extent}_0` // Left side
        }
    }


    public getGridData(): GridData {
        return createTriangleGrid(this)
    }
}