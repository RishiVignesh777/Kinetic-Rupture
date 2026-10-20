/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine.ts';
import { ArenaId, PlayerStats, StyleScoreState } from './game/types.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { HUD } from './components/HUD.tsx';
import { StatusModals } from './components/StatusModals.tsx';
import { soundEngine } from './game/audio.ts';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [status, setStatus] = useState<'title' | 'playing' | 'paused' | 'victory' | 'gameover'>('title');
  const [currentArenaId, setCurrentArenaId] = useState<ArenaId>('neon-roofs');
  const [isMuted, setIsMuted] = useState(false);

  const [styleState, setStyleState] = useState<StyleScoreState>({
    score: 0,
    grade: 'D',
    multiplier: 1.0,
    comboCount: 0,
    comboTimer: 0,
  });

  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    maxHp: 100,
    hp: 100,
    kineticCharge: 0,
    isOvercharged: false,
    speedKmh: 0,
    overdriveTargetsAvailable: 0,
  });

  const [bossStats, setBossStats] = useState<{
    active: boolean;
    name: string;
    hp: number;
    maxHp: number;
  }>({
    active: false,
    name: 'APEX VANGUARD PRIME',
    hp: 1800,
    maxHp: 1800,
  });

  const [executionTarget, setExecutionTarget] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Set initial body data-state
    document.body.dataset.state = 'title';

    const engine = new GameEngine(mountRef.current, {
      onStyleUpdate: (s) => setStyleState(s),
      onPlayerStatsUpdate: (p) => setPlayerStats(p),
      onBossStatsUpdate: (b) => setBossStats(b),
      onStatusChange: (newStatus) => setStatus(newStatus),
      onExecutionTargetAvailable: (t) => setExecutionTarget(t),
    });

    engineRef.current = engine;

    // Check autostart query param
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startGame();
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStartGame = () => {
    engineRef.current?.startGame();
  };

  const handleSelectArena = (id: ArenaId) => {
    setCurrentArenaId(id);
    engineRef.current?.setArena(id);
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handlePause = () => {
    engineRef.current?.togglePause();
  };

  const handleResume = () => {
    engineRef.current?.togglePause();
  };

  const handleRestart = () => {
    engineRef.current?.restartRun();
  };

  const handleReturnTitle = () => {
    engineRef.current?.returnToTitle();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-slate-100 select-none">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={mountRef}
        data-testid="webgl-canvas-mount"
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* Title Screen Overlay */}
      {status === 'title' && (
        <TitleScreen
          currentArenaId={currentArenaId}
          onSelectArena={handleSelectArena}
          onStartGame={handleStartGame}
        />
      )}

      {/* In-Game HUD (Visible during gameplay or pause) */}
      {(status === 'playing' || status === 'paused') && (
        <HUD
          styleState={styleState}
          playerStats={playerStats}
          bossStats={bossStats}
          isMuted={isMuted}
          executionTarget={executionTarget}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
        />
      )}

      {/* Status Modals (Pause, Victory, Defeat) */}
      <StatusModals
        status={status}
        score={styleState.score}
        grade={styleState.grade}
        comboCount={styleState.comboCount}
        onResume={handleResume}
        onRestart={handleRestart}
        onReturnTitle={handleReturnTitle}
      />
    </div>
  );
}
