import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './database.options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...buildDataSourceOptions({
          DATABASE_URL: config.getOrThrow<string>('DATABASE_URL'),
          DB_SSL: config.getOrThrow<boolean>('DB_SSL'),
        }),
        // 각 모듈의 TypeOrmModule.forFeature() 로 등록된 엔티티를 자동 수집
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
