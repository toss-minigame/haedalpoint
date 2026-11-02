import { Controller, Get, Post } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator.js';
import { AttendanceService } from './attendance.service.js';

// 표현 계층: HTTP 요청/응답만 다루고 로직은 서비스에 위임
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  checkIn(@CurrentUserId() userId: string) {
    return this.attendanceService.checkIn(userId);
  }

  @Get('me')
  getStatus(@CurrentUserId() userId: string) {
    return this.attendanceService.getStatus(userId);
  }

  // 출석 후 보상형 광고 시청 완료 (`userEarnedReward` 수신 후에만 호출)
  @Post('ad-bonus')
  claimAdBonus(@CurrentUserId() userId: string) {
    return this.attendanceService.claimAdBonus(userId);
  }
}
