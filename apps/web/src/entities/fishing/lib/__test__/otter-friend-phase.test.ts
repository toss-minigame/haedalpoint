import { describe, expect, it } from 'vitest';
import type { FishingStatus } from '../../model/types';
import { otterFriendPhaseAt } from '../otter-friend-phase';

const HOUR = 3_600_000;
/** 기기 시계는 서버 시계와 다를 수 있다. 응답을 받은 기기 시각 */
const RECEIVED_AT = 5_000_000;

/** 서버 시각 0시에 받은 현황: 친구는 1시에 녹기 시작해 2시에 떠난다 */
function status(overrides: Partial<FishingStatus> = {}): FishingStatus {
  return {
    serverTime: '2026-11-18T00:00:00.000Z',
    otterFriendActive: true,
    otterFriendMeltsAt: '2026-11-18T01:00:00.000Z',
    otterFriendUntil: '2026-11-18T02:00:00.000Z',
    otterFriendFrozen: false,
    ...overrides,
  } as FishingStatus;
}

describe('otterFriendPhaseAt', () => {
  it('is away when there is no status or no friend', () => {
    expect(otterFriendPhaseAt(undefined, RECEIVED_AT, RECEIVED_AT).isHere).toBe(false);
    const gone = status({ otterFriendActive: false });
    expect(otterFriendPhaseAt(gone, RECEIVED_AT, RECEIVED_AT).isHere).toBe(false);
  });

  it('is here and whole before the melting hour', () => {
    const phase = otterFriendPhaseAt(status(), RECEIVED_AT, RECEIVED_AT + 0.5 * HOUR);
    expect(phase).toEqual({ isHere: true, melt: 0, isFreezable: false });
  });

  it('starts melting visibly and can be frozen once the melting hour begins', () => {
    const phase = otterFriendPhaseAt(status(), RECEIVED_AT, RECEIVED_AT + HOUR);
    expect(phase.isFreezable).toBe(true);
    expect(phase.melt).toBeCloseTo(0.3);
  });

  it('melts more as the leaving time gets closer', () => {
    const half = otterFriendPhaseAt(status(), RECEIVED_AT, RECEIVED_AT + 1.5 * HOUR);
    const late = otterFriendPhaseAt(status(), RECEIVED_AT, RECEIVED_AT + 2 * HOUR - 1);
    expect(half.melt).toBeCloseTo(0.65);
    expect(late.melt).toBeGreaterThan(half.melt);
    expect(late.melt).toBeLessThanOrEqual(1);
  });

  it('cannot be frozen twice in one visit', () => {
    const frozen = status({ otterFriendFrozen: true });
    const phase = otterFriendPhaseAt(frozen, RECEIVED_AT, RECEIVED_AT + 1.5 * HOUR);
    expect(phase.isHere).toBe(true);
    expect(phase.isFreezable).toBe(false);
  });

  it('leaves at the leaving time without a new response', () => {
    const phase = otterFriendPhaseAt(status(), RECEIVED_AT, RECEIVED_AT + 2 * HOUR);
    expect(phase).toEqual({ isHere: false, melt: 0, isFreezable: false });
  });

  it('measures from when the response arrived, not from the device clock date', () => {
    // 기기 시계가 서버보다 하루 늦어도, 응답을 받은 지 30분이면 아직 녹지 않는다
    const dayBehind = Date.parse('2026-11-17T00:00:00.000Z');
    expect(otterFriendPhaseAt(status(), dayBehind, dayBehind + 0.5 * HOUR).melt).toBe(0);
    expect(otterFriendPhaseAt(status(), dayBehind, dayBehind + 1.5 * HOUR).melt).toBeGreaterThan(0);
  });
});
