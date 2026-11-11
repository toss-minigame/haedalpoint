import {
  AD_ROD_POLICY,
  BAIT_TIERS,
  CATCH_BACK_POLICY,
  FISHING_POLICY,
  HAMMOCK_EXPAND_POLICY,
  OTTER_FRIEND_POLICY,
  QUIZ_POLICY,
  ROD_POLICY,
} from '../../../common/globals/index.js';
import { ATTENDANCE_CYCLE_DAYS } from '../../attendance/lib/attendance-reward.policy.js';
import { speedPercent, tossPointsPerDay } from '../lib/fishing-rate.js';

// 월 지급 상한을 코드로 강제하지 않는 대신, 정책값이 예산을 넘으면 이 테스트가 실패한다 (ADR-0007).
// 최악의 한 달: 31일 내내 하루에 받을 수 있는 강화를 자정 직후 모두 받은 상태로 하루 종일 낚시,
// 해달 친구가 올 수 있는 최대 일수(그날은 하루 최대 인원), 해먹을 한 번도 넘치지 않게 비움,
// 매일 가장 높은 룰렛 미끼를 적용, 넘친 물고기 다시 잡아오기를 매일 최대로. 해먹 용량은 이 최악값에 영향이 없다.
const MAX_BAIT_BONUS_PERCENT = Math.max(...BAIT_TIERS.map((tier) => tier.speedBonusPercent));
const MINUTES_PER_DAY = 24 * 60;
/** 출석 1회 + '광고 보고 2배' 1회 (1~6일차 낚싯대 강화 1단계씩) */
const ATTENDANCE_ROD_LEVELS_PER_DAY = 2;

/** 낚싯대 하루 최대 단계는 없지만, 쿨타임·횟수 때문에 하루에 받을 수 있는 강화 단계에는 끝이 있다 */
function maxRodLevelsPerDay(): number {
  const adRodLevels =
    Math.ceil(MINUTES_PER_DAY / AD_ROD_POLICY.COOLDOWN_MINUTES) * AD_ROD_POLICY.LEVELS_PER_AD;
  const quizLevels = QUIZ_POLICY.DAILY_QUIZ_COUNT * QUIZ_POLICY.ROD_LEVELS_PER_REWARD;
  const hammockLevels =
    HAMMOCK_EXPAND_POLICY.MAX_LEVEL * HAMMOCK_EXPAND_POLICY.ROD_LEVELS_PER_EXPAND;
  return adRodLevels + quizLevels + ATTENDANCE_ROD_LEVELS_PER_DAY + hammockLevels;
}
const LONGEST_MONTH_DAYS = 31;
const MAX_OTTER_FRIEND_DAYS = Math.ceil(LONGEST_MONTH_DAYS / ATTENDANCE_CYCLE_DAYS);

/** 넘친 물고기 다시 잡아오기는 속도와 무관하게 하루 횟수 × 1회 상한만큼 더 줄 수 있다 */
function worstCaseMonthlyCatchBackTossPoints(): number {
  const fishPerDay = CATCH_BACK_POLICY.DAILY_LIMIT * CATCH_BACK_POLICY.MAX_FISH;
  return (LONGEST_MONTH_DAYS * fishPerDay) / FISHING_POLICY.FISH_PER_TOSS_POINT;
}

function worstCaseMonthlyTossPoints(): number {
  const maxRod = {
    rodLevel: maxRodLevelsPerDay(),
    otterFriends: 0,
    hammockLevel: HAMMOCK_EXPAND_POLICY.MAX_LEVEL,
    baitBonusPercent: MAX_BAIT_BONUS_PERCENT,
  };
  const maxRodWithFriends = { ...maxRod, otterFriends: OTTER_FRIEND_POLICY.MAX_PER_DAY };
  const normalDays = LONGEST_MONTH_DAYS - MAX_OTTER_FRIEND_DAYS;
  return (
    normalDays * tossPointsPerDay(speedPercent(maxRod)) +
    MAX_OTTER_FRIEND_DAYS * tossPointsPerDay(speedPercent(maxRodWithFriends)) +
    worstCaseMonthlyCatchBackTossPoints()
  );
}

describe('fishing budget', () => {
  it('keeps the worst-case month within the per-user monthly budget', () => {
    expect(worstCaseMonthlyTossPoints()).toBeLessThanOrEqual(
      FISHING_POLICY.MONTHLY_TOSS_POINT_BUDGET,
    );
  });

  it('adds at most 2 catch backs of 0.5 fish a day (31 points in the longest month)', () => {
    expect(worstCaseMonthlyCatchBackTossPoints()).toBe(31);
  });

  it('counts the otter friend on at most one day per attendance cycle', () => {
    expect(MAX_OTTER_FRIEND_DAYS).toBe(5);
  });

  it('pays the base amount for a 30-day month without boosts', () => {
    const points = FISHING_POLICY.BASE_MONTH_DAYS * tossPointsPerDay(100);

    expect(points).toBeCloseTo(FISHING_POLICY.BASE_MONTHLY_TOSS_POINTS, 6);
  });

  it('counts every rod source a day can give (ad cooldown, quizzes, attendance, hammock expand)', () => {
    expect(maxRodLevelsPerDay()).toBe(72 + 3 + 2 + 10);
  });

  it('uses positive bonus values', () => {
    expect(ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL).toBeGreaterThan(0);
    expect(OTTER_FRIEND_POLICY.SPEED_BONUS_PERCENT).toBeGreaterThan(0);
  });
});
