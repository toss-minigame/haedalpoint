import { WAREHOUSE_TOSS_POINT_POLICY } from '../../../common/globals/index.js';
import { MILLI_PER_FISH } from '../lib/fishing-rate.js';
import {
  claimableTossPoints,
  MILLI_FISH_PER_TOSS_POINT,
  tossPointsOf,
} from '../lib/warehouse-toss-point.js';

const fish = (count: number) => Math.round(count * MILLI_PER_FISH);

describe('warehouse toss point', () => {
  it('needs 48,000 fish for 1 point and gives up to 200 points a day', () => {
    expect(MILLI_FISH_PER_TOSS_POINT).toBe(fish(48_000));
    expect(WAREHOUSE_TOSS_POINT_POLICY.DAILY_LIMIT).toBe(200);
  });

  it('rounds down to whole points', () => {
    expect(tossPointsOf(fish(47_999.999))).toBe(0);
    expect(tossPointsOf(fish(48_000))).toBe(1);
    expect(tossPointsOf(fish(209_760))).toBe(4);
  });

  it('gives every whole point in the warehouse', () => {
    expect(claimableTossPoints(fish(209_760), 0)).toBe(4);
  });

  it('stops at what is left of the daily limit', () => {
    expect(claimableTossPoints(fish(48_000 * 300), 0)).toBe(200);
    expect(claimableTossPoints(fish(48_000 * 300), 198)).toBe(2);
    expect(claimableTossPoints(fish(48_000 * 300), 200)).toBe(0);
  });
});
