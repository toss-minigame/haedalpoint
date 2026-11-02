import { join } from 'node:path';
import pg from 'pg';
import type { DataSourceOptions } from 'typeorm';

// Nest 런타임(DatabaseModule)과 TypeORM CLI(data-source.ts)가 공유하는 설정
export function buildDataSourceOptions(env: {
  DATABASE_URL: string;
  DB_SSL: boolean;
}): DataSourceOptions {
  return {
    type: 'postgres',
    // TypeORM 은 pg 를 실행 중에 이름으로 불러와서, Vercel 함수 번들에서 빠진다. 직접 넘겨 포함시킨다.
    driver: pg,
    url: env.DATABASE_URL,
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
    synchronize: false,
    migrations: [join(import.meta.dirname, 'migrations', '*.{ts,js}')],
  };
}
