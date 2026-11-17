import type { WelcomeTutorial } from '../model/use-welcome-tutorial';
import { SpotlightOverlay } from './spotlight-overlay';
import { TutorialBubble } from './tutorial-bubble';

type Props = {
  tutorial: WelcomeTutorial;
};

// 첫 방문 홈 튜토리얼. 오른쪽 위에 건너뛰기를 늘 둔다 (마무리 단계 제외).
export function WelcomeTutorialOverlay({ tutorial }: Props) {
  const isFinish = tutorial.step.action.type === 'finish';
  return (
    <SpotlightOverlay
      target={tutorial.step.target}
      isTargetInteractive={tutorial.isTargetInteractive}
      bubbleKey={tutorial.step.id}
      bubblePlacement={tutorial.step.bubble}
      onSkip={isFinish ? undefined : tutorial.skip}
      label="해달해달 안내"
    >
      <TutorialBubble tutorial={tutorial} />
    </SpotlightOverlay>
  );
}
