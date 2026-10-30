import type { AttendanceReward } from '../model/types';

export function formatReward(reward: AttendanceReward): string {
  return reward.type === 'OTTER_FRIEND' ? '해달 친구' : `강화 보너스 +${reward.amount}`;
}
