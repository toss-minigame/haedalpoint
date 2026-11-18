import { buildTutorialStatus, canClaim, isClosed, isRewarded } from '../lib/tutorial-status.js';

const AT = new Date('2026-11-16T03:00:00Z');

function row(overrides: Record<string, Date | null> = {}) {
  return {
    rodRewardedAt: null,
    hammockRewardedAt: null,
    quizRewardedAt: null,
    giftRewardedAt: null,
    completedAt: null,
    skippedAt: null,
    ...overrides,
  };
}

const NOTHING_CLAIMED = { ROD: false, HAMMOCK: false, QUIZ: false, GIFT: false };

describe('buildTutorialStatus', () => {
  it('is NOT_STARTED with nothing claimed when there is no row', () => {
    expect(buildTutorialStatus(null)).toEqual({ status: 'NOT_STARTED', claimed: NOTHING_CLAIMED });
  });

  it('is NOT_STARTED when the row has no reward yet', () => {
    expect(buildTutorialStatus(row()).status).toBe('NOT_STARTED');
  });

  it('is IN_PROGRESS once a reward is claimed, and shows which ones', () => {
    expect(buildTutorialStatus(row({ rodRewardedAt: AT, quizRewardedAt: AT }))).toEqual({
      status: 'IN_PROGRESS',
      claimed: { ...NOTHING_CLAIMED, ROD: true, QUIZ: true },
    });
  });

  it('is DONE once completed, even if skipped later', () => {
    expect(buildTutorialStatus(row({ completedAt: AT, skippedAt: AT })).status).toBe('DONE');
  });

  it('is SKIPPED once skipped', () => {
    expect(buildTutorialStatus(row({ giftRewardedAt: AT, skippedAt: AT })).status).toBe('SKIPPED');
  });
});

describe('isRewarded', () => {
  it('checks the time of that reward kind only', () => {
    const r = row({ hammockRewardedAt: AT });

    expect(isRewarded(r, 'HAMMOCK')).toBe(true);
    expect(isRewarded(r, 'GIFT')).toBe(false);
  });
});

describe('isClosed', () => {
  it.each([
    ['open', row(), false],
    ['completed', row({ completedAt: AT }), true],
    ['skipped', row({ skippedAt: AT }), true],
  ])('%s', (_label, r, expected) => {
    expect(isClosed(r)).toBe(expected);
  });
});

describe('canClaim', () => {
  it('allows the first gift only while the tutorial is open', () => {
    expect(canClaim(row(), 'GIFT')).toBe(true);
    expect(canClaim(row({ completedAt: AT }), 'GIFT')).toBe(false);
    expect(canClaim(row({ skippedAt: AT }), 'GIFT')).toBe(false);
  });

  it.each(['ROD', 'HAMMOCK', 'QUIZ'] as const)(
    'allows the %s trial after completion but not after a skip',
    (kind) => {
      expect(canClaim(row(), kind)).toBe(true);
      expect(canClaim(row({ completedAt: AT }), kind)).toBe(true);
      expect(canClaim(row({ skippedAt: AT }), kind)).toBe(false);
    },
  );
});
