import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  type BaitRouletteSpin,
  landingAngle,
  nextSpinRotation,
  type RouletteToday,
  RouletteWheel,
  rouletteQueries,
} from '@/entities/roulette';
import { BaitResultDialog, useSpinRoulette } from '@/features/bait-roulette';
import { env } from '@/shared/config/env';
import { type RewardedAd, useRewardedAd } from '@/shared/lib/rewarded-ad';
import { useReducedMotion } from '@/shared/lib/use-reduced-motion';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Spinner } from '@/shared/ui/spinner';
import { BaitChanceDialog } from './bait-chance-dialog';

const ACTION_BUTTON_CLASS = 'h-12 w-full text-base';

function fishIndex(today: RouletteToday, spin: BaitRouletteSpin): number {
  return today.fishes.findIndex((fish) => fish.code === spin.fishCode);
}

/** 오늘 결과를 받았지만 아직 미끼를 안 달았거나, 이미 달았을 때 룰렛 아래에 두는 한 줄 */
function TodayBait({ spin, onOpen }: { spin: BaitRouletteSpin; onOpen: () => void }) {
  if (spin.appliedAt) {
    return (
      <p className="rounded-xl bg-muted px-4 py-3 text-center text-base">
        {spin.fishName} 미끼를 달았어요 · 자정까지 낚시 속도 +{spin.speedBonusPercent}%
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-base">
        오늘의 미끼는 <span className="font-bold">{spin.fishName}</span>예요 · 낚시 속도 +
        {spin.speedBonusPercent}%
      </p>
      <Button type="button" size="lg" className={ACTION_BUTTON_CLASS} onClick={onOpen}>
        미끼 달기
      </Button>
    </div>
  );
}

function RouletteBody({ today, ad }: { today: RouletteToday; ad: RewardedAd }) {
  const reducedMotion = useReducedMotion();
  const { mutate: spin, isPending } = useSpinRoulette();
  // null 이면 오늘 결과 칸(없으면 0deg)에 멈춰 있는 상태. 돌리면 누적 각도를 쥔다
  const [rotation, setRotation] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isChanceOpen, setIsChanceOpen] = useState(false);

  const restingIndex = today.spin ? fishIndex(today, today.spin) : -1;
  const restingAngle = restingIndex >= 0 ? landingAngle(restingIndex, today.fishes.length) : 0;
  const shownRotation = rotation ?? restingAngle;

  const finishSpin = () => {
    setIsSpinning(false);
    setIsResultOpen(true);
  };

  const handleSpin = () => {
    spin(undefined, {
      onSuccess: (result) => {
        const index = fishIndex(today, result);
        if (index < 0 || reducedMotion) {
          finishSpin();
          return;
        }
        setIsSpinning(true);
        setRotation(nextSpinRotation(shownRotation, index, today.fishes.length));
      },
    });
  };

  const showSpinButton = today.canSpin || isSpinning || isPending;

  return (
    <>
      <RouletteWheel
        fishes={today.fishes}
        rotation={shownRotation}
        instant={reducedMotion || rotation === null}
        onSpinEnd={isSpinning ? finishSpin : undefined}
      />

      {showSpinButton ? (
        <Button
          type="button"
          size="lg"
          className={ACTION_BUTTON_CLASS}
          disabled={!today.canSpin || isPending || isSpinning}
          onClick={handleSpin}
        >
          {(isPending || isSpinning) && <Spinner />}
          {isPending || isSpinning ? '돌아가는 중' : '룰렛 돌리기'}
        </Button>
      ) : (
        today.spin && <TodayBait spin={today.spin} onOpen={() => setIsResultOpen(true)} />
      )}

      {!isSpinning && !isPending && (
        <p className="text-center text-sm text-muted-foreground">
          {today.canSpin ? '하루에 한 번 돌릴 수 있어요' : '내일 다시 돌릴 수 있어요'}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="lg"
        className={ACTION_BUTTON_CLASS}
        onClick={() => setIsChanceOpen(true)}
      >
        미끼별 효과 보기
      </Button>

      <BaitChanceDialog
        month={today.month}
        fishes={today.fishes}
        open={isChanceOpen}
        onOpenChange={setIsChanceOpen}
      />
      {today.spin && (
        <BaitResultDialog
          spin={today.spin}
          open={isResultOpen}
          onOpenChange={setIsResultOpen}
          ad={ad}
        />
      )}
    </>
  );
}

function RouletteSkeleton() {
  return (
    <div role="status" className="flex flex-col items-center gap-6">
      <span className="sr-only">룰렛을 불러오는 중이에요</span>
      <Skeleton aria-hidden className="aspect-square w-full max-w-[280px] rounded-full" />
      <Skeleton aria-hidden className="h-12 w-full" />
    </div>
  );
}

export function RoulettePage() {
  const { data: today, isPending, isError, error } = useQuery(rouletteQueries.today());
  // 화면 진입 시 보상형 광고를 미리 불러온다 (버튼을 누를 때 불러오지 않는다)
  const rewardedAd = useRewardedAd(env.rewardedAdGroupId);
  const title = today ? `${today.month}월 제철 미끼 룰렛` : '제철 미끼 룰렛';

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-base break-keep text-muted-foreground">
          이달 제철 생선 중 하나가 오늘의 미끼가 돼요. 광고를 보고 미끼를 달면 자정까지 해달이 더
          빨리 낚아요.
        </p>
      </header>

      {isPending && <RouletteSkeleton />}
      {isError && <p className="text-destructive">{error.message}</p>}
      {today && <RouletteBody today={today} ad={rewardedAd} />}

      <Button asChild variant="ghost" className="h-11 self-start px-3 text-base">
        <Link to="/">홈으로</Link>
      </Button>
    </main>
  );
}
