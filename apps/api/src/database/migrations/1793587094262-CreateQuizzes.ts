import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuizzes1793587094262 implements MigrationInterface {
  name = 'CreateQuizzes1793587094262';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "quizzes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "question" character varying(200) NOT NULL, "answer" boolean NOT NULL, "explanation" character varying(500), "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_quizzes_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "quiz_attempts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "attempted_date" date NOT NULL, "quiz_id" uuid NOT NULL, "user_answer" boolean NOT NULL, "is_correct" boolean NOT NULL, "wrong_count" integer NOT NULL DEFAULT 0, "retry_unlocked" boolean NOT NULL DEFAULT false, "reward_amount" integer, "reward_claimed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_quiz_attempts_user_id_attempted_date_quiz_id" UNIQUE ("user_id", "attempted_date", "quiz_id"), CONSTRAINT "PK_quiz_attempts_id" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "quiz_attempts"`);
    await queryRunner.query(`DROP TABLE "quizzes"`);
  }
}
