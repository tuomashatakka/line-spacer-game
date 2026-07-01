
import * as THREE from 'three'
import type { GridData } from '../engine/GameLogicController'
import { getFaceKey, getTetraKey, getEdgeKey } from '../engine/GameLogicController'
import type { Level } from '../levels/Level'

type GridBuildingData = Omit<GridData, 'gridMesh' | 'gridPoints' | 'is2D' | 'gridType'> & {
    allShellPoints: THREE.Vector3[]
}


export function createCubicGrid(level: Level): GridData {
    const data: GridBuildingData = {
        vertices: new Map(), adjacency: new Map(), faces: new Map(),
        vertexToFaces: new Map(), tetrahedra: new Map(), faceToTetras: new Map(),
        shellGeometries: [], allShellPoints: [], edges: [],
        unitCubeData: new Map(), unitSquareData: new Map(),
    }

    const extent = level.gridShells - 1
    const spacing = level.cubeSpacing
    const edgeSet = new Set<string>()

    // 1. Generate Vertices
    for (let x = -extent; x <= extent; x++) {
        for (let y = -extent; y <= extent; y++) {
            for (let z = -extent; z <= extent; z++) {
                const key = `${x}_${y}_${z}`
                const pos = new THREE.Vector3(x, y, z).multiplyScalar(spacing)
                data.vertices.set(key, pos)
                data.adjacency.set(key, [])
                data.vertexToFaces.set(key, [])
                data.allShellPoints.push(pos)
            }
        }
    }


    // 2. Generate Adjacency (Edges)
    for (let x = -extent; x <= extent; x++) {
        for (let y = -extent; y <= extent; y++) {
            for (let z = -extent; z <= extent; z++) {
                const k1 = `${x}_${y}_${z}`
                if (x < extent) {
                    const k2 = `${x + 1}_${y}_${z}`
                    data.adjacency.get(k1)!.push(k2); data.adjacency.get(k2)!.push(k1)
                    const edgeKey = getEdgeKey(k1, k2); if (!edgeSet.has(edgeKey)) { edgeSet.add(edgeKey); data.edges.push({ k1, k2 }) }
                }
                if (y < extent) {
                    const k2 = `${x}_${y + 1}_${z}`
                    data.adjacency.get(k1)!.push(k2); data.adjacency.get(k2)!.push(k1)
                    const edgeKey = getEdgeKey(k1, k2); if (!edgeSet.has(edgeKey)) { edgeSet.add(edgeKey); data.edges.push({ k1, k2 }) }
                }
                if (z < extent) {
                    const k2 = `${x}_${y}_${z + 1}`
                    data.adjacency.get(k1)!.push(k2); data.adjacency.get(k2)!.push(k1)
                    const edgeKey = getEdgeKey(k1, k2); if (!edgeSet.has(edgeKey)) { edgeSet.add(edgeKey); data.edges.push({ k1, k2 }) }
                }
            }
        }
    }
    

    // 3. Generate Faces and Tetrahedra from unit cubes
    for (let x = -extent; x < extent; x++) {
        for (let y = -extent; y < extent; y++) {
            for (let z = -extent; z < extent; z++) {
                const cubeKey = `${x}_${y}_${z}`
                const k = (dx:number, dy:number, dz:number) => `${x+dx}_${y+dy}_${z+dz}`
                const p = [k(0,0,0), k(1,0,0), k(0,1,0), k(1,1,0), k(0,0,1), k(1,0,1), k(0,1,1), k(1,1,1)]
                
                 const cubeTetrahedra = [
                    getTetraKey(p[0], p[1], p[3], p[4]),
                    getTetraKey(p[1], p[3], p[4], p[5]),
                    getTetraKey(p[3], p[4], p[5], p[7]),
                    getTetraKey(p[2], p[3], p[4], p[6]),
                    getTetraKey(p[3], p[4], p[6], p[7]),
                ]
                data.unitCubeData!.set(cubeKey, cubeTetrahedra)
                
                cubeTetrahedra.forEach(tKey => {
                     if(!data.tetrahedra.has(tKey)){
                        const [vA, vB, vC, vD] = tKey.split('|')
                        const tFaces = [ getFaceKey(vA,vB,vC), getFaceKey(vA,vB,vD), getFaceKey(vA,vC,vD), getFaceKey(vB,vC,vD) ]
                        data.tetrahedra.set(tKey, { key: tKey, faces: tFaces })
                        tFaces.forEach(fKey => {
                            if (!data.faceToTetras.has(fKey)) data.faceToTetras.set(fKey, [])
                            data.faceToTetras.get(fKey)!.push(tKey)
                            if(!data.faces.has(fKey)){
                                const faceVerts = fKey.split('|')
                                data.faces.set(fKey, { key: fKey, vertices: faceVerts })
                                faceVerts.forEach(vk => data.vertexToFaces.get(vk)!.push(fKey))
                            }
                        })
                    }
                })

                const squareFaces = [
                    {sKey: `sq_b_${cubeKey}`, verts: [p[0],p[1],p[3],p[2]]}, {sKey: `sq_t_${cubeKey}`, verts: [p[4],p[5],p[7],p[6]]},
                    {sKey: `sq_f_${cubeKey}`, verts: [p[0],p[4],p[6],p[2]]}, {sKey: `sq_k_${cubeKey}`, verts: [p[1],p[5],p[7],p[3]]},
                    {sKey: `sq_l_${cubeKey}`, verts: [p[0],p[1],p[5],p[4]]}, {sKey: `sq_r_${cubeKey}`, verts: [p[2],p[3],p[7],p[6]]},
                ]
                squareFaces.forEach(({sKey, verts}) => {
                    const f1 = getFaceKey(verts[0], verts[1], verts[3]) // Note: squares are made of two triangles, we just need the keys of those triangles
                    const f2 = getFaceKey(verts[0], verts[3], verts[2])
                    data.unitSquareData!.set(sKey, [f1, f2])
                })
            }
        }
    }
    

    // 4. Generate shell geometries for boundary visualization
    for (let s = 0; s < level.gridShells; s++) {
        const boundary = extent - s
        if (boundary < 0) continue
        const size = boundary * 2 * spacing + spacing
        const boxGeom = new THREE.BoxGeometry(size, size, size)
        const edges = new THREE.EdgesGeometry(boxGeom)
        data.shellGeometries.push(edges)
        boxGeom.dispose()
    }
    data.shellGeometries.reverse()


    // Ensure all diagonal edges and face/tetra edges are fully connected in adjacency and edges lists
    ensureAllMeshEdgesAreConnected(data, edgeSet);

    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(data.allShellPoints)
    pointsGeometry.computeBoundingSphere();
    const pointsMaterial = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.2, sizeAttenuation: true, transparent: true, opacity: 0.7 })
    
    return {
        gridType: level.gridType,
        is2D: false,
        gridPoints: new THREE.Points(pointsGeometry, pointsMaterial),
        ...data
    }
}


