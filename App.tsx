
import React, { useState, useMemo, Fragment, useRef, useEffect } from 'react'
import { Score, TurnInfo } from './components/TronCaptureGame'
import StartScreen from './components/StartScreen'
import * as C from './game/config'
import GameContainer from './components/TronCaptureGame'
import { Level } from './game/levels/Level'
import { IcosahedronLevel } from './game/levels/IcosahedronLevel'
import { CubeLevel } from './game/levels/CubeLevel'
import { SquareLevel } from './game/levels/SquareLevel'
import { TriangleLevel } from './game/levels/TriangleLevel'
import { TetrahedronLevel } from './game/levels/TetrahedronLevel'
import { OctahedronLevel } from './game/levels/OctahedronLevel'
import { TrianglePyramidLevel } from './game/levels/TrianglePyramidLevel'
import { THEMES, EFFECTS } from './game/theme'
import type { ThemeType, EffectType } from './game/theme'

// --- Icons ---
const PyramidIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9.75l-9-5.25M12 7.5v9.75" />
    </svg>
)

const TetrahedronIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L3 7.5l9 12.5 9-12.5L12 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v17.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5l9 5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9 5" />
    </svg>
)


const TriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 22h20L12 2z" />
    </svg>
)

const LineIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="11" width="18" height="2" rx="1" />
    </svg>
)

const MovesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
)

const TotalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
)

const CubeIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
)

const SquareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25-2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
    </svg>
)


const scoreUIMap: Record<string, { icon: React.ReactNode, label: string }> = {
    pyramids: { icon: <PyramidIcon />, label: 'Pyramids' },
    tetrahedra: { icon: <TetrahedronIcon />, label: 'Tetrahedra' },
    cubes: { icon: <CubeIcon />, label: 'Cubes' },
    triangles: { icon: <TriangleIcon />, label: 'Triangles' },
    squares: { icon: <SquareIcon />, label: 'Squares' },
    lines: { icon: <LineIcon />, label: 'Lines' },
    moves: { icon: <MovesIcon />, label: 'Moves' },
}

const scoreOrder = ['pyramids', 'tetrahedra', 'triangles', 'lines', 'moves']

export type GridType = 'icosahedron' | 'tetrahedron' | 'cube' | 'square' | 'triangle' | 'octahedron' | 'triangle_pyramid'
export type GameMode = 'pvp' | 'pva' // Player vs Player, Player vs AI

export interface DebugInfo {
    moves: string[];
    highlighted: string | null;
}

const initialScores = {
    player1: { total: 0, moves: 0 },
    player2: { total: 0, moves: 0 },
}


const levelMap: Record<GridType, Level> = {
    icosahedron: new IcosahedronLevel(),
    tetrahedron: new TetrahedronLevel(),
    cube: new CubeLevel(),
    square: new SquareLevel(),
    triangle: new TriangleLevel(),
    octahedron: new OctahedronLevel(),
    triangle_pyramid: new TrianglePyramidLevel(),
}


