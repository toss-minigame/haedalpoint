import { Check, Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { bigintNumberTransformer } from '../../../common/entities/bigint-number.transformer.js';

// STORE: 해먹 → 창고 저장. (후속) CONVERT: 창고 → 토스 포인트 전환
export type WarehouseLedgerType = 'STORE';

// 창고 적립·차감 이력. 행을 고치지 않고 쌓기만 한다.
// STORE 합계가 매월 콘솔에 보고할 물고기 발행 총액이다 (ADR-0007).
@Entity('warehouse_ledger')
@Check('CHK_warehouse_ledger_amount', '"amount" > 0')
export class WarehouseLedger extends BaseEntity {
  @Index('IDX_warehouse_ledger_user_id')
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 16 })
  type: WarehouseLedgerType;

  @Column({ type: 'bigint', transformer: bigintNumberTransformer })
  amount: number;
}
