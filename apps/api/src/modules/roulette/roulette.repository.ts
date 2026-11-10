import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, IsNull, type Repository } from 'typeorm';
import { RouletteSpin } from './entities/roulette-spin.entity.js';

export type CreateRouletteSpinData = Pick<
  RouletteSpin,
  'userId' | 'spinDate' | 'fishCode' | 'fishName' | 'speedBonusPercent'
>;

// 데이터 접근 계층: TypeORM 의존성은 이 계층 안에만 둡니다.
// 상태 변경은 "현재 상태 조건부 UPDATE" 로 처리해 연타·동시 요청에도 한 번만 반영되게 한다.
@Injectable()
export class RouletteRepository {
  constructor(
    @InjectRepository(RouletteSpin) private readonly spinRepo: Repository<RouletteSpin>,
  ) {}

  findSpin(userId: string, spinDate: string): Promise<RouletteSpin | null> {
    return this.spinRepo.findOneBy({ userId, spinDate });
  }

  /** 오늘 결과 저장. (user_id, spin_date) 유니크 위반 시 pg 에러(code 23505)가 그대로 전파됨 */
  createSpin(data: CreateRouletteSpinData): Promise<RouletteSpin> {
    return this.spinRepo.save(this.spinRepo.create({ ...data, appliedAt: null }));
  }

  /**
   * 적용 기록: 아직 적용하지 않은 결과에만 반영한다.
   * 낚시 속도 보너스와 한 트랜잭션으로 묶을 수 있도록 호출자의 EntityManager 를 받는다.
   * @returns 반영됐으면 true
   */
  async markApplied(spinId: string, appliedAt: Date, manager: EntityManager): Promise<boolean> {
    const result = await manager
      .getRepository(RouletteSpin)
      .update({ id: spinId, appliedAt: IsNull() }, { appliedAt });
    return result.affected === 1;
  }
}
