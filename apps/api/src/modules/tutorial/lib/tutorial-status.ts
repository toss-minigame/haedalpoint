import type {
  TutorialRewardKind,
  TutorialStatus,
  TutorialStatusResponse,
} from '@haedalpoint/shared';
import type { UserTutorial } from '../entities/user-tutorial.entity.js';

// 튜토리얼 상태 계산 (순수 함수). docs/design/tutorial.md 3장 "언제 보여주나".

/** 보상 종류와 받은 시각을 적는 칸. 컨트롤러가 경로 값을 검사할 때도 쓴다 (값이 곧 종류) */
export const TUTORIAL_REWARD_KINDS = {
  ROD: 'ROD',
  HAMMOCK: 'HAMMOCK',
  QUIZ: 'QUIZ',
  GIFT: 'GIFT',
} as const satisfies Record<TutorialRewardKind, TutorialRewardKind>;

export const REWARDED_AT_FIELD = {
  ROD: 'rodRewardedAt',
  HAMMOCK: 'hammockRewardedAt',
  QUIZ: 'quizRewardedAt',
  GIFT: 'giftRewardedAt',
} as const satisfies Record<TutorialRewardKind, keyof UserTutorial>;

type TutorialRow = Pick<
  UserTutorial,
  | 'rodRewardedAt'
  | 'hammockRewardedAt'
  | 'quizRewardedAt'
  | 'giftRewardedAt'
  | 'completedAt'
  | 'skippedAt'
>;

const KINDS = Object.values(TUTORIAL_REWARD_KINDS);

/** 그 종류의 보상을 이미 받았는지 */
export function isRewarded(row: TutorialRow, kind: TutorialRewardKind): boolean {
  return row[REWARDED_AT_FIELD[kind]] !== null;
}

/** 마쳤거나 건너뛰어 더는 보상을 줄 수 없는지 */
export function isClosed(row: TutorialRow): boolean {
  return row.completedAt !== null || row.skippedAt !== null;
}

function statusOf(row: TutorialRow | null): TutorialStatus {
  if (!row) return 'NOT_STARTED';
  if (row.completedAt) return 'DONE';
  if (row.skippedAt) return 'SKIPPED';
  return KINDS.some((kind) => isRewarded(row, kind)) ? 'IN_PROGRESS' : 'NOT_STARTED';
}

/** 행이 없으면 아직 시작하지 않은 튜토리얼 */
export function buildTutorialStatus(row: TutorialRow | null): TutorialStatusResponse {
  const claimed = Object.fromEntries(
    KINDS.map((kind) => [kind, row ? isRewarded(row, kind) : false]),
  ) as Record<TutorialRewardKind, boolean>;
  return { status: statusOf(row), claimed };
}
