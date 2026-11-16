import type { AttendanceRewardType } from '@haedalpoint/shared';
import { Check, Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

// users 와 TypeORM 관계를 걸지 않고 userId 컬럼으로만 참조 (모듈 경계 유지)
// 출석은 보상형 광고를 끝까지 본 뒤에 기록한다 (docs/design/attendance-check.md)
@Entity('attendance_logs')
@Unique('UQ_attendance_logs_user_id_checked_date', ['userId', 'checkedDate'])
@Unique('UQ_attendance_logs_user_id_attendance_day', ['userId', 'attendanceDay'])
@Check('CHK_attendance_logs_attendance_day', '"attendance_day" >= 1')
export class AttendanceLog extends BaseEntity {
  @Index('IDX_attendance_logs_user_id')
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  // KST 기준 'YYYY-MM-DD' (pg driver 는 date 를 문자열로 반환)
  @Column({ type: 'date', name: 'checked_date' })
  checkedDate: string;

  // 누적 출석 일차 (1부터). 보상은 이 일차로 정한다
  @Column({ type: 'smallint', name: 'attendance_day' })
  attendanceDay: number;

  @Column({ type: 'varchar', length: 32, name: 'reward_type' })
  rewardType: AttendanceRewardType;

  @Column({ type: 'int', name: 'reward_amount' })
  rewardAmount: number;

  // 보상(토스 포인트 지급 건·해달 친구·낚싯대 강화)을 적용한 시각. 출석 기록과 같은 트랜잭션에서 기록
  @Column({ type: 'timestamptz', name: 'reward_applied_at', nullable: true })
  rewardAppliedAt: Date | null;
}
