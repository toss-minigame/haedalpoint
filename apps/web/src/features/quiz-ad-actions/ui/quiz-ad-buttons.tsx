import { Button } from '@/shared/ui/button';

// TODO(ad): 보상형 광고 연결 PR 에서 SDK `userEarnedReward` 수신 후
//   - RetryAdButton → POST /quiz/:quizId/ad-retry
//   - RewardAdButton → POST /quiz/:quizId/ad-reward
// 를 호출하도록 연결한다. 연결 전까지는 비활성 상태로 노출만 한다 (출석 '광고 2배'와 동일).

const AD_BUTTON_CLASS = 'h-12 w-full text-base';

export function RetryAdButton() {
  return (
    <Button type="button" variant="outline" size="lg" className={AD_BUTTON_CLASS} disabled>
      광고 보고 다시 풀기 · 준비 중
    </Button>
  );
}

type RewardAdButtonProps = {
  rewardPerQuiz: number;
};

export function RewardAdButton({ rewardPerQuiz }: RewardAdButtonProps) {
  return (
    <Button type="button" size="lg" className={AD_BUTTON_CLASS} disabled>
      광고 보고 물고기 {rewardPerQuiz}마리 받기 · 준비 중
    </Button>
  );
}
