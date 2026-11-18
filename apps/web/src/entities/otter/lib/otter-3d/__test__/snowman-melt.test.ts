import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { meltedBodyPoint } from '../snowman-melt';

/** 눈사람 몸통 꼭대기 높이 (snowman-melt.ts 의 BODY_TOP) */
const BODY_TOP = 1.34;
const melted = (x: number, y: number, z: number) =>
  meltedBodyPoint(new Vector3(x, y, z), new Vector3());
const radius = (point: Vector3) => Math.hypot(point.x, point.z);

describe('meltedBodyPoint', () => {
  it('sinks every point to half its height', () => {
    expect(melted(0.3, 1, 0.2).y).toBeCloseTo(0.5);
    expect(melted(0.3, 0, 0.2).y).toBe(0);
  });

  it('spreads the bottom outward much more than the top', () => {
    const bottom = radius(melted(0.5, 0.05, 0)) / 0.5;
    const middle = radius(melted(0.5, BODY_TOP / 2, 0)) / 0.5;
    expect(bottom).toBeGreaterThan(middle);
    expect(middle).toBeGreaterThan(1);
    expect(bottom).toBeGreaterThan(1.5);
  });

  it('only lowers what sits on top of the body (head, hat), without spreading it', () => {
    for (const height of [BODY_TOP, BODY_TOP + 0.5]) {
      const point = melted(0.4, height, -0.3);
      expect(point.x).toBeCloseTo(0.4);
      expect(point.z).toBeCloseTo(-0.3);
    }
  });

  it('keeps the middle of the body in the middle', () => {
    const point = melted(0, 0.4, 0);
    expect(point.x).toBeCloseTo(0);
    expect(point.z).toBeCloseTo(0);
  });

  it('melts into an uneven edge, not a perfect circle', () => {
    const edge = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const angle = (i / 8) * 2 * Math.PI;
      return radius(melted(0.5 * Math.cos(angle), 0.05, 0.5 * Math.sin(angle)));
    });
    expect(Math.max(...edge) - Math.min(...edge)).toBeGreaterThan(0.02);
  });
});
