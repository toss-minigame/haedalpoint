import type { OutfitCode } from '@haedalpoint/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, In, Not, type Repository } from 'typeorm';
import { OtterOutfit } from './entities/otter-outfit.entity.js';

// 데이터 접근 계층: TypeORM 의존성은 이 계층 안에만 둡니다.
@Injectable()
export class OutfitRepository {
  constructor(@InjectRepository(OtterOutfit) private readonly repo: Repository<OtterOutfit>) {}

  /** 사용자가 연 소품 (연 순서). 트랜잭션 안이면 manager 를 넘긴다 */
  findByUserId(userId: string, manager?: EntityManager): Promise<OtterOutfit[]> {
    const repo = manager ? manager.getRepository(OtterOutfit) : this.repo;
    return repo.find({ where: { userId }, order: { createdAt: 'ASC', id: 'ASC' } });
  }

  /** 연 소품을 기록한다. 이미 열었으면 (user_id, outfit_code) 유니크 위반(23505)이 그대로 전파된다 */
  async addOwned(manager: EntityManager, userId: string, outfitCode: OutfitCode): Promise<void> {
    const repo = manager.getRepository(OtterOutfit);
    await repo.insert(repo.create({ userId, outfitCode }));
  }

  /** 입은 소품을 codes 로 맞춘다 (나머지는 벗는다) */
  async setEquipped(
    manager: EntityManager,
    userId: string,
    codes: readonly OutfitCode[],
  ): Promise<void> {
    const repo = manager.getRepository(OtterOutfit);
    await repo.update(
      { userId, equipped: true, ...(codes.length > 0 && { outfitCode: Not(In(codes)) }) },
      { equipped: false },
    );
    if (codes.length > 0) {
      await repo.update({ userId, outfitCode: In(codes) }, { equipped: true });
    }
  }
}
