import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { FishingState } from './entities/fishing-state.entity.js';
import { WarehouseLedger } from './entities/warehouse-ledger.entity.js';
import { FishingController } from './fishing.controller.js';
import { FishingRepository } from './fishing.repository.js';
import { FishingService } from './fishing.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([FishingState, WarehouseLedger]), UsersModule],
  controllers: [FishingController],
  providers: [FishingService, FishingRepository],
  // 다른 모듈에는 Service 만 공개 (Repository/Entity 직접 접근 금지)
  exports: [FishingService],
})
export class FishingModule {}
