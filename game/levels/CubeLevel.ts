
import { Level } from './Level'
import { createPyramidGrid } from '../grids/cube'
import type { GridData } from '../engine/GameLogicController'
import * as C from '../config'


export class CubeLevel extends Level {
    
    public gridType = 'cube' as const
    public cameraType = '3D' as const

    constructor() {
        super()
        this.cubeSpacing = C.UNIFIED_EDGE_LENGTH;
    }

    public get playerStartPositions() {
        const extent = this.gridShells - 1
        return {
            p1: `${extent}_${extent}_${extent}`,
            p2: `${-extent}_${-extent}_${-extent}`
        }
    }


    public getGridData(): GridData {
        return createPyramidGrid(this)
    }
}
