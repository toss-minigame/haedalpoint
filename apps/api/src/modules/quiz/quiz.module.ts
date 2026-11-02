import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Quiz } from './entities/quiz.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizController } from './quiz.controller';
import { QuizRepository } from './quiz.repository';
import { QuizService } from './quiz.service';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, QuizAttempt]), UsersModule],
  controllers: [QuizController],
  providers: [QuizService, QuizRepository],
  // 다른 모듈에는 Service 만 공개 (Repository/Entity 직접 접근 금지)
  exports: [QuizService],
})
export class QuizModule {}
