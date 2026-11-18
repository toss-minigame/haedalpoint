import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type FishingStatus, fishingQueries } from '@/entities/fishing';
import { tutorialQueries } from '@/entities/tutorial';
import { ApiError } from '@/shared/api';
import {
  useClaimTutorialReward,
  useCompleteTutorial,
  useSkipTutorial,
} from '../api/use-tutorial-mutations';
import { TUTORIAL_STEPS, type TutorialStep } from './steps';

const HTTP_CONFLICT = 409;

/** ready: 기다림, pending: 요청 중, done: 보상을 받음(다음으로), failed: 실패(다시 하거나 넘어감) */
export type TutorialPhase = 'ready' | 'pending' | 'done' | 'failed';

type Progress = { index: number; phase: TutorialPhase; message: string | null };

export type WelcomeTutorial = {
  step: TutorialStep;
  phase: TutorialPhase;
  /** 지금 말풍선에 보일 말 */
  message: string;
  next: () => void;
  retry: () => void;
  skip: () => void;
  /** 마지막 단계면 다음 대신 시작하기로 마친다 */
  isLast: boolean;
  /** 마지막 단계의 시작하기: 튜토리얼을 마치고(해달 친구) 닫는다 */
  finish: () => void;
};

/** 단계 말풍선. 낚시 현황에 따라 달라지는 말은 현황을 받기 전이면 비워 둔다 */
function stepMessage(step: TutorialStep, fishing: FishingStatus | undefined): string {
  if (typeof step.message === 'string') return step.message;
  return fishing ? step.message(fishing) : '';
}

const GIFT_INDEX = TUTORIAL_STEPS.findIndex((step) => step.action.type === 'gift');

/** 첫 방문 튜토리얼 진행. 홈이 들고 있다가 말풍선에 준다. 띄우지 않을 때는 null */
export function useWelcomeTutorial(): WelcomeTutorial | null {
  const queryClient = useQueryClient();
  const { data: tutorial } = useQuery(tutorialQueries.me());
  const { data: fishing } = useQuery(fishingQueries.me());
  const claimReward = useClaimTutorialReward();
  const completeTutorial = useCompleteTutorial();
  const skipTutorial = useSkipTutorial();
  // undefined: 아직 정하지 않음, null: 띄우지 않음
  const [progress, setProgress] = useState<Progress | null | undefined>(undefined);
  const startedAuto = useRef(new Set<string>());

  // 마치기(해달 친구)는 말풍선 없이 한다. 친구는 응답의 낚시 현황으로 장면에 바로 나타난다.
  // 실패해도 막지 않는다: 다음에 들어오면 선물을 받은 IN_PROGRESS 라 다시 마치기만 시도한다
  const complete = useCallback(() => {
    completeTutorial.mutate(undefined, {
      onSettled: () => queryClient.invalidateQueries({ queryKey: tutorialQueries.all() }),
    });
  }, [completeTutorial, queryClient]);

  // 튜토리얼 상태와 낚시 현황을 받으면 한 번만 띄울지 정한다 (조회 실패는 튜토리얼 없음).
  // 처음이면 1단계부터, 중간에 나갔으면 첫 선물부터, 선물까지 받았으면 띄우지 않고 마치기만 다시 한다
  useEffect(() => {
    if (progress !== undefined || !tutorial || !fishing) return;
    const open = tutorial.status === 'NOT_STARTED' || tutorial.status === 'IN_PROGRESS';
    if (open && tutorial.claimed.GIFT) {
      complete();
      setProgress(null);
      return;
    }
    const index = tutorial.status === 'NOT_STARTED' ? 0 : GIFT_INDEX;
    setProgress(open ? { index, phase: 'ready', message: null } : null);
  }, [progress, tutorial, fishing, complete]);

  const step = progress ? TUTORIAL_STEPS[progress.index] : undefined;
  const update = useCallback((changes: Partial<Progress>) => {
    setProgress((current) => (current ? { ...current, ...changes } : current));
  }, []);

  const next = useCallback(() => {
    setProgress((current) =>
      current
        ? {
            index: Math.min(current.index + 1, TUTORIAL_STEPS.length - 1),
            phase: 'ready',
            message: null,
          }
        : current,
    );
  }, []);

  const claimGift = useCallback(
    (doneMessage: string | undefined) => {
      update({ phase: 'pending', message: null });
      claimReward.mutate('GIFT', {
        onSuccess: () => update({ phase: 'done', message: doneMessage ?? null }),
        onError: (error) => {
          // 다른 기기에서 먼저 받았으면 받은 것으로 보고 넘어간다
          if (error instanceof ApiError && error.statusCode === HTTP_CONFLICT) {
            update({ phase: 'done', message: doneMessage ?? null });
            void queryClient.invalidateQueries({ queryKey: fishingQueries.me().queryKey });
            return;
          }
          update({ phase: 'failed', message: '선물을 받지 못했어요. 잠시 후 다시 눌러주세요' });
        },
      });
    },
    [claimReward, queryClient, update],
  );

  // 첫 선물 단계는 들어가자마자 받는다 (한 번)
  useEffect(() => {
    if (!step || progress?.phase !== 'ready' || startedAuto.current.has(step.id)) return;
    if (step.action.type === 'gift') {
      startedAuto.current.add(step.id);
      claimGift(step.doneMessage);
    }
  }, [step, progress?.phase, claimGift]);

  if (!progress || !step) return null;

  return {
    step,
    phase: progress.phase,
    message: progress.message ?? stepMessage(step, fishing),
    isLast: progress.index === TUTORIAL_STEPS.length - 1,
    next,
    retry: () => {
      if (step.action.type === 'gift') claimGift(step.doneMessage);
    },
    skip: () => {
      skipTutorial.mutate();
      setProgress(null);
    },
    finish: () => {
      complete();
      setProgress(null);
    },
  };
}
