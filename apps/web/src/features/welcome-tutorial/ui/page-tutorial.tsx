import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { OtterBubble } from '@/entities/otter';
import { tutorialQueries } from '@/entities/tutorial';
import { ApiError } from '@/shared/api';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';
import { useClaimTutorialReward } from '../api/use-tutorial-mutations';
import { markSeen, readSeen } from '../lib/seen-flag';
import {
  type PageTutorialStep,
  QUIZ_TUTORIAL_STEPS,
  ROULETTE_TUTORIAL_STEPS,
} from '../model/page-tutorial-steps';
import { FocusFirstButton } from './focus-first-button';
import { SpotlightOverlay } from './spotlight-overlay';

const HTTP_CONFLICT = 409;
const BUTTON_CLASS = 'h-12 flex-1 text-base';

type Phase = 'ready' | 'pending' | 'done' | 'failed';

type Props = {
  steps: readonly PageTutorialStep[];
  /** 본 기록 이름 (화면마다 다르게) */
  seenKey: string;
  /** 연습 퀴즈 보상을 줄지 (아직 안 받았을 때만) */
  withPracticeReward: boolean;
};

// 퀴즈·룰렛 화면을 처음 열 때 한 번 띄우는 짧은 안내. 홈 튜토리얼과 같은 비추기 막과 해달 말풍선을 쓴다.
function PageTutorial({ steps, seenKey, withPracticeReward }: Props) {
  const claimReward = useClaimTutorialReward();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [isOpen, setIsOpen] = useState(true);
  // 연습 보상을 이미 받았으면 연습 단계는 빼고 설명만 한다
  const shownSteps = withPracticeReward ? steps : steps.filter((s) => s.action !== 'practice');
  const step = shownSteps[index];
  if (!isOpen || !step) return null;

  const close = () => {
    markSeen(seenKey);
    setIsOpen(false);
  };
  const isLast = index === shownSteps.length - 1;
  const next = () => {
    if (isLast) return close();
    setIndex(index + 1);
    setPhase('ready');
  };
  const practice = () => {
    setPhase('pending');
    claimReward.mutate('QUIZ', {
      onSuccess: () => setPhase('done'),
      // 다른 기기에서 먼저 받았으면 받은 것으로 본다
      onError: (error) =>
        setPhase(
          error instanceof ApiError && error.statusCode === HTTP_CONFLICT ? 'done' : 'failed',
        ),
    });
  };

  const message =
    phase === 'done' && step.doneMessage
      ? step.doneMessage
      : phase === 'failed'
        ? '강화하지 못했어요. 잠시 후 다시 눌러주세요'
        : step.message;

  const actions = () => {
    if (phase === 'pending') {
      return (
        <p className="flex h-12 items-center justify-center gap-2 text-[15px] text-muted-foreground">
          <Spinner />
          잠시만 기다려 주세요
        </p>
      );
    }
    if (step.action === 'practice' && phase === 'ready') {
      return (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={BUTTON_CLASS}
            onClick={practice}
          >
            O 맞아요
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={BUTTON_CLASS}
            onClick={practice}
          >
            X 아니에요
          </Button>
        </div>
      );
    }
    if (phase === 'failed') {
      return (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" className={BUTTON_CLASS} onClick={next}>
            넘어가기
          </Button>
          <Button type="button" size="lg" className={BUTTON_CLASS} onClick={practice}>
            다시 하기
          </Button>
        </div>
      );
    }
    return (
      <Button type="button" size="lg" className={BUTTON_CLASS} onClick={next}>
        {isLast ? '시작하기' : '다음'}
      </Button>
    );
  };

  return (
    <SpotlightOverlay
      target={step.target}
      isTargetInteractive={false}
      bubbleKey={step.id}
      onSkip={isLast && phase === 'done' ? undefined : close}
      label="화면 안내"
    >
      <OtterBubble message={message}>
        <FocusFirstButton key={`${step.id}-${phase}`}>{actions()}</FocusFirstButton>
      </OtterBubble>
    </SpotlightOverlay>
  );
}

/**
 * 화면 안내를 띄울지: 홈 튜토리얼을 건너뛴 사람에게는 띄우지 않는다 (안내를 원하지 않음).
 * 튜토리얼 상태를 못 받았거나 저장소를 쓸 수 없으면 띄우지 않는다
 */
function useShouldShow(seenKey: string) {
  const { data: tutorial } = useQuery(tutorialQueries.me());
  const [seen] = useState(() => readSeen(seenKey));
  return {
    tutorial,
    show: seen === false && tutorial !== undefined && tutorial.status !== 'SKIPPED',
  };
}

/** O/X 퀴즈 화면을 처음 열 때. 연습 퀴즈를 풀면 광고 없이 한 번 강화한다 */
export function QuizTutorial() {
  const { tutorial, show } = useShouldShow('quiz');
  if (!show || !tutorial) return null;
  return (
    <PageTutorial
      steps={QUIZ_TUTORIAL_STEPS}
      seenKey="quiz"
      withPracticeReward={!tutorial.claimed.QUIZ}
    />
  );
}

/** 미끼 룰렛 화면을 처음 열 때 (설명만) */
export function RouletteTutorial() {
  const { show } = useShouldShow('roulette');
  if (!show) return null;
  return (
    <PageTutorial steps={ROULETTE_TUTORIAL_STEPS} seenKey="roulette" withPracticeReward={false} />
  );
}
