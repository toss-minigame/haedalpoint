import { describe, expect, it } from 'vitest';
import { SNOW } from '../snow-config';
import { createSnowflake, snowflakePosition } from '../snowflake';

const AREA = { width: 400, height: 600 };

/** 정해진 값을 차례로 돌려주는 난수 (끝나면 처음부터 다시) */
function sequence(...values: number[]) {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

describe('createSnowflake', () => {
  it('keeps every random value inside the configured ranges', () => {
    for (const value of [0, 0.25, 0.5, 0.75, 0.999]) {
      const flake = createSnowflake(sequence(value), AREA, 'scattered');

      expect(flake.diameter).toBeGreaterThanOrEqual(SNOW.MIN_DIAMETER);
      expect(flake.diameter).toBeLessThanOrEqual(SNOW.MAX_DIAMETER);
      expect(flake.x).toBeGreaterThanOrEqual(0);
      expect(flake.x).toBeLessThanOrEqual(AREA.width);
      expect(flake.sway).toBeGreaterThanOrEqual(SNOW.MIN_SWAY);
      expect(flake.sway).toBeLessThanOrEqual(SNOW.MAX_SWAY);
      expect(flake.opacity).toBeGreaterThanOrEqual(SNOW.MIN_OPACITY);
      expect(flake.opacity).toBeLessThanOrEqual(SNOW.MAX_OPACITY);
    }
  });

  it('makes bigger flakes fall faster, like nearer snow', () => {
    const small = createSnowflake(sequence(0), AREA, 'scattered');
    const big = createSnowflake(sequence(0.999), AREA, 'scattered');

    expect(small.speed).toBeCloseTo(SNOW.MIN_SPEED);
    expect(big.speed).toBeGreaterThan(small.speed);
    expect(big.speed).toBeLessThanOrEqual(SNOW.MAX_SPEED);
  });

  it('scatters flakes over the whole area with no delay at the start', () => {
    const flake = createSnowflake(sequence(0.5), AREA, 'scattered');

    expect(flake.y).toBeCloseTo(AREA.height * 0.5);
    expect(flake.delay).toBe(0);
  });

  it('respawns flakes just above the top after a random delay', () => {
    const flake = createSnowflake(sequence(0.5), AREA, 'top');

    expect(flake.y).toBeLessThan(0);
    expect(flake.y + flake.diameter / 2).toBeLessThanOrEqual(0);
    expect(flake.delay).toBeCloseTo(SNOW.MAX_RESPAWN_DELAY * 0.5);
  });
});

describe('snowflakePosition', () => {
  it('sways sideways around its base x', () => {
    const flake = { ...createSnowflake(sequence(0.5), AREA, 'scattered'), phase: Math.PI / 2 };

    expect(snowflakePosition(flake)).toEqual({ x: flake.x + flake.sway, y: flake.y });
  });
});
