// 첫 방문 튜토리얼 API 응답 타입 (FE/BE 공용). docs/design/tutorial.md
//
// 흐름: 설명 → 출석 → 체험 보상(낚싯대·해먹·퀴즈, 광고 없이 한 번씩) → 첫 선물(해먹 채우기)
//       → 광고 보고 저장 → 완료(해달 친구 24시간)
import type { FishingStatusResponse } from './fishing';

/** NOT_STARTED: 기록 없음, IN_PROGRESS: 보상을 하나 이상 받음, DONE: 마침, SKIPPED: 건너뜀 */
export type TutorialStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED';

/** 튜토리얼에서 한 번씩 받는 보상. ROD·QUIZ: 낚싯대 강화, HAMMOCK: 해먹 넓히기, GIFT: 해먹 채우기 */
export type TutorialRewardKind = 'ROD' | 'HAMMOCK' | 'QUIZ' | 'GIFT';

// GET /api/tutorial/me, POST /api/tutorial/skip
export interface TutorialStatusResponse {
  status: TutorialStatus;
  /** 종류별로 받았는지 */
  claimed: Record<TutorialRewardKind, boolean>;
}

// POST /api/tutorial/rewards/:kind, POST /api/tutorial/complete
// 응답은 보상을 받은 뒤의 낚시 현황이다 (완료면 otterFriendUntil 에 친구가 떠나는 시각).
export type TutorialRewardResponse = FishingStatusResponse;
export type TutorialCompleteResponse = FishingStatusResponse;
