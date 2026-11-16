import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, LessThanOrEqual, type Repository } from 'typeorm';
import { AttendanceLog } from './entities/attendance-log.entity.js';

export type CreateAttendanceLogData = Pick<
  AttendanceLog,
  'userId' | 'checkedDate' | 'attendanceDay' | 'rewardType' | 'rewardAmount'
> &
  Partial<Pick<AttendanceLog, 'rewardAppliedAt'>>;

// 데이터 접근 계층: TypeORM 의존성은 이 계층 안에만 둡니다.
@Injectable()
export class AttendanceRepository {
  constructor(@InjectRepository(AttendanceLog) private readonly repo: Repository<AttendanceLog>) {}

  /** 가장 최근 출석 로그 */
  findLatestByUserId(userId: string): Promise<AttendanceLog | null> {
    return this.repo.findOne({ where: { userId }, order: { checkedDate: 'DESC' } });
  }

  /** 누적 출석 일수 */
  countByUserId(userId: string): Promise<number> {
    return this.repo.countBy({ userId });
  }

  /** 1~lastDay 일차 출석 로그 (일차 오름차순) */
  findFirstDays(userId: string, lastDay: number): Promise<AttendanceLog[]> {
    return this.repo.find({
      where: { userId, attendanceDay: LessThanOrEqual(lastDay) },
      order: { attendanceDay: 'ASC' },
    });
  }

  /**
   * (user_id, checked_date)·(user_id, attendance_day) 유니크 위반 시 pg 에러(code 23505)가 그대로 전파됨.
   * 보상 적용과 한 트랜잭션으로 묶을 수 있도록 호출자의 EntityManager 를 받는다.
   */
  create(data: CreateAttendanceLogData, manager?: EntityManager): Promise<AttendanceLog> {
    const repo = manager ? manager.getRepository(AttendanceLog) : this.repo;
    return repo.save(repo.create(data));
  }
}
