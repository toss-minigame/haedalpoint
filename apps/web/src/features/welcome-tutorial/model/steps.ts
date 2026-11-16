import type { TutorialRewardKind } from '@/entities/tutorial';

/** 튜토리얼이 비추는 홈 화면 영역. 홈에서 그 영역에 `data-tutorial` 로 붙인다 */
export type TutorialTarget =
  | 'scene'
  | 'hammock'
  | 'store'
  | 'warehouse'
  | 'check-in'
  | 'ad-rod'
  | 'ad-hammock'
  | 'quiz'
  | 'roulette';

/**
 * - info: 설명만 하고 다음으로
 * - check-in: 출석 버튼을 직접 누른다
 * - trial: 비춘 버튼을 광고 없이 눌러 체험 보상을 받는다
 * - quiz: 말풍선 안 연습 문제를 푼다
 * - gift: 단계에 들어가면 첫 선물을 받는다
 * - store: 광고를 보고 창고에 저장한다
 * - finish: 단계에 들어가면 완료 보상(해달 친구)을 받는다
 */
export type TutorialAction =
  | { type: 'info' }
  | { type: 'check-in' }
  | { type: 'trial'; kind: Extract<TutorialRewardKind, 'ROD' | 'HAMMOCK'> }
  | { type: 'quiz' }
  | { type: 'gift' }
  | { type: 'store' }
  | { type: 'finish' };

export type TutorialStep = {
  id: string;
  target: TutorialTarget;
  /** 해달 말풍선 (한 줄) */
  message: string;
  /** 보상을 받은 뒤 잠깐 보여줄 말 */
  doneMessage?: string;
  action: TutorialAction;
};

/** 연습 퀴즈 (오늘의 퀴즈와 따로 둔다). O·X 어느 쪽을 골라도 해설을 보여주고 강화한다 */
export const PRACTICE_QUIZ = {
  question: '해달은 잠잘 때 서로 손을 잡고 자요',
  answer: 'O',
  explanation: '해달은 잠든 동안 떠내려가지 않도록 서로 손을 잡아요',
} as const;

// docs/design/tutorial.md 3장
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'greet',
    target: 'scene',
    message: '안녕하세요! 제가 물고기를 잡아올게요',
    action: { type: 'info' },
  },
  {
    id: 'hammock',
    target: 'hammock',
    message: '잡은 물고기는 해먹에 쌓여요',
    action: { type: 'info' },
  },
  {
    id: 'store-intro',
    target: 'store',
    message: '해먹이 차면 이 버튼으로 창고에 옮겨요',
    action: { type: 'info' },
  },
  {
    id: 'warehouse',
    target: 'warehouse',
    message: '창고에 모은 물고기는 토스 포인트로 받을 수 있게 준비하고 있어요',
    action: { type: 'info' },
  },
  {
    id: 'check-in',
    target: 'check-in',
    message: '매일 출석하면 낚싯대가 강화돼요. 7일째엔 해달 친구가 와요',
    doneMessage: '출석했어요! 오늘 낚싯대가 강화됐어요',
    action: { type: 'check-in' },
  },
  {
    id: 'rod',
    target: 'ad-rod',
    message: '이번엔 광고 없이 낚싯대를 강화해 드릴게요. 눌러보세요',
    doneMessage: '낚싯대가 1단계 강화됐어요. 평소에는 광고를 보면 오늘 자정까지 강화돼요',
    action: { type: 'trial', kind: 'ROD' },
  },
  {
    id: 'hammock-expand',
    target: 'ad-hammock',
    message: '해먹도 광고 없이 넓혀 드릴게요. 눌러보세요',
    doneMessage: '해먹이 넓어지고 낚싯대도 강화됐어요. 평소에는 광고를 보면 오늘 자정까지예요',
    action: { type: 'trial', kind: 'HAMMOCK' },
  },
  {
    id: 'quiz',
    target: 'quiz',
    message: `해달 퀴즈를 맞히면 낚싯대를 강화할 수 있어요. "${PRACTICE_QUIZ.question}"`,
    doneMessage: `정답은 ${PRACTICE_QUIZ.answer}예요. ${PRACTICE_QUIZ.explanation}. 낚싯대가 1단계 강화됐어요`,
    action: { type: 'quiz' },
  },
  {
    id: 'roulette',
    target: 'roulette',
    message: '하루 한 번 미끼를 뽑아 더 빨리 낚아요',
    action: { type: 'info' },
  },
  {
    id: 'gift',
    target: 'hammock',
    message: '선물을 준비하고 있어요',
    doneMessage: '첫 선물로 해먹을 가득 채워뒀어요!',
    action: { type: 'gift' },
  },
  {
    id: 'store',
    target: 'store',
    message: '광고를 보고 창고에 옮겨보세요',
    action: { type: 'store' },
  },
  {
    id: 'finish',
    target: 'scene',
    message: '친구를 부르고 있어요',
    action: { type: 'finish' },
  },
];

/** 보상 종류를 받는 단계. 다시 들어왔을 때 받지 않은 첫 보상 단계부터 이어서 한다 */
export const REWARD_STEP_ID: Record<TutorialRewardKind, string> = {
  ROD: 'rod',
  HAMMOCK: 'hammock-expand',
  QUIZ: 'quiz',
  GIFT: 'gift',
};

/** 홈에서 튜토리얼이 비출 영역에 붙이는 속성 */
export function tutorialTarget(target: TutorialTarget): { 'data-tutorial': TutorialTarget } {
  return { 'data-tutorial': target };
}
