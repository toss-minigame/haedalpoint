import { Check, Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

// 한 행 = 사용자가 그날(KST) 돌린 룰렛 결과. users 와 TypeORM 관계를 걸지 않고 user_id 컬럼으로만 참조 (모듈 경계 유지)
// (user_id, spin_date) 유니크 제약이 하루 한 번을 보장한다 (연타·동시 요청 포함).
//   돌리기 → 행 생성 (applied_at = null) → (광고 시청) applied_at 기록 + 그날 자정까지 낚시 속도 보너스
// 생선 이름과 보너스는 돌린 시점 값으로 저장한다 (정책이 바뀌어도 지난 결과는 그대로).
@Entity('roulette_spins')
@Unique('UQ_roulette_spins_user_id_spin_date', ['userId', 'spinDate'])
@Check('CHK_roulette_spins_speed_bonus_percent', '"speed_bonus_percent" > 0')
export class RouletteSpin extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  // KST 기준 'YYYY-MM-DD' (pg driver 는 date 를 문자열로 반환)
  @Column({ type: 'date', name: 'spin_date' })
  spinDate: string;

  @Column({ type: 'varchar', length: 32, name: 'fish_code' })
  fishCode: string;

  @Column({ type: 'varchar', length: 16, name: 'fish_name' })
  fishName: string;

  // 적용하면 오르는 낚시 속도 (기본 속도 대비 %)
  @Column({ type: 'smallint', name: 'speed_bonus_percent' })
  speedBonusPercent: number;

  // 광고를 보고 적용한 시각. 적용 전이면 null
  @Column({ type: 'timestamptz', name: 'applied_at', nullable: true })
  appliedAt: Date | null;
}