export function createPyramidGrid(level: Level): GridData {
    const data: GridBuildingData = {
        vertices: new Map(), adjacency: new Map(), faces: new Map(),
        vertexToFaces: new Map(), tetrahedra: new Map(), faceToTetras: new Map(),
        shellGeometries: [], allShellPoints: [], edges: [],
    }

    const extent = level.gridShells - 1;
    const spacing = level.cubeSpacing;
    const edgeSet = new Set<string>();

    // 1. Generate Vertices (corners and centers)
    // Corner points (playable nodes)
    for (let x = -extent; x <= extent; x++) {
        for (let y = -extent; y <= extent; y++) {
            for (let z = -extent; z <= extent; z++) {
                const key = `${x}_${y}_${z}`;
                const pos = new THREE.Vector3(x, y, z).multiplyScalar(spacing);
                data.vertices.set(key, pos);
                data.adjacency.set(key, []);
                data.vertexToFaces.set(key, []);
                data.allShellPoints.push(pos);
            }
        }
    }
    // Center points (pyramid apexes)
    for (let x = -extent; x < extent; x++) {
        for (let y = -extent; y < extent; y++) {
            for (let z = -extent; z < extent; z++) {
                const key = `c_${x}_${y}_${z}`;
                const pos = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5).multiplyScalar(spacing);
                data.vertices.set(key, pos);
                data.adjacency.set(key, []);
                data.vertexToFaces.set(key, []);
                data.allShellPoints.push(pos); // Make centers visible & playable!
            }
        }
    }

    // 2. Generate Adjacency (Edges) for the playable grid
    for (let x = -extent; x <= extent; x++) {
        for (let y = -extent; y <= extent; y++) {
            for (let z = -extent; z <= extent; z++) {
                const k1 = `${x}_${y}_${z}`;
                if (x < extent) {
                    const k2 = `${x + 1}_${y}_${z}`;
                    data.adjacency.get(k1)!.push(k2); data.adjacency.get(k2)!.push(k1);
                    const edgeKey = getEdgeKey(k1, k2); if (!edgeSet.has(edgeKey)) { edgeSet.add(edgeKey); data.edges.push({ k1, k2 }); }
                }
                if (y < extent) {
                    const k2 = `${x}_${y + 1}_${z}`;
                    data.adjacency.get(k1)!.push(k2); data.adjacency.get(k2)!.push(k1);
                    const edgeKey = getEdgeKey(k1, k2); if (!edgeSet.has(edgeKey)) { edgeSet.add(edgeKey); data.edges.push({ k1, k2 }); }
                }
                if (z < extent) {
                    const k2 = `${x}_${y}_${z + 1}`;
                    data.adjacency.get(k1)!.push(k2); data.adjacency.get(k2)!.push(k1);
                    const edgeKey = getEdgeKey(k1, k2); if (!edgeSet.has(edgeKey)) { edgeSet.add(edgeKey); data.edges.push({ k1, k2 }); }
                }
            }
        }
    }

    // 3. Generate Faces and Tetrahedra from unit pyramids
    for (let x = -extent; x < extent; x++) {
        for (let y = -extent; y < extent; y++) {
            for (let z = -extent; z < extent; z++) {
                const k = (dx:number, dy:number, dz:number) => `${x+dx}_${y+dy}_${z+dz}`;
                const p = [k(0,0,0), k(1,0,0), k(0,1,0), k(1,1,0), k(0,0,1), k(1,0,1), k(0,1,1), k(1,1,1)];
                const centerKey = `c_${x}_${y}_${z}`;

                const cubeFaces = [
                    [p[0], p[1], p[3], p[2]], // bottom
                    [p[4], p[6], p[7], p[5]], // top (reversed winding for correct normals)
                    [p[0], p[2], p[6], p[4]], // left
                    [p[1], p[5], p[7], p[3]], // right (reversed winding for correct normals)
                    [p[2], p[6], p[7], p[3]], // front (reversed winding for correct normals)
                    [p[0], p[4], p[5], p[1]], // back (reversed winding for correct normals)
                ];

                cubeFaces.forEach(faceVerts => {
                    const [v0, v1, v2, v3] = faceVerts;
                    // Each square face of the cube forms the base of a pyramid.
                    // The pyramid is made of two tetrahedra.
                    const pyramidTetras = [
                        getTetraKey(v0, v1, v2, centerKey),
                        getTetraKey(v0, v2, v3, centerKey),
                    ];
                    
                    pyramidTetras.forEach(tKey => {
                        if(!data.tetrahedra.has(tKey)){
                            const [vA, vB, vC, vD] = tKey.split('|');
                            const tFaces = [ getFaceKey(vA,vB,vC), getFaceKey(vA,vB,vD), getFaceKey(vA,vC,vD), getFaceKey(vB,vC,vD) ];
                            data.tetrahedra.set(tKey, { key: tKey, faces: tFaces });
                            tFaces.forEach(fKey => {
                                if (!data.faceToTetras.has(fKey)) data.faceToTetras.set(fKey, []);
                                data.faceToTetras.get(fKey)!.push(tKey);
                                if(!data.faces.has(fKey)){
                                    const fVerts = fKey.split('|');
                                    data.faces.set(fKey, { key: fKey, vertices: fVerts });
                                    fVerts.forEach(vk => {
                                        // Center points are not playable, so they don't have an entry in vertexToFaces
                                        if (data.vertexToFaces.has(vk)) {
                                            data.vertexToFaces.get(vk)!.push(fKey);
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            }
        }
    }

    // 4. Generate shell geometries for boundary visualization
    for (let s = 0; s < level.gridShells; s++) {
        const boundary = extent - s;
        if (boundary < 0) continue;
        const size = boundary * 2 * spacing + spacing;
        const boxGeom = new THREE.BoxGeometry(size, size, size);
        const edges = new THREE.EdgesGeometry(boxGeom);
        data.shellGeometries.push(edges);
        boxGeom.dispose();
    }
    data.shellGeometries.reverse();


    // Ensure all diagonal edges and face/tetra edges are fully connected in adjacency and edges lists
    ensureAllMeshEdgesAreConnected(data, edgeSet);

    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(data.allShellPoints);
    pointsGeometry.computeBoundingSphere();
    const pointsMaterial = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.2, sizeAttenuation: true, transparent: true, opacity: 0.7 });
    
    return {
        gridType: level.gridType,
        is2D: false,
        gridPoints: new THREE.Points(pointsGeometry, pointsMaterial),
        ...data
    }
}

function ensureAllMeshEdgesAreConnected(data: any, edgeSet: Set<string>) {
    // 1. Ensure all face edges are in adjacency and edges
    for (const face of data.faces.values()) {
        const verts = face.vertices;
        const len = verts.length;
        for (let i = 0; i < len; i++) {
            const k1 = verts[i];
            const k2 = verts[(i + 1) % len];
            const edgeKey = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
            
            if (!edgeSet.has(edgeKey)) {
                edgeSet.add(edgeKey);
                data.edges.push({ k1, k2 });
            }
            if (!data.adjacency.get(k1).includes(k2)) {
                data.adjacency.get(k1).push(k2);
            }
            if (!data.adjacency.get(k2).includes(k1)) {
                data.adjacency.get(k2).push(k1);
            }
        }
    }

    // 2. Ensure all tetrahedra edges are in adjacency and edges
    for (const tetra of data.tetrahedra.values()) {
        const [vA, vB, vC, vD] = tetra.key.split('|');
        const pairs = [
            [vA, vB], [vA, vC], [vA, vD],
            [vB, vC], [vB, vD], [vC, vD]
        ];
        pairs.forEach(([k1, k2]) => {
            const edgeKey = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
            if (!edgeSet.has(edgeKey)) {
                edgeSet.add(edgeKey);
                data.edges.push({ k1, k2 });
            }
            if (!data.adjacency.get(k1).includes(k2)) {
                data.adjacency.get(k1).push(k2);
            }
            if (!data.adjacency.get(k2).includes(k1)) {
                data.adjacency.get(k2).push(k1);
            }
        });
    }

    // 3. Clean up duplicates in adjacency
    for (const [key, neighbors] of data.adjacency.entries()) {
        data.adjacency.set(key, Array.from(new Set(neighbors)));
    }
}
