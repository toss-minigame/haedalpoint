import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, IsNull, type Repository } from 'typeorm';
import { AttendanceLog } from './entities/attendance-log.entity.js';

export type CreateAttendanceLogData = Pick<
  AttendanceLog,
  'userId' | 'checkedDate' | 'streakDay' | 'rewardType' | 'rewardAmount' | 'cycleCompleted'
> &
  Partial<Pick<AttendanceLog, 'rewardAppliedAt'>>;

// 데이터 접근 계층: TypeORM 의존성은 이 계층 안에만 둡니다.
@Injectable()
export class AttendanceRepository {
  constructor(@InjectRepository(AttendanceLog) private readonly repo: Repository<AttendanceLog>) {}

  /** 최근 출석 로그 (checkedDate 내림차순) */
  findRecentByUserId(userId: string, limit: number): Promise<AttendanceLog[]> {
    return this.repo.find({
      where: { userId },
      order: { checkedDate: 'DESC' },
      take: limit,
    });
  }

  findByUserIdAndDate(userId: string, checkedDate: string): Promise<AttendanceLog | null> {
    return this.repo.findOneBy({ userId, checkedDate });
  }

  /**
   * (user_id, checked_date) 유니크 위반 시 pg 에러(code 23505)가 그대로 전파됨.
   * 보상 적용(낚시)과 한 트랜잭션으로 묶을 수 있도록 호출자의 EntityManager 를 받는다.
   */
  create(data: CreateAttendanceLogData, manager?: EntityManager): Promise<AttendanceLog> {
    const repo = manager ? manager.getRepository(AttendanceLog) : this.repo;
    return repo.save(repo.create(data));
  }

  /**
   * 광고 보너스 수령 기록. 아직 받지 않은 경우에만 반영되는 조건부 UPDATE (연타·동시 요청 방어)
   * @returns 반영됐으면 true
   */
  async claimAdBonus(logId: string, claimedAt: Date): Promise<boolean> {
    const result = await this.repo.update(
      { id: logId, adBonusClaimedAt: IsNull() },
      { adBonusClaimedAt: claimedAt },
    );
    return result.affected === 1;
  }
}
