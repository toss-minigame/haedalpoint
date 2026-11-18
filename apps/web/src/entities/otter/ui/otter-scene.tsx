import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import {
  FISH_SPRITES,
  OTTER_3D_MODEL,
  OTTER_FISHING_FRAMES,
  OTTER_FRIEND_FISHING_FRAMES,
  OTTER_FULL_SPRITE,
  PUDDLE_SPRITE,
  SNOW_BACKGROUND_SPRITE,
  SNOWMAN_3D_MODEL,
} from '../lib/otter-sprites';
import { createSceneEngine, type SceneEngine } from '../lib/scene/scene-engine';
import { fishingArea, type Rect, snowmanLayout } from '../lib/scene/scene-state';

/** 해달이 낚시하는 영역에 붙일 속성 (예: 튜토리얼이 비출 곳 표시 data-tutorial) */
type FishingAreaProps = { [attribute: `data-${string}`]: string };

type Props = {
  className?: string;
  /** 자동으로 잡을 때마다 물고기 옆에 띄울 글자 (예: +3). 없으면 띄우지 않는다 */
  catchLabel?: string | null;
  /** 친구(눈사람)가 함께 낚시하면 true. 물웅덩이 왼쪽에 선다 */
  withOtterFriend?: boolean;
  /** 친구가 녹은 정도 (0 = 멀쩡, 1 = 다 녹음). 떠나기 전 한 시간 동안 커진다 */
  friendMelt?: number;
  /** 이번에 온 친구를 얼렸는지. false → true 로 바뀌면 얼리는 연출을 한 번 보여 준다 */
  friendFrozen?: boolean;
  /** 친구가 없을 때 보여 줄, 출석으로 만드는 중인 눈사람 단계 (0 = 없음 … 6 = 완성) */
  friendBuildStage?: number;
  /** 친구 머리 위 말풍선에 넣을 내용 (예: 녹을 때 얼려 달라는 버튼). 없으면 말풍선을 띄우지 않는다 */
  friendBubble?: ReactNode;
  /** 해달 친구가 물고기를 잡을 때 머리 위에 띄울 글자 (친구 몫). 없으면 띄우지 않는다 */
  friendCatchLabel?: string | null;
  /** 해먹이 가득 찼으면 true. 낚시를 멈추고 물고기가 가득한 양동이를 든 모습이 된다 */
  hammockFull?: boolean;
  /** 주면 해달·낚싯대·웅덩이를 감싸는 보이지 않는 영역을 장면 위에 두고 이 속성을 붙인다 */
  fishingAreaProps?: FishingAreaProps;
};

function sceneLabel(withOtterFriend: boolean, hammockFull: boolean): string {
  if (hammockFull) return '양동이가 가득 차 양동이를 든 해달. 창고에 저장하면 다시 낚시해요';
  return withOtterFriend
    ? '눈사람 친구와 함께 얼음낚시하는 해달. 누르면 해달이 물고기를 잡아요'
    : '얼음낚시하는 해달. 누르면 해달이 물고기를 잡아요';
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** 캔버스 크기를 따라 해달이 낚시하는 영역을 다시 잰다. enabled 가 false 면 재지 않는다 */
function useFishingArea(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
): Rect | null {
  const [area, setArea] = useState<Rect | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled || !canvas) return;
    const observer = new ResizeObserver(() =>
      setArea(fishingArea({ width: canvas.clientWidth, height: canvas.clientHeight })),
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [canvasRef, enabled]);
  return area;
}

/** 친구 말풍선: 너비, 장면 가장자리와의 간격, 머리 위로 띄우는 거리 (px) */
const BUBBLE = { WIDTH: 208, EDGE: 8, GAP: 12, TAIL: 12 } as const;

type SceneSize = { width: number; height: number };

/** 눈사람 머리 위 말풍선의 자리. 눈사람이 화면 왼쪽 끝에 있으므로 말풍선은 장면 안으로 밀고 꼬리만 머리를 가리킨다 */
function bubblePlacement(size: SceneSize) {
  const { centerX, bottomY, height } = snowmanLayout(size);
  const left = Math.min(
    Math.max(centerX - BUBBLE.WIDTH / 2, BUBBLE.EDGE),
    Math.max(size.width - BUBBLE.WIDTH - BUBBLE.EDGE, BUBBLE.EDGE),
  );
  return { left, top: bottomY - height - BUBBLE.GAP, tailLeft: centerX - left - BUBBLE.TAIL / 2 };
}

/**
 * 해달을 3D 모델로 그릴지. 기본은 3D 이고, 3D 일 때는 옛 그림 해달·그림 친구를 어떤 경우에도 그리지 않는다
 * (모델을 못 불러오면 해달 없이 둔다). 빌드 환경 변수 VITE_OTTER_3D=false 로 끄거나, 브라우저에서 주소에
 * ?otter2d 를 붙였을 때만 그림 해달을 그린다
 */
function isOtter3dEnabled(): boolean {
  return (
    import.meta.env.VITE_OTTER_3D !== 'false' &&
    !new URLSearchParams(window.location.search).has('otter2d')
  );
}

