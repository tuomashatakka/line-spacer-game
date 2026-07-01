
import React, { useState } from 'react'
import type { GridType, GameMode } from '../App'

const IcosahedronIcon = () => (
    <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto mb-2" stroke="currentColor" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.5l-9.5 5v9l9.5 5 9.5-5v-9z"></path>
        <path d="M2.5 7.5l9.5 14"></path>
        <path d="M21.5 7.5l-9.5 14"></path>
        <path d="M12 2.5V12l9.5-4.5"></path>
        <path d="M12 2.5V12L2.5 7.5"></path>
        <path d="M2.5 16.5L12 12"></path>
        <path d="M21.5 16.5L12 12"></path>
    </svg>
)

const TetrahedronIcon = () => (
    <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto mb-2" stroke="currentColor" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3L2 9.5l10 11.5 10-11.5L12 3z"></path><path d="M12 3v18"></path><path d="M2 9.5l10 5.5"></path><path d="M22 9.5l-10 5.5"></path>
    </svg>
)

const CubeIcon = () => (
    <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto mb-2" stroke="currentColor" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <path d="M3.27 6.96L12 12.01l8.73-5.05"></path><path d="M12 22.08V12"></path>
    </svg>
)

const StellarIcon = () => (
    <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto mb-2" stroke="currentColor" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L6.2 7.8 12 22l5.8-14.2L12 2z" />
        <path d="M6.2 7.8h11.6" />
        <path d="M12 2L17.8 7.8" />
        <path d="M12 2L6.2 7.8" />
        <path d="M12 22L17.8 7.8" />
        <path d="M12 22L6.2 7.8" />
    </svg>
)

const SquareGridIcon = () => (
    <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto mb-2" stroke="currentColor" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="1"></rect><line x1="10" y1="4" x2="10" y2="20"></line><line x1="16" y1="4" x2="16" y2="20"></line><line x1="4" y1="10" x2="20" y2="10"></line><line x1="4" y1="16" x2="20" y2="16"></line>
    </svg>
)

const TriangleGridIcon = () => (
    <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto mb-2" stroke="currentColor" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18L12 3z"></path><path d="M12 3v18"></path><path d="M3 21l9-9"></path><path d="M21 21l-9-9"></path><path d="M7.5 12h9"></path>
    </svg>
)

const TrianglePyramidIcon = () => (
    <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto mb-2" stroke="currentColor" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 18h20L12 2z" />
        <path d="M12 2l4 16" />
        <path d="M12 2l-4 16" />
        <path d="M12 2v16" />
        <path d="M2 18l10-4 10 4" />
    </svg>
)

interface StartScreenProps {
  onStartGame: (gridType: GridType, mode: GameMode) => void
}

