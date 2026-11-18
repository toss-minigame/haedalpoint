import {
  AD_ROD_POLICY,
  ATTENDANCE_POLICY,
  BAIT_TIERS,
  CATCH_BACK_POLICY,
  FISHING_POLICY,
  HAMMOCK_EXPAND_POLICY,
  OTTER_FRIEND_POLICY,
  QUIZ_POLICY,
  ROD_POLICY,
  TUTORIAL_REWARD_POLICY,
} from '../../../common/globals/index.js';
import { NO_BOOSTS, speedPercent, tossPointsPerDay } from '../lib/fishing-rate.js';

// 월 지급 상한을 코드로 강제하지 않는 대신, 정책값이 예산을 넘으면 이 테스트가 실패한다 (ADR-0007).
// 최악의 한 달: 31일 내내 하루에 받을 수 있는 강화를 자정 직후 모두 받은 상태로 하루 종일 낚시,
// 해달 친구(출석 7일마다·튜토리얼 완료, 올 때마다 24시간 + 얼려서 6시간)와 함께, 해먹을 한 번도 넘치지 않게 비움, 매일 가장 높은 룰렛 미끼를 적용,
// 넘친 물고기 다시 잡아오기를 매일 최대로, 출석 토스 포인트(1~6일차)와 튜토리얼 보상(체험 강화·첫 선물)을 모두 받음.
// 해먹 용량은 이 최악값에 영향이 없다.
const MAX_BAIT_BONUS_PERCENT = Math.max(...BAIT_TIERS.map((tier) => tier.speedBonusPercent));
const MINUTES_PER_DAY = 24 * 60;
/** 출석 1회 (첫 주 이후 매일 낚싯대 강화) */
const ATTENDANCE_ROD_LEVELS_PER_DAY = ATTENDANCE_POLICY.ROD_LEVELS_AFTER_FIRST_WEEK;
/** 출석 토스 포인트는 사용자당 1~6일차에 한 번씩만 준다 */
const ATTENDANCE_TOSS_POINTS =
  ATTENDANCE_POLICY.TOSS_POINT_LAST_DAY * ATTENDANCE_POLICY.TOSS_POINTS_PER_DAY;

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
/** 튜토리얼 체험으로 하루에 더 오르는 낚싯대 단계. 해먹 넓히기 체험은 하루 최대 해먹 단계 안에서 센다 */
const TUTORIAL_ROD_LEVELS =
  TUTORIAL_REWARD_POLICY.ROD_LEVELS + TUTORIAL_REWARD_POLICY.QUIZ_ROD_LEVELS;
/**
 * 해달 친구가 한 달에 오는 최대 횟수. 매일 출석하면 가장 긴 달(31일) 안에 7의 배수 일차가 최대 5번 있다.
 * 튜토리얼 친구는 첫 달에만 오고 그 달은 7의 배수 일차가 4번(7·14·21·28)이라, 합쳐도 5번이다
 */
const MAX_OTTER_FRIEND_VISITS = Math.ceil(
  LONGEST_MONTH_DAYS / ATTENDANCE_POLICY.OTTER_FRIEND_CYCLE_DAYS,
);
/** 올 때마다 24시간 머물고, 광고를 보고 한 번 얼리면 6시간 더 머문다 (한 번에 한 명) */
const MAX_OTTER_FRIEND_DAYS =
  (MAX_OTTER_FRIEND_VISITS *
    (OTTER_FRIEND_POLICY.DURATION_HOURS + OTTER_FRIEND_POLICY.FREEZE_HOURS)) /
  24;

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
  const maxRodWithFriends = { ...maxRod, otterFriends: 1 };
  const normalDays = LONGEST_MONTH_DAYS - MAX_OTTER_FRIEND_DAYS;
  return (
    normalDays * tossPointsPerDay(speedPercent(maxRod)) +
    MAX_OTTER_FRIEND_DAYS * tossPointsPerDay(speedPercent(maxRodWithFriends)) +
    worstCaseMonthlyCatchBackTossPoints() +
    ATTENDANCE_TOSS_POINTS +
    worstCaseTutorialTossPoints()
  );
}

/** 튜토리얼 체험 강화를 받은 날 더 잡는 양 + 첫 선물. 해달 친구는 MAX_OTTER_FRIEND_DAYS 에 넣었다 */
function worstCaseTutorialTossPoints(): number {
  const extraRod = { ...NO_BOOSTS, rodLevel: TUTORIAL_ROD_LEVELS };
  const extraRodTossPoints = tossPointsPerDay(speedPercent(extraRod)) - tossPointsPerDay(100);
  return (
    extraRodTossPoints + TUTORIAL_REWARD_POLICY.GIFT_MAX_FISH / FISHING_POLICY.FISH_PER_TOSS_POINT
  );
}

describe('fishing budget', () => {
  it('keeps the worst-case month within the per-user monthly budget', () => {
    expect(worstCaseMonthlyTossPoints()).toBeLessThanOrEqual(
      FISHING_POLICY.MONTHLY_TOSS_POINT_BUDGET,
    );
  });

  it('adds at most 2 catch backs of half a point a day (31 points in the longest month)', () => {
    expect(worstCaseMonthlyCatchBackTossPoints()).toBe(31);
  });

  it('counts the otter friend 5 times a month, 24 hours plus a 6-hour freeze each (6.25 days)', () => {
    expect(MAX_OTTER_FRIEND_VISITS).toBe(5);
    expect(MAX_OTTER_FRIEND_DAYS).toBe(6.25);
  });

  it('adds the six attendance toss points', () => {
    expect(ATTENDANCE_TOSS_POINTS).toBe(6);
  });

  it('adds the tutorial rod levels and gift to the worst case (under 2 points)', () => {
    expect(worstCaseTutorialTossPoints()).toBeGreaterThan(0);
    expect(worstCaseTutorialTossPoints()).toBeLessThan(2);
  });

  it('catches one fish a second at the base speed (48,000 fish = 1 point)', () => {
    expect(tossPointsPerDay(100) * FISHING_POLICY.FISH_PER_TOSS_POINT).toBeCloseTo(86_400, 6);
  });

  it('pays the base amount for a 30-day month without boosts', () => {
    const points = FISHING_POLICY.BASE_MONTH_DAYS * tossPointsPerDay(100);

    expect(points).toBeCloseTo(FISHING_POLICY.BASE_MONTHLY_TOSS_POINTS, 6);
  });

  it('counts every rod source a day can give (ad cooldown, quizzes, attendance, hammock expand)', () => {
    expect(maxRodLevelsPerDay()).toBe(72 + 3 + 10 + 8);
  });

  it('uses positive bonus values', () => {
    expect(ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL).toBeGreaterThan(0);
    expect(OTTER_FRIEND_POLICY.SPEED_BONUS_PERCENT).toBeGreaterThan(0);
  });
});
