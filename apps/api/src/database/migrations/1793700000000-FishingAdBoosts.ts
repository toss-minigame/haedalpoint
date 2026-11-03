import { MigrationInterface, QueryRunner } from 'typeorm';

// 광고 부스트 (docs/design/fishing.md): 해달 친구 수, 광고로 넓힌 해먹 단계, 광고 보상 쿨타임 시각.
// 이미 해달 친구가 온 행은 한 명으로 채운다 (이전에는 날짜만으로 한 명을 뜻했다).
export class FishingAdBoosts1793700000000 implements MigrationInterface {
  name = 'FishingAdBoosts1793700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD "otter_friend_count" smallint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE "fishing_states" SET "otter_friend_count" = 1 WHERE "otter_friend_date" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD "hammock_level" smallint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "fishing_states" ADD "hammock_level_date" date`);
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD "ad_rod_enhanced_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD "ad_hammock_expanded_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD CONSTRAINT "CHK_fishing_states_otter_friend_count" CHECK ("otter_friend_count" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD CONSTRAINT "CHK_fishing_states_hammock_level" CHECK ("hammock_level" >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fishing_states" DROP CONSTRAINT "CHK_fishing_states_hammock_level"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" DROP CONSTRAINT "CHK_fishing_states_otter_friend_count"`,
    );
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "ad_hammock_expanded_at"`);
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "ad_rod_enhanced_at"`);
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "hammock_level_date"`);
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "hammock_level"`);
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "otter_friend_count"`);
  }
}
