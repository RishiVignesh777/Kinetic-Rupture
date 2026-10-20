/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRuptureGrade,
  updateStyleScore,
  decayComboTimer,
  calculateKineticMomentumCharge,
  calculateMeleeDamage,
  canDeflectProjectile,
  calculateVanguardHit,
  calculateRailCannonDamage,
  canExecuteOverdrive,
} from './logic.ts';
import type { StyleScoreState } from './types.ts';

test('Rupture grade progression maps correctly to score thresholds', () => {
  assert.equal(calculateRuptureGrade(0), 'D');
  assert.equal(calculateRuptureGrade(500), 'D');
  assert.equal(calculateRuptureGrade(800), 'C');
  assert.equal(calculateRuptureGrade(2500), 'B');
  assert.equal(calculateRuptureGrade(5000), 'A');
  assert.equal(calculateRuptureGrade(8500), 'S');
  assert.equal(calculateRuptureGrade(13000), 'SS');
  assert.equal(calculateRuptureGrade(20000), 'SSS');
});

test('Style score increases with actions and increases combo multiplier', () => {
  const initial: StyleScoreState = {
    score: 0,
    grade: 'D',
    multiplier: 1.0,
    comboCount: 0,
    comboTimer: 0,
  };

  const step1 = updateStyleScore(initial, 'slash_hit');
  assert.ok(step1.score > 0);
  assert.equal(step1.comboCount, 1);
  assert.equal(step1.comboTimer, 4.0);

  const step2 = updateStyleScore(step1, 'deflect_parry');
  assert.ok(step2.score > step1.score);
  assert.equal(step2.comboCount, 2);

  // Taking damage resets combo and drops score
  const hurt = updateStyleScore(step2, 'took_damage');
  assert.equal(hurt.comboCount, 0);
  assert.equal(hurt.multiplier, 1.0);
  assert.ok(hurt.score <= step2.score);
});

test('Combo timer decays and drops combo at 0', () => {
  const state: StyleScoreState = {
    score: 3000,
    grade: 'B',
    multiplier: 2.0,
    comboCount: 6,
    comboTimer: 0.5,
  };

  const ticking = decayComboTimer(state, 0.2);
  assert.equal(ticking.comboCount, 6);
  assert.ok(Math.abs(ticking.comboTimer - 0.3) < 0.001);

  const expired = decayComboTimer(state, 0.6);
  assert.equal(expired.comboCount, 0);
  assert.equal(expired.comboTimer, 0);
});

test('Kinetic momentum charges with high speed and wall running', () => {
  // Low speed decays
  const idle = calculateKineticMomentumCharge(50, 1.0, false, 1.0);
  assert.ok(idle.charge < 50);

  // High speed charges
  const fast = calculateKineticMomentumCharge(50, 16.0, false, 1.0);
  assert.ok(fast.charge > 50);

  // Wall-running gives huge bonus
  const wallRun = calculateKineticMomentumCharge(50, 16.0, true, 1.0);
  assert.ok(wallRun.charge > fast.charge);

  // Caps at 100 with isOvercharged true
  const maxed = calculateKineticMomentumCharge(99, 20.0, true, 1.0);
  assert.equal(maxed.charge, 100);
  assert.equal(maxed.isOvercharged, true);
});

test('Melee blade damage scales with charge and overcharge generates shockwave', () => {
  const normalHit = calculateMeleeDamage(100, 0, false);
  assert.equal(normalHit.damage, 100);
  assert.equal(normalHit.createsShockwave, false);

  const chargedHit = calculateMeleeDamage(100, 80, false);
  assert.ok(chargedHit.damage > normalHit.damage);

  const overchargeHit = calculateMeleeDamage(100, 100, true);
  assert.ok(overchargeHit.damage > chargedHit.damage);
  assert.equal(overchargeHit.createsShockwave, true);
  assert.equal(overchargeHit.isCritical, true);
});

test('Deflection parry requires active slash early window or wall-run/dash', () => {
  // Early slash deflects
  assert.equal(canDeflectProjectile(false, 0.1), true);
  // Late slash does not deflect if not dashing
  assert.equal(canDeflectProjectile(false, 0.3), false);
  // Dashing/wall-running deflects during attack
  assert.equal(canDeflectProjectile(true, 0.3), true);
  // Beyond attack recovery does not deflect
  assert.equal(canDeflectProjectile(true, 0.7), false);
});

test('Vanguard shield blocks front hits and takes massive damage from rear', () => {
  const frontHit = calculateVanguardHit(false, 150);
  assert.equal(frontHit.blocked, true);
  assert.equal(frontHit.effectiveDamage, 0);

  const rearHit = calculateVanguardHit(true, 150);
  assert.equal(rearHit.blocked, false);
  assert.ok(rearHit.effectiveDamage > 150);
});

test('Particle rail cannon requires at least 25% charge', () => {
  const noCharge = calculateRailCannonDamage(10);
  assert.equal(noCharge.canFire, false);

  const fired = calculateRailCannonDamage(40);
  assert.equal(fired.canFire, true);
  assert.ok(fired.damage >= 180);
  assert.equal(fired.chargeConsumed, 40);
  assert.ok(fired.pierceCount >= 3);
});

test('Overdrive execution unlocks at critical low HP or stagger', () => {
  assert.equal(canExecuteOverdrive(100, 100, false), false);
  assert.equal(canExecuteOverdrive(30, 100, false), true);
  assert.equal(canExecuteOverdrive(80, 100, true), true); // staggered
  assert.equal(canExecuteOverdrive(0, 100, false), false); // dead
});
