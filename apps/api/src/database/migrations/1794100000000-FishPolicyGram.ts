import { MigrationInterface, QueryRunner } from 'typeorm';

// 낚시·출석 정책 변경 (docs/design/fishing.md, attendance-check.md)
//
// 1) 물고기 단위: 1마리 = 1원 → 48,000마리 = 1원 (1마리 = 1g). 수량 단위는 1/10억 마리 → 1/1000마리.
//    같은 원화 가치를 유지하도록 환산한다: 새 값(milli) = 옛 값(nano) × 48,000 × 1,000 ÷ 10억 = 옛 값 × 0.048
// 2) 해달 친구: 그날 자정까지(날짜·인원) → 온 시각부터 24시간(떠나는 시각). 이미 와 있는 친구는 그날 자정에 떠나게 둔다.
// 3) 해먹 넓히기 최대 단계 10 → 8. 오늘 8단계를 넘은 사용자는 8단계로 맞춘다.
// 4) 출석: 연속 일차(streak_day, 7일 주기) → 누적 출석 일차(attendance_day). 광고 2배는 없앤다.
// 5) 토스 포인트 지급 건 테이블 (출석 1~6일차, 프로모션 API).
//
// 컬럼 이름이 바뀌므로 api 를 배포하는 것과 같은 때에 실행한다 (이전 버전 서버와 같은 DB 를 함께 쓸 수 없다).
// down 은 구조와 단위를 되돌린다. 해달 친구 인원·출석 연속 일차·광고 2배 기록은 근사값으로 되돌린다.
const NANO_TO_MILLI = 0.048;
const FISH_COLUMNS = ['hammock', 'warehouse', 'overflow', 'catch_back'] as const;

export class FishPolicyGram1794100000000 implements MigrationInterface {
  name = 'FishPolicyGram1794100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.convertFishUnit(queryRunner, 'nano', 'milli', NANO_TO_MILLI);

    // 해달 친구: 날짜·인원 → 떠나는 시각 (그날 KST 자정)
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD "otter_friend_until" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `UPDATE "fishing_states" SET "otter_friend_until" = (("otter_friend_date" + 1)::timestamp AT TIME ZONE 'Asia/Seoul') WHERE "otter_friend_date" IS NOT NULL AND "otter_friend_count" > 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" DROP CONSTRAINT "CHK_fishing_states_otter_friend_count"`,
    );
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "otter_friend_count"`);
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "otter_friend_date"`);

    await queryRunner.query(
      `UPDATE "fishing_states" SET "hammock_level" = 8 WHERE "hammock_level" > 8`,
    );

    // 출석: 연속 일차 → 누적 출석 일차
    await queryRunner.query(
      `ALTER TABLE "attendance_logs" DROP CONSTRAINT "CHK_attendance_logs_streak_day"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_logs" RENAME COLUMN "streak_day" TO "attendance_day"`,
    );
    await queryRunner.query(
      `UPDATE "attendance_logs" AS a SET "attendance_day" = n.day FROM (SELECT "id", ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "checked_date") AS day FROM "attendance_logs") AS n WHERE a."id" = n."id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_logs" ADD CONSTRAINT "CHK_attendance_logs_attendance_day" CHECK ("attendance_day" >= 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_logs" ADD CONSTRAINT "UQ_attendance_logs_user_id_attendance_day" UNIQUE ("user_id", "attendance_day")`,
    );
    await queryRunner.query(`ALTER TABLE "attendance_logs" DROP COLUMN "cycle_completed"`);
    await queryRunner.query(`ALTER TABLE "attendance_logs" DROP COLUMN "ad_bonus_claimed_at"`);

    await queryRunner.query(
      `CREATE TABLE "toss_point_grants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "source" character varying(32) NOT NULL, "source_id" uuid NOT NULL, "amount" integer NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'PENDING', "reward_key" text, "last_error" character varying(64), "attempts" smallint NOT NULL DEFAULT 0, "next_attempt_at" TIMESTAMP WITH TIME ZONE, "granted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_toss_point_grants_source" UNIQUE ("source", "source_id"), CONSTRAINT "CHK_toss_point_grants_amount" CHECK ("amount" > 0), CONSTRAINT "PK_toss_point_grants" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_toss_point_grants_user_id" ON "toss_point_grants" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_toss_point_grants_user_id"`);
    await queryRunner.query(`DROP TABLE "toss_point_grants"`);

    await queryRunner.query(
      `ALTER TABLE "attendance_logs" ADD "ad_bonus_claimed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_logs" ADD "cycle_completed" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_logs" DROP CONSTRAINT "UQ_attendance_logs_user_id_attendance_day"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_logs" DROP CONSTRAINT "CHK_attendance_logs_attendance_day"`,
    );
    // 연속 기록은 복구할 수 없어 누적 일차를 7일 주기로 접는다
    await queryRunner.query(
      `UPDATE "attendance_logs" SET "attendance_day" = (("attendance_day" - 1) % 7) + 1, "cycle_completed" = ((("attendance_day" - 1) % 7) + 1 = 7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_logs" RENAME COLUMN "attendance_day" TO "streak_day"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_logs" ADD CONSTRAINT "CHK_attendance_logs_streak_day" CHECK ("streak_day" BETWEEN 1 AND 7)`,
    );

    await queryRunner.query(`ALTER TABLE "fishing_states" ADD "otter_friend_date" date`);
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD "otter_friend_count" smallint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE "fishing_states" SET "otter_friend_date" = ("otter_friend_until" AT TIME ZONE 'Asia/Seoul')::date, "otter_friend_count" = 1 WHERE "otter_friend_until" > now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD CONSTRAINT "CHK_fishing_states_otter_friend_count" CHECK ("otter_friend_count" >= 0)`,
    );
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "otter_friend_until"`);

    await this.convertFishUnit(queryRunner, 'milli', 'nano', 1 / NANO_TO_MILLI);
  }

  /** 수량 컬럼 이름을 바꾸고 값을 factor 배로 환산한다 (내림) */
  private async convertFishUnit(
    queryRunner: QueryRunner,
    from: 'nano' | 'milli',
    to: 'nano' | 'milli',
    factor: number,
  ): Promise<void> {
    for (const column of FISH_COLUMNS) {
      const oldName = `${column}_${from}_fish`;
      const newName = `${column}_${to}_fish`;
      await queryRunner.query(
        `ALTER TABLE "fishing_states" RENAME COLUMN "${oldName}" TO "${newName}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "fishing_states" RENAME CONSTRAINT "CHK_fishing_states_${oldName}" TO "CHK_fishing_states_${newName}"`,
      );
      await queryRunner.query(
        `UPDATE "fishing_states" SET "${newName}" = FLOOR("${newName}" * ${factor})`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "warehouse_ledger" RENAME COLUMN "amount_${from}_fish" TO "amount_${to}_fish"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_ledger" RENAME CONSTRAINT "CHK_warehouse_ledger_amount_${from}_fish" TO "CHK_warehouse_ledger_amount_${to}_fish"`,
    );
    // 이력은 0이 될 수 없다 (CHECK > 0). 아주 작은 옛 이력은 1로 남긴다
    await queryRunner.query(
      `UPDATE "warehouse_ledger" SET "amount_${to}_fish" = GREATEST(1, FLOOR("amount_${to}_fish" * ${factor}))`,
    );
  }
}
