import type { TutorialRewardKind, TutorialStatusResponse } from '@/entities/tutorial';
import type { TutorialTarget } from './steps';

/** 처음 누를 때 안내를 띄우는 홈 콘텐츠 */
export type ContentGuideId = 'rod' | 'hammock' | 'check-in';

/** 광고 없이 한 번 체험시키는 안내 (홈 튜토리얼을 건너뛰지 않았고 아직 받지 않았을 때만) */
export type GuideTrial = {
  kind: Extract<TutorialRewardKind, 'ROD' | 'HAMMOCK'>;
  message: string;
  buttonLabel: string;
  doneMessage: string;
};

export type ContentGuide = {
  target: TutorialTarget;
  message: string;
  /** 안내를 읽고 누르면, 처음 눌렀던 버튼을 이어서 누른다 */
  continueLabel: string;
  trial?: GuideTrial;
};

// 콘텐츠를 처음 누를 때 그 동작 대신 한 번 띄우는 안내 (docs/design/tutorial.md 4장).
// 저장 버튼은 홈 튜토리얼 8단계에서 알려주므로 두지 않는다
export const CONTENT_GUIDES: Record<ContentGuideId, ContentGuide> = {
  rod: {
    target: 'ad-rod',
    message: '광고를 보면 오늘 자정까지\n낚싯대가 강화돼요',
    continueLabel: '광고 보고 강화하기',
    trial: {
      kind: 'ROD',
      message: '처음 한 번은 광고 없이\n낚싯대를 강화해 드릴게요',
      buttonLabel: '광고 없이 강화하기',
      doneMessage: '낚싯대가 1단계 강화됐어요\n다음부터는 광고를 보면 오늘 자정까지 강화돼요',
    },
  },
  hammock: {
    target: 'ad-hammock',
    message: '광고를 보면 오늘 자정까지\n양동이가 커지고 낚싯대도 강화돼요',
    continueLabel: '광고 보고 키우기',
    trial: {
      kind: 'HAMMOCK',
      message: '처음 한 번은 광고 없이\n양동이를 키워 드릴게요',
      buttonLabel: '광고 없이 키우기',
      doneMessage: '양동이가 커지고 낚싯대도 강화됐어요\n다음부터는 광고를 보면 오늘 자정까지예요',
    },
  },
  'check-in': {
    target: 'check-in',
    message: '광고를 보고 출석하면 6일 동안 토스 포인트를 받아요\n7일째엔 해달 친구가 와요',
    continueLabel: '확인',
  },
};

/** 홈 튜토리얼을 건너뛰지 않았고 아직 받지 않았으면 광고 없이 한 번 체험시킨다 (서버 canClaim 과 같은 규칙) */
export function trialFor(guide: ContentGuide, tutorial: TutorialStatusResponse): GuideTrial | null {
  const { trial } = guide;
  if (!trial || tutorial.status === 'SKIPPED' || tutorial.claimed[trial.kind]) return null;
  return trial;
}
