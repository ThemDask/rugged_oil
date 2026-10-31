import type { SimWorld } from './world';

/**
 * The per-tick game systems, called by SimWorld.step() in this order (LLD section 4). Each is a
 * function over the world. They are empty until their milestone implements them; keeping the
 * order fixed here means adding one never reorders the others.
 */

/** M5: each player's visibility grid, rebuilt every few ticks. */
export function stepVisibility(_world: SimWorld): void {}

/** M5: mount turning, targeting and firing (spawns projectiles). */
export function stepCombat(_world: SimWorld): void {}

/** M5: projectile flight, hits and damage. */
export function stepProjectiles(_world: SimWorld): void {}
