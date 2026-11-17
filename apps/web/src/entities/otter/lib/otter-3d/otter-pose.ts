import { CATCH_TIMELINE, catchElapsed, type SceneState } from '../scene/scene-state';

/**
 * 3D 해달의 한 순간 자세. 각도는 rad.
 * - rodLift: 낚싯대를 들어 올린 각도 (0 = 드리운 모습, + = 위로)
 * - headRoll: 고개를 좌우로 갸웃하는 각도
 * - headNod: 고개를 숙인 각도 (+ = 웅덩이를 내려다봄)
 * - lean: 몸을 기울인 각도 (- = 낚싯대 반대쪽으로 젖힘)
 * - squash: 몸 세로 배율 (숨쉬기·통통 튀기)
 */
export type OtterPose = {
  rodLift: number;
  headRoll: number;
  headNod: number;
  lean: number;
  squash: number;
};

const POSE = {
  ROD_LIFT: 1.0, // 잡아 올렸을 때 낚싯대 각도
  ROD_SWAY: 0.02, // 기다릴 때 낚싯대가 살랑이는 폭
  ROD_SWAY_SPEED: 1.3, // rad/s
  BREATH_PERIOD: 2.4, // s
  BREATH_SQUASH: 0.015,
  IDLE_HEAD_ROLL: 0.05,
  IDLE_HEAD_SPEED: 1.1, // rad/s
  NOTICE_NOD: 0.14, // 입질에 웅덩이를 내려다보는 각도
  NOTICE_DIP: 0.06, // 입질에 낚싯대 끝이 끌려 내려가는 각도
  NOTICE_TWITCH: 0.04,
  NOTICE_TWITCH_SPEED: 38, // rad/s, 줄 끝 떨림(scene-state BITE_TUG_SPEED)과 맞춘다
  REEL_LEAN: 0.12, // 끌어 올릴 때 뒤로 젖히는 각도
  HOLD_LOOK_UP: -0.08, // 잡은 물고기를 올려다보는 각도
  HOLD_HEAD_ROLL: 0.14,
  HOLD_SPEED: 7, // rad/s, 잡은 뒤 신나서 몸을 흔드는 빠르기
  HOLD_BOUNCE: 0.04,
} as const;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** 기다리는 동안: 숨을 쉬고 고개를 살짝 갸웃하며 낚싯대가 살랑인다 */
function idlePose(time: number): OtterPose {
  return {
    rodLift: POSE.ROD_SWAY * Math.sin(time * POSE.ROD_SWAY_SPEED),
    headRoll: POSE.IDLE_HEAD_ROLL * Math.sin(time * POSE.IDLE_HEAD_SPEED),
    headNod: 0,
    lean: 0,
    squash: 1 + POSE.BREATH_SQUASH * Math.sin((time * 2 * Math.PI) / POSE.BREATH_PERIOD),
  };
}

/** 잡는 동작 (입질 → 챔질 → 잡음 → 던짐). 장면의 줄·물고기 연출과 같은 시각표를 따른다 */
function catchPose(base: OtterPose, elapsed: number): OtterPose {
  const { REEL_START, HOLD_START, CAST_START, CATCH_END } = CATCH_TIMELINE;
  if (elapsed < REEL_START) {
    const p = clamp01(elapsed / REEL_START);
    const twitch = POSE.NOTICE_TWITCH * Math.sin(elapsed * POSE.NOTICE_TWITCH_SPEED) * p;
    return {
      ...base,
      headNod: POSE.NOTICE_NOD * easeOut(p),
      rodLift: -POSE.NOTICE_DIP * p - twitch,
    };
  }
  if (elapsed < HOLD_START) {
    const p = clamp01((elapsed - REEL_START) / (HOLD_START - REEL_START));
    return {
      ...base,
      rodLift: POSE.ROD_LIFT * easeOut(p),
      lean: -POSE.REEL_LEAN * Math.sin(Math.PI * p),
      headNod: POSE.NOTICE_NOD * (1 - p) + POSE.HOLD_LOOK_UP * p,
    };
  }
  if (elapsed < CAST_START) {
    const wave = Math.sin((elapsed - HOLD_START) * POSE.HOLD_SPEED);
    return {
      ...base,
      rodLift: POSE.ROD_LIFT,
      headNod: POSE.HOLD_LOOK_UP,
      headRoll: POSE.HOLD_HEAD_ROLL * wave,
      squash: 1 - POSE.HOLD_BOUNCE * Math.abs(wave),
    };
  }
  if (elapsed < CATCH_END) {
    const p = clamp01((elapsed - CAST_START) / (CATCH_END - CAST_START));
    return {
      ...base,
      rodLift: POSE.ROD_LIFT * (1 - easeInOut(p)),
      headNod: POSE.HOLD_LOOK_UP * (1 - p),
    };
  }
  return base;
}

/** 장면 상태에서 지금 3D 해달 자세를 구한다 */
export function otterPose(state: SceneState): OtterPose {
  const base = idlePose(state.time);
  const elapsed = catchElapsed(state);
  return elapsed === null ? base : catchPose(base, elapsed);
}
