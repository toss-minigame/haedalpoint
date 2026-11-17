import { CATCH_TIMELINE, friendPhase, type SceneState } from '../scene/scene-state';

/** 눈사람 표정. 해달 친구 그림의 다섯 모습과 같은 순서다 (기다림 → 알아챔 → 끙끙 → 만세 → 활짝) */
export type SnowmanFace = 'idle' | 'notice' | 'pull' | 'cheer' | 'happy';

/**
 * 눈사람 친구의 한 순간 자세. 각도는 rad, 길이는 모델 단위.
 * - armRaise: 나뭇가지 팔을 든 각도 (0 = 가로, + = 위로)
 * - armWave: 두 팔이 엇갈려 흔들리는 각도 (만세할 때)
 * - lean: 몸을 기울인 각도 (+ = 왼쪽으로)
 * - headTilt: 고개를 갸웃하는 각도
 * - squash: 몸 세로 배율
 * - hop: 뛰어오른 높이
 * - fxBob: 머리 옆 표시(하트·반짝이 등)가 위아래로 둥실거리는 높이
 */
export type SnowmanPose = {
  armRaise: number;
  armWave: number;
  lean: number;
  headTilt: number;
  squash: number;
  hop: number;
  fxBob: number;
  face: SnowmanFace;
};

const POSE = {
  ARM_REST: -0.55, // 기다릴 때 팔 (아래로 늘어뜨림)
  ARM_NOTICE: -0.1,
  ARM_PULL: 0.12,
  ARM_CHEER: 0.75,
  ARM_WAVE: 0.14,
  WAVE_SPEED: 9, // rad/s
  PULL_LEAN: 0.2,
  PULL_SHAKE: 0.025,
  PULL_SHAKE_SPEED: 40, // rad/s
  NOTICE_HOP: 0.12,
  HAPPY_BOUNCE: 0.05,
  HAPPY_SPEED: 7, // rad/s
  IDLE_TILT: 0.06,
  IDLE_SPEED: 1.3, // rad/s
  BREATH_SQUASH: 0.012,
  BREATH_SPEED: 2.4, // rad/s
  FX_BOB: 0.05,
  FX_SPEED: 3, // rad/s
  RELAX_SECONDS: 0.4, // 다 잡은 뒤 팔을 내리는 데 걸리는 시간
} as const;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** 잡는 동작의 구간 시작 시각 (초). 해달 친구 그림이 프레임을 바꾸던 시각과 같다 */
const REEL = CATCH_TIMELINE.REEL_START;
const HOLD = CATCH_TIMELINE.HOLD_START;
const LIFT = (REEL + HOLD) / 2;
const DONE = CATCH_TIMELINE.CAST_START;

/** [시각, 팔 각도, 기울기]. 사이는 부드럽게 잇는다 */
const KEYS: readonly (readonly [number, number, number])[] = [
  [0, POSE.ARM_REST, 0],
  [0.18, POSE.ARM_NOTICE, 0],
  [REEL, POSE.ARM_NOTICE, 0],
  [REEL + 0.12, POSE.ARM_PULL, POSE.PULL_LEAN],
  [LIFT, POSE.ARM_PULL, POSE.PULL_LEAN],
  [LIFT + 0.15, POSE.ARM_CHEER, 0],
  [DONE, POSE.ARM_CHEER, 0],
  [DONE + POSE.RELAX_SECONDS, POSE.ARM_REST, 0],
];

function keyed(phase: number): { arm: number; lean: number } {
  const last = KEYS[KEYS.length - 1];
  if (!last || phase >= last[0]) return { arm: POSE.ARM_REST, lean: 0 };
  for (let i = 1; i < KEYS.length; i++) {
    const from = KEYS[i - 1];
    const to = KEYS[i];
    if (!from || !to || phase >= to[0]) continue;
    const t = smooth(clamp01((phase - from[0]) / (to[0] - from[0])));
    return { arm: lerp(from[1], to[1], t), lean: lerp(from[2], to[2], t) };
  }
  return { arm: POSE.ARM_REST, lean: 0 };
}

function faceAt(phase: number | null): SnowmanFace {
  if (phase === null || phase >= DONE) return 'idle';
  if (phase < REEL) return 'notice';
  if (phase < LIFT) return 'pull';
  return phase < HOLD ? 'cheer' : 'happy';
}

/** 장면 시각에서 지금 눈사람 친구 자세를 구한다 (해달 친구와 같은 주기로 물고기를 잡는 시늉을 한다) */
export function snowmanPose(state: SceneState): SnowmanPose {
  const { time } = state;
  const phase = friendPhase(state);
  const face = faceAt(phase);
  const { arm, lean } = phase === null ? { arm: POSE.ARM_REST, lean: 0 } : keyed(phase);
  const busy = face !== 'idle';
  const cheering = face === 'cheer' || face === 'happy';
  const bounce = face === 'happy' ? Math.abs(Math.sin((phase ?? 0) * POSE.HAPPY_SPEED)) : 0;
  const noticeHop =
    face === 'notice' ? POSE.NOTICE_HOP * Math.sin(Math.PI * clamp01((phase ?? 0) / 0.3)) : 0;
  return {
    armRaise: arm,
    armWave: cheering ? POSE.ARM_WAVE * Math.sin(time * POSE.WAVE_SPEED) : 0,
    lean: lean + (face === 'pull' ? POSE.PULL_SHAKE * Math.sin(time * POSE.PULL_SHAKE_SPEED) : 0),
    headTilt: busy ? 0 : POSE.IDLE_TILT * Math.sin(time * POSE.IDLE_SPEED),
    squash:
      1 + POSE.BREATH_SQUASH * Math.sin(time * POSE.BREATH_SPEED) - POSE.HAPPY_BOUNCE * bounce,
    hop: Math.max(noticeHop, 0),
    fxBob: POSE.FX_BOB * Math.sin(time * POSE.FX_SPEED),
    face,
  };
}
