
import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { getFaceKey, getTetraKey, getEdgeKey } from '../engine/GameLogicController'
import type { GridData } from '../engine/GameLogicController'
import type { GridType } from '../../App'
import type { Level } from '../levels/Level'


type GridBuildingData = Omit<GridData, 'gridMesh' | 'gridPoints' | 'is2D' | 'gridType'> & {
    allShellPoints: THREE.Vector3[]
}


export function createPolyhedralGrid(baseGeometry: THREE.BufferGeometry, level: Level): GridData {
    const data: GridBuildingData = {
        vertices: new Map(), adjacency: new Map(), faces: new Map(),
        vertexToFaces: new Map(), tetrahedra: new Map(), faceToTetras: new Map(),
        shellGeometries: [], allShellPoints: [], edges: [],
    }
    
    const indexedGeom = mergeVertices(baseGeometry)
    const baseVertices = indexedGeom.getAttribute('position')
    const baseIndices = indexedGeom.index!.array
    const numBaseVertices = baseVertices.count
    const shellVertexMap: string[][] = []
    const edgeSet = new Set<string>()


    // 1. Generate concentric shells of vertices
    for (let s = 0; s < level.gridShells; s++) {
        const radius = level.gridSize - s * level.shellSpacing
        const currentShellVertexKeys: string[] = []
        for (let i = 0; i < numBaseVertices; i++) {
            const key = `${s}-${i}`
            const pos = new THREE.Vector3().fromBufferAttribute(baseVertices, i).multiplyScalar(radius)
            data.vertices.set(key, pos)
            data.adjacency.set(key, [])
            data.vertexToFaces.set(key, [])
            data.allShellPoints.push(pos)
            currentShellVertexKeys.push(key)
        }
        shellVertexMap.push(currentShellVertexKeys)
    }
  

    // 2. Build adjacency, faces, and tetrahedra
    for (let s = 0; s < level.gridShells; s++) {
        const currentShellLines: THREE.Vector3[] = []
        const currentShellVertexKeys = shellVertexMap[s]

        for(let i = 0; i < baseIndices.length; i += 3) {
            const i1 = baseIndices[i], i2 = baseIndices[i+1], i3 = baseIndices[i+2]
            const k1 = currentShellVertexKeys[i1], k2 = currentShellVertexKeys[i2], k3 = currentShellVertexKeys[i3]
            const v1 = data.vertices.get(k1)!, v2 = data.vertices.get(k2)!, v3 = data.vertices.get(k3)!

            const edges = [{ka:k1,kb:k2,va:v1,vb:v2}, {ka:k2,kb:k3,va:v2,vb:v3}, {ka:k3,kb:k1,va:v3,vb:v1}]
            edges.forEach(({ka, kb, va, vb}) => {
                if (!data.adjacency.get(ka)!.includes(kb)) data.adjacency.get(ka)!.push(kb)
                if (!data.adjacency.get(kb)!.includes(ka)) data.adjacency.get(kb)!.push(ka)
                const edgeKey = getEdgeKey(ka, kb); if (!edgeSet.has(edgeKey)) { edgeSet.add(edgeKey); data.edges.push({ k1: ka, k2: kb }) }
                currentShellLines.push(va, vb)
            })

            const faceKey = getFaceKey(k1,k2,k3)
            if(!data.faces.has(faceKey)){
                const faceVertices: string[] = [k1, k2, k3]
                data.faces.set(faceKey, { key: faceKey, vertices: faceVertices })
                faceVertices.forEach(vk => data.vertexToFaces.get(vk)!.push(faceKey))
            }
        }
        const shellGeom = new THREE.BufferGeometry().setFromPoints(currentShellLines)
        data.shellGeometries.push(shellGeom)

        if (s < level.gridShells - 1) {
            const nextShellVertexKeys = shellVertexMap[s + 1]
            for(let i=0; i < currentShellVertexKeys.length; i++) {
                const k_current = currentShellVertexKeys[i]
                const k_next = nextShellVertexKeys[i]
                data.adjacency.get(k_current)!.push(k_next)
                data.adjacency.get(k_next)!.push(k_current)
                const edgeKey = getEdgeKey(k_current, k_next); if (!edgeSet.has(edgeKey)) { edgeSet.add(edgeKey); data.edges.push({ k1: k_current, k2: k_next }) }
            }
        
            for(let i = 0; i < baseIndices.length; i += 3) {
                const i1 = baseIndices[i], i2 = baseIndices[i+1], i3 = baseIndices[i+2]
                const k1s = currentShellVertexKeys[i1], k2s = currentShellVertexKeys[i2], k3s = currentShellVertexKeys[i3]
                const k1n = nextShellVertexKeys[i1], k2n = nextShellVertexKeys[i2], k3n = nextShellVertexKeys[i3]
                
                const tetrahedraKeys = [
                    getTetraKey(k1s, k2s, k3s, k3n), getTetraKey(k1s, k2s, k2n, k3n), getTetraKey(k1s, k1n, k2n, k3n)
                ]

                tetrahedraKeys.forEach(tKey => {
                    if(!data.tetrahedra.has(tKey)){
                        const [vA, vB, vC, vD] = tKey.split('|')
                        const tFaces = [ getFaceKey(vA, vB, vC), getFaceKey(vA, vB, vD), getFaceKey(vA, vC, vD), getFaceKey(vB, vC, vD) ]
                        data.tetrahedra.set(tKey, { key: tKey, faces: tFaces })
                        tFaces.forEach(fKey => {
                            if (!data.faceToTetras.has(fKey)) data.faceToTetras.set(fKey, [])
                            data.faceToTetras.get(fKey)!.push(tKey)
                        })
                    }
                })
            }
        }
    }


    indexedGeom.dispose()
    baseGeometry.dispose()
    
    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(data.allShellPoints)
    pointsGeometry.computeBoundingSphere();
    const pointsMaterial = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.15, sizeAttenuation: true, transparent: true, opacity: 0.7 })
    
    return {
        gridType: level.gridType,
        is2D: false,
        gridPoints: new THREE.Points(pointsGeometry, pointsMaterial),
        ...data
    }
}


