import { Controller, Get, Post } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { AttendanceService } from './attendance.service';

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

  @Post('ad-bonus')
  claimAdBonus(@CurrentUserId() userId: string) {
    return this.attendanceService.claimAdBonus(userId);
  }
}
