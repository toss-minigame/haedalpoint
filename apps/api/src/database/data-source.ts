// TypeORM CLI 전용 DataSource (pnpm migration:* 스크립트에서 사용)
// ESM 이라 ts-node 대신 빌드 결과(dist/database/data-source.js)를 CLI 에 넘긴다
import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './database.options.js';

try {
  process.loadEnvFile(join(import.meta.dirname, '..', '..', '.env'));
} catch {
  // .env 가 없으면 이미 주입된 환경변수를 사용
}

export default new DataSource({
  ...buildDataSourceOptions({
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    DB_SSL: process.env.DB_SSL !== 'false',
  }),
  entities: [join(import.meta.dirname, '..', 'modules', '**', 'entities', '*.entity.{ts,js}')],
});
