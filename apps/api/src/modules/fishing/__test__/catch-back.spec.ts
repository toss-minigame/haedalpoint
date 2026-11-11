import { CATCH_BACK_POLICY } from '../../../common/globals/index.js';
import {
  catchBackNanoFish,
  catchBacksUsedOn,
  MIN_CATCH_BACK_NANO_FISH,
} from '../lib/catch-back.js';
import { NANO_PER_FISH } from '../lib/fishing-rate.js';

const fish = (count: number) => Math.round(count * NANO_PER_FISH);

describe('catch back policy', () => {
  it('returns half of the overflow, up to 0.5 fish and 80% of the hammock, twice a day', () => {
    expect(CATCH_BACK_POLICY).toMatchObject({
      RETURN_PERCENT: 50,
      MAX_FISH: 0.5,
      CAPACITY_PERCENT: 80,
      DAILY_LIMIT: 2,
    });
    expect(MIN_CATCH_BACK_NANO_FISH).toBe(fish(0.01));
  });
});

describe('catchBackNanoFish', () => {
  it('returns half of a small overflow', () => {
    expect(catchBackNanoFish(fish(0.3), fish(0.56))).toBe(fish(0.15));
  });

  it('stops at 80% of a basic hammock', () => {
    expect(catchBackNanoFish(fish(2), fish(0.56))).toBe(fish(0.448));
  });

  it('stops at 0.5 fish for a wide hammock', () => {
    expect(catchBackNanoFish(fish(5), fish(1.4525))).toBe(fish(0.5));
  });

  it('returns nothing without overflow', () => {
    expect(catchBackNanoFish(0, fish(0.56))).toBe(0);
  });
});

describe('catchBacksUsedOn', () => {
  it('counts only the uses recorded today', () => {
    expect(catchBacksUsedOn(2, '2026-11-11', '2026-11-11')).toBe(2);
    expect(catchBacksUsedOn(2, '2026-11-10', '2026-11-11')).toBe(0);
    expect(catchBacksUsedOn(0, null, '2026-11-11')).toBe(0);
  });
});
