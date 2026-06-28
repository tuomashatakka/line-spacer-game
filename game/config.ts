import * as THREE from 'three'

// Player 1 (Magenta)
export const PLAYER_1_COLOR = new THREE.Color(0xff00ff) 
export const PLAYER_1_COLOR_DARK = new THREE.Color(0xad0dba)

// Player 2 (Cyan)
export const PLAYER_2_COLOR = new THREE.Color(0x00ffff)
export const PLAYER_2_COLOR_DARK = new THREE.Color(0x0492c2)

// Grid & Camera
export const UNIFIED_EDGE_LENGTH = 5
export const GRID_SHELLS = 5
export const SHELL_SPACING = 1.5
export const CUBE_SPACING = 5

// Gameplay Materials & Colors
export const UNCLAIMED_PATH_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0x8888ff, // Dim blue
  transparent: true,
  opacity: 0.5
})

export const HIGHLIGHT_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xffffff, // Bright white for max bloom
})

export const PREVIEW_MATERIAL = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
})

export const SOLID_MATERIAL_P1 = new THREE.MeshStandardMaterial({
    color: PLAYER_1_COLOR,
    emissive: PLAYER_1_COLOR,
    emissiveIntensity: 0.3,
    metalness: 0.4,
    roughness: 0.5,
    side: THREE.DoubleSide,
})

export const SOLID_MATERIAL_P2 = new THREE.MeshStandardMaterial({
    color: PLAYER_2_COLOR,
    emissive: PLAYER_2_COLOR,
    emissiveIntensity: 0.3,
    metalness: 0.4,
    roughness: 0.5,
    side: THREE.DoubleSide,
})

export const HIGHLIGHT_SOLID_MATERIAL_P1 = new THREE.MeshStandardMaterial({
    color: PLAYER_1_COLOR,
    emissive: PLAYER_1_COLOR,
    emissiveIntensity: 0.8,
    side: THREE.DoubleSide,
})

export const HIGHLIGHT_SOLID_MATERIAL_P2 = new THREE.MeshStandardMaterial({
    color: PLAYER_2_COLOR,
    emissive: PLAYER_2_COLOR,
    emissiveIntensity: 0.8,
    side: THREE.DoubleSide,
})

export const BOUNDS_COLOR = new THREE.Color(0x94a3b8) // slate-400
export const SUDDEN_DEATH_PULSE_COLOR = new THREE.Color(0xf97316) // orange-500

// Gameplay Rules
export const SCORE_PER_PYRAMID = 2048
export const SCORE_PER_TRIANGLE = 256
export const SCORE_PER_LINE = 32
export const SCORE_PER_REMAINING_MOVE = 12
export const INITIAL_MOVES_PER_TURN = 8
export const SUDDEN_DEATH_ROUND_START = 10