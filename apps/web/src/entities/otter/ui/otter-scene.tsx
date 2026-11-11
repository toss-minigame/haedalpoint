import { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib/utils';
import {
  FISH_SPRITES,
  OTTER_FISHING_SPRITES,
  OTTER_FRIEND_FISHING_SPRITES,
  PIER_SPRITE,
  SEA_BACKGROUND_SPRITE,
  SEA_WAVE_SPRITE,
} from '../lib/otter-sprites';
import { createSceneEngine, type SceneEngine } from '../lib/scene/scene-engine';

type Props = {
  className?: string;
  /** 자동으로 잡을 때마다 물고기 옆에 띄울 글자 (예: +0.0000208). 없으면 띄우지 않는다 */
  catchLabel?: string | null;
  /** 오늘 해달 친구가 함께 낚시하면 true. 해달 왼쪽 선착장 모서리에 걸터앉는다 */
  withOtterFriend?: boolean;
  /** 해달 친구가 낚싯대를 들어 올릴 때 머리 위에 띄울 글자 (친구 몫). 없으면 띄우지 않는다 */
  friendCatchLabel?: string | null;
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// 해달이 선착장에 앉아 바다에서 물고기를 낚는 장면 (캔버스). CATCH_INTERVAL_SECONDS 마다 스스로 잡고,
// 탭하면 바로 한 마리 잡는다 (탭은 연출만 하고 catchLabel 은 띄우지 않는다).
export function OtterScene({
  className,
  catchLabel = null,
  withOtterFriend = false,
  friendCatchLabel = null,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);
  // 엔진은 한 번만 만들므로, 만들 때 쓸 최신 값을 ref 로 들고 있는다
  const catchLabelRef = useRef(catchLabel);
  const withOtterFriendRef = useRef(withOtterFriend);
  const friendCatchLabelRef = useRef(friendCatchLabel);

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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createSceneEngine(canvas, {
      sprites: {
        idle: OTTER_FISHING_SPRITES.idle,
        happy: OTTER_FISHING_SPRITES.catch,
        pier: PIER_SPRITE,
        fish: FISH_SPRITES,
        background: SEA_BACKGROUND_SPRITE,
        wave: SEA_WAVE_SPRITE,
        friend: OTTER_FRIEND_FISHING_SPRITES,
      },
      reducedMotion: window.matchMedia(REDUCED_MOTION_QUERY).matches,
    });
    engineRef.current = engine;
    engine.setCatchLabel(catchLabelRef.current);
    engine.setOtterFriendVisible(withOtterFriendRef.current);
    engine.setFriendCatchLabel(friendCatchLabelRef.current);
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={
        withOtterFriend
          ? '선착장에서 해달 친구와 함께 낚시하는 해달. 누르면 해달이 물고기를 잡아요'
          : '선착장에서 낚시하는 해달. 누르면 해달이 물고기를 잡아요'
      }
      className={cn(
        'block w-full overflow-hidden rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
      onClick={() => engineRef.current?.catchFish()}
    >
      <canvas ref={canvasRef} aria-hidden className="block h-72 w-full" />
    </button>
  );
}
