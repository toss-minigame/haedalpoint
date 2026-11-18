import { type FishingStatus, formatFish } from '@/entities/fishing';

/** 튜토리얼이 비추는 화면 영역. 그 영역에 `data-tutorial` 로 붙인다 (홈, 퀴즈·룰렛 화면) */
export type TutorialTarget =
  | 'scene'
  | 'otter'
  | 'hammock'
  | 'store'
  | 'warehouse'
  | 'today-boost'
  | 'reward-tiles'
  | 'check-in'
  | 'ad-rod'
  | 'ad-hammock'
  | 'quiz-first'
  | 'roulette-wheel'
  | 'roulette-spin'
  | 'roulette-effects';

/**
 * - info: 설명만 하고 다음으로 (마지막 단계는 시작하기로 튜토리얼을 마친다: 완료 보상 해달 친구)
 * - gift: 단계에 들어가면 첫 선물을 받는다
 */
export type TutorialAction = { type: 'info' } | { type: 'gift' };

/** 말풍선 자리. auto: 비춘 곳 아래(모자라면 위), above: 비춘 곳 위(모자라면 auto) */
export type BubblePlacement = 'auto' | 'above';

export type TutorialStep = {
  id: string;
  target: TutorialTarget;
  /** 해달 말풍선. 낚시 현황에 따라 달라지면 함수로 둔다 */
  message: string | ((fishing: FishingStatus) => string);
  /** 보상을 받은 뒤 잠깐 보여줄 말 */
  doneMessage?: string;
  action: TutorialAction;
  /** 말풍선 자리 (기본 auto: 비춘 곳 아래) */
  bubble?: BubblePlacement;
};

// 홈 튜토리얼 (docs/design/tutorial.md 3장): 6단계 설명, 7단계 첫 선물, 8단계 저장 버튼 안내로 끝난다.
// 출석·낚싯대·양동이·저장은 처음 누를 때(content-guides), 퀴즈·룰렛은 그 화면을 처음 열 때(page-tutorial-steps) 알려준다
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'greet',
    target: 'otter',
    message: '편하게 쉬다 오세요\n물고기는 제가 계속 잡을게요!',
    action: { type: 'info' },
    bubble: 'above',
  },
  {
    id: 'hammock',
    target: 'hammock',
    message: '쉬는 동안 잡은 물고기는\n여기 양동이에 쌓여요',
    action: { type: 'info' },
  },
  {
    id: 'store-intro',
    target: 'store',
    message: '양동이가 차면\n이 버튼으로 창고에 옮기세요!',
    action: { type: 'info' },
  },
  {
    id: 'warehouse',
    target: 'warehouse',
    message: '창고에 모은 물고기는 토스 포인트로 받을 수 있게 준비하고 있어요',
    action: { type: 'info' },
  },
  {
    id: 'today-boost',
    target: 'today-boost',
    // 처음엔 강화가 +0% 라 % 대신 지금 낚는 속도(시간당 마리)로 보여준다
    message: ({ fishPerHour }) =>
      `지금 1시간에 ${formatFish(fishPerHour)}마리씩 낚고 있어요\n강화하면 여기 숫자만큼 더 빨라져요`,
    action: { type: 'info' },
  },
  {
    id: 'reward-tiles',
    target: 'reward-tiles',
    message: '다양한 콘텐츠를 경험하고\n물고기를 더 많이 잡아봐요!',
    action: { type: 'info' },
  },
  {
    id: 'gift',
    target: 'hammock',
    message: '선물을 준비하고 있어요',
    doneMessage: '첫 선물로 양동이를 가득 채워뒀어요!',
    action: { type: 'gift' },
  },
  {
    id: 'store',
    target: 'store',
    message: '이 버튼을 눌러\n잡은 물고기를 창고에 저장하세요!',
    action: { type: 'info' },
  },
];

/** 홈에서 튜토리얼이 비출 영역에 붙이는 속성 */
export function tutorialTarget(target: TutorialTarget): { 'data-tutorial': TutorialTarget } {
  return { 'data-tutorial': target };
}
