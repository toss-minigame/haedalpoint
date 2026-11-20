import type { OutfitCode } from '@haedalpoint/shared';
import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

// 사용자가 연 소품마다 한 행. 행이 있으면 연 소품이고, equipped 가 지금 입고 있는지다.
// users 와 TypeORM 관계를 걸지 않고 user_id 컬럼으로만 참조 (모듈 경계 유지)
@Entity('otter_outfits')
@Unique('UQ_otter_outfits_user_id_outfit_code', ['userId', 'outfitCode'])
export class OtterOutfit extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  // common/globals/outfit.policy.ts 의 소품 코드
  @Column({ type: 'varchar', length: 32, name: 'outfit_code' })
  outfitCode: OutfitCode;

  @Column({ type: 'boolean', default: false })
  equipped: boolean;
}
