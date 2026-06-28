
import * as THREE from 'three'
import type { GridData } from '../engine/GameLogicController'
import type { Level } from '../levels/Level'
import { getEdgeKey, getFaceKey } from '../engine/GameLogicController'


type GridBuildingData = Omit<GridData, 'gridMesh' | 'gridPoints' | 'is2D' | 'gridType' | 'tetrahedra' | 'faceToTetras' | 'unitCubeData' | 'unitSquareData'> & {
    allShellPoints: THREE.Vector3[]
}


export function createSquareGrid(level: Level): GridData {
    const data: GridBuildingData = {
        vertices: new Map(), adjacency: new Map(), faces: new Map(),
        vertexToFaces: new Map(),
        shellGeometries: [], allShellPoints: [], edges: [],
    }

    const extent = level.gridShells - 1
    const spacing = level.cubeSpacing
    const edgeSet = new Set<string>()

    // 1. Generate Vertices (on the XY plane)
    for (let x = -extent; x <= extent; x++) {
        for (let y = -extent; y <= extent; y++) {
            const key = `${x}_${y}`
            const pos = new THREE.Vector3(x * spacing, y * spacing, 0)
            data.vertices.set(key, pos)
            data.adjacency.set(key, [])
            data.vertexToFaces.set(key, [])
            data.allShellPoints.push(pos)
        }
    }


    // 2. Generate Adjacency (Edges) and Faces
    for (let x = -extent; x <= extent; x++) {
        for (let y = -extent; y <= extent; y++) {
            const k1 = `${x}_${y}`
            
            if (x < extent) {
                const k2 = `${x + 1}_${y}`
                data.adjacency.get(k1)!.push(k2); data.adjacency.get(k2)!.push(k1)
                const edgeKey = getEdgeKey(k1, k2); if (!edgeSet.has(edgeKey)) { edgeSet.add(edgeKey); data.edges.push({ k1, k2 }) }
            }
            if (y < extent) {
                const k2 = `${x}_${y + 1}`
                data.adjacency.get(k1)!.push(k2); data.adjacency.get(k2)!.push(k1)
                const edgeKey = getEdgeKey(k1, k2); if (!edgeSet.has(edgeKey)) { edgeSet.add(edgeKey); data.edges.push({ k1, k2 }) }
            }
            
            if (x < extent && y < extent) {
                const v_00 = `${x}_${y}`
                const v_10 = `${x + 1}_${y}`
                const v_01 = `${x}_${y + 1}`
                const v_11 = `${x + 1}_${y + 1}`
                
                // Split square into two triangles along the v_00 -> v_11 diagonal
                const f1_verts = [v_00, v_10, v_11];
                const f2_verts = [v_00, v_11, v_01];

                const faceKey1 = getFaceKey(f1_verts[0], f1_verts[1], f1_verts[2]);
                const faceKey2 = getFaceKey(f2_verts[0], f2_verts[1], f2_verts[2]);

                if (!data.faces.has(faceKey1)) {
                    data.faces.set(faceKey1, { key: faceKey1, vertices: f1_verts });
                    f1_verts.forEach(vk => data.vertexToFaces.get(vk)!.push(faceKey1));
                }
                if (!data.faces.has(faceKey2)) {
                    data.faces.set(faceKey2, { key: faceKey2, vertices: f2_verts });
                    f2_verts.forEach(vk => data.vertexToFaces.get(vk)!.push(faceKey2));
                }
            }
        }
    }


    // 3. Generate shell geometries for boundary visualization
    for (let s = 0; s < level.gridShells; s++) {
        const boundary = extent - s
        if (boundary < 0) continue
        const size = boundary * spacing * 2 + spacing
        const squareShape = new THREE.Shape()
        squareShape.moveTo(-size/2, -size/2)
        squareShape.lineTo(size/2, -size/2)
        squareShape.lineTo(size/2, size/2)
        squareShape.lineTo(-size/2, size/2)
        squareShape.closePath()
        const geom = new THREE.BufferGeometry().setFromPoints(squareShape.getPoints())
        data.shellGeometries.push(geom)
    }
    data.shellGeometries.reverse()
    
    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(data.allShellPoints)
    pointsGeometry.computeBoundingSphere();
    const pointsMaterial = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.3, sizeAttenuation: true, transparent: true, opacity: 0.8 })

    return {
        gridType: 'square',
        is2D: true,
        gridPoints: new THREE.Points(pointsGeometry, pointsMaterial),
        tetrahedra: new Map(),
        faceToTetras: new Map(),
        ...data,
    }
}
