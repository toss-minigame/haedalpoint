import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FishingModule } from '../fishing/fishing.module.js';
import { UsersModule } from '../users/users.module.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceRepository } from './attendance.repository.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceLog } from './entities/attendance-log.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceLog]), UsersModule, FishingModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository],
  // 다른 모듈에는 Service 만 공개 (Repository/Entity 직접 접근 금지)
  exports: [AttendanceService],
})
export class AttendanceModule {}
