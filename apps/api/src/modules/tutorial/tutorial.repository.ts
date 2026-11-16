import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { UserTutorial } from './entities/user-tutorial.entity.js';

export type UserTutorialChanges = Partial<
  Pick<
    UserTutorial,
    | 'rodRewardedAt'
    | 'hammockRewardedAt'
    | 'quizRewardedAt'
    | 'giftRewardedAt'
    | 'completedAt'
    | 'skippedAt'
  >
>;

// 데이터 접근 계층: TypeORM 의존성은 이 계층 안에만 둡니다.
// 보상을 주는 작업은 서비스가 연 트랜잭션(EntityManager) 안에서 행을 잠그고 처리한다.
@Injectable()
export class TutorialRepository {
  constructor(@InjectRepository(UserTutorial) private readonly repo: Repository<UserTutorial>) {}

  findByUserId(userId: string): Promise<UserTutorial | null> {
    return this.repo.findOneBy({ userId });
  }

  /** 트랜잭션 안에서 행을 잠그고 돌려준다 (SELECT … FOR UPDATE). 없으면 먼저 만든다 */
  async lockOrCreate(manager: EntityManager, userId: string): Promise<UserTutorial> {
    // 동시에 첫 요청이 들어와도 한 행만 생기도록 user_id 유니크 충돌은 무시한다
    await manager
      .createQueryBuilder()
      .insert()
      .into(UserTutorial)
      .values({ userId })
      .orIgnore()
      .execute();
    return manager.getRepository(UserTutorial).findOneOrFail({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async update(manager: EntityManager, id: string, changes: UserTutorialChanges): Promise<void> {
    await manager.getRepository(UserTutorial).update({ id }, changes);
  }
}
