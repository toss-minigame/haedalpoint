import { describe, expect, it } from 'vitest';
import { isFrameDue, SCENE_FPS } from '../frame-pacing';

/** 주사율 hz 인 화면에서 seconds 동안 프레임마다 물어봤을 때 그린 횟수 */
function drawsPerSecond(hz: number, everyFrame = false, seconds = 2): number {
  let lastDrawnAt: number | null = null;
  let draws = 0;
  for (let frame = 0; frame < hz * seconds; frame++) {
    const now = (frame * 1000) / hz;
    if (!isFrameDue(lastDrawnAt, now, everyFrame)) continue;
    lastDrawnAt = now;
    draws += 1;
  }
  return draws / seconds;
}

describe('isFrameDue', () => {
  it('draws the first frame right away', () => {
    expect(isFrameDue(null, 0, false)).toBe(true);
  });

  it.each([60, 120])('draws 30 times a second on a %iHz screen', (hz) => {
    expect(drawsPerSecond(hz)).toBe(SCENE_FPS);
  });

  it('does not slow down a screen that is already at 30Hz', () => {
    expect(drawsPerSecond(30)).toBe(30);
  });

  it('skips a frame that comes too soon after the last one', () => {
    expect(isFrameDue(1000, 1016.7, false)).toBe(false);
  });

  it('still draws when the browser reports a frame slightly early', () => {
    expect(isFrameDue(1000, 1031, false)).toBe(true);
  });

  it('draws every frame while the otter is being dragged', () => {
    expect(isFrameDue(1000, 1008.3, true)).toBe(true);
    expect(drawsPerSecond(60, true)).toBe(60);
  });
});
