/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArenaConfig, ArenaId } from '../game/types.ts';
import { ARENAS } from '../game/engine.ts';

interface TitleScreenProps {
  currentArenaId: ArenaId;
  onSelectArena: (id: ArenaId) => void;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  currentArenaId,
  onSelectArena,
  onStartGame,
}) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-12 pointer-events-auto select-none bg-gradient-to-t from-black/80 via-black/30 to-transparent">
      {/* Top Bar with World Metadata */}
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45" />
          <span className="text-xs font-display tracking-widest text-cyan-400 uppercase">
            NEO-VERIDIAN METROPOLIS · SECTOR 07
          </span>
        </div>
        <div className="text-xs font-mono text-slate-400">
          SYS://BUILD_V2.4 · READY
        </div>
      </div>

      {/* Center Title Lockup over Negative Space */}
      <div className="flex flex-col items-start max-w-2xl my-auto">
        {/* Custom Inline SVG Title Emblem Lockup */}
        <div className="mb-4">
          <svg className="w-full max-w-xl h-24 sm:h-32" viewBox="0 0 600 120" fill="none">
            {/* Background cyber vector slash lines */}
            <path d="M10 110L120 10L590 10" stroke="#00f0ff" strokeWidth="2" strokeOpacity="0.4" />
            <path d="M30 115L140 25L570 25" stroke="#ff0055" strokeWidth="1.5" strokeOpacity="0.3" />

            {/* Glowing Main Title: KINETIC */}
            <text
              x="20"
              y="60"
              fill="#ffffff"
              fontFamily="Orbitron, monospace"
              fontSize="48"
              fontWeight="900"
              letterSpacing="6"
            >
              KINETIC
            </text>

            {/* Sub-Title: RUPTURE with neon cyan/crimson contrast */}
            <text
              x="250"
              y="105"
              fill="#00f0ff"
              fontFamily="Orbitron, monospace"
              fontSize="52"
              fontWeight="900"
              letterSpacing="8"
            >
              RUPTURE
            </text>
          </svg>
        </div>

        <p className="text-slate-300 font-sans text-base sm:text-lg mb-8 max-w-lg leading-relaxed">
          Vector-shift across skyscraper facades, convert gravity into shockwave slashes, and pierce through rogue AI mech legions.
        </p>

        {/* Arena / Mission Selector */}
        <div className="w-full mb-8">
          <span className="text-[11px] font-display font-semibold tracking-wider text-slate-400 uppercase mb-3 block">
            SELECT DEPLOYMENT ZONE
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
            {(Object.values(ARENAS) as ArenaConfig[]).map((arena) => {
              const isSelected = arena.id === currentArenaId;
              return (
                <button
                  key={arena.id}
                  onClick={() => onSelectArena(arena.id)}
                  className={`p-3 text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/60 shadow-lg shadow-cyan-950/50'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-600'
                  }`}
                >
                  <div className="text-[10px] font-mono text-cyan-400 mb-0.5">{arena.subtitle}</div>
                  <div className="text-sm font-display font-bold text-slate-100">{arena.name}</div>
                  <div className="text-xs text-slate-400 mt-1 line-clamp-2">{arena.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Start CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <button
            data-start="true"
            onClick={onStartGame}
            className="px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-display font-black text-sm sm:text-base tracking-wider uppercase transition-transform active:scale-95 shadow-xl shadow-cyan-500/30 cursor-pointer border-t border-cyan-300 text-center"
          >
            INITIALIZE VECTOR SHIFT &middot; ENTER
          </button>
        </div>
      </div>

      {/* Flat borderless control hint line in bottom safe margin */}
      <div className="w-full border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 font-mono">
        <div>
          WASD Move · Space Jump/Wall-Jump · Shift Dash · LMB Slash/Deflect · RMB Rail Cannon · E Tether · Esc Pause
        </div>
        <div className="mt-2 sm:mt-0 text-[11px] text-cyan-500/80">
          60 FPS VECTOR SIMULATION
        </div>
      </div>
    </div>
  );
};
