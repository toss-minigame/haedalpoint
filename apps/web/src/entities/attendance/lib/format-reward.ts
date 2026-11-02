import type { AttendanceReward } from '../model/types';

// ENHANCE_BONUS 의 amount 는 낚싯대 강화 단계 수다 (ADR-0007)
export function formatReward(reward: AttendanceReward): string {
  if (reward.type === 'OTTER_FRIEND') return '해달 친구';
  return reward.amount > 1 ? `낚싯대 ${reward.amount}단계 강화` : '낚싯대 강화';
}
