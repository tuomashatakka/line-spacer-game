
import * as THREE from 'three'
import type { GridData } from '../engine/GameLogicController'
import type { Level } from '../levels/Level'
import { getEdgeKey } from '../engine/GameLogicController'


type GridBuildingData = Omit<GridData, 'gridMesh' | 'gridPoints' | 'is2D' | 'gridType' | 'tetrahedra' | 'faceToTetras' | 'unitCubeData' | 'unitSquareData'> & {
    allShellPoints: THREE.Vector3[]
}


export function createTriangleGrid(level: Level): GridData {
    const data: GridBuildingData = {
        vertices: new Map(), adjacency: new Map(), faces: new Map(),
        vertexToFaces: new Map(),
        shellGeometries: [], allShellPoints: [], edges: [],
    }
    
    const size = level.gridShells - 1
    const spacing = level.cubeSpacing
    const edgeSet = new Set<string>()

    // 1. Generate Vertices in a hexagonal layout using axial coordinates
    for (let q = -size; q <= size; q++) {
        for (let r = -size; r <= size; r++) {
            if (Math.abs(q+r) > size) continue
            const key = `${q}_${r}`
            const x = spacing * (3/2 * q)
            const y = spacing * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r)
            const pos = new THREE.Vector3(x, y, 0)
            data.vertices.set(key, pos)
            data.adjacency.set(key, [])
            data.vertexToFaces.set(key, [])
            data.allShellPoints.push(pos)
        }
    }
    

    const directions = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]

    // 2. Generate Adjacency and Faces
    for(const [key] of data.vertices.entries()) {
        const [q, r] = key.split('_').map(Number)
        directions.forEach((dir, i) => {
            const nq = q + dir[0]
            const nr = r + dir[1]
            const neighborKey = `${nq}_${nr}`
            if (data.vertices.has(neighborKey)) {
                data.adjacency.get(key)!.push(neighborKey)
                const edgeKey = getEdgeKey(key, neighborKey); 
                if (!edgeSet.has(edgeKey)) { 
                    edgeSet.add(edgeKey)
                    data.edges.push({ k1: key, k2: neighborKey }) 
                }

                const nextDir = directions[(i + 1) % 6]
                const nnq = q + nextDir[0]
                const nnr = r + nextDir[1]
                const nextNeighborKey = `${nnq}_${nnr}`

                if(data.vertices.has(nextNeighborKey)) {
                    const faceVerts = [key, neighborKey, nextNeighborKey].sort()
                    const faceKey = `f_${faceVerts.join('_')}`
                    if(!data.faces.has(faceKey)) {
                        data.faces.set(faceKey, {key: faceKey, vertices: faceVerts})
                        faceVerts.forEach(vk => data.vertexToFaces.get(vk)!.push(faceKey))
                    }
                }
            }
        })
    }

    // 3. Generate shell geometries
    for (let s = 0; s < level.gridShells; s++) {
        const boundary = size - s
        if (boundary < 0) continue
        const hexRadius = boundary * spacing * Math.sqrt(3) // More accurate radius
        const points = []
        for (let i = 0; i < 6; i++) {
            points.push(new THREE.Vector3(
                hexRadius * Math.cos(Math.PI / 3 * i),
                hexRadius * Math.sin(Math.PI / 3 * i),
                0
            ))
        }
        points.push(points[0].clone())
        const geom = new THREE.BufferGeometry().setFromPoints(points)
        data.shellGeometries.push(geom)
    }
    data.shellGeometries.reverse()
    
    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(data.allShellPoints)
    pointsGeometry.computeBoundingSphere();
    const pointsMaterial = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.3, sizeAttenuation: true, transparent: true, opacity: 0.8 })

    return {
        gridType: 'triangle',
        is2D: true,
        gridPoints: new THREE.Points(pointsGeometry, pointsMaterial),
        tetrahedra: new Map(),
        faceToTetras: new Map(),
        ...data,
    }
}
