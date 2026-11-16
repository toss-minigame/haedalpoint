import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FishingModule } from '../fishing/fishing.module.js';
import { UsersModule } from '../users/users.module.js';
import { UserTutorial } from './entities/user-tutorial.entity.js';
import { TutorialController } from './tutorial.controller.js';
import { TutorialRepository } from './tutorial.repository.js';
import { TutorialService } from './tutorial.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserTutorial]), UsersModule, FishingModule],
  controllers: [TutorialController],
  providers: [TutorialService, TutorialRepository],
})
export class TutorialModule {}
