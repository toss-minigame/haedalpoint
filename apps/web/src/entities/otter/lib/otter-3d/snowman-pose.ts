import { CATCH_TIMELINE, friendPhase, type SceneState } from '../scene/scene-state';

/**
 * 눈사람 표정. 앞의 다섯은 해달 친구 그림의 다섯 모습과 같은 순서다 (기다림 → 알아챔 → 끙끙 → 만세 → 활짝).
 * melt 는 녹는 중(걱정하는 눈썹·땀), plain 은 만드는 중인 눈사람(표시 없이 가만히)
 */
export type SnowmanFace = 'idle' | 'notice' | 'pull' | 'cheer' | 'happy' | 'melt' | 'plain';

/** 눈사람을 다 만든 단계. 친구로 와 있는 눈사람은 항상 이 단계다 */
export const SNOWMAN_COMPLETE_STAGE = 6;

/** 장면이 눈사람에게 알려 주는 상태 */
export type SnowmanView = {
  /** 친구로 와서 함께 낚시하는 중인지. 아니면 buildStage 단계의 만드는 중인 눈사람을 그린다 */
  alive: boolean;
  /** 녹은 정도 (0 = 멀쩡, 1 = 다 녹음). 떠나기 전 한 시간 동안 커진다 */
  melt: number;
  /** 만드는 중인 단계 (0 = 없음, 1 = 작은 눈덩이 … 6 = 완성). alive 면 쓰지 않는다 */
  buildStage: number;
  /** 얼린 뒤 지난 시간 (초). 얼린 적이 없으면 null */
  freezeElapsed: number | null;
};

/**
 * 눈사람의 한 순간 자세. 각도는 rad, 길이는 모델 단위.
 * - armRaise: 나뭇가지 팔을 든 각도 (0 = 가로, + = 위로)
 * - armWave: 두 팔이 엇갈려 흔들리는 각도 (만세할 때)
 * - lean: 몸을 기울인 각도 (+ = 왼쪽으로)
 * - headTilt: 고개를 갸웃하는 각도
 * - squash: 몸 세로 배율 (숨쉬기·통통 튀기)
 * - melt: 녹아내린 정도 (0 = 멀쩡, 1 = 다 녹음). 몸통 위는 가라앉고 아래는 흘러 퍼진다
 * - size: 전체 크기 배율 (만들기 첫 단계의 작은 눈덩이)
 * - hop: 뛰어오른 높이
 * - fxBob: 머리 옆 표시(하트·반짝이 등)가 위아래로 움직인 높이 (녹을 때는 땀방울이 떨어진다)
 * - puddle: 발밑 물웅덩이 크기 (0 = 없음, 1 = 눈사람 발밑만큼. 녹을수록 더 넓게 번진다)
 * - ice: 둘레 얼음 조각 크기 (0 = 없음)
 * - stage: 보이는 부품 단계 (1 = 몸통만 … 6 = 전부)
 */
export type SnowmanPose = {
  armRaise: number;
  armWave: number;
  lean: number;
  headTilt: number;
  squash: number;
  melt: number;
  size: number;
  hop: number;
  fxBob: number;
  puddle: number;
  ice: number;
  stage: number;
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

/** 녹을 때 (melt = 1 일 때의 값. 그 사이는 melt 에 비례한다) */
const MELT = {
  ARM_SPLAY: -0.3, // 다 녹았을 때 팔 각도 (무너진 몸 위에 걸쳐 옆으로 벌어진다)
  PUDDLE_START: 0.6, // 녹기 시작할 때 물웅덩이 크기
  PUDDLE_END: 1.4, // 다 녹았을 때 물웅덩이 크기 (퍼진 몸보다 넓다)
  LEAN: 0.07,
  HEAD_TILT: 0.12,
  WOBBLE: 0.03, // 힘없이 흔들리는 각도
  WOBBLE_SPEED: 1.7, // rad/s
  DRIP_SECONDS: 1.4, // 땀방울 하나가 떨어지는 데 걸리는 시간
  DRIP_FALL: 0.3, // 땀방울이 떨어지는 거리
} as const;

/** 얼릴 때: 얼음 조각이 톡 솟았다가(POP) 잠깐 머물고(HOLD) 사라진다(END). 그동안 활짝 웃으며 만세한다 */
const FREEZE = { POP: 0.25, HOLD: 1.4, END: 2.0, CHEER_UNTIL: 1.6 } as const;

/** 만들기 첫 단계(작은 눈덩이)의 크기 */
const SMALL_SNOWBALL_SIZE = 0.5;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
/** 끝에서 살짝 넘쳤다 돌아온다 (톡 튀어나오는 느낌) */
const easeOutBack = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

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

/** 친구로 와서 함께 낚시하는 눈사람 (해달 친구와 같은 주기로 물고기를 잡는 시늉을 한다) */
function alivePose(state: SceneState): SnowmanPose {
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
    melt: 0,
    size: 1,
    hop: Math.max(noticeHop, 0),
    fxBob: POSE.FX_BOB * Math.sin(time * POSE.FX_SPEED),
    puddle: 0,
    ice: 0,
    stage: SNOWMAN_COMPLETE_STAGE,
    face,
  };
}

