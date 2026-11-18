import { OtterBubble } from '@/entities/otter';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';
import type { WelcomeTutorial } from '../model/use-welcome-tutorial';
import { FocusFirstButton } from './focus-first-button';

type Props = {
  tutorial: WelcomeTutorial;
};

const BUTTON_CLASS = 'h-12 flex-1 text-base';

// 튜토리얼 말풍선 아래 버튼: 단계와 진행 상태에 따라 다음·다시 하기·시작하기 중 하나
function BubbleActions({ tutorial }: Props) {
  const { phase } = tutorial;

  if (phase === 'pending') {
    return (
      <p className="flex h-12 items-center justify-center gap-2 text-[15px] text-muted-foreground">
        <Spinner />
        잠시만 기다려 주세요
      </p>
    );
  }
  // 마지막 단계는 시작하기로 마친다
  if (tutorial.isLast) {
    return (
      <Button type="button" size="lg" className={BUTTON_CLASS} onClick={tutorial.finish}>
        시작하기
      </Button>
    );
  }
  if (phase === 'failed') {
    return (
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className={BUTTON_CLASS}
          onClick={tutorial.next}
        >
          넘어가기
        </Button>
        <Button type="button" size="lg" className={BUTTON_CLASS} onClick={tutorial.retry}>
          다시 하기
        </Button>
      </div>
    );
  }
  return (
    <Button type="button" size="lg" className={BUTTON_CLASS} onClick={tutorial.next}>
      다음
    </Button>
  );
}

export function TutorialBubble({ tutorial }: Props) {
  return (
    <OtterBubble message={tutorial.message}>
      <FocusFirstButton key={`${tutorial.step.id}-${tutorial.phase}`}>
        <BubbleActions tutorial={tutorial} />
      </FocusFirstButton>
    </OtterBubble>
  );
}
