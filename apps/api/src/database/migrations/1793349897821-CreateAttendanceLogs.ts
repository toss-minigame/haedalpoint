import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttendanceLogs1793349897821 implements MigrationInterface {
  name = 'CreateAttendanceLogs1793349897821';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "attendance_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "checked_date" date NOT NULL, "streak_day" smallint NOT NULL, "reward_type" character varying(32) NOT NULL, "reward_amount" integer NOT NULL, "cycle_completed" boolean NOT NULL DEFAULT false, "reward_applied_at" TIMESTAMP WITH TIME ZONE, "ad_bonus_claimed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_attendance_logs_user_id_checked_date" UNIQUE ("user_id", "checked_date"), CONSTRAINT "CHK_attendance_logs_streak_day" CHECK ("streak_day" BETWEEN 1 AND 7), CONSTRAINT "PK_e78c28cf950bd06d614ae09f26b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_attendance_logs_user_id" ON "attendance_logs"  ("user_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_attendance_logs_user_id"`);
    await queryRunner.query(`DROP TABLE "attendance_logs"`);
  }
}
