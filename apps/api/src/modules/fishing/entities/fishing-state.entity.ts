import { Check, Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { bigintNumberTransformer } from '../../../common/entities/bigint-number.transformer.js';

// 사용자당 한 행. users 와 TypeORM 관계를 걸지 않고 user_id 컬럼으로만 참조 (모듈 경계 유지)
// 해먹 수량은 settled_at 시점 값이다. 지금 수량은 lib/settle-hammock.ts 로 계산한다 (docs/design/fishing.md 3장).
// 강화·해먹 넓히기는 유효 날짜(KST)가 오늘일 때만, 해달 친구는 떠나는 시각 전까지만 적용되므로 초기화 배치가 필요 없다.
@Entity('fishing_states')
@Unique('UQ_fishing_states_user_id', ['userId'])
@Check('CHK_fishing_states_hammock_milli_fish', '"hammock_milli_fish" >= 0')
@Check('CHK_fishing_states_warehouse_milli_fish', '"warehouse_milli_fish" >= 0')
@Check('CHK_fishing_states_rod_level', '"rod_level" >= 0')
@Check('CHK_fishing_states_hammock_level', '"hammock_level" >= 0')
@Check('CHK_fishing_states_bait_bonus_percent', '"bait_bonus_percent" >= 0')
@Check('CHK_fishing_states_overflow_milli_fish', '"overflow_milli_fish" >= 0')
@Check('CHK_fishing_states_catch_back_milli_fish', '"catch_back_milli_fish" >= 0')
@Check('CHK_fishing_states_catch_back_count', '"catch_back_count" >= 0')
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

  // 해달 친구가 떠나는 시각 (온 시각 + 24시간). 이 시각 전까지 함께 낚시한다
  @Column({ type: 'timestamptz', name: 'otter_friend_until', nullable: true })
  otterFriendUntil: Date | null;

  // 이번에 온 해달 친구를 이미 얼렸는지 (광고 보고 6시간 연장, 올 때마다 한 번). 친구가 새로 오면 false 로 되돌린다
  @Column({ type: 'boolean', name: 'otter_friend_frozen', default: false })
  otterFriendFrozen: boolean;

  // 광고로 넓힌 해먹 단계와 그 단계가 유효한 KST 날짜
  @Column({ type: 'smallint', name: 'hammock_level', default: 0 })
  hammockLevel: number;

  @Column({ type: 'date', name: 'hammock_level_date', nullable: true })
  hammockLevelDate: string | null;

  // 룰렛 미끼로 오른 낚시 속도(%)와 그 효과가 유효한 KST 날짜 (modules/roulette)
  @Column({ type: 'smallint', name: 'bait_bonus_percent', default: 0 })
  baitBonusPercent: number;

  @Column({ type: 'date', name: 'bait_date', nullable: true })
  baitDate: string | null;

  // 마지막 저장 이후 해먹이 가득 차서 버려진 물고기 (1/1000마리 단위). 서버만 쓰고 응답에는 내보내지 않는다
  @Column({
    type: 'bigint',
    name: 'overflow_milli_fish',
    default: 0,
    transformer: bigintNumberTransformer,
  })
  overflowMilliFish: number;

  // 저장할 때 계산해 둔, 광고를 보면 다시 잡아올 물고기. 다음 저장 때 새로 계산한다
  @Column({
    type: 'bigint',
    name: 'catch_back_milli_fish',
    default: 0,
    transformer: bigintNumberTransformer,
  })
  catchBackMilliFish: number;

  // 다시 잡아오기를 한 횟수와 그 KST 날짜 (하루 횟수 제한용)
  @Column({ type: 'smallint', name: 'catch_back_count', default: 0 })
  catchBackCount: number;

  @Column({ type: 'date', name: 'catch_back_date', nullable: true })
  catchBackDate: string | null;

  // 마지막으로 광고를 보고 해먹을 넓힌 시각 (쿨타임 계산용)
  @Column({ type: 'timestamptz', name: 'ad_hammock_expanded_at', nullable: true })
  adHammockExpandedAt: Date | null;

  // 마지막으로 광고를 보고 낚싯대를 강화한 시각 (쿨타임 계산용)
  @Column({ type: 'timestamptz', name: 'ad_rod_enhanced_at', nullable: true })
  adRodEnhancedAt: Date | null;

  // 창고의 물고기 (영속 재화, 1/1000마리 단위)
  @Column({
    type: 'bigint',
    name: 'warehouse_milli_fish',
    default: 0,
    transformer: bigintNumberTransformer,
  })
  warehouseMilliFish: number;
}
