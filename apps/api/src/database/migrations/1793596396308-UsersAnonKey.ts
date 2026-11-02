import { MigrationInterface, QueryRunner } from 'typeorm';

// ADR-0006: users 를 익명키(anon_key) 기준으로 바꾼다. email/name 은 익명키 방식으로 받을 수 없어 제거한다.
// 익명키 도입 전에 만든 테스트 사용자는 실제 익명키와 겹치지 않는 'legacy:<id>' 로 채워
// 출석·퀴즈 기록의 user_id 연결은 유지한다 (이 사용자로는 다시 인증할 수 없다).
export class UsersAnonKey1793596396308 implements MigrationInterface {
  name = 'UsersAnonKey1793596396308';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "anon_key" text`);
    await queryRunner.query(
      `UPDATE "users" SET "anon_key" = 'legacy:' || "id" WHERE "anon_key" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "anon_key" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_users_anon_key" UNIQUE ("anon_key")`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
  }

  // 제거한 email/name 값은 복구되지 않는다. 형식만 되돌리고 자리표시 값을 채운다.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "email" character varying`);
    await queryRunner.query(`UPDATE "users" SET "email" = "id" || '@legacy.invalid', "name" = ''`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_users_anon_key"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "anon_key"`);
  }
}
