import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceService } from './attendance.service';
import { AttendanceLog } from './entities/attendance-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceLog]), UsersModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository],
  // 다른 모듈에는 Service 만 공개 (Repository/Entity 직접 접근 금지)
  exports: [AttendanceService],
})
export class AttendanceModule {}
