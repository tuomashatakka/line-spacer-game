
import * as THREE from 'three'
import { Level } from './Level'
import { createPolyhedralGrid } from '../grids/polyhedral'
import type { GridData } from '../engine/GameLogicController'
import * as C from '../config'


export class TetrahedronLevel extends Level {
    
    public gridType = 'tetrahedron' as const
    public cameraType = '3D' as const
    public gridSubdivisions = 0

    constructor() {
        super()
        this.shellSpacing = C.UNIFIED_EDGE_LENGTH;
        // For a regular tetrahedron with circumradius R, edge length a = R * 2 * sqrt(2/3)
        // To get R for a given a, R = a / (2 * sqrt(2/3))
        // Our base geometry has R=1, so we scale it by this calculated radius.
        this.gridSize = C.UNIFIED_EDGE_LENGTH / (2 * Math.sqrt(2 / 3));
    }

    public playerStartPositions = {
        p1: '0-0', // Top vertex
        p2: '0-3'  // Opposite vertex on a 4-vertex tetrahedron
    }


    public getGridData(): GridData {
        const baseGeometry = new THREE.TetrahedronGeometry(1, this.gridSubdivisions)
        return createPolyhedralGrid(baseGeometry, this)
    }
}
