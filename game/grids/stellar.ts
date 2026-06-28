
import * as THREE from 'three'
import type { GridData } from '../engine/GameLogicController'
import { getFaceKey, getTetraKey, getEdgeKey } from '../engine/GameLogicController'
import type { Level } from '../levels/Level'

type GridBuildingData = Omit<GridData, 'gridMesh' | 'gridPoints' | 'is2D' | 'gridType'> & {
    allShellPoints: THREE.Vector3[]
}

export function createStellarGrid(level: Level): GridData {
    const data: GridBuildingData = {
        vertices: new Map(), adjacency: new Map(), faces: new Map(),
        vertexToFaces: new Map(), tetrahedra: new Map(), faceToTetras: new Map(),
        shellGeometries: [], allShellPoints: [], edges: [],
    }

    const R = 2.8284270763397217;
    const spacing = R; // Primitives will touch at their outer vertices
    const edgeSet = new Set<string>();

    const gridDim = { x: 3, y: 2, z: 2 }; // 12 primitives

    // Vertex keys will be based on their integer grid coordinates
    // Center point of primitive (i,j,k) -> "c_i_j_k"
    // Shared vertex between (i,j,k) and (i+1,j,k) -> "vx_i_j_k"

    // 1. Generate all unique vertex positions and keys
    for (let i = 0; i < gridDim.x; i++) {
        for (let j = 0; j < gridDim.y; j++) {
            for (let k = 0; k < gridDim.z; k++) {
                // Primitive Center vertex
                const cKey = `c_${i}_${j}_${k}`;
                const cPos = new THREE.Vector3(i * 2 * spacing, j * 2 * spacing, k * 2 * spacing);
                data.vertices.set(cKey, cPos);
                data.adjacency.set(cKey, []);
                data.vertexToFaces.set(cKey, []);
                data.allShellPoints.push(cPos);

                // Outer vertices (face-sharing points)
                const outer_offsets = [
                    { key: `vx_${i}_${j}_${k}`, pos: new THREE.Vector3(spacing, 0, 0) },
                    { key: `vx_${i-1}_${j}_${k}`, pos: new THREE.Vector3(-spacing, 0, 0) },
                    { key: `vy_${i}_${j}_${k}`, pos: new THREE.Vector3(0, spacing, 0) },
                    { key: `vy_${i}_${j-1}_${k}`, pos: new THREE.Vector3(0, -spacing, 0) },
                    { key: `vz_${i}_${j}_${k}`, pos: new THREE.Vector3(0, 0, spacing) },
                    { key: `vz_${i}_${j}_${k-1}`, pos: new THREE.Vector3(0, 0, -spacing) },
                ]
                outer_offsets.forEach(off => {
                    if (!data.vertices.has(off.key)) {
                        const vPos = cPos.clone().add(off.pos);
                        data.vertices.set(off.key, vPos);
                        data.adjacency.set(off.key, []);
                        data.vertexToFaces.set(off.key, []);
                        data.allShellPoints.push(vPos);
                    }
                })
            }
        }
    }


    // 2. Build adjacency, faces, and tetrahedra for each primitive
    for (let i = 0; i < gridDim.x; i++) {
        for (let j = 0; j < gridDim.y; j++) {
            for (let k = 0; k < gridDim.z; k++) {
                const cKey = `c_${i}_${j}_${k}`;
                const xpKey = `vx_${i}_${j}_${k}`;
                const xmKey = `vx_${i-1}_${j}_${k}`;
                const ypKey = `vy_${i}_${j}_${k}`;
                const ymKey = `vy_${i}_${j-1}_${k}`;
                const zpKey = `vz_${i}_${j}_${k}`;
                const zmKey = `vz_${i}_${j}_${k-1}`;
                
                const outerKeys = [xpKey, xmKey, ypKey, ymKey, zpKey, zmKey];

                // Adjacency: center to all outer vertices
                outerKeys.forEach(vk => {
                    data.adjacency.get(cKey)!.push(vk);
                    data.adjacency.get(vk)!.push(cKey);
                    const edgeKey = getEdgeKey(cKey, vk);
                    if (!edgeSet.has(edgeKey)) { edgeSet.add(edgeKey); data.edges.push({ k1: cKey, k2: vk }); }
                });

                // Adjacency: outer vertices to form octahedron edges
                const octaEdges = [
                    [ypKey, zpKey], [ypKey, xpKey], [ypKey, zmKey], [ypKey, xmKey],
                    [ymKey, zpKey], [ymKey, xpKey], [ymKey, zmKey], [ymKey, xmKey],
                    [zpKey, xpKey], [xpKey, zmKey], [zmKey, xmKey], [xmKey, zpKey]
                ];
                octaEdges.forEach(([k1, k2]) => {
                     data.adjacency.get(k1)!.push(k2);
                     data.adjacency.get(k2)!.push(k1);
                     const edgeKey = getEdgeKey(k1, k2);
                     if (!edgeSet.has(edgeKey)) { edgeSet.add(edgeKey); data.edges.push({ k1, k2 }); }
                });

                // Faces and Tetrahedra (8 pyramids per primitive)
                const octaFaces = [
                    [ypKey, xpKey, zpKey], [ypKey, zpKey, xmKey], [ypKey, xmKey, zmKey], [ypKey, zmKey, xpKey],
                    [ymKey, zpKey, xpKey], [ymKey, xmKey, zpKey], [ymKey, zmKey, xmKey], [ymKey, xpKey, zmKey]
                ];
                octaFaces.forEach(faceVerts => {
                    const faceKey = getFaceKey(faceVerts[0], faceVerts[1], faceVerts[2]);
                    if (!data.faces.has(faceKey)) {
                        data.faces.set(faceKey, { key: faceKey, vertices: faceVerts });
                        faceVerts.forEach(vk => data.vertexToFaces.get(vk)!.push(faceKey));
                    }
                    const tetraKey = getTetraKey(faceVerts[0], faceVerts[1], faceVerts[2], cKey);
                     if (!data.tetrahedra.has(tetraKey)) {
                        const tFaces = [
                            faceKey,
                            getFaceKey(faceVerts[0], faceVerts[1], cKey),
                            getFaceKey(faceVerts[1], faceVerts[2], cKey),
                            getFaceKey(faceVerts[2], faceVerts[0], cKey),
                        ];
                        data.tetrahedra.set(tetraKey, { key: tetraKey, faces: tFaces });
                        tFaces.forEach(fKey => {
                            if (!data.faceToTetras.has(fKey)) data.faceToTetras.set(fKey, []);
                            data.faceToTetras.get(fKey)!.push(tetraKey);
                            if (!data.faces.has(fKey)) {
                                const verts = fKey.split('|');
                                data.faces.set(fKey, { key: fKey, vertices: verts });
                                verts.forEach(vk => data.vertexToFaces.get(vk)!.push(fKey));
                            }
                        });
                    }
                });
            }
        }
    }
    
    // Add a single bounding box shell for visualization
    const boundingBox = new THREE.Box3().setFromPoints(Array.from(data.vertices.values()));
    const boxGeom = new THREE.BoxGeometry(boundingBox.getSize(new THREE.Vector3()).x, boundingBox.getSize(new THREE.Vector3()).y, boundingBox.getSize(new THREE.Vector3()).z);
    boxGeom.translate(boundingBox.getCenter(new THREE.Vector3()).x, boundingBox.getCenter(new THREE.Vector3()).y, boundingBox.getCenter(new THREE.Vector3()).z);
    const edges = new THREE.EdgesGeometry(boxGeom);
    data.shellGeometries.push(edges);
    boxGeom.dispose();
    
    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(data.allShellPoints);
    pointsGeometry.computeBoundingSphere();
    const pointsMaterial = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.2, sizeAttenuation: true, transparent: true, opacity: 0.7 });

    return {
        gridType: level.gridType,
        is2D: false,
        gridPoints: new THREE.Points(pointsGeometry, pointsMaterial),
        ...data,
    };
}