/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTrailColor, calculateTrailWidth } from './trail.ts';

test('calculateTrailColor returns scorching gold when overcharged', () => {
  const color = calculateTrailColor(50, false, false, true);
  assert.equal(color.r, 1.0);
  assert.ok(color.g > 0.7);
  assert.ok(color.b < 0.3);
});

test('calculateTrailColor returns chromatic flare when dashing', () => {
  const color = calculateTrailColor(50, true, false, false);
  assert.equal(color.r, 1.0);
  assert.ok(color.b > 0.4); // magenta flare
});

test('calculateTrailColor returns electric violet when wall running', () => {
  const color = calculateTrailColor(50, false, true, false);
  assert.ok(color.r > 0.4);
  assert.equal(color.b, 1.0);
});

test('calculateTrailColor returns neon cyan for standard high speed', () => {
  const normal = calculateTrailColor(40, false, false, false);
  assert.equal(normal.r, 0.0);
  assert.ok(normal.g > 0.8);
  assert.equal(normal.b, 1.0);

  const hyperSpeed = calculateTrailColor(85, false, false, false);
  assert.ok(hyperSpeed.r > 0.3); // whitened cyan
  assert.equal(hyperSpeed.b, 1.0);
});

test('calculateTrailWidth is zero at standstill and expands with speed and dashes', () => {
  const zero = calculateTrailWidth(0.3, 5, false, false);
  assert.equal(zero, 0);

  const running = calculateTrailWidth(0.3, 40, false, false);
  assert.ok(running > 0.2);

  const dashing = calculateTrailWidth(0.3, 40, true, false);
  assert.ok(dashing > running * 2.0);

  const wallRunning = calculateTrailWidth(0.3, 40, false, true);
  assert.ok(wallRunning > running * 1.3);
});
