import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceLog } from './entities/attendance-log.entity';

export type CreateAttendanceLogData = Pick<
  AttendanceLog,
  'userId' | 'checkedDate' | 'streakDay' | 'rewardType' | 'rewardAmount' | 'cycleCompleted'
>;

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

  /** (user_id, checked_date) 유니크 위반 시 pg 에러(code 23505)가 그대로 전파됨 */
  create(data: CreateAttendanceLogData): Promise<AttendanceLog> {
    return this.repo.save(this.repo.create(data));
  }
}
