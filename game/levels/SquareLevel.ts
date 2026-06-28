import { Level } from './Level'
import { createSquareGrid } from '../grids/square'
import type { GridData } from '../engine/GameLogicController'
import * as C from '../config'


export class SquareLevel extends Level {
    
    public gridType = 'square' as const
    public cameraType = '2D' as const

    constructor() {
        super()
        this.cubeSpacing = C.UNIFIED_EDGE_LENGTH;
    }

    public get playerStartPositions() {
        const extent = this.gridShells - 1
        return {
            p1: `${extent}_${extent}`,
            p2: `${-extent}_${-extent}`
        }
    }


    public getGridData(): GridData {
        return createSquareGrid(this)
    }
}