
import { Level } from './Level'
import { createStellarGrid } from '../grids/stellar'
import type { GridData } from '../engine/GameLogicController'
import * as C from '../config'


export class OctahedronLevel extends Level {
    
    public gridType = 'octahedron' as const
    public cameraType = '3D' as const
    
    constructor() {
        super();
        this.cubeSpacing = 2.8284270763397217 * 2; // Diameter of the primitive
        this.gridShells = 1; // Not used by stellar grid
    }

    public get playerStartPositions() {
        // Start positions will be at opposite corners of the 3x2x2 grid of primitives.
        // We use the center vertex of two opposing primitives.
        return {
            p1: 'c_0_0_0',
            p2: 'c_2_1_1',
        }
    }

    public getGridData(): GridData {
        return createStellarGrid(this);
    }
}