// 해달이 설원에 앉아 물웅덩이에서 물고기를 낚는 장면 (캔버스). CATCH_INTERVAL_SECONDS 마다 스스로 잡고,
// 탭하면 바로 한 마리 잡는다 (탭은 연출만 하고 catchLabel 은 띄우지 않는다). 해먹이 가득 차면 잡지 않는다.
export function OtterScene({
  className,
  catchLabel = null,
  withOtterFriend = false,
  friendCatchLabel = null,
  hammockFull = false,
  fishingAreaProps,
  friendMelt = 0,
  friendFrozen = false,
  friendBuildStage = 0,
  friendBubble = null,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<SceneSize | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const area = useFishingArea(canvasRef, fishingAreaProps !== undefined);
  const [otter3dEnabled] = useState(isOtter3dEnabled);
  const engineRef = useRef<SceneEngine | null>(null);
  // 엔진은 한 번만 만들므로, 만들 때 쓸 최신 값을 ref 로 들고 있는다
  const catchLabelRef = useRef(catchLabel);
  const withOtterFriendRef = useRef(withOtterFriend);
  const friendCatchLabelRef = useRef(friendCatchLabel);
  const hammockFullRef = useRef(hammockFull);
  const friendMeltRef = useRef(friendMelt);
  const friendBuildStageRef = useRef(friendBuildStage);
  const wasFriendFrozenRef = useRef(friendFrozen);

  useEffect(() => {
    catchLabelRef.current = catchLabel;
    engineRef.current?.setCatchLabel(catchLabel);
  }, [catchLabel]);

  useEffect(() => {
    withOtterFriendRef.current = withOtterFriend;
    engineRef.current?.setOtterFriendVisible(withOtterFriend);
  }, [withOtterFriend]);

  useEffect(() => {
    friendCatchLabelRef.current = friendCatchLabel;
    engineRef.current?.setFriendCatchLabel(friendCatchLabel);
  }, [friendCatchLabel]);

  useEffect(() => {
    hammockFullRef.current = hammockFull;
    engineRef.current?.setHammockFull(hammockFull);
  }, [hammockFull]);

  useEffect(() => {
    friendMeltRef.current = friendMelt;
    engineRef.current?.setFriendMelt(friendMelt);
  }, [friendMelt]);

  useEffect(() => {
    friendBuildStageRef.current = friendBuildStage;
    engineRef.current?.setFriendBuildStage(friendBuildStage);
  }, [friendBuildStage]);

  // 방금 얼렸을 때만 연출을 보여 준다 (이미 얼린 채로 화면에 들어왔을 때는 보여 주지 않는다)
  useEffect(() => {
    if (friendFrozen && !wasFriendFrozenRef.current) engineRef.current?.playFriendFreeze();
    wasFriendFrozenRef.current = friendFrozen;
  }, [friendFrozen]);

  // 말풍선을 눈사람 머리 위에 놓으려면 장면 크기가 필요하다
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setSize({ width: root.clientWidth, height: root.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createSceneEngine(canvas, {
      sprites: {
        otter: OTTER_FISHING_FRAMES,
        full: OTTER_FULL_SPRITE,
        fish: FISH_SPRITES,
        background: SNOW_BACKGROUND_SPRITE,
        puddle: PUDDLE_SPRITE,
        friend: OTTER_FRIEND_FISHING_FRAMES,
      },
      reducedMotion: window.matchMedia(REDUCED_MOTION_QUERY).matches,
      otterModelUrl: otter3dEnabled ? OTTER_3D_MODEL : null,
      friendModelUrl: otter3dEnabled ? SNOWMAN_3D_MODEL : null,
    });
    engineRef.current = engine;
    engine.setCatchLabel(catchLabelRef.current);
    engine.setOtterFriendVisible(withOtterFriendRef.current);
    engine.setFriendCatchLabel(friendCatchLabelRef.current);
    engine.setHammockFull(hammockFullRef.current);
    engine.setFriendMelt(friendMeltRef.current);
    engine.setFriendBuildStage(friendBuildStageRef.current);
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // otter3dEnabled 는 처음 정한 뒤 바뀌지 않아, 엔진은 한 번만 만든다
  }, [otter3dEnabled]);

  // 말풍선은 3D 눈사람 머리 위에만 띄운다 (그림 친구는 자리와 키가 다르다)
  const bubble = friendBubble && otter3dEnabled && size ? bubblePlacement(size) : null;

  return (
    <div ref={rootRef} className={cn('relative w-full overflow-hidden', className)}>
      <button
        type="button"
        aria-label={sceneLabel(withOtterFriend, hammockFull)}
        className="block h-full w-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        onClick={() => {
          const engine = engineRef.current;
          // 3D 해달을 끌어 돌린 뒤 손을 뗀 것은 탭이 아니다
          if (!engine || engine.consumeDrag()) return;
          engine.catchFish();
        }}
      >
        {/* 3D 해달은 가로로 끌어 돌리므로, 브라우저는 세로 스크롤만 맡게 한다 */}
        <canvas
          ref={canvasRef}
          aria-hidden
          className={cn('block h-full w-full', otter3dEnabled && 'touch-pan-y')}
        />
      </button>
      {fishingAreaProps && area && (
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{ left: area.x, top: area.y, width: area.width, height: area.height }}
          {...fishingAreaProps}
        />
      )}
      {/* 장면 버튼 안에 넣지 않는다 (버튼 안의 버튼이 되지 않게). 눈사람 머리 위에 얹는다 */}
      {bubble && (
        <div
          className="absolute -translate-y-full rounded-2xl bg-card p-3 shadow-lg"
          style={{ left: bubble.left, top: bubble.top, width: BUBBLE.WIDTH }}
        >
          {friendBubble}
          <span
            aria-hidden
            className="absolute -bottom-1.5 rotate-45 rounded-[3px] bg-card"
            style={{ left: bubble.tailLeft, width: BUBBLE.TAIL, height: BUBBLE.TAIL }}
          />
        </div>
      )}
    </div>
  );
}
