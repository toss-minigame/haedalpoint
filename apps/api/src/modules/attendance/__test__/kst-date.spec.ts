import { addDays, toKstDateString } from '../lib/kst-date';

describe('toKstDateString', () => {
  it('treats UTC 14:59 as the same KST day', () => {
    expect(toKstDateString(new Date('2026-10-30T14:59:59.999Z'))).toBe('2026-10-30');
  });

  it('rolls over to the next KST day at UTC 15:00', () => {
    expect(toKstDateString(new Date('2026-10-30T15:00:00.000Z'))).toBe('2026-10-31');
  });

  it('handles year boundary', () => {
    expect(toKstDateString(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01');
  });
});

describe('addDays', () => {
  it.each([
    ['2026-10-30', -1, '2026-10-29'],
    ['2026-10-31', 1, '2026-11-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2028-03-01', -1, '2028-02-29'],
    ['2026-01-01', -1, '2025-12-31'],
    ['2026-10-30', 0, '2026-10-30'],
  ])('%s %+d → %s', (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });
});
