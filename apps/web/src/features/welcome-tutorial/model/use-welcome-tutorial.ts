import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { attendanceQueries } from '@/entities/attendance';
import { type FishingStatus, fishingQueries, formatFullAt } from '@/entities/fishing';
import {
  type TutorialRewardKind,
  type TutorialStatusResponse,
  tutorialQueries,
} from '@/entities/tutorial';
import { ApiError } from '@/shared/api';
import {
  useClaimTutorialReward,
  useCompleteTutorial,
  useSkipTutorial,
} from '../api/use-tutorial-mutations';
import { type HomeRewardKind, REWARD_STEP_ID, TUTORIAL_STEPS, type TutorialStep } from './steps';

const HTTP_CONFLICT = 409;
const REWARD_ORDER: readonly HomeRewardKind[] = ['ROD', 'HAMMOCK', 'GIFT'];
/** 이보다 적게 남았으면 이미 저장한 것으로 보고 마무리로 간다 (마리) */
const STORED_THRESHOLD_FISH = 0.01;

/** ready: 누르기를 기다림, pending: 요청 중, done: 보상을 받음(다음으로), failed: 실패(다시 하거나 넘어감) */
export type TutorialPhase = 'ready' | 'pending' | 'done' | 'failed';

type Progress = { index: number; phase: TutorialPhase; message: string | null };

/** 광고 대신 튜토리얼 보상을 받는 버튼 동작 (낚싯대 강화·해먹 넓히기) */
export type TutorialTrial = { onTry: () => void; isPending: boolean };

export type WelcomeTutorial = {
  step: TutorialStep;
  phase: TutorialPhase;
  /** 지금 말풍선에 보일 말 */
  message: string;
  /** 비춘 영역을 누를 수 있는지 */
  isTargetInteractive: boolean;
  next: () => void;
  retry: () => void;
  skip: () => void;
  close: () => void;
  trialFor: (kind: TutorialRewardKind) => TutorialTrial | undefined;
  /** 마지막 저장 단계에서만 있다. 저장 안내 대신 이걸 부른다 */
  onStored: ((storedFish: number) => void) | undefined;
};

const indexOf = (id: string) => TUTORIAL_STEPS.findIndex((step) => step.id === id);

/** 처음이면 첫 단계, 중간에 나갔으면 받지 않은 첫 보상 단계부터 (docs/design/tutorial.md 3장) */
function startIndex(tutorial: TutorialStatusResponse, fishing: FishingStatus): number {
  if (tutorial.status === 'NOT_STARTED') return 0;
  const next = REWARD_ORDER.find((kind) => !tutorial.claimed[kind]);
  if (next) return indexOf(REWARD_STEP_ID[next]);
  // 선물까지 받았으면 저장부터. 이미 저장했으면 완료만 다시 시도한다
  return fishing.hammockFish >= STORED_THRESHOLD_FISH ? indexOf('store') : indexOf('finish');
}

function friendMessage(status: FishingStatus): string {
  if (!status.otterFriendUntil) return '눈사람 친구가 왔어요! 하루 동안 함께 낚시해요';
  const until = formatFullAt(new Date(status.otterFriendUntil), new Date());
  return `눈사람 친구가 왔어요! ${until}까지 함께 낚시해요`;
}

