import type { AttendanceRewardType } from '@haedalpoint/shared';
import { Check, Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// users 와 TypeORM 관계를 걸지 않고 userId 컬럼으로만 참조 (모듈 경계 유지)
@Entity('attendance_logs')
@Unique('UQ_attendance_logs_user_id_checked_date', ['userId', 'checkedDate'])
@Check('CHK_attendance_logs_streak_day', '"streak_day" BETWEEN 1 AND 7')
export class AttendanceLog extends BaseEntity {
  @Index('IDX_attendance_logs_user_id')
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  // KST 기준 'YYYY-MM-DD' (pg driver 는 date 를 문자열로 반환)
  @Column({ type: 'date', name: 'checked_date' })
  checkedDate: string;

  @Column({ type: 'smallint', name: 'streak_day' })
  streakDay: number;

  @Column({ type: 'varchar', length: 32, name: 'reward_type' })
  rewardType: AttendanceRewardType;

  @Column({ type: 'int', name: 'reward_amount' })
  rewardAmount: number;

  @Column({ type: 'boolean', name: 'cycle_completed', default: false })
  cycleCompleted: boolean;

  // 강화 모듈이 실제로 보너스를 적립한 시각 (TODO: enhancement 모듈 연동 시 기록)
  @Column({ type: 'timestamptz', name: 'reward_applied_at', nullable: true })
  rewardAppliedAt: Date | null;

  // "광고 보고 2배" 수령 시각 (TODO: 보상형 광고 연동 시 기록)
  @Column({ type: 'timestamptz', name: 'ad_bonus_claimed_at', nullable: true })
  adBonusClaimedAt: Date | null;
}
