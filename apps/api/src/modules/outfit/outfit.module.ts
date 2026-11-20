import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FishingModule } from '../fishing/fishing.module.js';
import { UsersModule } from '../users/users.module.js';
import { OtterOutfit } from './entities/otter-outfit.entity.js';
import { OutfitController } from './outfit.controller.js';
import { OutfitRepository } from './outfit.repository.js';
import { OutfitService } from './outfit.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([OtterOutfit]), UsersModule, FishingModule],
  controllers: [OutfitController],
  providers: [OutfitService, OutfitRepository],
})
export class OutfitModule {}