const StartScreen: React.FC<StartScreenProps> = ({ onStartGame }) => {
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const buttonClasses = "sci-fi-button relative group w-44 h-44 p-4 text-blue-200 transition-all duration-300 ease-in-out flex flex-col justify-center items-center text-center transform hover:-translate-y-2"

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-sm z-50 pointer-events-auto animate-fadeIn">
       <style>{`
        .sci-fi-button {
          background: rgba(10, 25, 47, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(59, 130, 246, 0.6);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4), inset 0 0 15px rgba(59, 130, 246, 0.2);
          clip-path: polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px);
          transition: all 0.3s ease;
        }
        .sci-fi-button:hover {
          background: rgba(20, 40, 70, 0.9);
          border-color: rgba(96, 165, 250, 0.8);
          box-shadow: 0 0 35px rgba(96, 165, 250, 0.6), inset 0 0 20px rgba(96, 165, 250, 0.3);
        }
        .sci-fi-button::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: repeating-linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.1) 1px, transparent 2px);
          pointer-events: none;
          z-index: 1;
        }
        .sci-fi-button-content { position: relative; z-index: 2; }
        .title-text {
            text-shadow: 0 0 10px #fff, 0 0 20px #fff, 0 0 30px #60a5fa, 0 0 40px #60a5fa, 0 0 50px #60a5fa, 0 0 60px #60a5fa, 0 0 70px #60a5fa;
        }
        .mode-selector {
            background-color: rgba(10, 25, 47, 0.7);
            border: 1px solid rgba(59, 130, 246, 0.6);
            border-radius: 9999px;
            padding: 4px;
            display: inline-flex;
            position: relative;
        }
        .mode-selector button {
            padding: 8px 24px;
            border-radius: 9999px;
            font-weight: bold;
            transition: color 0.3s ease;
            position: relative;
            z-index: 2;
        }
        .mode-selector .glider {
            position: absolute;
            height: 100%;
            width: 50%;
            background-color: rgba(59, 130, 246, 0.5);
            border-radius: 9999px;
            transition: transform 0.3s ease-in-out;
            top: 0;
            left: 0;
            z-index: 1;
        }
        .mode-selector.pva .glider {
            transform: translateX(100%);
        }

      `}</style>
      <div className="text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-widest uppercase title-text">
          Tron Capture
        </h1>
        <p className="text-blue-300 mt-4 text-lg tracking-wider">Select a Grid to Begin</p>
      </div>

       <div className={`mode-selector mt-8 mb-4 ${gameMode}`}>
          <div className="glider"></div>
          <button onClick={() => setGameMode('pvp')} className={gameMode === 'pvp' ? 'text-white' : 'text-blue-300'}>Player vs Player</button>
          <button onClick={() => setGameMode('pva')} className={gameMode === 'pva' ? 'text-white' : 'text-blue-300'}>Player vs AI</button>
      </div>
      
      <div className="flex flex-wrap justify-center gap-8 mt-4 px-4">
        <button onClick={() => onStartGame('icosahedron', gameMode)} className={buttonClasses}>
          <div className="sci-fi-button-content"><IcosahedronIcon /><span className="font-bold text-lg tracking-wider uppercase">Icosahedron</span><p className="text-xs text-blue-400 mt-1">3D - Triangles</p></div>
        </button>
        <button onClick={() => onStartGame('tetrahedron', gameMode)} className={buttonClasses}>
          <div className="sci-fi-button-content"><TetrahedronIcon /><span className="font-bold text-lg tracking-wider uppercase">Tetrahedron</span><p className="text-xs text-blue-400 mt-1">3D - Simple</p></div>
        </button>
        <button onClick={() => onStartGame('triangle_pyramid', gameMode)} className={buttonClasses}>
          <div className="sci-fi-button-content"><TrianglePyramidIcon /><span className="font-bold text-lg tracking-wider uppercase">Tri Pyramid</span><p className="text-xs text-blue-400 mt-1">3D - Pyramidal</p></div>
        </button>
        <button onClick={() => onStartGame('cube', gameMode)} className={buttonClasses}>
          <div className="sci-fi-button-content"><CubeIcon /><span className="font-bold text-lg tracking-wider uppercase">Cube</span><p className="text-xs text-blue-400 mt-1">3D - Structured</p></div>
        </button>
        <button onClick={() => onStartGame('octahedron', gameMode)} className={buttonClasses}>
          <div className="sci-fi-button-content"><StellarIcon /><span className="font-bold text-lg tracking-wider uppercase">Stellar</span><p className="text-xs text-blue-400 mt-1">3D - Complex</p></div>
        </button>
        <button onClick={() => onStartGame('square', gameMode)} className={buttonClasses}>
          <div className="sci-fi-button-content"><SquareGridIcon /><span className="font-bold text-lg tracking-wider uppercase">2D Square</span><p className="text-xs text-blue-400 mt-1">2D - Classic</p></div>
        </button>
        <button onClick={() => onStartGame('triangle', gameMode)} className={buttonClasses}>
          <div className="sci-fi-button-content"><TriangleGridIcon /><span className="font-bold text-lg tracking-wider uppercase">2D Triangle</span><p className="text-xs text-blue-400 mt-1">2D - Tactical</p></div>
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-in-out; }
      `}</style>
    </div>
  )
}

export default StartScreen