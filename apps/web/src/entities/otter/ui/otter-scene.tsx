import { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { OTTER_SPRITES } from '../lib/otter-sprites';
import { createSceneEngine, type SceneEngine } from '../lib/scene/scene-engine';

type Props = {
  className?: string;
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// 해달이 바다에서 물고기를 잡는 장면 (캔버스). 탭하면 바로 한 마리 잡는다.
// 장식용 연출이므로 재화 수량은 표시하지 않는다 (물고기 지갑 API 연동 후 별도 표시).
export function OtterScene({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createSceneEngine(canvas, {
      sprites: { idle: OTTER_SPRITES.idle, happy: OTTER_SPRITES.happy },
      reducedMotion: window.matchMedia(REDUCED_MOTION_QUERY).matches,
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <button
      type="button"
      aria-label="바다에서 물고기를 잡는 해달. 누르면 해달이 물고기를 잡아요"
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
