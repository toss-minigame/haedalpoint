import {
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/shared/lib/utils';

/** 카드 둥근 위 모서리가 장면 아래쪽(눈밭)에 겹쳐 올라오는 높이 (px) */
const SCENE_OVERLAP = 24;
/** 이만큼 움직여야 끌기로 본다 (그 전에는 버튼 누르기) */
const DRAG_START_PX = 8;
/** 손을 뗐을 때 이만큼 끌었으면 펼치거나 접는다 */
const SNAP_PX = 40;

export type DrawerControls = {
  isOpen: boolean;
  toggle: () => void;
  /** 접었을 때 화면 밖으로 내려가는 부분 (높이만큼 카드를 내린다) */
  moreRef: RefObject<HTMLDivElement | null>;
};

type Props = {
  /** 늘 보이는 위쪽 (양동이 카드) */
  peek: ReactNode;
  /** 아래쪽. moreRef 를 단 부분은 접으면 화면 밖으로 내려간다 (출석 현황) */
  renderMore: (controls: DrawerControls) => ReactNode;
  /** 튜토리얼처럼 밖에서 펼쳐 둬야 할 때 true */
  forceOpen?: boolean;
};

function useElementHeight(ref: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    setHeight(element.offsetHeight);
    return () => observer.disconnect();
  }, [ref]);
  return height;
}

type Drag = { pointerId: number; startY: number; startTranslate: number; isDragging: boolean };

// 홈 아래 카드: 평소에는 양동이 카드와 출석체크 머리 줄까지만 보인다. 카드를 위로 끌거나 손잡이를 누르면
// 카드가 통째로 따라 올라와 아래의 출석 현황이 보이고, 아래로 끌거나 위쪽 어두운 곳을 누르면 다시 접힌다.
// 카드는 화면 아래에 붙어 있고, 접힌 높이만큼 자리를 비워 장면(해달)이 그 위를 채우게 한다.
export function HomeDrawer({ peek, renderMore, forceOpen = false }: Props) {
  const [isOpenByUser, setIsOpenByUser] = useState(false);
  const isOpen = forceOpen || isOpenByUser;
  const drawerRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const drawerHeight = useElementHeight(drawerRef);
  const moreHeight = useElementHeight(moreRef);
  const [dragTranslate, setDragTranslate] = useState<number | null>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);

  const restTranslate = isOpen ? 0 : moreHeight;
  const translate = dragTranslate ?? restTranslate;
  const toggle = () => setIsOpenByUser((open) => !open);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (forceOpen) return;
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTranslate: restTranslate,
      isDragging: false,
    };
  };
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dy = event.clientY - current.startY;
    if (!current.isDragging) {
      if (Math.abs(dy) < DRAG_START_PX) return;
      current.isDragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setDragTranslate(Math.min(moreHeight, Math.max(0, current.startTranslate + dy)));
  };
  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    drag.current = null;
    if (!current?.isDragging) return;
    const dy = event.clientY - current.startY;
    if (dy <= -SNAP_PX) setIsOpenByUser(true);
    else if (dy >= SNAP_PX) setIsOpenByUser(false);
    setDragTranslate(null);
    // 끈 뒤에 따라오는 클릭(버튼 누르기)은 무시한다
    suppressClick.current = true;
  };

  return (
    <>
      {/* 접힌 카드가 차지하는 자리. 장면은 이 위까지 늘어난다 */}
      <div
        aria-hidden="true"
        style={{ height: Math.max(0, drawerHeight - moreHeight - SCENE_OVERLAP) }}
      />
      {isOpen && !forceOpen && (
        <button
          type="button"
          aria-label="출석 현황 접기"
          className="fixed inset-0 z-30 bg-black/30 animate-in fade-in-0 duration-200 motion-reduce:animate-none"
          onClick={() => setIsOpenByUser(false)}
        />
      )}
      <div
        ref={drawerRef}
        className={cn(
          // 끄는 동안 글자가 선택되지 않게 한다
          'fixed inset-x-0 bottom-0 z-40 touch-none rounded-t-3xl bg-card shadow-[0_-6px_20px_rgb(30_70_120/0.08)] select-none',
          dragTranslate === null &&
            'transition-transform duration-300 ease-out motion-reduce:transition-none',
        )}
        style={{ transform: `translateY(${translate}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <div className="mx-auto flex max-w-xl flex-col px-5">
          {/* 끌 수 있다는 손잡이. 누르면 펼치거나 접는다 */}
          <button
            type="button"
            aria-label={isOpen ? '출석 현황 접기' : '출석 현황 펼치기'}
            aria-expanded={isOpen}
            className="flex h-6 w-full items-center justify-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={toggle}
          >
            <span aria-hidden="true" className="h-1 w-10 rounded-full bg-border" />
          </button>
          <div className="flex flex-col gap-5">
            {peek}
            {renderMore({ isOpen, toggle, moreRef })}
          </div>
        </div>
      </div>
    </>
  );
}
