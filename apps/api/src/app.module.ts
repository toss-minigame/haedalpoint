import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    // 전역 인증 Guard 등록 (ADR-0006)
    AuthModule,
    // 도메인 모듈
    HealthModule,
    UsersModule,
    AttendanceModule,
    QuizModule,
  ],
})
export class AppModule {}
