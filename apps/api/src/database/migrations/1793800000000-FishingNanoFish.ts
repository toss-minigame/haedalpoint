import { MigrationInterface, QueryRunner } from 'typeorm';

// 낚시 정책 변경 (1마리 = 1원, 시간당 0.075마리, 해먹 0.56마리): 수량 단위를 1/1000마리에서 1/10억 마리로 바꾼다.
// 기존 해먹·창고 수량은 옛 정책 기준이라 단위를 환산하지 않고 0으로 초기화한다 (창고 이력도 삭제).
// down 은 컬럼 이름만 되돌리고 수량은 0으로 둔다 (옛 수량은 복구하지 않는다).
export class FishingNanoFish1793800000000 implements MigrationInterface {
  name = 'FishingNanoFish1793800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "warehouse_ledger"`);
    await queryRunner.query(
      `UPDATE "fishing_states" SET "hammock_milli_fish" = 0, "warehouse_fish" = 0, "settled_at" = now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" RENAME COLUMN "hammock_milli_fish" TO "hammock_nano_fish"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" RENAME CONSTRAINT "CHK_fishing_states_hammock_milli_fish" TO "CHK_fishing_states_hammock_nano_fish"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" RENAME COLUMN "warehouse_fish" TO "warehouse_nano_fish"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" RENAME CONSTRAINT "CHK_fishing_states_warehouse_fish" TO "CHK_fishing_states_warehouse_nano_fish"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_ledger" RENAME COLUMN "amount" TO "amount_nano_fish"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_ledger" RENAME CONSTRAINT "CHK_warehouse_ledger_amount" TO "CHK_warehouse_ledger_amount_nano_fish"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "warehouse_ledger"`);
    await queryRunner.query(
      `UPDATE "fishing_states" SET "hammock_nano_fish" = 0, "warehouse_nano_fish" = 0, "settled_at" = now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_ledger" RENAME CONSTRAINT "CHK_warehouse_ledger_amount_nano_fish" TO "CHK_warehouse_ledger_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_ledger" RENAME COLUMN "amount_nano_fish" TO "amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" RENAME CONSTRAINT "CHK_fishing_states_warehouse_nano_fish" TO "CHK_fishing_states_warehouse_fish"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" RENAME COLUMN "warehouse_nano_fish" TO "warehouse_fish"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" RENAME CONSTRAINT "CHK_fishing_states_hammock_nano_fish" TO "CHK_fishing_states_hammock_milli_fish"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" RENAME COLUMN "hammock_nano_fish" TO "hammock_milli_fish"`,
    );
  }
}
