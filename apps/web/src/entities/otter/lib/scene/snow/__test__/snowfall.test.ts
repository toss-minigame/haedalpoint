import { describe, expect, it } from 'vitest';
import { SNOW } from '../snow-config';
import { createSnowfall, snowflakeCount, stepSnowfall } from '../snowfall';
import type { Snowflake } from '../snowflake';

const AREA = { width: 400, height: 600 };
const half = () => 0.5;

const flake = (changes: Partial<Snowflake>): Snowflake => ({
  x: 100,
  y: 100,
  diameter: 4,
  speed: 50,
  sway: 8,
  phase: 0,
  opacity: 0.8,
  delay: 0,
  ...changes,
});

describe('snowflakeCount', () => {
  it('grows with the area but never passes the maximum', () => {
    expect(snowflakeCount({ width: 100, height: 100 })).toBeLessThan(snowflakeCount(AREA));
    expect(snowflakeCount({ width: 4000, height: 4000 })).toBe(SNOW.MAX_COUNT);
  });

  it('has no snow when the area is empty', () => {
    expect(snowflakeCount({ width: 0, height: 0 })).toBe(0);
  });
});

describe('createSnowfall', () => {
  it('scatters as many flakes as the area allows, already falling', () => {
    const snowfall = createSnowfall(half, AREA);

    expect(snowfall).toHaveLength(snowflakeCount(AREA));
    expect(snowfall.every((item) => item.delay === 0 && item.y >= 0)).toBe(true);
  });
});

describe('stepSnowfall', () => {
  it('moves each flake down by its speed and advances the sway', () => {
    const [moved] = stepSnowfall([flake({})], 0.5, half, AREA);

    expect(moved?.y).toBeCloseTo(125);
    expect(moved?.phase).toBeCloseTo(SNOW.SWAY_SPEED * 0.5);
  });

  it('keeps a delayed flake still until its delay runs out', () => {
    const [waiting] = stepSnowfall([flake({ delay: 1 })], 0.4, half, AREA);

    expect(waiting?.y).toBe(100);
    expect(waiting?.delay).toBeCloseTo(0.6);
  });

  it('respawns a flake above the top once it falls below the bottom', () => {
    const [respawned] = stepSnowfall([flake({ y: AREA.height + 1 })], 0.1, half, AREA);

    expect(respawned?.y).toBeLessThan(0);
    expect(respawned?.delay).toBeGreaterThan(0);
  });

  it('keeps the number of flakes and does not change the input', () => {
    const before = createSnowfall(half, AREA);
    const copy = structuredClone(before);

    const after = stepSnowfall(before, 0.05, half, AREA);

    expect(after).toHaveLength(before.length);
    expect(before).toEqual(copy);
  });
});
