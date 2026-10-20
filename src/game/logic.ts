/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RuptureGrade, StyleScoreState } from './types.ts';

export const GRADE_THRESHOLDS: Record<RuptureGrade, number> = {
  D: 0,
  C: 800,
  B: 2000,
  A: 4200,
  S: 7500,
  SS: 12000,
  SSS: 18000,
};

export const GRADE_MULTIPLIERS: Record<RuptureGrade, number> = {
  D: 1.0,
  C: 1.25,
  B: 1.5,
  A: 2.0,
  S: 2.5,
  SS: 3.25,
  SSS: 4.0,
};

export function calculateRuptureGrade(score: number): RuptureGrade {
  if (score >= GRADE_THRESHOLDS.SSS) return 'SSS';
  if (score >= GRADE_THRESHOLDS.SS) return 'SS';
  if (score >= GRADE_THRESHOLDS.S) return 'S';
  if (score >= GRADE_THRESHOLDS.A) return 'A';
  if (score >= GRADE_THRESHOLDS.B) return 'B';
  if (score >= GRADE_THRESHOLDS.C) return 'C';
  return 'D';
}

export type StyleActionType =
  | 'slash_hit'
  | 'deflect_parry'
  | 'rail_cannon_pierce'
  | 'wall_run_bonus'
  | 'tether_slingshot'
  | 'overdrive_execution'
  | 'took_damage';

export const ACTION_POINTS: Record<StyleActionType, number> = {
  slash_hit: 150,
  deflect_parry: 450,
  rail_cannon_pierce: 600,
  wall_run_bonus: 80,
  tether_slingshot: 200,
  overdrive_execution: 1200,
  took_damage: -500,
};

export const COMBO_MAX_TIMEOUT = 4.0; // 4 seconds before combo drops

export function updateStyleScore(
  current: StyleScoreState,
  action: StyleActionType,
  dt: number = 0
): StyleScoreState {
  if (action === 'took_damage') {
    const newScore = Math.max(0, current.score + ACTION_POINTS.took_damage);
    return {
      score: newScore,
      grade: calculateRuptureGrade(newScore),
      multiplier: 1.0,
      comboCount: 0,
      comboTimer: 0,
    };
  }

  const basePoints = ACTION_POINTS[action];
  const earned = Math.round(basePoints * current.multiplier);
  const newScore = current.score + earned;
  const newGrade = calculateRuptureGrade(newScore);
  const newCombo = current.comboCount + 1;

  // Multiplier climbs with combo count and grade
  const gradeMult = GRADE_MULTIPLIERS[newGrade];
  const comboBonus = Math.min(1.5, Math.floor(newCombo / 5) * 0.1);
  const totalMultiplier = Math.round((gradeMult + comboBonus) * 100) / 100;

  return {
    score: newScore,
    grade: newGrade,
    multiplier: totalMultiplier,
    comboCount: newCombo,
    comboTimer: COMBO_MAX_TIMEOUT,
  };
}

export function decayComboTimer(current: StyleScoreState, dt: number): StyleScoreState {
  if (current.comboTimer <= 0) {
    if (current.comboCount === 0) return current;
    // Combo dropped: reset combo count and decay score gradually
    return {
      ...current,
      comboCount: 0,
      comboTimer: 0,
      multiplier: GRADE_MULTIPLIERS[current.grade],
    };
  }

  const nextTimer = Math.max(0, current.comboTimer - dt);
  if (nextTimer === 0) {
    return {
      ...current,
      comboCount: 0,
      comboTimer: 0,
      multiplier: GRADE_MULTIPLIERS[current.grade],
    };
  }

  return {
    ...current,
    comboTimer: nextTimer,
  };
}

/**
 * Kinetic Momentum Bar:
 * Increases when moving fast (> 18 km/h / 5 m/s) and during wall-running.
 * Caps at 100%. When at 100%, unlocks OVERDRIVE shockwaves.
 */
export function calculateKineticMomentumCharge(
  currentCharge: number,
  speedMps: number,
  isWallRunning: boolean,
  dt: number
): { charge: number; isOvercharged: boolean } {
  let rate = 0;
  if (speedMps > 15) {
    rate = 22; // fast charging when sprinting/falling/launching
  } else if (speedMps > 8) {
    rate = 12; // moderate charging
  } else if (speedMps < 3) {
    rate = -10; // decays when stationary
  }

  if (isWallRunning) {
    rate += 18; // large boost while wall-running
  }

  const newCharge = Math.max(0, Math.min(100, currentCharge + rate * dt));
  return {
    charge: newCharge,
    isOvercharged: newCharge >= 99.5,
  };
}

/**
 * Melee Blade Damage:
 * Scales with kinetic charge. Overcharged blades produce high-impact shockwaves and critical hits.
 */
export function calculateMeleeDamage(
  baseDamage: number,
  kineticCharge: number,
  isOvercharged: boolean
): { damage: number; isCritical: boolean; createsShockwave: boolean } {
  const chargeBonus = (kineticCharge / 100) * 0.75; // up to +75% damage
  let damage = baseDamage * (1 + chargeBonus);

  if (isOvercharged) {
    damage *= 1.5; // +50% overcharge crit
    return {
      damage: Math.round(damage),
      isCritical: true,
      createsShockwave: true,
    };
  }

  return {
    damage: Math.round(damage),
    isCritical: kineticCharge >= 70,
    createsShockwave: false,
  };
}

/**
 * Projectile deflection:
 * Deflects when attacking during active dash or wall-run, or during first 0.15s of slash.
 */
export function canDeflectProjectile(
  isWallRunningOrDashing: boolean,
  slashNormalizedTime: number // 0 to 1
): boolean {
  if (slashNormalizedTime > 0.45) return false;
  return isWallRunningOrDashing || slashNormalizedTime <= 0.18;
}

/**
 * Heavy Vanguard Mech:
 * Immune to frontal attacks. Requires high-velocity flanking or rear attacks.
 */
export function calculateVanguardHit(
  hitFromBehind: boolean,
  damage: number
): { effectiveDamage: number; blocked: boolean } {
  if (!hitFromBehind) {
    return {
      effectiveDamage: 0,
      blocked: true,
    };
  }
  return {
    effectiveDamage: Math.round(damage * 1.4), // 40% rear reactor critical vulnerability
    blocked: false,
  };
}

/**
 * Particle Rail Cannon:
 * Consumes accumulated kinetic charge (min 25%) to fire high-impact piercing beam.
 */
export function calculateRailCannonDamage(kineticCharge: number): {
  canFire: boolean;
  damage: number;
  chargeConsumed: number;
  pierceCount: number;
} {
  if (kineticCharge < 25) {
    return {
      canFire: false,
      damage: 0,
      chargeConsumed: 0,
      pierceCount: 0,
    };
  }

  const chargeToConsume = Math.min(50, kineticCharge);
  const powerFactor = chargeToConsume / 50;
  const damage = Math.round(180 + powerFactor * 220); // 180 to 400 damage
  const pierceCount = powerFactor >= 0.8 ? 5 : 3;

  return {
    canFire: true,
    damage,
    chargeConsumed: chargeToConsume,
    pierceCount,
  };
}

/**
 * Overdrive Execution eligibility:
 * Triggers when enemy HP is low (<= 35% of max HP) or staggered.
 */
export function canExecuteOverdrive(
  enemyHp: number,
  enemyMaxHp: number,
  isStaggered: boolean
): boolean {
  if (enemyHp <= 0) return false;
  if (isStaggered) return true;
  return enemyHp / enemyMaxHp <= 0.35;
}
