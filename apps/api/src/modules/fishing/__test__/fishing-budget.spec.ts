import {
  FISHING_POLICY,
  HAMMOCK_EXPAND_POLICY,
  OTTER_FRIEND_POLICY,
  ROD_POLICY,
} from '../../../common/globals/index.js';
import { ATTENDANCE_CYCLE_DAYS } from '../../attendance/lib/attendance-reward.policy.js';
import { speedPercent, tossPointsPerDay } from '../lib/fishing-rate.js';

// 월 지급 상한을 코드로 강제하지 않는 대신, 정책값이 예산을 넘으면 이 테스트가 실패한다 (ADR-0007).
// 최악의 한 달: 31일 내내 최대 강화, 해달 친구가 올 수 있는 최대 일수(그날은 하루 최대 인원),
// 해먹을 한 번도 넘치지 않게 비움. 해먹 넓히기는 속도를 바꾸지 않아 이 최악값에 영향이 없다.
const LONGEST_MONTH_DAYS = 31;
const MAX_OTTER_FRIEND_DAYS = Math.ceil(LONGEST_MONTH_DAYS / ATTENDANCE_CYCLE_DAYS);

function worstCaseMonthlyTossPoints(): number {
  const maxRod = {
    rodLevel: ROD_POLICY.MAX_LEVEL,
    otterFriends: 0,
    hammockLevel: HAMMOCK_EXPAND_POLICY.MAX_LEVEL,
  };
  const maxRodWithFriends = { ...maxRod, otterFriends: OTTER_FRIEND_POLICY.MAX_PER_DAY };
  const normalDays = LONGEST_MONTH_DAYS - MAX_OTTER_FRIEND_DAYS;
  return (
    normalDays * tossPointsPerDay(speedPercent(maxRod)) +
    MAX_OTTER_FRIEND_DAYS * tossPointsPerDay(speedPercent(maxRodWithFriends))
  );
}

describe('fishing budget', () => {
  it('keeps the worst-case month within the per-user monthly budget', () => {
    expect(worstCaseMonthlyTossPoints()).toBeLessThanOrEqual(
      FISHING_POLICY.MONTHLY_TOSS_POINT_BUDGET,
    );
  });

  it('counts the otter friend on at most one day per attendance cycle', () => {
    expect(MAX_OTTER_FRIEND_DAYS).toBe(5);
  });

  it('pays the base amount for a 30-day month without boosts', () => {
    const points = FISHING_POLICY.BASE_MONTH_DAYS * tossPointsPerDay(100);

    expect(points).toBeCloseTo(FISHING_POLICY.BASE_MONTHLY_TOSS_POINTS, 6);
  });

  it('uses positive bonus values', () => {
    expect(ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL).toBeGreaterThan(0);
    expect(OTTER_FRIEND_POLICY.SPEED_BONUS_PERCENT).toBeGreaterThan(0);
  });
});
