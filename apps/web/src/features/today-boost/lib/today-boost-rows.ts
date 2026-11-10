import { type FishingStatus, hammockName } from '@/entities/fishing';

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
 * 해달 친구 몫은 응답에 따로 없어서 전체 속도 보너스에서 낚싯대·미끼 몫을 뺀다.
 * baitName 은 오늘 단 미끼 이름 (룰렛 정보를 아직 못 받았으면 null)
 */
export function todayBoostRows(status: FishingStatus, baitName: string | null): TodayBoostRow[] {
  const rodBonus = status.rodSpeedBonusPercent;
  const baitBonus = status.baitSpeedBonusPercent;
  const friendBonus = todaySpeedBonusPercent(status) - rodBonus - baitBonus;
  const hammockBonus = status.hammockLevelBonusPercent;

  return [
    {
      key: 'rod',
      title: '낚싯대 강화',
      detail:
        status.rodLevel > 0
          ? `오늘 ${status.rodLevel}단계 · 출석과 광고로 강화`
          : '출석하거나 광고를 보면 강화돼요',
      value: `+${rodBonus}%`,
      isActive: rodBonus > 0,
    },
    {
      key: 'friend',
      title: '해달 친구',
      detail:
        status.otterFriendCount > 0
          ? `오늘 함께 낚시하는 친구 ${status.otterFriendCount}명`
          : '7일 연속 출석하면 함께 낚시해요',
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
      title: '해먹 넓히기',
      detail:
        status.hammockLevel > 0
          ? `${status.hammockLevel}단계 · ${hammockName(status.hammockLevel)}`
          : '광고를 보면 해먹이 넓어져요',
      value: `용량 +${hammockBonus}%`,
      isActive: hammockBonus > 0,
    },
  ];
}
