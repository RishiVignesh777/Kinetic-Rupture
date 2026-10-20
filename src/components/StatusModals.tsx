/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RuptureGrade } from '../game/types.ts';

interface StatusModalsProps {
  status: 'paused' | 'victory' | 'gameover' | 'playing' | 'title';
  score: number;
  grade: RuptureGrade;
  comboCount: number;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export const StatusModals: React.FC<StatusModalsProps> = ({
  status,
  score,
  grade,
  comboCount,
  onResume,
  onRestart,
  onReturnTitle,
}) => {
  if (status !== 'paused' && status !== 'victory' && status !== 'gameover') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75 pointer-events-auto select-none">
      {/* PAUSE MODAL */}
      {status === 'paused' && (
        <div className="bg-slate-950 border border-slate-700 p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-black text-center">
          <div className="text-xs font-display tracking-widest text-cyan-400 uppercase mb-1">
            SIMULATION SUSPENDED
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-white mb-6">
            SYSTEM PAUSED
          </h2>

          <div className="flex flex-col gap-3">
            <button
              onClick={onResume}
              className="py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-black font-display font-bold text-sm tracking-wider uppercase transition-colors cursor-pointer"
            >
              RESUME COMBAT [ESC]
            </button>
            <button
              onClick={onRestart}
              className="py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-display font-semibold text-sm tracking-wider uppercase transition-colors cursor-pointer"
            >
              RESTART MISSION
            </button>
            <button
              onClick={onReturnTitle}
              className="py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-display font-semibold text-sm tracking-wider uppercase transition-colors cursor-pointer"
            >
              RETURN TO TITLE
            </button>
          </div>
        </div>
      )}

      {/* VICTORY MODAL */}
      {status === 'victory' && (
        <div className="bg-slate-950 border border-cyan-500 p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-cyan-950/80 text-center relative overflow-hidden">
          <div className="text-xs font-display tracking-widest text-emerald-400 uppercase mb-1">
            MISSION ACCOMPLISHED
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-white mb-4">
            SECTOR LIBERATED
          </h2>

          {/* Mastery Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/80 border border-slate-800 mb-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-display text-slate-400 uppercase">RUPTURE RANK</span>
              <span className="text-3xl font-display font-black text-yellow-400 tabular-nums">
                {grade}
              </span>
            </div>
            <div className="flex flex-col border-x border-slate-800">
              <span className="text-[10px] font-display text-slate-400 uppercase">STYLE SCORE</span>
              <span className="text-2xl font-mono font-bold text-cyan-300 tabular-nums">
                {score.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-display text-slate-400 uppercase">MAX CHAIN</span>
              <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums">
                x{comboCount}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              data-start="true"
              onClick={onRestart}
              className="py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-display font-black text-sm tracking-wider uppercase transition-transform active:scale-95 cursor-pointer shadow-lg shadow-cyan-500/30"
            >
              PLAY AGAIN &middot; ENTER
            </button>
            <button
              onClick={onReturnTitle}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-display font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
            >
              MISSION SELECT
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER / DEFEAT MODAL */}
      {status === 'gameover' && (
        <div className="bg-slate-950 border border-rose-600 p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-rose-950/80 text-center">
          <div className="text-xs font-display tracking-widest text-rose-500 uppercase mb-1">
            CRITICAL VECTOR FAILURE
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-white mb-4">
            CHASSIS DESTROYED
          </h2>

          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-900/80 border border-slate-800 mb-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-display text-slate-400 uppercase">FINAL SCORE</span>
              <span className="text-2xl font-mono font-bold text-slate-200 tabular-nums">
                {score.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col border-l border-slate-800">
              <span className="text-[10px] font-display text-slate-400 uppercase">FINAL RANK</span>
              <span className="text-2xl font-display font-bold text-rose-400 tabular-nums">
                {grade}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              data-start="true"
              onClick={onRestart}
              className="py-3 px-6 bg-rose-600 hover:bg-rose-500 text-white font-display font-black text-sm tracking-wider uppercase transition-transform active:scale-95 cursor-pointer shadow-lg shadow-rose-600/30"
            >
              REDEPLOY &middot; ENTER
            </button>
            <button
              onClick={onReturnTitle}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-display font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
            >
              RETURN TO TITLE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
