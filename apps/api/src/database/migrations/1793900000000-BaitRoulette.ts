import { MigrationInterface, QueryRunner } from 'typeorm';

// 제철 미끼 룰렛 (docs/design/bait-roulette.md): 하루 한 번 결과 기록과, 적용한 미끼의 낚시 속도 보너스.
export class BaitRoulette1793900000000 implements MigrationInterface {
  name = 'BaitRoulette1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "roulette_spins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "spin_date" date NOT NULL, "fish_code" character varying(32) NOT NULL, "fish_name" character varying(16) NOT NULL, "speed_bonus_percent" smallint NOT NULL, "applied_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_roulette_spins_user_id_spin_date" UNIQUE ("user_id", "spin_date"), CONSTRAINT "CHK_roulette_spins_speed_bonus_percent" CHECK ("speed_bonus_percent" > 0), CONSTRAINT "PK_roulette_spins" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD "bait_bonus_percent" smallint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "fishing_states" ADD "bait_date" date`);
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD CONSTRAINT "CHK_fishing_states_bait_bonus_percent" CHECK ("bait_bonus_percent" >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fishing_states" DROP CONSTRAINT "CHK_fishing_states_bait_bonus_percent"`,
    );
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "bait_date"`);
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "bait_bonus_percent"`);
    await queryRunner.query(`DROP TABLE "roulette_spins"`);
  }
}