/** 녹는 눈사람: 몸이 무너져 흘러 퍼지고 팔이 처지며, 땀방울이 떨어지고, 발밑에 물이 번진다. 낚시 시늉은 하지 않는다 */
function meltingPose(time: number, melt: number): SnowmanPose {
  const wobble = Math.sin(time * MELT.WOBBLE_SPEED);
  const drip = (time / MELT.DRIP_SECONDS) % 1;
  return {
    armRaise: lerp(POSE.ARM_REST, MELT.ARM_SPLAY, melt),
    armWave: 0,
    lean: (MELT.LEAN + MELT.WOBBLE * wobble) * melt,
    headTilt: (MELT.HEAD_TILT + MELT.WOBBLE * wobble) * melt,
    squash: 1,
    melt,
    size: 1,
    hop: 0,
    fxBob: -MELT.DRIP_FALL * drip,
    puddle: lerp(MELT.PUDDLE_START, MELT.PUDDLE_END, melt),
    ice: 0,
    stage: SNOWMAN_COMPLETE_STAGE,
    face: 'melt',
  };
}

/** 얼음 조각 크기: 톡 솟았다가 잠깐 머물고 사라진다 */
function iceAt(elapsed: number): number {
  if (elapsed < FREEZE.POP) return easeOutBack(elapsed / FREEZE.POP);
  if (elapsed < FREEZE.HOLD) return 1;
  return 1 - clamp01((elapsed - FREEZE.HOLD) / (FREEZE.END - FREEZE.HOLD));
}

/** 만드는 중인 눈사람: 단계까지의 부품만 보이고 가만히 서 있다 */
function buildingPose(stage: number): SnowmanPose {
  return {
    armRaise: POSE.ARM_REST,
    armWave: 0,
    lean: 0,
    headTilt: 0,
    squash: 1,
    melt: 0,
    size: stage <= 1 ? SMALL_SNOWBALL_SIZE : 1,
    hop: 0,
    fxBob: 0,
    puddle: 0,
    ice: 0,
    stage: Math.min(stage, SNOWMAN_COMPLETE_STAGE),
    face: 'plain',
  };
}

/** 장면 시각과 눈사람 상태에서 지금 자세를 구한다 */
export function snowmanPose(state: SceneState, view: SnowmanView): SnowmanPose {
  if (!view.alive) return buildingPose(view.buildStage);
  const { time } = state;
  const base = view.melt > 0 ? meltingPose(time, view.melt) : alivePose(state);
  const elapsed = view.freezeElapsed;
  if (elapsed === null || elapsed < 0 || elapsed >= FREEZE.END) return base;
  const cheering = elapsed < FREEZE.CHEER_UNTIL;
  return {
    ...base,
    ice: iceAt(elapsed),
    armRaise: cheering ? POSE.ARM_CHEER : base.armRaise,
    armWave: cheering ? POSE.ARM_WAVE * Math.sin(time * POSE.WAVE_SPEED) : base.armWave,
    fxBob: cheering ? POSE.FX_BOB * Math.sin(time * POSE.FX_SPEED) : base.fxBob,
    face: cheering ? 'happy' : base.face,
  };
}
