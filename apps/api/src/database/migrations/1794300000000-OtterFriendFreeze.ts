import { MigrationInterface, QueryRunner } from 'typeorm';

// 눈사람 친구 얼리기 (docs/design/snowman-friend.md): 이번에 온 친구를 이미 얼렸는지 표시하는 칸.
// 칸을 더하기만 하고 기본값이 있어, 이전 버전 서버와 같은 DB 를 함께 써도 된다.
export class OtterFriendFreeze1794300000000 implements MigrationInterface {
  name = 'OtterFriendFreeze1794300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fishing_states" ADD "otter_friend_frozen" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "fishing_states" DROP COLUMN "otter_friend_frozen"`);
  }
}
