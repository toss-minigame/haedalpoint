import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { QuizModule } from './modules/quiz/quiz.module.js';
import { UsersModule } from './modules/users/users.module.js';

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
