import type { AttendanceReward } from '../model/types';

// 출석 보상 (누적 출석 일차로 정해진다)
// - TOSS_POINT: amount 원 (서버가 프로모션으로 지급)
// - OTTER_FRIEND: 해달 친구 (24시간)
// - ENHANCE_BONUS: amount 는 낚싯대 강화 단계 수 (그날 자정까지)

/** 출석 보상 이름 (예: 토스 포인트 1원, 해달 친구, 낚싯대 10단계 강화) */
export function formatReward(reward: AttendanceReward): string {
  switch (reward.type) {
    case 'TOSS_POINT':
      return `토스 포인트 ${reward.amount}원`;
    case 'OTTER_FRIEND':
      return '눈사람 친구';
    case 'ENHANCE_BONUS':
      return reward.amount > 1 ? `낚싯대 ${reward.amount}단계 강화` : '낚싯대 강화';
  }
}

/** 출석 칸 동그라미에 들어가는 짧은 보상 이름 (예: 1원, 친구, 강화) */
export function formatRewardShort(reward: AttendanceReward): string {
  switch (reward.type) {
    case 'TOSS_POINT':
      return `${reward.amount}원`;
    case 'OTTER_FRIEND':
      return '눈사람';
    case 'ENHANCE_BONUS':
      return '강화';
  }
}
