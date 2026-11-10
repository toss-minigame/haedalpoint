import { BAIT_TIERS, SEASONAL_FISH_BY_MONTH } from '../../../common/globals/index.js';
import { baitsOfMonth, monthOf, pickBaitIndex, TOTAL_BAIT_WEIGHT } from '../lib/pick-bait.js';

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

describe('bait tiers', () => {
  it('uses 1, 2, 3 and 5 percent with 40, 30, 20 and 10 percent chances', () => {
    expect(BAIT_TIERS.map((tier) => tier.speedBonusPercent)).toEqual([1, 2, 3, 5]);
    expect(BAIT_TIERS.map((tier) => tier.weight)).toEqual([40, 30, 20, 10]);
    expect(TOTAL_BAIT_WEIGHT).toBe(100);
  });
});

describe('seasonal fish', () => {
  it.each(MONTHS)('has four distinct fish for month %i', (month) => {
    const fishes = SEASONAL_FISH_BY_MONTH[month];

    expect(fishes).toHaveLength(BAIT_TIERS.length);
    expect(new Set(fishes.map((fish) => fish.code)).size).toBe(BAIT_TIERS.length);
  });

  it('keeps one name per fish code across months', () => {
    const nameByCode = new Map<string, string>();
    for (const month of MONTHS) {
      for (const fish of SEASONAL_FISH_BY_MONTH[month]) {
        expect(nameByCode.get(fish.code) ?? fish.name).toBe(fish.name);
        nameByCode.set(fish.code, fish.name);
      }
    }
  });

  it('fits the fish code and name columns', () => {
    for (const month of MONTHS) {
      for (const fish of SEASONAL_FISH_BY_MONTH[month]) {
        expect(fish.code.length).toBeLessThanOrEqual(32);
        expect(fish.name.length).toBeLessThanOrEqual(16);
      }
    }
  });
});

describe('monthOf', () => {
  it('reads the month of a KST date', () => {
    expect(monthOf('2026-01-31')).toBe(1);
    expect(monthOf('2026-11-10')).toBe(11);
  });
});

describe('baitsOfMonth', () => {
  it("gives the month's fish the tiers in order", () => {
    expect(baitsOfMonth(11)).toEqual([
      { code: 'saury', name: '꽁치', speedBonusPercent: 1, probabilityPercent: 40 },
      { code: 'mullet', name: '숭어', speedBonusPercent: 2, probabilityPercent: 30 },
      { code: 'hairtail', name: '갈치', speedBonusPercent: 3, probabilityPercent: 20 },
      { code: 'yellowtail', name: '방어', speedBonusPercent: 5, probabilityPercent: 10 },
    ]);
  });

  it('rejects an unknown month', () => {
    expect(() => baitsOfMonth(13)).toThrow();
  });
});

describe('pickBaitIndex', () => {
  it.each([
    [0, 0],
    [39, 0],
    [40, 1],
    [69, 1],
    [70, 2],
    [89, 2],
    [90, 3],
    [99, 3],
  ])('maps roll %i to tier %i', (roll, index) => {
    expect(pickBaitIndex(roll)).toBe(index);
  });

  it('matches the tier chances over every roll', () => {
    const counts = [0, 0, 0, 0];
    for (let roll = 0; roll < TOTAL_BAIT_WEIGHT; roll += 1) counts[pickBaitIndex(roll)] += 1;

    expect(counts).toEqual([40, 30, 20, 10]);
  });

  it.each([-1, 100, 1.5, Number.NaN])('rejects roll %p', (roll) => {
    expect(() => pickBaitIndex(roll)).toThrow(RangeError);
  });
});
