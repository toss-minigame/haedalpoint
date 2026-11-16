import type { TutorialTarget } from './steps';

/** info: 설명만, practice: 말풍선 안 연습 퀴즈를 풀면 광고 없이 낚싯대 강화 (한 번) */
export type PageTutorialStep = {
  id: string;
  target: TutorialTarget;
  message: string;
  doneMessage?: string;
  action: 'info' | 'practice';
};

/** 연습 퀴즈 (오늘의 퀴즈와 따로 둔다). O·X 어느 쪽을 골라도 해설을 보여주고 강화한다 */
export const PRACTICE_QUIZ = {
  question: '해달은 잠잘 때 서로 손을 잡고 자요',
  answer: 'O',
  explanation: '해달은 잠든 동안 떠내려가지 않도록 서로 손을 잡아요',
} as const;

// 퀴즈 화면을 처음 열 때 (docs/design/tutorial.md 3장)
export const QUIZ_TUTORIAL_STEPS: readonly PageTutorialStep[] = [
  {
    id: 'quiz-intro',
    target: 'quiz-first',
    message: '매일 해달 퀴즈 3문제가 나와요. 맞히고 광고를 보면 오늘 낚싯대가 강화돼요',
    action: 'info',
  },
  {
    id: 'quiz-retry',
    target: 'quiz-first',
    message: '틀려도 광고를 보면 한 번 더 풀 수 있어요',
    action: 'info',
  },
  {
    id: 'quiz-practice',
    target: 'quiz-first',
    message: `먼저 연습해 볼까요? "${PRACTICE_QUIZ.question}"`,
    doneMessage: `정답은 ${PRACTICE_QUIZ.answer}예요. ${PRACTICE_QUIZ.explanation}. 이번엔 광고 없이 낚싯대를 강화해 드렸어요`,
    action: 'practice',
  },
];

// 룰렛 화면을 처음 열 때. 룰렛은 랜덤 보상이라 체험시키지 않고 설명만 한다
export const ROULETTE_TUTORIAL_STEPS: readonly PageTutorialStep[] = [
  {
    id: 'roulette-wheel',
    target: 'roulette-wheel',
    message: '하루 한 번 룰렛을 돌려 오늘의 미끼를 뽑아요',
    action: 'info',
  },
  {
    id: 'roulette-effects',
    target: 'roulette-effects',
    message: '미끼마다 빨라지는 정도가 달라요. 여기서 확인할 수 있어요',
    action: 'info',
  },
  {
    id: 'roulette-spin',
    target: 'roulette-spin',
    message: '뽑은 뒤 광고를 보고 미끼를 달면 오늘 자정까지 더 빨리 낚아요',
    action: 'info',
  },
];
