import { MigrationInterface, QueryRunner } from 'typeorm';

// 퀴즈 보상이 물고기 지급에서 낚싯대 강화로 바뀌어 지급 수량 컬럼이 필요 없다 (ADR-0007)
export class DropQuizAttemptsRewardAmount1793600000001 implements MigrationInterface {
  name = 'DropQuizAttemptsRewardAmount1793600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quiz_attempts" DROP COLUMN "reward_amount"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quiz_attempts" ADD "reward_amount" integer`);
  }
}
