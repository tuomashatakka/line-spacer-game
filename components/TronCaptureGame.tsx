
import React, { useRef, useLayoutEffect, useEffect } from 'react'
import { GameEngine } from '../game/engine/GameEngine'
import type { Level } from '../game/levels/Level'
import type { DebugInfo, GameMode } from '../App'
import type { ThemeType, EffectType } from '../game/theme'

export interface Score {
    [key: string]: number
}

export interface TurnInfo {
  activePlayer: number
  status: 'playing' | 'between_turns' | 'game_over' | 'shattering' | 'thinking' | 'coloring_loop'
  movesLeft: number
  totalMoves: number
  suddenDeath: boolean
  round: number
}

interface GameContainerProps {
  level: Level
  gameMode: GameMode
  theme: ThemeType
  effect: EffectType
  scoreCallbacks: { p1: (s: Score) => void, p2: (s: Score) => void }
  setTurnInfo: React.Dispatch<React.SetStateAction<TurnInfo>>
  setDebugInfo: React.Dispatch<React.SetStateAction<DebugInfo>>
}


const GameContainer: React.FC<GameContainerProps> = ({ level, gameMode, theme, effect, scoreCallbacks, setTurnInfo, setDebugInfo }) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<GameEngine | null>(null)

  useLayoutEffect(() => {
    if (!mountRef.current) return

    const engine = new GameEngine(mountRef.current, level, gameMode, scoreCallbacks, setTurnInfo, setDebugInfo)
    engineRef.current = engine
    engine.init()
    engine.applyTheme(theme)
    engine.applyEffect(effect)

    return () => {
      engine.destroy()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, gameMode]) // Add gameMode dependency to re-initialize engine on mode change

  // Apply theme dynamically when it changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.applyTheme(theme)
    }
  }, [theme])

  // Apply effect dynamically when it changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.applyEffect(effect)
    }
  }, [effect])

  return <div ref={mountRef} className="w-full h-full touch-none" />
}

export default GameContainer