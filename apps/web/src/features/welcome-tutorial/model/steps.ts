import type { TutorialRewardKind } from '@/entities/tutorial';

/** 튜토리얼이 비추는 화면 영역. 그 영역에 `data-tutorial` 로 붙인다 (홈, 퀴즈·룰렛 화면) */
export type TutorialTarget =
  | 'scene'
  | 'hammock'
  | 'store'
  | 'warehouse'
  | 'check-in'
  | 'ad-rod'
  | 'ad-hammock'
  | 'shortcuts'
  | 'quiz-first'
  | 'roulette-wheel'
  | 'roulette-spin'
  | 'roulette-effects';

/**
 * - info: 설명만 하고 다음으로
 * - check-in: 출석 버튼을 직접 누른다
 * - trial: 비춘 버튼을 광고 없이 눌러 체험 보상을 받는다
 * - gift: 단계에 들어가면 첫 선물을 받는다
 * - store: 광고를 보고 창고에 저장한다
 * - finish: 단계에 들어가면 완료 보상(해달 친구)을 받는다
 */
export type TutorialAction =
  | { type: 'info' }
  | { type: 'check-in' }
  | { type: 'trial'; kind: Extract<TutorialRewardKind, 'ROD' | 'HAMMOCK'> }
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

// 홈 튜토리얼 (docs/design/tutorial.md 3장). 퀴즈·룰렛은 그 화면을 처음 열 때 따로 알려준다 (page-tutorial-steps)
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
    id: 'shortcuts',
    target: 'shortcuts',
    message: 'O/X 퀴즈와 미끼 룰렛도 낚싯대를 빠르게 해줘요. 처음 열면 알려드릴게요',
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

/** 홈 튜토리얼에서 받는 보상 (연습 퀴즈는 퀴즈 화면에서) */
export type HomeRewardKind = Exclude<TutorialRewardKind, 'QUIZ'>;

/** 보상 종류를 받는 단계. 다시 들어왔을 때 받지 않은 첫 보상 단계부터 이어서 한다 */
export const REWARD_STEP_ID: Record<HomeRewardKind, string> = {
  ROD: 'rod',
  HAMMOCK: 'hammock-expand',
  GIFT: 'gift',
};

/** 홈에서 튜토리얼이 비출 영역에 붙이는 속성 */
export function tutorialTarget(target: TutorialTarget): { 'data-tutorial': TutorialTarget } {
  return { 'data-tutorial': target };
}
