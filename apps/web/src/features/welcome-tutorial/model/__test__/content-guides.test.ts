import { describe, expect, it } from 'vitest';
import type { TutorialStatusResponse } from '@/entities/tutorial';
import { CONTENT_GUIDES, trialFor } from '../content-guides';

const NOTHING_CLAIMED = { ROD: false, HAMMOCK: false, QUIZ: false, GIFT: false };

function tutorial(
  status: TutorialStatusResponse['status'],
  claimed: Partial<TutorialStatusResponse['claimed']> = {},
): TutorialStatusResponse {
  return { status, claimed: { ...NOTHING_CLAIMED, ...claimed } };
}

describe('trialFor', () => {
  it('offers the rod trial after the home tutorial is done when it is not claimed yet', () => {
    expect(trialFor(CONTENT_GUIDES.rod, tutorial('DONE', { GIFT: true }))?.kind).toBe('ROD');
  });

  it('offers no trial once that reward is claimed (existing users)', () => {
    expect(trialFor(CONTENT_GUIDES.hammock, tutorial('DONE', { HAMMOCK: true }))).toBeNull();
  });

  it('offers no trial to users who skipped the home tutorial', () => {
    expect(trialFor(CONTENT_GUIDES.rod, tutorial('SKIPPED'))).toBeNull();
  });

  it('check-in only explains', () => {
    expect(trialFor(CONTENT_GUIDES['check-in'], tutorial('DONE'))).toBeNull();
  });
});
