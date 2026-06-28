
# 3D Tron Capture: Neon Grid Wars

A strategy game set in the vastness of neon-lit space. Pilot your glowing vessel, carve trails of light, and encircle sectors of the grid to claim them for your faction. Built with React and Three.js.

## Objective

Capture more territory than your opponent by creating closed loops with your ship's energy trail. The player with the highest score when the grid is filled wins.

## Gameplay

- **Move & Conquer**: On your turn, move your ship from one node to another on the energy grid. Each move leaves a trail of light.
- **Form Loops**: Close a loop by connecting your active trail back to itself or to any of your previously claimed territory.
- **Claim Territory**: When a loop is closed, the boundary becomes permanently yours. The space within shatters like a black mirror, revealing the captured territory now glowing in your color and earning you points.
- **Scoring**: Earn points for the geometric shapes you capture.
    - **3D Maps**: Score for capturing Pyramids (which are complex structures of tetrahedra), as well as standalone Triangles and Lines.
    - **2D Maps**: Score for capturing Triangles.
- **Sudden Death**: After 10 rounds, the playable grid begins to shrink, pushing players toward a final confrontation in a collapsing arena.

## Controls

- **Select Route**: `W/A/S/D` or `Arrow Keys`
- **Confirm Move / End Turn**: `Spacebar`
- **Undo Move**: `Backspace`
- **Zoom Camera**: `Z` / `X` or `Mouse Wheel`
- **Orbit Camera**: `Ctrl` + `Left Mouse Drag`
- **Parallax Effect**: The camera has a slight parallax effect with general mouse movement.
- **Toggle Help**: `H`
- **Mobile**: Swipe to select a move, Tap to confirm. Two-finger drag to orbit, pinch to zoom.
