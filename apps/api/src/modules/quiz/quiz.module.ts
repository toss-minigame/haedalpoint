import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FishingModule } from '../fishing/fishing.module.js';
import { UsersModule } from '../users/users.module.js';
import { Quiz } from './entities/quiz.entity.js';
import { QuizAttempt } from './entities/quiz-attempt.entity.js';
import { QuizController } from './quiz.controller.js';
import { QuizRepository } from './quiz.repository.js';
import { QuizService } from './quiz.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, QuizAttempt]), UsersModule, FishingModule],
  controllers: [QuizController],
  providers: [QuizService, QuizRepository],
  // 다른 모듈에는 Service 만 공개 (Repository/Entity 직접 접근 금지)
  exports: [QuizService],
})
export class QuizModule {}