function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu')
  const [gameMode, setGameMode] = useState<GameMode>('pvp')
  const [theme, setTheme] = useState<ThemeType>('neon')
  const [effect, setEffect] = useState<EffectType>('bloom')
  const [level, setLevel] = useState<Level>(levelMap.icosahedron)
  const [scores, setScores] = useState<{ player1: Score, player2: Score }>(initialScores)
  const [showHelp, setShowHelp] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({ moves: [], highlighted: null });
  const [turnInfo, setTurnInfo] = useState<TurnInfo>({
    activePlayer: 1,
    status: 'playing', // 'playing' | 'between_turns' | 'game_over'
    movesLeft: C.INITIAL_MOVES_PER_TURN,
    totalMoves: C.INITIAL_MOVES_PER_TURN,
    suddenDeath: false,
    round: 1,
  })

  const p1HudRef = useRef<HTMLDivElement>(null);
  const p2HudRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!p1HudRef.current || !p2HudRef.current) return;
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        const x = (clientX / innerWidth - 0.5) * 2; // -1 to 1
        const y = (clientY / innerHeight - 0.5) * 2; // -1 to 1
        const factor = 8;
        // The perspective is already on the parent, so we only need to apply the translate part.
        p1HudRef.current.style.transform = `translate(${x * -factor}px, ${y * -factor}px)`;
        p2HudRef.current.style.transform = `translate(${x * -factor}px, ${y * -factor}px)`;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const scoreCallbacks = useMemo(() => ({
    p1: (newScore: Score) => setScores(s => ({ ...s, player1: newScore })),
    p2: (newScore: Score) => setScores(s => ({ ...s, player2: newScore })),
  }), [])

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'h') {
      setShowHelp(prev => !prev)
    }
  }

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])


  const getWinner = () => {
    if (scores.player1.total > scores.player2.total) return 'Player 1 Wins!'
    if (scores.player2.total > scores.player1.total) return 'Player 2 Wins!'
    return "It's a Draw!"
  }

  const handleDebugMoveSelect = (vertexKey: string) => {
    window.dispatchEvent(new CustomEvent('tron_debug_select', { detail: vertexKey }));
  };

  const getTurnText = () => {
    if (turnInfo.status === 'game_over') {
      return `Game Over - ${getWinner()}`
    }
    if (turnInfo.status === 'shattering') {
      return `SECTOR CAPTURED!`
    }
    if (turnInfo.status === 'coloring_loop') {
      return `CAPTURING TERRITORY...`
    }
    if (turnInfo.status === 'thinking') {
      return `AI IS THINKING...`
    }
    if (turnInfo.status === 'between_turns') {
      const nextPlayer = turnInfo.activePlayer === 1 ? 2 : 1
      if (gameMode === 'pva' && nextPlayer === 2) {
        return "AI's Turn"
      }
      return `Ready Player ${nextPlayer}. Press SPACE or Tap.`
    }
    const playerIdentifier = (turnInfo.activePlayer === 2 && gameMode === 'pva') ? "AI" : `Player ${turnInfo.activePlayer}`;
    return `${playerIdentifier}'s Turn (Round ${turnInfo.round})`
  }
  
  const handleStartGame = (type: GridType, mode: GameMode) => {
    setLevel(levelMap[type])
    setGameMode(mode)
    setScores(initialScores)
    setGameState('playing')
  }
  
  const renderScoreItems = (playerScore: Score, rightAligned = false) => {
      return scoreOrder.map(key => {
          if (playerScore[key] === undefined || playerScore[key] === 0 && key !== 'moves') return null
          
          const { icon, label } = scoreUIMap[key]
          const value = playerScore[key]
          
          return (
              <p key={key} className="flex justify-between items-center text-sm md:text-base">
                  {rightAligned ? (
                    <Fragment>
                      <span className="font-bold mr-4">{icon} {value}</span> <span>{label}</span>
                    </Fragment>
                  ) : (
                    <Fragment>
                      <span>{label}</span> <span className="font-bold ml-4">{value} {icon}</span>
                    </Fragment>
                  )}
              </p>
          )
      }).filter(Boolean)
  }

  const progressWidth = turnInfo.totalMoves > 0 ? (turnInfo.movesLeft / turnInfo.totalMoves) * 100 : 0
  const player2Title = gameMode === 'pva' ? 'AI' : 'PLAYER 2';

  return (
    <main className="relative w-screen h-screen bg-transparent text-gray-800 font-sans overflow-hidden">
        <style>{`
            .sci-fi-panel {
                background: ${THEMES[theme].hudBg};
                backdrop-filter: blur(8px);
                color: ${THEMES[theme].hudText};
                transform: perspective(1200px);
                position: relative;
                border-radius: 12px;
                border: 1px solid ${THEMES[theme].hudBorder};
                box-shadow: 0 0 25px rgba(${THEMES[theme].accentRgb}, 0.25), inset 0 0 15px rgba(${THEMES[theme].accentRgb}, 0.15);
            }
            .sci-fi-panel::after {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                background-image: repeating-linear-gradient(to bottom, transparent, rgba(${THEMES[theme].accentRgb}, 0.05) 1px, transparent 3px);
                pointer-events: none;
                z-index: 1;
                opacity: 0.5;
            }
            .sci-fi-panel-content {
                position: relative;
                z-index: 2;
            }
            .skew-corners {
                clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px);
            }
            .player1-hud { 
                --hud-color: rgb(${THEMES[theme].accentRgb === '255, 255, 255' ? '255, 255, 255' : THEMES[theme].accentRgb}); 
                --hud-color-dark: ${theme === 'monochrome' ? 'rgb(136, 136, 136)' : theme === 'cyber' ? 'rgb(0, 170, 0)' : 'rgb(173, 13, 186)'}; 
                --hud-shadow-color: rgba(${theme === 'monochrome' ? '255, 255, 255' : theme === 'cyber' ? '57, 255, 20' : '255, 0, 255'}, 0.25); 
            }
            .player2-hud { 
                --hud-color: ${theme === 'monochrome' ? 'rgb(156, 163, 175)' : theme === 'cyber' ? 'rgb(255, 176, 0)' : 'rgb(0, 255, 255)'}; 
                --hud-color-dark: ${theme === 'monochrome' ? 'rgb(75, 85, 99)' : theme === 'cyber' ? 'rgb(170, 119, 0)' : 'rgb(4, 146, 194)'}; 
                --hud-shadow-color: rgba(${theme === 'monochrome' ? '156, 163, 175' : theme === 'cyber' ? '255, 176, 0' : '0, 255, 255'}, 0.25); 
            }
            .player-hud {
                background: ${THEMES[theme].hudBg};
                backdrop-filter: blur(8px);
                color: var(--hud-color-dark);
                border: 1px solid var(--hud-color);
                box-shadow: 0 0 25px var(--hud-shadow-color), inset 0 0 15px var(--hud-shadow-color);
                border-radius: 1rem;
            }
             .player-hud h2, .player-hud .font-bold { color: var(--hud-color) }
             .thinking-pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
             @keyframes pulse { 
                 0%, 100% { opacity: 1; box-shadow: 0 0 25px rgba(${THEMES[theme].accentRgb}, 0.25), inset 0 0 15px rgba(${THEMES[theme].accentRgb}, 0.15); } 
                 50% { opacity: .9; box-shadow: 0 0 40px rgba(${THEMES[theme].accentRgb}, 0.55), inset 0 0 25px rgba(${THEMES[theme].accentRgb}, 0.3); } 
             }
        `}</style>
      
      {gameState === 'menu' && <StartScreen onStartGame={handleStartGame} />}

      {gameState === 'playing' && (
          <>
            <GameContainer level={level} gameMode={gameMode} theme={theme} effect={effect} scoreCallbacks={scoreCallbacks} setTurnInfo={setTurnInfo} setDebugInfo={setDebugInfo} />

            {/* Visuals Control Panel */}
            <div className="absolute top-6 left-6 pointer-events-auto z-50 flex flex-col space-y-3">
                <div className="sci-fi-panel p-4 px-5 skew-corners shadow-lg w-80">
                    <div className="sci-fi-panel-content space-y-4">
                        {/* Theme Section */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-mono tracking-wider opacity-85 uppercase text-blue-200">System Theme:</span>
                                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">THEME_ACTIVE</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                                {(Object.keys(THEMES) as ThemeType[]).map((t) => {
                                    const active = theme === t;
                                    return (
                                        <button
                                            key={t}
                                            onClick={() => setTheme(t)}
                                            className={`px-2 py-1 text-[11px] font-mono uppercase rounded transition-all duration-150 border ${
                                                active
                                                    ? 'font-bold border-white/20'
                                                    : 'border-transparent hover:bg-white/5 text-gray-300'
                                            }`}
                                            style={active ? { backgroundColor: THEMES[t].themeAccent, color: '#000000', borderColor: THEMES[t].themeAccent } : {}}
                                        >
                                            {THEMES[t].name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Separator line */}
                        <div className="h-[1px] bg-white/10" />

                        {/* VFX/Post processing Section */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-mono tracking-wider opacity-85 uppercase text-blue-200">VFX Engine:</span>
                                <span className="text-[10px] font-mono text-pink-400 bg-pink-950/60 px-1.5 py-0.5 rounded border border-pink-800/40">POST_PROC</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {EFFECTS.map((eff) => {
                                    const active = effect === eff.id;
                                    return (
                                        <button
                                            key={eff.id}
                                            onClick={() => setEffect(eff.id)}
                                            className={`px-2.5 py-1.5 text-left rounded transition-all duration-150 border flex flex-col justify-center ${
                                                active
                                                    ? 'bg-white/15 border-white/40'
                                                    : 'border-transparent hover:bg-white/5 hover:border-white/10'
                                            }`}
                                        >
                                            <span className={`text-[11px] font-mono uppercase font-bold tracking-wide ${active ? 'text-white' : 'text-gray-300'}`}>
                                                {eff.name}
                                            </span>
                                            <span className="text-[9px] text-gray-400 font-mono leading-none mt-0.5">
                                                {eff.description}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Turn Info Display */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-md pointer-events-none">
                <div className={`sci-fi-panel p-3 skew-corners transition-all duration-300 ${turnInfo.status === 'shattering' || turnInfo.status === 'thinking' || turnInfo.status === 'coloring_loop' ? 'thinking-pulse' : ''}`}>
                    <div className="sci-fi-panel-content">
                        <h2 className="text-xl md:text-2xl font-bold text-center whitespace-nowrap tracking-wider text-blue-200">{getTurnText()}</h2>
                        {turnInfo.status === 'playing' && (
                            <div className="mt-2 px-2">
                                <div className="flex justify-between text-xs text-blue-300 mb-1 font-mono">
                                    <span>MOVES</span>
                                    <span>{turnInfo.movesLeft} / {turnInfo.totalMoves}</span>
                                </div>
                                <div className="w-full bg-blue-900/50 h-2 rounded-full overflow-hidden border border-blue-500/50">
                                    <div 
                                        className="h-full rounded-full transition-all duration-300 ease-in-out"
                                        style={{ width: `${progressWidth}%`, backgroundColor: turnInfo.activePlayer === 1 ? (theme === 'monochrome' ? '#ffffff' : theme === 'cyber' ? '#39ff14' : '#ff00ff') : (theme === 'monochrome' ? '#9ca3af' : theme === 'cyber' ? '#ffb000' : '#00ffff') }}>
                                    </div>
                                </div>
                            </div>
                        )}
                        {turnInfo.suddenDeath && turnInfo.status !== 'game_over' && (
                            <p className="text-lg font-bold text-orange-400 mt-2 text-center animate-pulse tracking-widest">SUDDEN DEATH</p>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Player 1 Score HUD */}
            <div ref={p1HudRef} className="absolute bottom-6 left-6 pointer-events-none transition-transform duration-300 ease-out">
                <div className="player-hud player1-hud p-4 skew-corners min-w-[240px]">
                    <div className="sci-fi-panel-content">
                        <h2 className="text-xl md:text-2xl font-bold">PLAYER 1</h2>
                        <div className="font-mono text-lg space-y-1 mt-2">
                            {renderScoreItems(scores.player1)}
                            <div className="border-t border-white/20 my-2"></div>
                            <p className="font-bold flex justify-between items-center text-xl"><span>TOTAL</span> <span>{scores.player1.total} <TotalIcon /></span></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Player 2 Score HUD */}
             <div ref={p2HudRef} className="absolute bottom-6 right-6 pointer-events-none transition-transform duration-300 ease-out">
                <div className="player-hud player2-hud p-4 skew-corners min-w-[240px]">
                    <div className="sci-fi-panel-content">
                        <h2 className="text-xl md:text-2xl font-bold text-right">{player2Title}</h2>
                        <div className="font-mono text-lg space-y-1 mt-2">
                            {renderScoreItems(scores.player2, true)}
                            <div className="border-t border-white/20 my-2"></div>
                            <p className="font-bold flex justify-between items-center text-xl"><span><TotalIcon /> {scores.player2.total}</span> <span>TOTAL</span></p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Help Panel */}
            {showHelp && (
                <div className="absolute top-1/2 -translate-y-1/2 right-0 pointer-events-none">
                    <div className="sci-fi-panel p-6 max-w-xs skew-corners">
                         <div className="sci-fi-panel-content">
                            <h2 className="font-bold mb-3 text-lg tracking-wider text-blue-200">CONTROLS</h2>
                            <ul className="space-y-2 text-blue-300">
                                <li><strong className="font-semibold w-36 inline-block text-blue-100">Select Route:</strong> Tap Direction or Drag to Orbit</li>
                                <li><strong className="font-semibold w-36 inline-block text-blue-100">Confirm Move:</strong> Spacebar or Tap Player</li>
                                <li><strong className="font-semibold w-36 inline-block text-blue-100">Undo Move:</strong> Backspace</li>
                                <li><strong className="font-semibold w-36 inline-block text-blue-100">End Turn:</strong> Spacebar (no move)</li>
                                <li><strong className="font-semibold w-36 inline-block text-blue-100">Orbit Camera:</strong> Mouse Drag or 1-Finger Drag</li>
                                <li><strong className="font-semibold w-36 inline-block text-blue-100">Zoom:</strong> Scroll or 2-Finger Pinch</li>
                                <li><strong className="font-semibold w-36 inline-block text-blue-100">Toggle Help:</strong> H</li>
                            </ul>
                         </div>
                    </div>
                </div>
            )}

            {/* Debug Panel */}
            {debugInfo.moves.length > 0 && (
                <div className="absolute top-24 right-6 bg-gray-900 bg-opacity-80 text-white p-3 rounded-lg max-h-[70vh] overflow-y-auto shadow-lg border border-blue-500/50 font-mono text-xs w-48 pointer-events-auto">
                    <h3 className="font-bold text-base mb-2 text-blue-300 border-b border-blue-400/50 pb-1">Debug Moves</h3>
                    <p className="mb-2 text-yellow-400">Highlighted: <span className="font-bold">{debugInfo.highlighted || 'None'}</span></p>
                    <ul className="space-y-1">
                        {debugInfo.moves.map(moveKey => (
                            <li key={moveKey}>
                                <button 
                                    onClick={() => handleDebugMoveSelect(moveKey)}
                                    className={`text-left w-full p-1 rounded transition-colors duration-150 ${debugInfo.highlighted === moveKey ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-700'}`}
                                >
                                    {moveKey}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
      )}
    </main>
  )
}

export default App