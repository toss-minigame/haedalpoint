import { MigrationInterface, QueryRunner } from 'typeorm';

// ⚠️ 임시 개발용 시드: 퀴즈 데이터 관리 방식(운영자 API / 외부 시트 등)이 정해지면 교체한다.
// down 에서 정확히 이 행들만 지울 수 있도록 id 를 고정한다.
const SEED_QUIZZES: ReadonlyArray<{
  id: string;
  question: string;
  answer: boolean;
  explanation: string;
}> = [
  {
    id: '32f71097-7138-4e1b-8c40-3f1202de7c88',
    question: '해달은 돌을 도구로 사용해 조개를 깨 먹는다.',
    answer: true,
    explanation: '해달은 배 위에 돌을 올려 두고 조개를 내리쳐 깨 먹어요.',
  },
  {
    id: 'e87f9e04-de13-4c3c-970e-d880fe939e12',
    question: '해달은 잠을 잘 때 떠내려가지 않도록 서로 손을 잡기도 한다.',
    answer: true,
    explanation: '해달은 잠잘 때 서로 앞발을 잡거나 해초를 몸에 감아 떠내려가지 않게 해요.',
  },
  {
    id: 'fba6a9ca-fabb-4e9a-90a3-688483ca9917',
    question: '고래는 어류에 속한다.',
    answer: false,
    explanation: '고래는 폐로 숨을 쉬고 새끼에게 젖을 먹이는 포유류예요.',
  },
  {
    id: '4e202004-d2ec-4b45-abc5-a59c1042879b',
    question: '문어의 심장은 1개다.',
    answer: false,
    explanation: '문어는 심장이 3개예요.',
  },
  {
    id: '59aeb2e6-d249-4495-b8fe-b1d36bde432b',
    question: '펭귄은 주로 북극에 산다.',
    answer: false,
    explanation: '펭귄은 대부분 남극을 포함한 남반구에 살아요.',
  },
  {
    id: '840ecccc-af33-4a95-aa44-c44229505410',
    question: '해마는 수컷이 알을 품어 새끼를 낳는다.',
    answer: true,
    explanation: '암컷이 수컷의 육아낭에 알을 낳으면 수컷이 품었다가 새끼를 내보내요.',
  },
  {
    id: '14d54737-0e9a-4e55-a216-5d1fb7821cd7',
    question: '상어의 뼈대는 단단한 뼈로만 이루어져 있다.',
    answer: false,
    explanation: '상어는 뼈대가 연골로 이루어진 연골어류예요.',
  },
  {
    id: '31de8638-3ef6-4f49-94b8-811a16e02590',
    question: '불가사리에게는 뇌가 없다.',
    answer: true,
    explanation: '불가사리는 중앙 집중된 뇌 대신 몸 전체에 퍼진 신경망을 가지고 있어요.',
  },
  {
    id: '32da5d3a-d281-4c75-9e6d-947b397b1ef7',
    question: '지구 표면의 약 70%는 바다로 덮여 있다.',
    answer: true,
    explanation: '지구 표면의 약 71%가 바다예요.',
  },
  {
    id: '23bdb181-5e66-46fa-99dc-bb3d1e90bcec',
    question: '바닷물이 짠 가장 큰 이유는 염화나트륨(소금) 때문이다.',
    answer: true,
    explanation: '바닷물에 녹아 있는 염류 중 가장 많은 것이 염화나트륨이에요.',
  },
];

export class SeedQuizzes1793587094263 implements MigrationInterface {
  name = 'SeedQuizzes1793587094263';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const quiz of SEED_QUIZZES) {
      await queryRunner.query(
        `INSERT INTO "quizzes" ("id", "question", "answer", "explanation") VALUES ($1, $2, $3, $4)`,
        [quiz.id, quiz.question, quiz.answer, quiz.explanation],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "quizzes" WHERE "id" = ANY($1::uuid[])`, [
      SEED_QUIZZES.map((quiz) => quiz.id),
    ]);
  }
}
