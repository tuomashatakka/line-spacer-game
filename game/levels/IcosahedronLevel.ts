
import * as THREE from 'three'
import { Level } from './Level'
import { createIcosahedronTriangleGrid } from '../grids/polyhedral'
import type { GridData } from '../engine/GameLogicController'
import * as C from '../config'


export class IcosahedronLevel extends Level {
    
    public gridType = 'icosahedron' as const
    public cameraType = '3D' as const
    public gridSubdivisions = 1 // Higher subdivision for more triangles

    constructor() {
        super();
        // Since we are no longer using shells, we only need to define the outer radius.
        this.gridShells = 1; // No shells
        this.shellSpacing = 0; 
        
        // This calculation sets the radius of the icosahedron so that its
        // main edges (before subdivision) are of a standard length.
        const icoEdgeFactor = 1 / (2 * Math.sin(2 * Math.PI / 10)); // Ratio of edge length to circumradius for icosahedron
        this.gridSize = (C.UNIFIED_EDGE_LENGTH * 2.5) / icoEdgeFactor;
    }

    public playerStartPositions = {
        // With 1 subdivision, an icosahedron has 42 vertices.
        p1: '0-0',  // A vertex from the original 12
        p2: '0-6' // A vertex roughly opposite on the other side of the pole.
    }


    public getGridData(): GridData {
        return createIcosahedronTriangleGrid(this)
    }
}
