import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { TossPointGrant } from './entities/toss-point-grant.entity.js';

export type CreateTossPointGrantData = Pick<
  TossPointGrant,
  'userId' | 'source' | 'sourceId' | 'amount'
>;

export type TossPointGrantChanges = Partial<
  Pick<TossPointGrant, 'status' | 'rewardKey' | 'lastError' | 'attempts' | 'grantedAt'>
>;

// 데이터 접근 계층: TypeORM 의존성은 이 계층 안에만 둡니다.
@Injectable()
export class TossPointRepository {
  constructor(
    @InjectRepository(TossPointGrant) private readonly repo: Repository<TossPointGrant>,
  ) {}

  /** 보상 기록과 한 트랜잭션으로 묶을 수 있도록 호출자의 EntityManager 를 받는다 */
  async create(manager: EntityManager, data: CreateTossPointGrantData): Promise<TossPointGrant> {
    const repo = manager.getRepository(TossPointGrant);
    return repo.save(repo.create(data));
  }

  /** 아직 지급을 확인하지 못한 건 (오래된 순) */
  findPendingByUserId(userId: string): Promise<TossPointGrant[]> {
    return this.repo.find({
      where: { userId, status: 'PENDING' },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 지금 시도할 수 있는 PENDING 건이면 다음 시도 시각을 retryAt 으로 미루고 그 행을 돌려준다.
   * 조건부 UPDATE 라 동시에 들어온 요청 중 한 곳만 처리한다. 처리할 수 없으면 null.
   */
  async claim(id: string, now: Date, retryAt: Date): Promise<TossPointGrant | null> {
    const result = await this.repo
      .createQueryBuilder()
      .update(TossPointGrant)
      .set({ nextAttemptAt: retryAt })
      .where('id = :id', { id })
      .andWhere("status = 'PENDING'")
      .andWhere('(next_attempt_at IS NULL OR next_attempt_at <= :now)', { now })
      .returning('*')
      .execute();
    if (result.affected !== 1) return null;
    return this.repo.findOneBy({ id });
  }

  async update(id: string, changes: TossPointGrantChanges): Promise<void> {
    await this.repo.update({ id }, changes);
  }
}
