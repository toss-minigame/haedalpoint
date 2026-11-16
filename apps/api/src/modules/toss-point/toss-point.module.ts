import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TossPartnerModule } from '../toss-partner/toss-partner.module.js';
import { UsersModule } from '../users/users.module.js';
import { TossPointGrant } from './entities/toss-point-grant.entity.js';
import { TossPointRepository } from './toss-point.repository.js';
import { TossPointService } from './toss-point.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([TossPointGrant]), TossPartnerModule, UsersModule],
  providers: [TossPointService, TossPointRepository],
  // 다른 모듈에는 Service 만 공개 (Repository/Entity 직접 접근 금지)
  exports: [TossPointService],
})
export class TossPointModule {}
