import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

// Nest 런타임(DatabaseModule)과 TypeORM CLI(data-source.ts)가 공유하는 설정
export function buildDataSourceOptions(env: {
  DATABASE_URL: string;
  DB_SSL: boolean;
}): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
    synchronize: false,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  };
}
