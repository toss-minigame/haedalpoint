import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FishingModule } from '../fishing/fishing.module.js';
import { UsersModule } from '../users/users.module.js';
import { RouletteSpin } from './entities/roulette-spin.entity.js';
import { RouletteRoller } from './lib/roulette-roller.js';
import { RouletteController } from './roulette.controller.js';
import { RouletteRepository } from './roulette.repository.js';
import { RouletteService } from './roulette.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([RouletteSpin]), UsersModule, FishingModule],
  controllers: [RouletteController],
  providers: [RouletteService, RouletteRepository, RouletteRoller],
  // 다른 모듈에는 Service 만 공개 (Repository/Entity 직접 접근 금지)
  exports: [RouletteService],
})
export class RouletteModule {}
