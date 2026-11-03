import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { FishingState } from './entities/fishing-state.entity.js';
import { WarehouseLedger, type WarehouseLedgerType } from './entities/warehouse-ledger.entity.js';

export type FishingStateChanges = Partial<
  Pick<
    FishingState,
    | 'hammockMilliFish'
    | 'settledAt'
    | 'rodLevel'
    | 'rodLevelDate'
    | 'otterFriendDate'
    | 'otterFriendCount'
    | 'hammockExpandedDate'
    | 'adRodEnhancedAt'
    | 'warehouseFish'
  >
>;

export interface WarehouseLedgerEntry {
  userId: string;
  type: WarehouseLedgerType;
  amount: number;
}

// 데이터 접근 계층: TypeORM 의존성은 이 계층 안에만 둡니다.
// 해먹이 바뀌는 작업은 서비스가 연 트랜잭션(EntityManager) 안에서 행을 잠그고 처리한다.
@Injectable()
export class FishingRepository {
  constructor(
    @InjectRepository(FishingState) private readonly stateRepo: Repository<FishingState>,
  ) {}

  /** 조회용. 처음 들어온 사용자면 지금부터 낚시를 시작하는 행을 만든다 */
  async findOrCreate(userId: string, now: Date): Promise<FishingState> {
    await this.insertIfMissing(this.stateRepo.manager, userId, now);
    return this.stateRepo.findOneByOrFail({ userId });
  }

  /** 트랜잭션 안에서 행을 잠그고 돌려준다 (SELECT … FOR UPDATE). 없으면 먼저 만든다 */
  async lockOrCreate(manager: EntityManager, userId: string, now: Date): Promise<FishingState> {
    await this.insertIfMissing(manager, userId, now);
    return manager.getRepository(FishingState).findOneOrFail({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async updateState(
    manager: EntityManager,
    id: string,
    changes: FishingStateChanges,
  ): Promise<void> {
    await manager.getRepository(FishingState).update({ id }, changes);
  }

  async addLedgerEntry(manager: EntityManager, entry: WarehouseLedgerEntry): Promise<void> {
    const repo = manager.getRepository(WarehouseLedger);
    await repo.insert(repo.create(entry));
  }

  /** 동시에 첫 요청이 들어와도 한 행만 생기도록 user_id 유니크 충돌은 무시한다 */
  private async insertIfMissing(manager: EntityManager, userId: string, now: Date): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(FishingState)
      .values({ userId, settledAt: now })
      .orIgnore()
      .execute();
  }
}
