/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RuptureGrade = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface StyleScoreState {
  score: number;
  grade: RuptureGrade;
  multiplier: number;
  comboCount: number;
  comboTimer: number; // seconds remaining before combo drops
}

export type EnemyType = 'drone' | 'vanguard' | 'boss';

export interface EnemyStats {
  id: string;
  type: EnemyType;
  maxHp: number;
  hp: number;
  isStaggered: boolean;
  staggerTimer: number;
  shieldActive: boolean;
  telegraphTimer: number;
  attackCooldown: number;
}

export interface PlayerStats {
  maxHp: number;
  hp: number;
  kineticCharge: number; // 0 - 100
  isOvercharged: boolean;
  speedKmh: number;
  overdriveTargetsAvailable: number;
}

export type ArenaId = 'neon-roofs' | 'orbital-shaft' | 'cyber-forge';

export interface ArenaConfig {
  id: ArenaId;
  name: string;
  subtitle: string;
  description: string;
  themeColor: string;
  gravityY: number;
  enemyWaveTotal: number;
  hasBoss: boolean;
}
