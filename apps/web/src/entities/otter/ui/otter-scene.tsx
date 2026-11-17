import { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib/utils';
import {
  FISH_SPRITES,
  OTTER_FISHING_FRAMES,
  OTTER_FRIEND_FISHING_FRAMES,
  OTTER_FULL_SPRITE,
  PUDDLE_SPRITE,
  SNOW_BACKGROUND_SPRITE,
} from '../lib/otter-sprites';
import { createSceneEngine, type SceneEngine } from '../lib/scene/scene-engine';

type Props = {
  className?: string;
  /** 자동으로 잡을 때마다 물고기 옆에 띄울 글자 (예: +3). 없으면 띄우지 않는다 */
  catchLabel?: string | null;
  /** 해달 친구가 함께 낚시하면 true. 물웅덩이 왼쪽에 앉는다 */
  withOtterFriend?: boolean;
  /** 해달 친구가 물고기를 잡을 때 머리 위에 띄울 글자 (친구 몫). 없으면 띄우지 않는다 */
  friendCatchLabel?: string | null;
  /** 해먹이 가득 찼으면 true. 낚시를 멈추고 물고기가 가득한 양동이를 든 모습이 된다 */
  hammockFull?: boolean;
};

function sceneLabel(withOtterFriend: boolean, hammockFull: boolean): string {
  if (hammockFull) return '해먹이 가득 차 물고기 양동이를 든 해달. 창고에 저장하면 다시 낚시해요';
  return withOtterFriend
    ? '해달 친구와 함께 얼음낚시하는 해달. 누르면 해달이 물고기를 잡아요'
    : '얼음낚시하는 해달. 누르면 해달이 물고기를 잡아요';
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// 해달이 설원에 앉아 물웅덩이에서 물고기를 낚는 장면 (캔버스). CATCH_INTERVAL_SECONDS 마다 스스로 잡고,
// 탭하면 바로 한 마리 잡는다 (탭은 연출만 하고 catchLabel 은 띄우지 않는다). 해먹이 가득 차면 잡지 않는다.
export function OtterScene({
  className,
  catchLabel = null,
  withOtterFriend = false,
  friendCatchLabel = null,
  hammockFull = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);
  // 엔진은 한 번만 만들므로, 만들 때 쓸 최신 값을 ref 로 들고 있는다
  const catchLabelRef = useRef(catchLabel);
  const withOtterFriendRef = useRef(withOtterFriend);
  const friendCatchLabelRef = useRef(friendCatchLabel);
  const hammockFullRef = useRef(hammockFull);

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
    });
    engineRef.current = engine;
    engine.setCatchLabel(catchLabelRef.current);
    engine.setOtterFriendVisible(withOtterFriendRef.current);
    engine.setFriendCatchLabel(friendCatchLabelRef.current);
    engine.setHammockFull(hammockFullRef.current);
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={sceneLabel(withOtterFriend, hammockFull)}
      className={cn(
        'block w-full overflow-hidden outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
        className,
      )}
      onClick={() => engineRef.current?.catchFish()}
    >
      <canvas ref={canvasRef} aria-hidden className="block h-full w-full" />
    </button>
  );
}
