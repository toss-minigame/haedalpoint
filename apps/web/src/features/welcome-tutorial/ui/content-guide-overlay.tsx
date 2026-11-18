import { OtterBubble } from '@/entities/otter';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';
import type { ContentGuides, OpenContentGuide } from '../model/use-content-guides';
import { FocusFirstButton } from './focus-first-button';
import { SpotlightOverlay } from './spotlight-overlay';

const BUTTON_CLASS = 'h-12 flex-1 text-base';

// 안내 말풍선 아래 버튼: 체험이면 광고 없이 받기 → 확인, 설명만이면 처음 눌렀던 동작 이어서 하기
function GuideActions({ current }: { current: OpenContentGuide }) {
  const { trial, phase } = current;

  if (phase === 'pending') {
    return (
      <p className="flex h-12 items-center justify-center gap-2 text-[15px] text-muted-foreground">
        <Spinner />
        잠시만 기다려 주세요
      </p>
    );
  }
  if (!trial) {
    return (
      <Button type="button" size="lg" className={BUTTON_CLASS} onClick={current.proceed}>
        {current.guide.continueLabel}
      </Button>
    );
  }
  if (phase === 'done') {
    return (
      <Button type="button" size="lg" className={BUTTON_CLASS} onClick={current.close}>
        확인
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
          onClick={current.close}
        >
          넘어가기
        </Button>
        <Button type="button" size="lg" className={BUTTON_CLASS} onClick={current.tryTrial}>
          다시 하기
        </Button>
      </div>
    );
  }
  return (
    <Button type="button" size="lg" className={BUTTON_CLASS} onClick={current.tryTrial}>
      {trial.buttonLabel}
    </Button>
  );
}

type Props = {
  guides: ContentGuides;
};

// 홈 콘텐츠를 처음 누를 때 그 콘텐츠를 비추고 해달이 한 번 알려준다. 받는 중·받은 뒤에는 닫기를 두지 않는다
export function ContentGuideOverlay({ guides }: Props) {
  const { current } = guides;
  if (!current) return null;
  const canDismiss = current.phase === 'ready' || current.phase === 'failed';

  return (
    <SpotlightOverlay
      target={current.guide.target}
      isTargetInteractive={false}
      bubbleKey={current.id}
      onSkip={canDismiss ? current.close : undefined}
      skipLabel="닫기"
      label="콘텐츠 안내"
    >
      <OtterBubble message={current.message}>
        <FocusFirstButton key={`${current.id}-${current.phase}`}>
          <GuideActions current={current} />
        </FocusFirstButton>
      </OtterBubble>
    </SpotlightOverlay>
  );
}
