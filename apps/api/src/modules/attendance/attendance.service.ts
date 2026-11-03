import type {
  AdBonusResponse,
  AttendanceReward,
  AttendanceStatusResponse,
  CheckInResponse,
} from '@haedalpoint/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { isUniqueViolation } from '../../common/utils/is-unique-violation.js';
import { toKstDateString } from '../../common/utils/kst-date.js';
import { FishingService } from '../fishing/fishing.service.js';
import { UsersService } from '../users/users.service.js';
import { AttendanceRepository } from './attendance.repository.js';
import { ATTENDANCE_CYCLE_DAYS, AttendanceRewardPolicy } from './lib/attendance-reward.policy.js';
import { buildAttendanceStatus } from './lib/attendance-status.js';

const ALREADY_CHECKED_IN = '이미 오늘 출석했습니다';
const AD_BONUS_ALREADY_CLAIMED = '이미 광고 보너스를 받았습니다';

// 비즈니스 로직 계층
@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly usersService: UsersService,
    private readonly fishingService: FishingService,
    private readonly dataSource: DataSource,
  ) {}

  async checkIn(userId: string): Promise<CheckInResponse> {
    await this.usersService.findById(userId);
    // 출석 날짜와 보상(낚시) 적용 날짜가 자정 경계에서 어긋나지 않도록 한 시각을 함께 쓴다
    const now = new Date();
    const today = toKstDateString(now);

    const [latest] = await this.attendanceRepository.findRecentByUserId(userId, 1);
    if (latest?.checkedDate === today) throw new ConflictException(ALREADY_CHECKED_IN);

    const streakDay = AttendanceRewardPolicy.streakDayOn(today, latest ?? null);
    const reward = AttendanceRewardPolicy.rewardFor(streakDay);
    const cycleCompleted = AttendanceRewardPolicy.isCycleCompleted(streakDay);

    try {
      // 출석 기록과 보상 적용(낚싯대 강화·해달 친구)을 한 트랜잭션으로 처리한다.
      // 조회 → insert 사이 레이스(더블 탭)는 (user_id, checked_date) 유니크 제약이 막는다
      await this.dataSource.transaction(async (manager) => {
        await this.attendanceRepository.create(
          {
            userId,
            checkedDate: today,
            streakDay,
            rewardType: reward.type,
            rewardAmount: reward.amount,
            cycleCompleted,
            rewardAppliedAt: now,
          },
          manager,
        );
        await this.applyReward(userId, reward, manager, now);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(ALREADY_CHECKED_IN);
      throw error;
    }

    return { checkedDate: today, streakDay, reward, cycleCompleted };
  }

  async getStatus(userId: string): Promise<AttendanceStatusResponse> {
    await this.usersService.findById(userId);
    const today = toKstDateString(new Date());
    const recentLogs = await this.attendanceRepository.findRecentByUserId(
      userId,
      ATTENDANCE_CYCLE_DAYS,
    );
    return buildAttendanceStatus(today, recentLogs);
  }

  /** ENHANCE_BONUS → 그날 낚싯대 강화, OTTER_FRIEND → 그날 자정까지 해달 친구 (ADR-0007) */
  private async applyReward(
    userId: string,
    reward: AttendanceReward,
    manager: EntityManager,
    now: Date,
  ): Promise<void> {
    if (reward.type === 'OTTER_FRIEND') {
      await this.fishingService.summonOtterFriend(userId, manager, now);
      return;
    }
    await this.fishingService.enhanceRod(userId, reward.amount, manager, now);
  }

  /**
   * "광고 보고 2배 받기": 클라이언트가 보상형 광고의 `userEarnedReward` 를 받은 뒤에만 호출한다.
   * 오늘 출석 보상과 같은 종류·수량을 한 번 더 적용한다 (강화 +N단계, 7일차는 해달 친구 한 명 더).
   * 하루 1회이며, 조건부 UPDATE 로 연타·동시 요청에도 한 번만 반영된다.
   * 수령 기록과 보상 적용은 한 트랜잭션이라, 적용이 실패하면 수령 기록도 남지 않아 다시 받을 수 있다.
   */
  async claimAdBonus(userId: string): Promise<AdBonusResponse> {
    await this.usersService.findById(userId);
    // 수령 기록과 보상 적용 날짜가 자정 경계에서 어긋나지 않도록 한 시각을 함께 쓴다
    const now = new Date();
    const today = toKstDateString(now);

    const todayLog = await this.attendanceRepository.findByUserIdAndDate(userId, today);
    if (!todayLog) throw new NotFoundException('오늘 출석 기록이 없습니다');
    if (todayLog.adBonusClaimedAt) throw new ConflictException(AD_BONUS_ALREADY_CLAIMED);

    const bonusReward: AttendanceReward = {
      type: todayLog.rewardType,
      amount: todayLog.rewardAmount,
    };
    await this.dataSource.transaction(async (manager) => {
      const claimed = await this.attendanceRepository.claimAdBonus(todayLog.id, now, manager);
      if (!claimed) throw new ConflictException(AD_BONUS_ALREADY_CLAIMED);
      await this.applyReward(userId, bonusReward, manager, now);
    });

    return { checkedDate: today, bonusReward };
  }
}
