import {
  type FishingStatus,
  formatFullAt,
  hammockName,
  otterFriendSpeedBonusPercent,
} from '@/entities/fishing';

const BASE_SPEED_PERCENT = 100;

export type TodayBoostRow = {
  key: 'rod' | 'friend' | 'bait' | 'hammock';
  title: string;
  detail: string;
  value: string;
  /** 오늘 받은 강화가 있으면 true (없으면 흐리게 보여준다) */
  isActive: boolean;
};

/** 기본 속도 대비 오늘 오른 낚시 속도 (%). 낚싯대 강화 + 해달 친구 + 룰렛 미끼 */
export function todaySpeedBonusPercent(status: FishingStatus): number {
  return status.speedPercent - BASE_SPEED_PERCENT;
}

/**
 * 오늘 적용 중인 강화 목록. 모두 서버 응답 값에서 계산한다.
 * 해먹 단계는 해먹 광고로만 오르고 한 번에 낚싯대도 함께 오르므로, 낚싯대 중 해먹 넓히기 몫 = 해먹 단계 × 1회당 속도.
 * baitName 은 오늘 단 미끼 이름 (룰렛 정보를 아직 못 받았으면 null).
 * now 는 서버 시각 기준 지금 (해달 친구가 떠나는 시각을 '오늘'/'내일'로 나눠 보여줄 때 쓴다)
 */
export function todayBoostRows(
  status: FishingStatus,
  baitName: string | null,
  now: Date,
): TodayBoostRow[] {
  const rodBonus = status.rodSpeedBonusPercent;
  const baitBonus = status.baitSpeedBonusPercent;
  const friendBonus = otterFriendSpeedBonusPercent(status);
  const hammockBonus = status.hammockLevelBonusPercent;
  // 정책이 바뀌기 전에 넓힌 해먹 단계는 낚싯대를 올리지 않았으므로 낚싯대 전체를 넘지 않게 한다
  const hammockRodBonus = Math.min(
    rodBonus,
    status.hammockLevel * status.adHammockRodSpeedBonusPercent,
  );
  const otherRodBonus = rodBonus - hammockRodBonus;

  return [
    {
      key: 'rod',
      // 홈의 낚싯대 타일 이름과 같게 적는다
      title: '빨리 잡기',
      detail: rodDetail(status.rodLevel, otherRodBonus, hammockRodBonus),
      value: `+${rodBonus}%`,
      isActive: rodBonus > 0,
    },
    {
      key: 'friend',
      title: '눈사람 친구',
      detail: friendDetail(status, now),
      value: `+${friendBonus}%`,
      isActive: friendBonus > 0,
    },
    {
      key: 'bait',
      title: '룰렛 미끼',
      detail:
        baitBonus > 0
          ? `${baitName ?? '오늘'} 미끼 · 오늘 자정까지`
          : '룰렛을 돌려 미끼를 달 수 있어요',
      value: `+${baitBonus}%`,
      isActive: baitBonus > 0,
    },
    {
      key: 'hammock',
      title: '양동이 키우기',
      detail:
        status.hammockLevel > 0
          ? `${hammockName(status.hammockLevel)}${
              hammockRodBonus > 0 ? ` · 낚싯대 +${hammockRodBonus}% 함께` : ''
            }`
          : '광고를 보면 양동이가 커지고 낚싯대도 강화돼요',
      value: `용량 +${hammockBonus}%`,
      isActive: hammockBonus > 0,
    },
  ];
}

/**
 * 눈사람 친구 줄 설명: 함께 낚시 중이면 떠나는 시각 (온 지 24시간 뒤, 얼리면 더 늦다).
 * 떠나기 한 시간 전부터는 녹는 중이라고 알린다
 */
function friendDetail(status: FishingStatus, now: Date): string {
  const { otterFriendUntil, otterFriendMeltsAt } = status;
  if (otterFriendUntil === null) return '출석 7일마다 함께 낚시하러 와요';
  const leavesAt = formatFullAt(new Date(otterFriendUntil), now);
  const isMelting = otterFriendMeltsAt !== null && now.getTime() >= Date.parse(otterFriendMeltsAt);
  return isMelting ? `곧 녹아요 · ${leavesAt}까지` : `${leavesAt}까지 함께 낚시해요`;
}

/** 낚싯대 강화 줄 설명: 출석·퀴즈·광고 몫과 해먹 넓히기 몫을 나눠 보여준다 (둘을 더하면 낚싯대 값) */
function rodDetail(rodLevel: number, otherBonus: number, hammockBonus: number): string {
  if (rodLevel <= 0) return '출석하거나 광고를 보면 강화돼요';
  if (hammockBonus <= 0) return `오늘 ${rodLevel}단계 · 출석·퀴즈·광고로 강화`;
  if (otherBonus <= 0) return `오늘 ${rodLevel}단계 · 양동이 키우기 +${hammockBonus}%`;
  return `출석·퀴즈·광고 +${otherBonus}% · 양동이 키우기 +${hammockBonus}%`;
}
