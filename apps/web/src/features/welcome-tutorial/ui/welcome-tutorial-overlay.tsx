import type { WelcomeTutorial } from '../model/use-welcome-tutorial';
import { SpotlightOverlay } from './spotlight-overlay';
import { TutorialBubble } from './tutorial-bubble';

type Props = {
  tutorial: WelcomeTutorial;
};

// 첫 방문 홈 튜토리얼. 말풍선 위나 아래에 건너뛰기를 둔다 (마지막 단계 제외).
export function WelcomeTutorialOverlay({ tutorial }: Props) {
  return (
    <SpotlightOverlay
      target={tutorial.step.target}
      isTargetInteractive={false}
      bubbleKey={tutorial.step.id}
      bubblePlacement={tutorial.step.bubble}
      onSkip={tutorial.isLast ? undefined : tutorial.skip}
      label="해달해달 안내"
    >
      <TutorialBubble tutorial={tutorial} />
    </SpotlightOverlay>
  );
}