/** 첫 방문 튜토리얼 진행. 홈이 들고 있다가 버튼·말풍선에 나눠 준다. 띄우지 않을 때는 null */
export function useWelcomeTutorial(): WelcomeTutorial | null {
  const queryClient = useQueryClient();
  const { data: tutorial } = useQuery(tutorialQueries.me());
  const { data: fishing } = useQuery(fishingQueries.me());
  const { data: attendance } = useQuery(attendanceQueries.me());
  const claimReward = useClaimTutorialReward();
  const completeTutorial = useCompleteTutorial();
  const skipTutorial = useSkipTutorial();
  // undefined: 아직 정하지 않음, null: 띄우지 않음
  const [progress, setProgress] = useState<Progress | null | undefined>(undefined);
  const startedAuto = useRef(new Set<string>());

  // 튜토리얼 상태와 낚시 현황을 받으면 한 번만 띄울지 정한다 (조회 실패는 튜토리얼 없음)
  useEffect(() => {
    if (progress !== undefined || !tutorial || !fishing) return;
    const open = tutorial.status === 'NOT_STARTED' || tutorial.status === 'IN_PROGRESS';
    setProgress(
      open ? { index: startIndex(tutorial, fishing), phase: 'ready', message: null } : null,
    );
  }, [progress, tutorial, fishing]);

  const step = progress ? TUTORIAL_STEPS[progress.index] : undefined;
  const update = useCallback((changes: Partial<Progress>) => {
    setProgress((current) => (current ? { ...current, ...changes } : current));
  }, []);

  const next = useCallback(() => {
    setProgress((current) => {
      if (!current) return current;
      const index = Math.min(current.index + 1, TUTORIAL_STEPS.length - 1);
      const alreadyCheckedIn =
        TUTORIAL_STEPS[index]?.action.type === 'check-in' && attendance?.checkedToday;
      return alreadyCheckedIn
        ? { index, phase: 'done', message: '오늘은 이미 출석했어요' }
        : { index, phase: 'ready', message: null };
    });
  }, [attendance?.checkedToday]);

  const claim = useCallback(
    (kind: TutorialRewardKind, doneMessage: string | undefined) => {
      update({ phase: 'pending', message: null });
      claimReward.mutate(kind, {
        onSuccess: () => update({ phase: 'done', message: doneMessage ?? null }),
        onError: (error) => {
          // 다른 기기에서 먼저 받았으면 받은 것으로 보고 넘어간다
          if (error instanceof ApiError && error.statusCode === HTTP_CONFLICT) {
            update({ phase: 'done', message: doneMessage ?? null });
            void queryClient.invalidateQueries({ queryKey: fishingQueries.me().queryKey });
            return;
          }
          update({ phase: 'failed', message: '보상을 받지 못했어요. 잠시 후 다시 눌러주세요' });
        },
      });
    },
    [claimReward, queryClient, update],
  );

  const finish = useCallback(() => {
    update({ phase: 'pending', message: null });
    completeTutorial.mutate(undefined, {
      onSuccess: (status) => update({ phase: 'done', message: friendMessage(status) }),
      onError: () => update({ phase: 'done', message: '이제 해달과 함께 낚시를 시작해요' }),
    });
  }, [completeTutorial, update]);

  // 출석 단계: 출석 버튼으로 출석하면 다음으로 넘어갈 수 있다
  useEffect(() => {
    if (step?.action.type !== 'check-in' || progress?.phase !== 'ready') return;
    if (attendance?.checkedToday) update({ phase: 'done', message: step.doneMessage ?? null });
  }, [step, progress?.phase, attendance?.checkedToday, update]);

  // 첫 선물·완료 단계는 들어가자마자 받는다 (한 단계에 한 번)
  useEffect(() => {
    if (!step || progress?.phase !== 'ready' || startedAuto.current.has(step.id)) return;
    if (step.action.type === 'gift') {
      startedAuto.current.add(step.id);
      claim('GIFT', step.doneMessage);
    } else if (step.action.type === 'finish') {
      startedAuto.current.add(step.id);
      finish();
    }
  }, [step, progress?.phase, claim, finish]);

  if (!progress || !step) return null;

  const { phase } = progress;
  const message =
    progress.message ??
    (phase === 'failed' && step.action.type === 'gift' ? '선물을 받지 못했어요' : step.message);
  const action = step.action;
  const closeWith = (refresh: boolean) => {
    setProgress(null);
    if (refresh) void queryClient.invalidateQueries({ queryKey: tutorialQueries.all() });
  };

  return {
    step,
    phase,
    message,
    isTargetInteractive: phase !== 'done' && ['check-in', 'trial', 'store'].includes(action.type),
    next,
    retry: () => {
      if (action.type === 'gift') claim('GIFT', step.doneMessage);
      if (action.type === 'trial') claim(action.kind, step.doneMessage);
    },
    skip: () => {
      skipTutorial.mutate();
      closeWith(false);
    },
    close: () => closeWith(true),
    trialFor: (kind) =>
      action.type === 'trial' && action.kind === kind && phase !== 'done'
        ? { onTry: () => claim(kind, step.doneMessage), isPending: phase === 'pending' }
        : undefined,
    onStored: action.type === 'store' ? () => next() : undefined,
  };
}
