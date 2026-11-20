import { CheckIcon, FishIcon, LockIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatFish } from '@/entities/fishing';
import { OUTFITS, type OutfitItem, type OutfitSlot } from '@/entities/otter';
import { cn } from '@/shared/lib/utils';
import { Spinner } from '@/shared/ui/spinner';
import { shortFish } from '../lib/wardrobe-look';
import type { Wardrobe } from '../model/use-wardrobe';

type Props = {
  id: string;
  wardrobe: Wardrobe;
  className?: string;
};

/** 옷장 칸: 부위마다 한 칸이고, 한 칸에서는 하나만 입는다 */
const SHELVES: readonly { slot: OutfitSlot; label: string }[] = [
  { slot: 'head', label: '모자' },
  { slot: 'face', label: '얼굴' },
  { slot: 'body', label: '상의' },
];

const FOCUS_RING = 'outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

type ItemProps = {
  outfit: OutfitItem;
  isWorn: boolean;
  onToggle: () => void;
};

function itemLabel(outfit: OutfitItem, isWorn: boolean): string {
  const name = OUTFITS[outfit.code].name;
  if (outfit.owned)
    return isWorn ? `${name}, 입고 있어요. 누르면 벗어요` : `${name}, 누르면 입어요`;
  return isWorn ? `${name}, 잠김, 입어 보는 중` : `${name}, 잠김, 누르면 입어 봐요`;
}

/** 소품 하나. 연 소품은 누르면 바로 입고, 잠긴 소품은 입어만 본다 */
function OutfitButton({ outfit, isWorn, onToggle }: ItemProps) {
  const StateIcon = outfit.owned ? CheckIcon : LockIcon;
  return (
    <button
      type="button"
      aria-pressed={isWorn}
      aria-label={itemLabel(outfit, isWorn)}
      className={cn(
        'flex min-h-11 w-full items-center gap-1.5 rounded-xl border-2 px-2.5 text-left text-[15px] leading-tight font-semibold transition-transform [word-break:keep-all] active:scale-[0.97]',
        FOCUS_RING,
        outfit.owned && isWorn && 'border-primary bg-primary text-primary-foreground',
        outfit.owned && !isWorn && 'border-transparent bg-muted text-foreground',
        !outfit.owned && isWorn && 'border-primary bg-primary/10 text-primary',
        !outfit.owned && !isWorn && 'border-transparent bg-muted text-foreground/70',
      )}
      onClick={onToggle}
    >
      {/* 연 소품은 입었을 때만 체크를 보이고, 자리는 늘 비워 둬 이름이 움직이지 않게 한다 */}
      <StateIcon
        aria-hidden="true"
        className={cn('size-4 shrink-0', outfit.owned && !isWorn && 'invisible')}
      />
      {OUTFITS[outfit.code].name}
    </button>
  );
}

type UnlockProps = {
  outfit: OutfitItem;
  warehouseFish: number;
  isUnlocking: boolean;
  isBusy: boolean;
  onUnlock: () => void;
};

/**
 * 입어 보는 잠긴 소품 바로 아래에 붙는 여는 버튼. 값(창고 물고기)을 한 줄로 적는다.
 * 물고기가 모자라면 누를 수 없고, 얼마나 모자란지 적는다
 */
function UnlockButton({ outfit, warehouseFish, isUnlocking, isBusy, onUnlock }: UnlockProps) {
  const name = OUTFITS[outfit.code].name;
  const short = shortFish(outfit.priceFish, warehouseFish);
  const isAffordable = short === 0;
  const buttonRef = useRef<HTMLButtonElement>(null);
  // 소품이 많은 칸에서는 목록이 창 안에서 스크롤된다. 맨 아래 소품을 입어 봐도 여는 버튼이 보이게 한다
  useEffect(() => {
    buttonRef.current?.scrollIntoView({ block: 'nearest' });
  }, []);
  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={!isAffordable || isBusy}
      aria-label={
        isAffordable
          ? `${name} 열기, 창고 물고기 ${formatFish(outfit.priceFish)}마리`
          : `${name} 열기, 창고 물고기가 ${formatFish(short)}마리 모자라요`
      }
      className={cn(
        'mt-1 flex min-h-11 w-full items-center justify-center gap-1 rounded-xl px-2 text-[14px] leading-tight font-semibold tabular-nums transition-transform active:scale-[0.97] disabled:active:scale-100',
        FOCUS_RING,
        isAffordable
          ? 'bg-primary text-primary-foreground'
          : 'border border-border bg-card font-medium text-muted-foreground',
        isAffordable && isBusy && 'opacity-60',
      )}
      onClick={onUnlock}
    >
      {isUnlocking ? <Spinner /> : <FishIcon aria-hidden="true" className="size-3.5 shrink-0" />}
      {isAffordable
        ? `${formatFish(outfit.priceFish)}마리 열기`
        : `${formatFish(short)}마리 모자라요`}
    </button>
  );
}