export function createIcosahedralPyramidGrid(level: Level): GridData {
    const data: GridBuildingData = {
        vertices: new Map(), adjacency: new Map(), faces: new Map(),
        vertexToFaces: new Map(), tetrahedra: new Map(), faceToTetras: new Map(),
        shellGeometries: [], allShellPoints: [], edges: [],
    };

    const baseGeometry = new THREE.IcosahedronGeometry(level.gridSize, level.gridSubdivisions);
    const indexedGeom = mergeVertices(baseGeometry);
    const baseVertices = indexedGeom.getAttribute('position');
    const baseIndices = indexedGeom.index!.array;
    const edgeSet = new Set<string>();
    const centerKey = 'C';

    // 1. Generate surface vertices
    for (let i = 0; i < baseVertices.count; i++) {
        const key = `0-${i}`; // '0' for the only shell
        const pos = new THREE.Vector3().fromBufferAttribute(baseVertices, i);
        data.vertices.set(key, pos);
        data.adjacency.set(key, []);
        data.vertexToFaces.set(key, []);
        data.allShellPoints.push(pos);
    }
    // Add center vertex (non-playable)
    data.vertices.set(centerKey, new THREE.Vector3(0, 0, 0));


    // 2. Build surface adjacency, faces, and volumetric tetrahedra
    const surfaceLines: THREE.Vector3[] = [];
    for (let i = 0; i < baseIndices.length; i += 3) {
        const i1 = baseIndices[i], i2 = baseIndices[i+1], i3 = baseIndices[i+2];
        const k1 = `0-${i1}`, k2 = `0-${i2}`, k3 = `0-${i3}`;
        const v1 = data.vertices.get(k1)!, v2 = data.vertices.get(k2)!, v3 = data.vertices.get(k3)!;

        // Adjacency and Edges
        const currentEdges = [{ka:k1,kb:k2,va:v1,vb:v2}, {ka:k2,kb:k3,va:v2,vb:v3}, {ka:k3,kb:k1,va:v3,vb:v1}];
        currentEdges.forEach(({ka, kb, va, vb}) => {
            if (!data.adjacency.get(ka)!.includes(kb)) data.adjacency.get(ka)!.push(kb);
            if (!data.adjacency.get(kb)!.includes(ka)) data.adjacency.get(kb)!.push(ka);
            const edgeKey = getEdgeKey(ka, kb);
            if (!edgeSet.has(edgeKey)) {
                edgeSet.add(edgeKey);
                data.edges.push({ k1: ka, k2: kb });
                surfaceLines.push(va, vb);
            }
        });

        // Surface Face
        const faceKey = getFaceKey(k1, k2, k3);
        if (!data.faces.has(faceKey)) {
            const faceVertices = [k1, k2, k3];
            data.faces.set(faceKey, { key: faceKey, vertices: faceVertices });
            faceVertices.forEach(vk => data.vertexToFaces.get(vk)!.push(faceKey));
        }

        // Volumetric Tetrahedron (Pyramid)
        const tetraKey = getTetraKey(k1, k2, k3, centerKey);
        if (!data.tetrahedra.has(tetraKey)) {
            // A pyramid consists of the base face, and 3 side faces connecting to the apex (center)
            const tFaces = [
                faceKey, // base
                getFaceKey(k1, k2, centerKey),
                getFaceKey(k2, k3, centerKey),
                getFaceKey(k3, k1, centerKey),
            ];
            data.tetrahedra.set(tetraKey, { key: tetraKey, faces: tFaces });
            tFaces.forEach(fKey => {
                if (!data.faceToTetras.has(fKey)) data.faceToTetras.set(fKey, []);
                data.faceToTetras.get(fKey)!.push(tetraKey);
                
                // Also add the side faces to the main face list if they don't exist
                if (!data.faces.has(fKey)) {
                    const verts = fKey.split('|');
                    data.faces.set(fKey, { key: fKey, vertices: verts });
                    verts.forEach(vk => {
                        // Don't add faces to the center vertex's list
                        if (vk !== centerKey) data.vertexToFaces.get(vk)!.push(fKey);
                    });
                }
            });
        }
    }

    const shellGeom = new THREE.BufferGeometry().setFromPoints(surfaceLines);
    data.shellGeometries.push(shellGeom);

    indexedGeom.dispose();
    baseGeometry.dispose();

    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(data.allShellPoints);
    pointsGeometry.computeBoundingSphere();
    const pointsMaterial = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.15, sizeAttenuation: true, transparent: true, opacity: 0.7 });

    return {
        gridType: level.gridType,
        is2D: false,
        gridPoints: new THREE.Points(pointsGeometry, pointsMaterial),
        ...data,
    };
}
