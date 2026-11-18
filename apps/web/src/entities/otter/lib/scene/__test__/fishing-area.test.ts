import { describe, expect, it } from 'vitest';
import { fishingArea, holeLayout, otterLayout } from '../scene-state';

const SIZES = [
  { width: 390, height: 620 },
  { width: 320, height: 520 },
  { width: 576, height: 700 },
];

describe('fishingArea', () => {
  it.each(SIZES)('is horizontally centered in a $width px scene', (size) => {
    const area = fishingArea(size);

    expect(area.x).toBeGreaterThanOrEqual(0);
    expect(area.x + area.width / 2).toBeCloseTo(size.width / 2);
  });

  it.each(SIZES)('covers every otter frame and the puddle in a $width px scene', (size) => {
    const area = fishingArea(size);
    const hole = holeLayout(size);
    const contains = (x: number, y: number) =>
      x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height;

    for (const frame of otterLayout(size).frames) {
      expect(contains(frame.x, frame.y)).toBe(true);
      expect(contains(frame.x + frame.width, frame.y + frame.height)).toBe(true);
    }
    expect(contains(hole.x - hole.radiusX, hole.y)).toBe(true);
    expect(contains(hole.x + hole.radiusX, hole.y + hole.radiusY)).toBe(true);
  });
});