// 옷장: 홈 장면 왼쪽에 뜨는 네모난 창. 위쪽 탭으로 칸(모자 · 얼굴 · 상의)을 고르고, 그 칸의 소품을 세로로 늘어놓는다.
// 해달은 장면 오른쪽에 있어 가려지지 않는다. 연 소품은 누르면 바로 입고 저장한다. 잠긴 소품은 입어만 볼 수 있고,
// 그동안 그 소품 바로 아래에 여는 버튼이 생긴다. 닫으면 입어 보던 소품은 벗는다. 장면 영역(relative) 안에 둔다.
export function WardrobePanel({ id, wardrobe, className }: Props) {
  const { outfits, worn, warehouseFish, unlockingCode } = wardrobe;
  const [slot, setSlot] = useState<OutfitSlot>('head');
  if (!wardrobe.isOpen) return null;
  const shelf = outfits?.filter((outfit) => outfit.slot === slot) ?? [];
  /** 그 칸에 잠긴 채 입어 보는 소품이 있는지 (탭에 점으로 알린다) */
  const isPreviewing = (shelfSlot: OutfitSlot) =>
    outfits?.some(
      (outfit) => outfit.slot === shelfSlot && !outfit.owned && worn.includes(outfit.code),
    ) ?? false;

  return (
    <section
      id={id}
      aria-label="옷장"
      className={cn(
        'flex w-44 flex-col rounded-2xl bg-card/95 shadow-[0_2px_14px_rgb(30_70_120/0.18)]',
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === 'Escape') wardrobe.close();
      }}
    >
      <header className="flex items-center pl-3">
        <h2 className="text-[15px] font-bold">옷장</h2>
        <button
          type="button"
          aria-label="옷장 닫기"
          className={cn('ml-auto grid size-11 place-items-center rounded-full', FOCUS_RING)}
          onClick={wardrobe.close}
        >
          <XIcon aria-hidden="true" className="size-5" />
        </button>
      </header>
      <div role="tablist" aria-label="옷장 칸" className="mx-2 flex rounded-xl bg-muted p-0.5">
        {SHELVES.map((item) => (
          <button
            key={item.slot}
            type="button"
            role="tab"
            id={`${id}-tab-${item.slot}`}
            aria-selected={slot === item.slot}
            aria-controls={`${id}-shelf`}
            className={cn(
              'relative min-h-11 flex-1 rounded-[10px] text-[14px] font-semibold',
              FOCUS_RING,
              slot === item.slot ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
            onClick={() => setSlot(item.slot)}
          >
            {item.label}
            {isPreviewing(item.slot) && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary"
              />
            )}
          </button>
        ))}
      </div>
      <div
        id={`${id}-shelf`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${slot}`}
        className="min-h-0 overflow-y-auto px-1.5 pt-1 pb-1.5"
      >
        {!outfits && !wardrobe.isError && (
          <p className="flex items-center gap-2 px-1 py-3 text-[14px] text-muted-foreground">
            <Spinner /> 불러오고 있어요
          </p>
        )}
        {!outfits && wardrobe.isError && (
          <div className="flex flex-col gap-2 px-1 py-2">
            <p className="text-[14px] [word-break:keep-all]">옷장을 불러오지 못했어요.</p>
            <button
              type="button"
              className={cn(
                'min-h-11 rounded-xl border border-border bg-card px-3 text-[15px] font-semibold',
                FOCUS_RING,
              )}
              onClick={wardrobe.retry}
            >
              다시 시도
            </button>
          </div>
        )}
        {outfits && (
          <ul className="flex flex-col gap-1">
            {shelf.map((outfit) => {
              const isWorn = worn.includes(outfit.code);
              return (
                <li key={outfit.code}>
                  <OutfitButton
                    outfit={outfit}
                    isWorn={isWorn}
                    onToggle={() => wardrobe.toggle(outfit.code)}
                  />
                  {!outfit.owned && isWorn && (
                    <UnlockButton
                      outfit={outfit}
                      warehouseFish={warehouseFish}
                      isUnlocking={unlockingCode === outfit.code}
                      isBusy={unlockingCode !== null}
                      onUnlock={() => wardrobe.unlock(outfit.code)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
