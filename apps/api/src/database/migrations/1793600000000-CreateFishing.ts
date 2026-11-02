import { MigrationInterface, QueryRunner } from 'typeorm';

// 해달 낚시 · 해먹 · 창고 (ADR-0007, docs/design/fishing.md)
export class CreateFishing1793600000000 implements MigrationInterface {
  name = 'CreateFishing1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "fishing_states" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "hammock_milli_fish" bigint NOT NULL DEFAULT 0, "settled_at" TIMESTAMP WITH TIME ZONE NOT NULL, "rod_level" smallint NOT NULL DEFAULT 0, "rod_level_date" date, "otter_friend_date" date, "warehouse_fish" bigint NOT NULL DEFAULT 0, CONSTRAINT "UQ_fishing_states_user_id" UNIQUE ("user_id"), CONSTRAINT "CHK_fishing_states_hammock_milli_fish" CHECK ("hammock_milli_fish" >= 0), CONSTRAINT "CHK_fishing_states_warehouse_fish" CHECK ("warehouse_fish" >= 0), CONSTRAINT "CHK_fishing_states_rod_level" CHECK ("rod_level" >= 0), CONSTRAINT "PK_ac23ef3942790e24772ef1ac13b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "warehouse_ledger" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "type" character varying(16) NOT NULL, "amount" bigint NOT NULL, CONSTRAINT "CHK_warehouse_ledger_amount" CHECK ("amount" > 0), CONSTRAINT "PK_798d808ec55f68886e58ddec08e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warehouse_ledger_user_id" ON "warehouse_ledger" ("user_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_warehouse_ledger_user_id"`);
    await queryRunner.query(`DROP TABLE "warehouse_ledger"`);
    await queryRunner.query(`DROP TABLE "fishing_states"`);
  }
}
