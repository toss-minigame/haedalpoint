import { CATCH_BACK_POLICY } from '../../../common/globals/index.js';
import {
  catchBackMilliFish,
  catchBacksUsedOn,
  MIN_CATCH_BACK_MILLI_FISH,
} from '../lib/catch-back.js';
import { MILLI_PER_FISH } from '../lib/fishing-rate.js';

const fish = (count: number) => Math.round(count * MILLI_PER_FISH);

describe('catch back policy', () => {
  it('returns half of the overflow, up to 24,000 fish (0.5 point) and 80% of the hammock, twice a day', () => {
    expect(CATCH_BACK_POLICY).toMatchObject({
      RETURN_PERCENT: 50,
      MAX_FISH: 24_000,
      CAPACITY_PERCENT: 80,
      DAILY_LIMIT: 2,
    });
    expect(MIN_CATCH_BACK_MILLI_FISH).toBe(fish(480));
  });
});

describe('catchBackMilliFish', () => {
  it('returns half of a small overflow', () => {
    expect(catchBackMilliFish(fish(10_000), fish(30_000))).toBe(fish(5_000));
  });

  it('stops at 80% of a hammock smaller than 30,000 fish', () => {
    expect(catchBackMilliFish(fish(100_000), fish(20_000))).toBe(fish(16_000));
  });

  it('stops at 24,000 fish for a basic or wider hammock', () => {
    expect(catchBackMilliFish(fish(100_000), fish(30_000))).toBe(fish(24_000));
    expect(catchBackMilliFish(fish(200_000), fish(64_307))).toBe(fish(24_000));
  });

  it('returns nothing without overflow', () => {
    expect(catchBackMilliFish(0, fish(30_000))).toBe(0);
  });
});

describe('catchBacksUsedOn', () => {
  it('counts only the uses recorded today', () => {
    expect(catchBacksUsedOn(2, '2026-11-11', '2026-11-11')).toBe(2);
    expect(catchBacksUsedOn(2, '2026-11-10', '2026-11-11')).toBe(0);
    expect(catchBacksUsedOn(0, null, '2026-11-11')).toBe(0);
  });
});
