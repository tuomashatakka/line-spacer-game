import * as THREE from 'three'
import type { GridData } from '../engine/GameLogicController'
import { getEdgeKey, getFaceKey, getTetraKey } from '../engine/GameLogicController'
import type { Level } from '../levels/Level'

type GridBuildingData = Omit<GridData, 'gridMesh' | 'gridPoints' | 'is2D' | 'gridType'> & {
    allShellPoints: THREE.Vector3[]
}

export function createTrianglePyramidGrid(level: Level): GridData {
    const data: GridBuildingData = {
        vertices: new Map(), adjacency: new Map(), faces: new Map(),
        vertexToFaces: new Map(), tetrahedra: new Map(), faceToTetras: new Map(),
        shellGeometries: [], allShellPoints: [], edges: [],
    }

    const H = level.gridShells; // Number of layers (height of the pyramid)
    const spacing = level.cubeSpacing;
    const edgeSet = new Set<string>();

    // Layer height factor for regular tetrahedron: sqrt(2/3)
    const layerHeight = spacing * Math.sqrt(2 / 3);

    // 1. Generate Vertices
    for (let h = 0; h < H; h++) {
        const sideLen = H - 1 - h;
        for (let u = 0; u <= sideLen; u++) {
            for (let v = 0; v <= sideLen - u; v++) {
                const key = `${h}_${u}_${v}`;
                
                // Centroid calculation to center each layer h
                const centroidX = sideLen / 3;
                const centroidY = (sideLen * Math.sqrt(3)) / 6;

                const x = (u + v * 0.5 - centroidX) * spacing;
                const y = (v * Math.sqrt(3) * 0.5 - centroidY) * spacing;
                const z = (h - (H - 1) / 3) * layerHeight; // Centered z-axis

                const pos = new THREE.Vector3(x, y, z);
                data.vertices.set(key, pos);
                data.adjacency.set(key, []);
                data.vertexToFaces.set(key, []);
                data.allShellPoints.push(pos);
            }
        }
    }

    // 2. Generate Adjacency (Edges) and Faces within each layer
    for (let h = 0; h < H; h++) {
        const sideLen = H - 1 - h;
        const currentLayerLines: THREE.Vector3[] = [];

        for (let u = 0; u <= sideLen; u++) {
            for (let v = 0; v <= sideLen - u; v++) {
                const k1 = `${h}_${u}_${v}`;

                // Horizontal neighbors
                if (u + 1 <= sideLen - v) {
                    const k2 = `${h}_${u + 1}_${v}`;
                    data.adjacency.get(k1)!.push(k2);
                    data.adjacency.get(k2)!.push(k1);
                    const edgeKey = getEdgeKey(k1, k2);
                    if (!edgeSet.has(edgeKey)) {
                        edgeSet.add(edgeKey);
                        data.edges.push({ k1, k2 });
                        currentLayerLines.push(data.vertices.get(k1)!, data.vertices.get(k2)!);
                    }
                }

                // Diagonal neighbors within layer
                if (v + 1 <= sideLen - u) {
                    const k2 = `${h}_${u}_${v + 1}`;
                    data.adjacency.get(k1)!.push(k2);
                    data.adjacency.get(k2)!.push(k1);
                    const edgeKey = getEdgeKey(k1, k2);
                    if (!edgeSet.has(edgeKey)) {
                        edgeSet.add(edgeKey);
                        data.edges.push({ k1, k2 });
                        currentLayerLines.push(data.vertices.get(k1)!, data.vertices.get(k2)!);
                    }
                }

                // Winding connection
                if (u + 1 <= sideLen - v && v + 1 <= sideLen - u) {
                    const k_right = `${h}_${u + 1}_${v}`;
                    const k_up = `${h}_${u}_${v + 1}`;
                    const edgeKey = getEdgeKey(k_right, k_up);
                    if (!edgeSet.has(edgeKey)) {
                        edgeSet.add(edgeKey);
                        data.edges.push({ k1: k_right, k2: k_up });
                        currentLayerLines.push(data.vertices.get(k_right)!, data.vertices.get(k_up)!);
                    }
                }

                // Faces within the layer
                if (u + 1 <= sideLen - v && v + 1 <= sideLen - u) {
                    const f1_verts = [k1, `${h}_${u + 1}_${v}`, `${h}_${u}_${v + 1}`];
                    const faceKey1 = getFaceKey(f1_verts[0], f1_verts[1], f1_verts[2]);
                    if (!data.faces.has(faceKey1)) {
                        data.faces.set(faceKey1, { key: faceKey1, vertices: f1_verts });
                        f1_verts.forEach(vk => data.vertexToFaces.get(vk)!.push(faceKey1));
                    }

                    if (u + 1 <= sideLen - (v + 1)) {
                        const f2_verts = [`${h}_${u + 1}_${v}`, `${h}_${u + 1}_${v + 1}`, `${h}_${u}_${v + 1}`];
                        const faceKey2 = getFaceKey(f2_verts[0], f2_verts[1], f2_verts[2]);
                        if (!data.faces.has(faceKey2)) {
                            data.faces.set(faceKey2, { key: faceKey2, vertices: f2_verts });
                            f2_verts.forEach(vk => data.vertexToFaces.get(vk)!.push(faceKey2));
                        }
                    }
                }
            }
        }

        if (currentLayerLines.length > 0) {
            const layerGeom = new THREE.BufferGeometry().setFromPoints(currentLayerLines);
            data.shellGeometries.push(layerGeom);
        }
    }

    // 3. Connect between layers and build tetrahedra (pyramids)
    for (let h = 0; h < H - 1; h++) {
        const sideLenUpper = H - 1 - (h + 1);
        for (let u = 0; u <= sideLenUpper; u++) {
            for (let v = 0; v <= sideLenUpper - u; v++) {
                const k_upper = `${h + 1}_${u}_${v}`;

                const k_lower_00 = `${h}_${u}_${v}`;
                const k_lower_10 = `${h}_${u + 1}_${v}`;
                const k_lower_01 = `${h}_${u}_${v + 1}`;

                const lowerVerts = [k_lower_00, k_lower_10, k_lower_01];
                lowerVerts.forEach(k_low => {
                    data.adjacency.get(k_upper)!.push(k_low);
                    data.adjacency.get(k_low)!.push(k_upper);
                    const edgeKey = getEdgeKey(k_upper, k_low);
                    if (!edgeSet.has(edgeKey)) {
                        edgeSet.add(edgeKey);
                        data.edges.push({ k1: k_upper, k2: k_low });
                    }
                });

                const tetraKey = getTetraKey(k_lower_00, k_lower_10, k_lower_01, k_upper);
                if (!data.tetrahedra.has(tetraKey)) {
                    const tFaces = [
                        getFaceKey(k_lower_00, k_lower_10, k_lower_01),
                        getFaceKey(k_lower_00, k_lower_10, k_upper),
                        getFaceKey(k_lower_10, k_lower_01, k_upper),
                        getFaceKey(k_lower_01, k_lower_00, k_upper),
                    ];

                    data.tetrahedra.set(tetraKey, { key: tetraKey, faces: tFaces });

                    tFaces.forEach(fKey => {
                        if (!data.faceToTetras.has(fKey)) data.faceToTetras.set(fKey, []);
                        data.faceToTetras.get(fKey)!.push(tetraKey);

                        if (!data.faces.has(fKey)) {
                            const verts = fKey.split('|');
                            data.faces.set(fKey, { key: fKey, vertices: verts });
                            verts.forEach(vk => {
                                data.vertexToFaces.get(vk)!.push(fKey);
                            });
                        }
                    });
                }
            }
        }
    }

    data.shellGeometries.reverse();

    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(data.allShellPoints);
    pointsGeometry.computeBoundingSphere();
    const pointsMaterial = new THREE.PointsMaterial({
        color: 0x94a3b8,
        size: 0.18,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.7
    });

    return {
        gridType: level.gridType,
        is2D: false,
        gridPoints: new THREE.Points(pointsGeometry, pointsMaterial),
        ...data,
    }
}
