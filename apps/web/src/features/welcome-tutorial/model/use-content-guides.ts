import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type MouseEvent, useRef, useState } from 'react';
import { fishingQueries } from '@/entities/fishing';
import { tutorialQueries } from '@/entities/tutorial';
import { ApiError } from '@/shared/api';
import { useClaimTutorialReward } from '../api/use-tutorial-mutations';
import { markSeen, readSeen } from '../lib/seen-flag';
import {
  CONTENT_GUIDES,
  type ContentGuide,
  type ContentGuideId,
  type GuideTrial,
  trialFor,
} from './content-guides';
import type { TutorialPhase } from './use-welcome-tutorial';

const HTTP_CONFLICT = 409;
const TRIAL_FAILED_MESSAGE = '받지 못했어요. 잠시 후 다시 눌러주세요';

type Opened = { id: ContentGuideId; trial: GuideTrial | null; phase: TutorialPhase };

export type GuardProps = { onClickCapture: (event: MouseEvent) => void };

export type OpenContentGuide = {
  id: ContentGuideId;
  guide: ContentGuide;
  /** 광고 없이 체험시키는 안내면 그 체험, 설명만 하면 null */
  trial: GuideTrial | null;
  phase: TutorialPhase;
  message: string;
  /** 읽었으니 처음 눌렀던 버튼을 이어서 누른다 */
  proceed: () => void;
  tryTrial: () => void;
  close: () => void;
};

export type ContentGuides = {
  /** 콘텐츠를 감싼 요소에 붙인다. 처음 누르면 누른 버튼 대신 안내를 띄운다 */
  guard: (id: ContentGuideId) => GuardProps;
  current: OpenContentGuide | null;
};

const seenKey = (id: ContentGuideId) => `content.${id}`;

function messageOf(guide: ContentGuide, opened: Opened): string {
  const { trial, phase } = opened;
  if (!trial) return guide.message;
  if (phase === 'done') return trial.doneMessage;
  if (phase === 'failed') return TRIAL_FAILED_MESSAGE;
  return trial.message;
}

/**
 * 홈 콘텐츠(출석·낚싯대·양동이)를 처음 누를 때 한 번 띄우는 안내 (docs/design/tutorial.md 4장).
 * 홈 튜토리얼이 떠 있는 동안(enabled=false)이나 튜토리얼 상태를 모를 때는 끼어들지 않는다.
 * 본 기록은 브라우저 저장소에 두고, 저장소를 쓸 수 없으면 띄우지 않는다
 */
export function useContentGuides(enabled: boolean): ContentGuides {
  const queryClient = useQueryClient();
  const { data: tutorial } = useQuery(tutorialQueries.me());
  const claimReward = useClaimTutorialReward();
  const [opened, setOpened] = useState<Opened | null>(null);
  // 안내를 읽은 뒤 이어서 누를 버튼
  const pressedButton = useRef<HTMLButtonElement | null>(null);

  const guard = (id: ContentGuideId): GuardProps => ({
    onClickCapture: (event) => {
      if (!enabled || !tutorial || opened || readSeen(seenKey(id)) !== false) return;
      const button = (event.target as Element).closest('button');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      pressedButton.current = button;
      setOpened({ id, trial: trialFor(CONTENT_GUIDES[id], tutorial), phase: 'ready' });
    },
  });

  if (!opened) return { guard, current: null };

  const guide = CONTENT_GUIDES[opened.id];
  const setPhase = (phase: TutorialPhase) =>
    setOpened((current) => (current ? { ...current, phase } : current));
  const close = () => {
    markSeen(seenKey(opened.id));
    setOpened(null);
  };

  return {
    guard,
    current: {
      id: opened.id,
      guide,
      trial: opened.trial,
      phase: opened.phase,
      message: messageOf(guide, opened),
      proceed: () => {
        const button = pressedButton.current;
        close();
        // 본 것으로 적은 뒤라 이번에는 안내 없이 원래 동작(광고 등)이 이어진다
        if (button?.isConnected && !button.disabled) button.click();
      },
      tryTrial: () => {
        if (!opened.trial) return;
        setPhase('pending');
        claimReward.mutate(opened.trial.kind, {
          onSuccess: () => {
            setPhase('done');
            void queryClient.invalidateQueries({ queryKey: tutorialQueries.all() });
          },
          onError: (error) => {
            // 다른 기기에서 먼저 받았으면 받은 것으로 본다
            if (error instanceof ApiError && error.statusCode === HTTP_CONFLICT) {
              setPhase('done');
              void queryClient.invalidateQueries({ queryKey: tutorialQueries.all() });
              void queryClient.invalidateQueries({ queryKey: fishingQueries.me().queryKey });
              return;
            }
            setPhase('failed');
          },
        });
      },
      close,
    },
  };
}
