import type { TossPointGrantStatus } from '@haedalpoint/shared';
import { Check, Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * 토스 포인트를 주는 이유. 이유마다 프로모션 코드가 다르다.
 * ATTENDANCE: 출석 1~6일차 (source_id = attendance_logs.id)
 * WAREHOUSE: 창고 물고기로 받기 (source_id = warehouse_ledger.id)
 */
export type TossPointGrantSource = 'ATTENDANCE' | 'WAREHOUSE';

// 토스 포인트 지급 한 건 (프로모션 API). docs/design/toss-point-grant.md
// users 와 TypeORM 관계를 걸지 않고 user_id 컬럼으로만 참조 (모듈 경계 유지)
// 같은 이유로 두 번 주지 않도록 (source, source_id) 를 유니크로 둔다.
@Entity('toss_point_grants')
@Unique('UQ_toss_point_grants_source', ['source', 'sourceId'])
@Check('CHK_toss_point_grants_amount', '"amount" > 0')
export class TossPointGrant extends BaseEntity {
  @Index('IDX_toss_point_grants_user_id')
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 32 })
  source: TossPointGrantSource;

  @Column({ type: 'uuid', name: 'source_id' })
  sourceId: string;

  // 지급할 토스 포인트 (원)
  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status: TossPointGrantStatus;

  // 지급 요청에 쓴 지급 키. 지급 요청 전에 먼저 저장해서, 요청 뒤 응답을 못 받아도 결과를 조회할 수 있게 한다
  @Column({ type: 'text', name: 'reward_key', nullable: true })
  rewardKey: string | null;

  // 마지막 실패의 오류 코드 (파트너 API errorCode 또는 서버 사유)
  @Column({ type: 'varchar', length: 64, name: 'last_error', nullable: true })
  lastError: string | null;

  @Column({ type: 'smallint', default: 0 })
  attempts: number;

  // 이 시각 이후에만 다시 시도한다. 시도를 시작할 때 미뤄 두므로 동시에 두 번 처리하지 않는다 (잠금 겸 재시도 간격)
  @Column({ type: 'timestamptz', name: 'next_attempt_at', nullable: true })
  nextAttemptAt: Date | null;

  @Column({ type: 'timestamptz', name: 'granted_at', nullable: true })
  grantedAt: Date | null;
}
