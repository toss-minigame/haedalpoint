import { MigrationInterface, QueryRunner } from 'typeorm';

// 첫 방문 튜토리얼과 해달 친구 24시간 (docs/design/tutorial.md).
// 테이블과 칸을 더하기만 해서 이전 버전 서버와 같은 DB 를 함께 써도 된다.
// 지금 와 있는 친구는 원래대로 온 날 자정(KST)에 떠나도록 otter_friend_until 을 채운다.
// otter_friend_date 는 이전 버전 서버가 읽으므로 남겨 두고 다음 배포에서 지운다.
export class TutorialAndOtterFriendStay1794100000000 implements MigrationInterface {
  name = 'TutorialAndOtterFriendStay1794100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_tutorials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "rod_rewarded_at" TIMESTAMP WITH TIME ZONE, "hammock_rewarded_at" TIMESTAMP WITH TIME ZONE, "quiz_rewarded_at" TIMESTAMP WITH TIME ZONE, "gift_rewarded_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "skipped_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_user_tutorials_user_id" UNIQUE ("user_id"), CONSTRAINT "PK_user_tutorials" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD "otter_friend_until" TIMESTAMP WITH TIME ZONE`,
    );
    // otter_friend_date 다음 날 00:00 KST
    await queryRunner.query(
      `UPDATE "fishing_states" SET "otter_friend_until" = (("otter_friend_date" + 1)::timestamp AT TIME ZONE 'Asia/Seoul') WHERE "otter_friend_date" IS NOT NULL AND "otter_friend_count" > 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "otter_friend_until"`);
    await queryRunner.query(`DROP TABLE "user_tutorials"`);
  }
}
