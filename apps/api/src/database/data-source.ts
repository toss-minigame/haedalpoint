// TypeORM CLI 전용 DataSource (pnpm migration:* 스크립트에서 사용)
import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './database.options';

try {
  process.loadEnvFile(join(__dirname, '..', '..', '.env'));
} catch {
  // .env 가 없으면 이미 주입된 환경변수를 사용
}

export default new DataSource({
  ...buildDataSourceOptions({
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    DB_SSL: process.env.DB_SSL !== 'false',
  }),
  entities: [join(__dirname, '..', 'modules', '**', 'entities', '*.entity.{ts,js}')],
});
