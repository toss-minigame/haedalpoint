import { MigrationInterface, QueryRunner } from 'typeorm';

// 해달 옷장 (docs/design/otter-outfit.md): 사용자가 연 소품과 지금 입고 있는지.
// 테이블을 더하기만 해서, 이전 버전 서버와 같은 DB 를 함께 써도 된다.
export class OtterOutfits1794400000000 implements MigrationInterface {
  name = 'OtterOutfits1794400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "otter_outfits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "outfit_code" character varying(32) NOT NULL, "equipped" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_otter_outfits_user_id_outfit_code" UNIQUE ("user_id", "outfit_code"), CONSTRAINT "PK_6783f7253658f14bb3d0006d17b" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "otter_outfits"`);
  }
}
