import type { AttendanceStatusResponse, CheckInResponse } from '@haedalpoint/shared';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AttendanceRepository } from './attendance.repository';
import { ATTENDANCE_CYCLE_DAYS, AttendanceRewardPolicy } from './lib/attendance-reward.policy';
import { buildAttendanceStatus } from './lib/attendance-status';
import { isUniqueViolation } from './lib/is-unique-violation';
import { toKstDateString } from './lib/kst-date';

const ALREADY_CHECKED_IN = '이미 오늘 출석했습니다';

// 비즈니스 로직 계층
@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly usersService: UsersService,
  ) {}

  async checkIn(userId: string): Promise<CheckInResponse> {
    await this.usersService.findById(userId);
    const today = toKstDateString(new Date());

    const [latest] = await this.attendanceRepository.findRecentByUserId(userId, 1);
    if (latest?.checkedDate === today) throw new ConflictException(ALREADY_CHECKED_IN);

    const streakDay = AttendanceRewardPolicy.streakDayOn(today, latest ?? null);
    const reward = AttendanceRewardPolicy.rewardFor(streakDay);
    const cycleCompleted = AttendanceRewardPolicy.isCycleCompleted(streakDay);

    try {
      // 조회 → insert 사이 레이스(더블 탭)는 (user_id, checked_date) 유니크 제약이 막는다
      await this.attendanceRepository.create({
        userId,
        checkedDate: today,
        streakDay,
        rewardType: reward.type,
        rewardAmount: reward.amount,
        cycleCompleted,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(ALREADY_CHECKED_IN);
      throw error;
    }

    // TODO(enhancement): 강화 모듈 생기면 ENHANCE_BONUS 적립 후 reward_applied_at 기록
    // TODO(otter-friend): OTTER_FRIEND(7일차) 보상 시 해달 친구 지급 모듈 호출
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

  /**
   * "광고 보고 2배 받기" — 뼈대만 존재.
   * 토스 보상형 광고 SDK 연동 시: 클라이언트가 `userEarnedReward` 이벤트를 받은 뒤 호출.
   * `dismissed` 만으로 호출 금지. 서버는 여기서 `ad_bonus_claimed_at` 기록 + 강화 보너스 2배 적립.
   */
  async claimAdBonus(userId: string): Promise<never> {
    await this.usersService.findById(userId);
    const today = toKstDateString(new Date());

    const todayLog = await this.attendanceRepository.findByUserIdAndDate(userId, today);
    if (!todayLog) throw new NotFoundException('오늘 출석 기록이 없습니다');
    if (todayLog.adBonusClaimedAt) throw new ConflictException('이미 광고 보너스를 받았습니다');

    throw new NotImplementedException('광고 보너스는 준비 중입니다');
  }
}
