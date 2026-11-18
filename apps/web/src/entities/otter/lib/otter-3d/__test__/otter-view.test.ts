import { describe, expect, it } from 'vitest';
import { otterLayout } from '../../../lib/scene/scene-state';
import { MODEL_HEIGHT, stillTip, VIEW, viewRect, viewUnit } from '../otter-view';

const SCENE = { width: 390, height: 560 };
const otter = otterLayout(SCENE);

describe('viewRect', () => {
  it('scales the model so the otter is as tall as the scene wants', () => {
    expect(viewUnit(otter) * MODEL_HEIGHT).toBeCloseTo(otter.bodyHeight);
  });

  it('puts the model origin at the otter spot: centered sideways, feet on the ground line', () => {
    const rect = viewRect(otter);
    const unit = viewUnit(otter);
    expect(rect.x - VIEW.LEFT * unit).toBeCloseTo(otter.centerX);
    expect(rect.y + VIEW.TOP * unit).toBeCloseTo(otter.bottomY);
    expect(rect.width).toBeCloseTo((VIEW.RIGHT - VIEW.LEFT) * unit);
    expect(rect.height).toBeCloseTo((VIEW.TOP - VIEW.BOTTOM) * unit);
  });

  it('grows to the left and up for the snowman without moving the otter', () => {
    const base = viewRect(otter);
    const wide = viewRect(otter, VIEW.LEFT - 2, VIEW.TOP + 1);
    expect(wide.x).toBeLessThan(base.x);
    expect(wide.y).toBeLessThan(base.y);
    expect(wide.x + wide.width).toBeCloseTo(base.x + base.width);
    expect(wide.y + wide.height).toBeCloseTo(base.y + base.height);
  });
});

describe('stillTip', () => {
  it('is at the left end of the still image, over the puddle side', () => {
    const rect = viewRect(otter);
    const tip = stillTip(rect);
    expect(tip.x).toBeGreaterThan(rect.x);
    expect(tip.x).toBeLessThan(rect.x + rect.width * 0.2);
    expect(tip.x).toBeLessThan(otter.centerX);
    expect(tip.y).toBeGreaterThan(rect.y);
    expect(tip.y).toBeLessThan(otter.bottomY);
  });
});
