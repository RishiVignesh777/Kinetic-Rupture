/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlayerStats, RuptureGrade, StyleScoreState } from '../game/types.ts';
import { Volume2, VolumeX, Pause } from 'lucide-react';

interface HUDProps {
  styleState: StyleScoreState;
  playerStats: PlayerStats;
  bossStats: { active: boolean; name: string; hp: number; maxHp: number };
  isMuted: boolean;
  executionTarget: { id: string; x: number; y: number } | null;
  onToggleMute: () => void;
  onPause: () => void;
}

const GRADE_COLORS: Record<RuptureGrade, { text: string; bg: string; border: string }> = {
  D: { text: 'text-slate-400', bg: 'bg-slate-900/90', border: 'border-slate-600' },
  C: { text: 'text-emerald-400', bg: 'bg-emerald-950/90', border: 'border-emerald-600' },
  B: { text: 'text-cyan-400', bg: 'bg-cyan-950/90', border: 'border-cyan-500' },
  A: { text: 'text-amber-400', bg: 'bg-amber-950/90', border: 'border-amber-500' },
  S: { text: 'text-rose-400', bg: 'bg-rose-950/90', border: 'border-rose-500' },
  SS: { text: 'text-purple-400', bg: 'bg-purple-950/90', border: 'border-purple-400' },
  SSS: { text: 'text-yellow-300', bg: 'bg-yellow-950/90', border: 'border-yellow-400' },
};

