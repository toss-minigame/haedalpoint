import type {
  AttendanceReward,
  AttendanceStatusResponse,
  CheckInResponse,
  TossPointGrantStatus,
} from '@haedalpoint/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { isUniqueViolation } from '../../common/utils/is-unique-violation.js';
import { toKstDateString } from '../../common/utils/kst-date.js';
import { FishingService } from '../fishing/fishing.service.js';
import { TossPointService } from '../toss-point/toss-point.service.js';
import { UsersService } from '../users/users.service.js';
import { AttendanceRepository } from './attendance.repository.js';
import type { AttendanceLog } from './entities/attendance-log.entity.js';
import { FIRST_WEEK_DAYS, rewardForDay } from './lib/attendance-reward.policy.js';
import { buildAttendanceStatus } from './lib/attendance-status.js';

const ALREADY_CHECKED_IN = '이미 오늘 출석했습니다';

// 비즈니스 로직 계층 (docs/design/attendance-check.md)
@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly usersService: UsersService,
    private readonly fishingService: FishingService,
    private readonly tossPointService: TossPointService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 출석. 클라이언트가 보상형 광고의 `userEarnedReward` 를 받은 뒤에만 호출한다.
   * 출석 기록과 보상 적용(토스 포인트 지급 건·해달 친구·낚싯대 강화)을 한 트랜잭션으로 처리하고,
   * 토스 포인트는 커밋한 뒤 지급한다 (지급이 늦어지거나 실패하면 출석 현황 조회 때 다시 시도).
   */
  async checkIn(userId: string): Promise<CheckInResponse> {
    await this.usersService.findById(userId);
    // 출석 날짜와 보상(낚시) 적용 날짜가 자정 경계에서 어긋나지 않도록 한 시각을 함께 쓴다
    const now = new Date();
    const today = toKstDateString(now);

    const latest = await this.attendanceRepository.findLatestByUserId(userId);
    if (latest?.checkedDate === today) throw new ConflictException(ALREADY_CHECKED_IN);

    const attendanceDay = (await this.attendanceRepository.countByUserId(userId)) + 1;
    const reward = rewardForDay(attendanceDay);

    let grantId: string | null = null;
    try {
      // 조회 → insert 사이 레이스(더블 탭)는 (user_id, checked_date)·(user_id, attendance_day) 유니크 제약이 막는다
      grantId = await this.dataSource.transaction(async (manager) => {
        const log = await this.attendanceRepository.create(
          {
            userId,
            checkedDate: today,
            attendanceDay,
            rewardType: reward.type,
            rewardAmount: reward.amount,
            rewardAppliedAt: now,
          },
          manager,
        );
        return this.applyReward(log, reward, manager, now);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(ALREADY_CHECKED_IN);
      throw error;
    }

    const tossPointGrant: TossPointGrantStatus | null = grantId
      ? await this.tossPointService.settle(grantId)
      : null;
    return { checkedDate: today, attendanceDay, reward, tossPointGrant };
  }

  /** 출석 현황. 아직 지급되지 않은 출석 토스 포인트가 있으면 먼저 다시 지급해 본다 */
  async getStatus(userId: string): Promise<AttendanceStatusResponse> {
    await this.usersService.findById(userId);
    await this.tossPointService.settlePending(userId);
    const today = toKstDateString(new Date());
    const [attendanceDays, latest, firstWeekLogs, pendingTossPoints] = await Promise.all([
      this.attendanceRepository.countByUserId(userId),
      this.attendanceRepository.findLatestByUserId(userId),
      this.attendanceRepository.findFirstDays(userId, FIRST_WEEK_DAYS),
      this.tossPointService.pendingAmount(userId),
    ]);
    return buildAttendanceStatus({
      today,
      attendanceDays,
      latestCheckedDate: latest?.checkedDate ?? null,
      firstWeekLogs,
      pendingTossPoints,
    });
  }

  /**
   * TOSS_POINT → 토스 포인트 지급 건 생성 (지급 건 id 반환),
   * OTTER_FRIEND → 24시간 해달 친구, ENHANCE_BONUS → 그날 낚싯대 강화
   */
  private async applyReward(
    log: AttendanceLog,
    reward: AttendanceReward,
    manager: EntityManager,
    now: Date,
  ): Promise<string | null> {
    if (reward.type === 'TOSS_POINT') {
      const grant = await this.tossPointService.createGrant(manager, {
        userId: log.userId,
        source: 'ATTENDANCE',
        sourceId: log.id,
        amount: reward.amount,
      });
      return grant.id;
    }
    if (reward.type === 'OTTER_FRIEND') {
      await this.fishingService.summonOtterFriend(log.userId, manager, now);
      return null;
    }
    await this.fishingService.enhanceRod(log.userId, reward.amount, manager, now);
    return null;
  }
}
