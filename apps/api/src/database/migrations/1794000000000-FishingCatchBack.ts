import { MigrationInterface, QueryRunner } from 'typeorm';

// 넘친 물고기 다시 잡아오기 (docs/design/fishing.md 10장): 마지막 저장 이후 넘친 양, 다시 잡아올 양, 하루 횟수.
// 칸을 더하기만 해서 이전 버전 서버와 같은 DB 를 함께 써도 된다.
export class FishingCatchBack1794000000000 implements MigrationInterface {
  name = 'FishingCatchBack1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD "overflow_nano_fish" bigint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD "catch_back_nano_fish" bigint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD "catch_back_count" smallint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "fishing_states" ADD "catch_back_date" date`);
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD CONSTRAINT "CHK_fishing_states_overflow_nano_fish" CHECK ("overflow_nano_fish" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD CONSTRAINT "CHK_fishing_states_catch_back_nano_fish" CHECK ("catch_back_nano_fish" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD CONSTRAINT "CHK_fishing_states_catch_back_count" CHECK ("catch_back_count" >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fishing_states" DROP CONSTRAINT "CHK_fishing_states_catch_back_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" DROP CONSTRAINT "CHK_fishing_states_catch_back_nano_fish"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" DROP CONSTRAINT "CHK_fishing_states_overflow_nano_fish"`,
    );
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "catch_back_date"`);
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "catch_back_count"`);
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "catch_back_nano_fish"`);
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "overflow_nano_fish"`);
  }
}
