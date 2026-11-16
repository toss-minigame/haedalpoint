import { useEffect, useRef } from 'react';
import { OtterBubble } from '@/entities/otter';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';
import type { WelcomeTutorial } from '../model/use-welcome-tutorial';

type Props = {
  tutorial: WelcomeTutorial;
};

const BUTTON_CLASS = 'h-12 flex-1 text-base';

// 튜토리얼 말풍선 아래 버튼: 단계와 진행 상태에 따라 다음·다시·O/X·시작하기 중 하나
function BubbleActions({ tutorial }: Props) {
  const { step, phase } = tutorial;
  const action = step.action.type;

  if (phase === 'pending') {
    return (
      <p className="flex h-12 items-center justify-center gap-2 text-[15px] text-muted-foreground">
        <Spinner />
        잠시만 기다려 주세요
      </p>
    );
  }
  if (action === 'finish') {
    return (
      <Button type="button" size="lg" className={BUTTON_CLASS} onClick={tutorial.close}>
        시작하기
      </Button>
    );
  }
  if (action === 'quiz' && phase !== 'done') {
    return (
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className={BUTTON_CLASS}
          onClick={tutorial.answerQuiz}
        >
          O 맞아요
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className={BUTTON_CLASS}
          onClick={tutorial.answerQuiz}
        >
          X 아니에요
        </Button>
      </div>
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
  // 직접 눌러야 하는 단계(체험·저장)는 그 버튼을 누를 때까지 다음 버튼을 두지 않는다.
  // 출석은 실패해도 막히지 않게 넘어갈 수 있다 (출석은 끝난 뒤에 해도 된다)
  const waitsForTarget = phase === 'ready' && (action === 'trial' || action === 'store');
  if (waitsForTarget) return null;
  const isSecondary = action === 'check-in' && phase === 'ready';
  return (
    <Button
      type="button"
      variant={isSecondary ? 'outline' : 'default'}
      size="lg"
      className={BUTTON_CLASS}
      onClick={tutorial.next}
    >
      {isSecondary ? '나중에 할게요' : '다음'}
    </Button>
  );
}

// 단계·상태가 바뀔 때마다 새로 그려(key) 첫 버튼으로 초점을 옮긴다. 화면 낭독기와 키보드로도 이어서 할 수 있다
function FocusFirstButton({ tutorial }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector('button')?.focus({ preventScroll: true });
  }, []);
  return (
    // 직접 누를 버튼을 기다리는 단계는 말풍선 아래 버튼이 없어 빈 칸을 남기지 않는다
    <div ref={ref} className="flex flex-col gap-2 empty:hidden">
      <BubbleActions tutorial={tutorial} />
    </div>
  );
}

export function TutorialBubble({ tutorial }: Props) {
  return (
    <OtterBubble message={tutorial.message}>
      <FocusFirstButton key={`${tutorial.step.id}-${tutorial.phase}`} tutorial={tutorial} />
    </OtterBubble>
  );
}