export const HUD: React.FC<HUDProps> = ({
  styleState,
  playerStats,
  bossStats,
  isMuted,
  executionTarget,
  onToggleMute,
  onPause,
}) => {
  const hpPercent = Math.max(0, Math.min(100, (playerStats.hp / playerStats.maxHp) * 100));
  const chargePercent = Math.max(0, Math.min(100, playerStats.kineticCharge));
  const gradeStyle = GRADE_COLORS[styleState.grade];

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* --- TOP ROW --- */}
      <div className="flex justify-between items-start w-full">
        {/* Top-Left: Player Vitality, Momentum Charge, Speedometer */}
        <div className="flex flex-col gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Health Bar with Hex Sockets */}
          <div className="bg-slate-950/90 border border-slate-800 p-2 sm:p-3 rounded-none w-44 sm:w-80 shadow-lg shadow-black/80">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] sm:text-[11px] font-display font-semibold tracking-wider text-cyan-400 truncate">
                CHASSIS INTEGRITY
              </span>
              <span className="text-[10px] sm:text-xs font-mono tabular-nums text-slate-200">
                {Math.round(playerStats.hp)} HP
              </span>
            </div>
            {/* Trailing Health Bar */}
            <div className="w-full h-2.5 sm:h-3 bg-slate-900 border border-slate-700 relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-150"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Kinetic Momentum Charge Bar */}
          <div className="bg-slate-950/90 border border-slate-800 p-2 sm:p-3 rounded-none w-44 sm:w-80 shadow-lg shadow-black/80">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] sm:text-[11px] font-display font-semibold tracking-wider text-amber-400 truncate">
                  MOMENTUM
                </span>
                {playerStats.isOvercharged && (
                  <span className="text-[8px] sm:text-[10px] font-display font-bold px-1 py-0.2 bg-amber-500 text-black">
                    OVERDRIVE
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-xs font-mono tabular-nums text-amber-300">
                {Math.round(chargePercent)}%
              </span>
            </div>
            <div className="w-full h-2.5 sm:h-3 bg-slate-900 border border-slate-700 relative overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  playerStats.isOvercharged
                    ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-yellow-300'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                }`}
                style={{ width: `${chargePercent}%` }}
              />
            </div>
          </div>

          {/* Real-time Speedometer */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 w-fit">
            <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="text-[10px] tracking-wider text-slate-400 font-display">VELOCITY</span>
            <span className="text-sm font-mono font-bold tabular-nums text-cyan-300">
              {playerStats.speedKmh} <span className="text-[10px] text-slate-400">KM/H</span>
            </span>
          </div>
        </div>

        {/* Top-Center: Apex Boss HP Bar (if active) */}
        {bossStats.active && (
          <div className="flex flex-col items-center w-full max-w-md mx-4 pointer-events-auto">
            <div className="flex justify-between items-center w-full mb-1">
              <span className="text-xs font-display font-bold tracking-widest text-rose-500">
                {bossStats.name}
              </span>
              <span className="text-xs font-mono tabular-nums text-rose-400">
                {Math.round(bossStats.hp)} / {bossStats.maxHp}
              </span>
            </div>
            <div className="w-full h-3.5 bg-slate-950 border border-rose-900 relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-red-400 transition-all duration-100"
                style={{ width: `${Math.max(0, (bossStats.hp / bossStats.maxHp) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Top-Right: Rupture Grade Combo & Utility Controls */}
        <div className="flex items-start gap-1.5 sm:gap-3 pointer-events-auto">
          {/* Rupture Grade Badge */}
          <div className={`p-2 sm:p-3 border ${gradeStyle.border} ${gradeStyle.bg} shadow-xl shadow-black flex flex-col items-end min-w-[100px] sm:min-w-[140px]`}>
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-[8px] sm:text-[10px] font-display tracking-widest text-slate-400">RUPTURE</span>
              <span className={`text-2xl sm:text-3xl font-display font-black tracking-tighter ${gradeStyle.text}`}>
                {styleState.grade}
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5">
              <span className="text-[9px] sm:text-[11px] font-mono tabular-nums text-slate-300">
                {styleState.score.toLocaleString()} PTS
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono text-cyan-400 font-bold">
                x{styleState.multiplier.toFixed(1)}
              </span>
            </div>

            {/* Combo streak & timer */}
            {styleState.comboCount > 0 && (
              <div className="w-full mt-2 pt-1 border-t border-slate-800">
                <div className="flex justify-between text-[10px] font-mono text-amber-400">
                  <span>CHAIN x{styleState.comboCount}</span>
                  <span>{styleState.comboTimer.toFixed(1)}s</span>
                </div>
                <div className="w-full h-1 bg-slate-900 mt-1">
                  <div
                    className="h-full bg-amber-400 transition-all duration-75"
                    style={{ width: `${(styleState.comboTimer / 4.0) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick utility buttons */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={onToggleMute}
              className="p-2.5 bg-slate-950/90 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500 transition-colors cursor-pointer"
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <button
              onClick={onPause}
              className="p-2.5 bg-slate-950/90 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500 transition-colors cursor-pointer"
              aria-label="Pause Game"
            >
              <Pause className="w-4 h-4 text-slate-200" />
            </button>
          </div>
        </div>
      </div>

      {/* --- CENTER CROSSHAIR & OVERDRIVE EXECUTION LOCK-ON --- */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Reticle */}
        <div className="relative w-8 h-8 opacity-75">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-cyan-400" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-cyan-400" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-2 bg-cyan-400" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-2 bg-cyan-400" />
          <div className="absolute inset-2 border border-cyan-500/40 rounded-full" />
        </div>
      </div>

      {/* Projected Overdrive Execution Tag */}
      {executionTarget && (
        <div
          className="fixed pointer-events-none -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
          style={{ left: `${executionTarget.x}px`, top: `${executionTarget.y}px` }}
        >
          <div className="w-10 h-10 border-2 border-rose-500 rotate-45 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="mt-2 px-2 py-0.5 bg-rose-600 text-black font-display font-black text-[11px] tracking-wider shadow-lg">
            [F] EXECUTE
          </span>
        </div>
      )}

      {/* --- BOTTOM WEAPON & ABILITY STATUS DOCK --- */}
      <div className="flex justify-center items-end w-full pb-2">
        <div className="flex items-center gap-2 bg-slate-950/95 border border-slate-800 p-2 shadow-2xl pointer-events-auto">
          {/* Kinetic Blade */}
          <div className="flex items-center gap-3 px-3 py-1.5 border border-cyan-500/40 bg-slate-900/60">
            <div className="p-1.5 bg-cyan-950 text-cyan-400 border border-cyan-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                <path d="m13 19 6-6" />
                <path d="m16 16 4 4" />
                <path d="m19 21 2-2" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-display font-bold text-cyan-300">KINETIC BLADE</span>
              <span className="text-[10px] text-slate-400">LMB · Deflect & Melee</span>
            </div>
          </div>

          {/* Particle Rail Cannon */}
          <div
            className={`flex items-center gap-3 px-3 py-1.5 border ${
              playerStats.kineticCharge >= 25
                ? 'border-amber-500/60 bg-amber-950/40 text-amber-200'
                : 'border-slate-800 bg-slate-900/40 text-slate-500'
            }`}
          >
            <div className="p-1.5 bg-slate-950 border border-current">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="22" y1="12" x2="18" y2="12" />
                <line x1="6" y1="12" x2="2" y2="12" />
                <line x1="12" y1="6" x2="12" y2="2" />
                <line x1="12" y1="22" x2="12" y2="18" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-display font-bold">RAIL CANNON</span>
              <span className="text-[10px]">
                {playerStats.kineticCharge >= 25 ? 'RMB / Q · READY' : 'REQUIRES 25% CHG'}
              </span>
            </div>
          </div>

          {/* Kinetic Tether */}
          <div className="flex items-center gap-3 px-3 py-1.5 border border-cyan-500/40 bg-slate-900/60">
            <div className="p-1.5 bg-cyan-950 text-cyan-400 border border-cyan-600">
              <span className="text-xs font-mono font-bold">[E]</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-display font-bold text-cyan-300">TETHER SLING</span>
              <span className="text-[10px] text-slate-400">Drone / Skyway Anchor</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
