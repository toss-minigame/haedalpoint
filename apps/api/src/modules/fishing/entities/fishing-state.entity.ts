import { Check, Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { bigintNumberTransformer } from '../../../common/entities/bigint-number.transformer.js';

// 사용자당 한 행. users 와 TypeORM 관계를 걸지 않고 user_id 컬럼으로만 참조 (모듈 경계 유지)
// 해먹 수량은 settled_at 시점 값이다. 지금 수량은 lib/settle-hammock.ts 로 계산한다 (docs/design/fishing.md 3장).
// 강화·해달 친구는 유효 날짜(KST)가 오늘일 때만 적용되므로 자정 초기화 배치가 필요 없다.
@Entity('fishing_states')
@Unique('UQ_fishing_states_user_id', ['userId'])
@Check('CHK_fishing_states_hammock_milli_fish', '"hammock_milli_fish" >= 0')
@Check('CHK_fishing_states_warehouse_fish', '"warehouse_fish" >= 0')
@Check('CHK_fishing_states_rod_level', '"rod_level" >= 0')
@Check('CHK_fishing_states_otter_friend_count', '"otter_friend_count" >= 0')
@Check('CHK_fishing_states_hammock_level', '"hammock_level" >= 0')
export class FishingState extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  // 해먹의 물고기 (1/1000마리 단위)
  @Column({
    type: 'bigint',
    name: 'hammock_milli_fish',
    default: 0,
    transformer: bigintNumberTransformer,
  })
  hammockMilliFish: number;

  // 마지막으로 해먹을 정산한 시각
  @Column({ type: 'timestamptz', name: 'settled_at' })
  settledAt: Date;

  @Column({ type: 'smallint', name: 'rod_level', default: 0 })
  rodLevel: number;

  // rod_level 이 유효한 KST 날짜 'YYYY-MM-DD' (pg driver 는 date 를 문자열로 반환)
  @Column({ type: 'date', name: 'rod_level_date', nullable: true })
  rodLevelDate: string | null;

  // 해달 친구가 오는 KST 날짜
  @Column({ type: 'date', name: 'otter_friend_date', nullable: true })
  otterFriendDate: string | null;

  // otter_friend_date 에 함께 낚시하는 해달 친구 수
  @Column({ type: 'smallint', name: 'otter_friend_count', default: 0 })
  otterFriendCount: number;

  // 광고로 넓힌 해먹 단계와 그 단계가 유효한 KST 날짜
  @Column({ type: 'smallint', name: 'hammock_level', default: 0 })
  hammockLevel: number;

  @Column({ type: 'date', name: 'hammock_level_date', nullable: true })
  hammockLevelDate: string | null;

  // 마지막으로 광고를 보고 해먹을 넓힌 시각 (쿨타임 계산용)
  @Column({ type: 'timestamptz', name: 'ad_hammock_expanded_at', nullable: true })
  adHammockExpandedAt: Date | null;

  // 마지막으로 광고를 보고 낚싯대를 강화한 시각 (쿨타임 계산용)
  @Column({ type: 'timestamptz', name: 'ad_rod_enhanced_at', nullable: true })
  adRodEnhancedAt: Date | null;

  // 창고의 물고기 (영속 재화)
  @Column({
    type: 'bigint',
    name: 'warehouse_fish',
    default: 0,
    transformer: bigintNumberTransformer,
  })
  warehouseFish: number;
}
