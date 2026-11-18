import { Group } from 'three';
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSnowmanMelt } from './snowman-melt';
import type { SnowmanFace, SnowmanPose } from './snowman-pose';
import { findNodes, stylize } from './toon';

/**
 * 해달 친구인 3D 눈사람 (snowman-3d.glb, design/otter-3d/build_snowman.py 로 Blender 에서 만든 모델).
 * 모델 단위: 바닥이 0, 몸 가운데가 x = 0, 앞을 바라본다.
 */

/** 눈사람 키 (바닥 ~ 모자 방울 꼭대기, 모델 단위) */
export const SNOWMAN_HEIGHT = 2.64;
/** 눈사람이 웅덩이 쪽(오른쪽)으로 살짝 몸을 돌려 선다 */
const BASE_YAW = 0.22;
/** 이보다 작으면 그리지 않는다 (물웅덩이·얼음 조각) */
const HIDDEN_SCALE = 0.01;
/** 다 녹았을 때: 목도리가 넓어지는 정도, 모자가 기우는 각도 (rad)와 옆으로 미끄러지는 거리 */
const MELT_SCARF_WIDEN = 0.18;
const MELT_HAT_TILT = 0.32;
const MELT_HAT_SLIDE = 0.07;
/**
 * 물웅덩이를 카메라 쪽으로 기울이는 각도 (rad). 장면을 옆에서 보기 때문에 눕혀 두면 선으로만 보여,
 * 장면의 낚시 웅덩이처럼 납작한 타원으로 보이게 한다
 */
const PUDDLE_TILT = 0.2;

const NODE_NAMES = {
  root: 'SnowRoot',
  head: 'SnowHead',
  armL: 'SnowArmL',
  armR: 'SnowArmR',
  body: 'SnowBody',
  button0: 'SnowButton0',
  button1: 'SnowButton1',
  scarf: 'SnowScarf',
  scarfTail: 'SnowScarfTail',
  headBall: 'SnowHeadBall',
  hat: 'SnowHat',
  nose: 'SnowNose',
  cheekL: 'SnowCheekL',
  cheekR: 'SnowCheekR',
  eyesOpen: 'SnowEyesOpen',
  eyesHappy: 'SnowEyesHappy',
  brows: 'SnowBrows',
  browsSad: 'SnowBrowsSad',
  mouthSmile: 'SnowMouthSmile',
  mouthO: 'SnowMouthO',
  mouthFrown: 'SnowMouthFrown',
  mouthOpen: 'SnowMouthOpen',
  fxHeart: 'SnowFxHeart',
  fxNotice: 'SnowFxNotice',
  fxSweat: 'SnowFxSweat',
  fxSparkle: 'SnowFxSparkle',
  puddle: 'SnowPuddle',
  ice: 'SnowIce',
} as const;

type NodeKey = keyof typeof NODE_NAMES;

/** 표정에 따라 바꿔 보이는 눈·눈썹·입·머리 옆 표시 */
const FACE_PARTS = [
  'eyesOpen',
  'eyesHappy',
  'brows',
  'browsSad',
  'mouthSmile',
  'mouthO',
  'mouthFrown',
  'mouthOpen',
  'fxHeart',
  'fxNotice',
  'fxSweat',
  'fxSparkle',
] as const satisfies readonly NodeKey[];

type FacePart = (typeof FACE_PARTS)[number];

const FACES: Record<SnowmanFace, readonly FacePart[]> = {
  idle: ['eyesOpen', 'mouthSmile', 'fxHeart'],
  notice: ['eyesOpen', 'mouthO', 'fxNotice'],
  pull: ['eyesOpen', 'brows', 'mouthFrown', 'fxSweat'],
  cheer: ['eyesOpen', 'mouthOpen', 'fxNotice'],
  happy: ['eyesHappy', 'mouthOpen', 'fxSparkle'],
  melt: ['eyesOpen', 'browsSad', 'mouthFrown', 'fxSweat'],
  plain: ['eyesOpen', 'mouthSmile'],
};

const FX_PARTS = [
  'fxHeart',
  'fxNotice',
  'fxSweat',
  'fxSparkle',
] as const satisfies readonly FacePart[];

/**
 * 눈사람을 만들어 가는 순서: 부품마다 보이기 시작하는 단계 (docs/design/snowman-friend.md).
 * 1 몸통(작은 눈덩이) → 2 큰 몸통 → 3 머리 → 4 팔 → 5 얼굴·단추 → 6 목도리·모자
 */
const PART_STAGES: readonly (readonly [NodeKey, number])[] = [
  ['body', 1],
  ['headBall', 3],
  ['armL', 4],
  ['armR', 4],
  ['nose', 5],
  ['cheekL', 5],
  ['cheekR', 5],
  ['button0', 5],
  ['button1', 5],
  ['scarf', 6],
  ['scarfTail', 6],
  ['hat', 6],
];
/** 눈·입(표정)이 보이기 시작하는 단계 */
const FACE_STAGE = 5;

export type Snowman = {
  /** 장면에 놓는 묶음. 위치·크기는 이 묶음에 준다 (자세는 안쪽 노드가 움직인다) */
  holder: Group;
  applyPose: (pose: SnowmanPose) => void;
};

export async function loadSnowman(loader: GLTFLoader, url: string): Promise<Snowman> {
  const gltf = await loader.loadAsync(url);
  stylize(gltf.scene);
  const nodes = findNodes(gltf.scene, NODE_NAMES);
  const holder = new Group();
  holder.add(gltf.scene);
  holder.rotation.y = BASE_YAW;
  nodes.puddle.rotation.x = PUDDLE_TILT;
  const rest = {
    armL: nodes.armL.rotation.z,
    armR: nodes.armR.rotation.z,
    head: nodes.head.rotation.z,
    hatTilt: nodes.hat.rotation.z,
    hatX: nodes.hat.position.x,
    fx: Object.fromEntries(FX_PARTS.map((key) => [key, nodes[key].position.y])),
  };

  // 녹을 때: 몸통이 무너져 퍼지고, 몸통에 붙은 머리·팔·목도리·단추가 함께 내려간다
  const applyMelt = createSnowmanMelt({
    body: nodes.body,
    headBall: nodes.headBall,
    attached: [
      nodes.head,
      nodes.armL,
      nodes.armR,
      nodes.scarf,
      nodes.scarfTail,
      nodes.button0,
      nodes.button1,
    ],
  });

  const applyPose = (pose: SnowmanPose) => {
    const { root, head, hat, scarf, armL, armR, puddle, ice } = nodes;
    root.rotation.z = pose.lean;
    const side = pose.size / Math.sqrt(pose.squash);
    root.scale.set(side, pose.squash * pose.size, side);
    root.position.y = pose.hop;
    applyMelt(pose.melt);
    // 목도리는 퍼진 목둘레에 맞춰 넓어지고, 모자는 옆으로 미끄러지며 기운다
    scarf.scale.set(1 + MELT_SCARF_WIDEN * pose.melt, 1, 1 + MELT_SCARF_WIDEN * pose.melt);
    hat.rotation.z = rest.hatTilt + MELT_HAT_TILT * pose.melt;
    hat.position.x = rest.hatX - MELT_HAT_SLIDE * pose.melt;
    head.rotation.z = rest.head + pose.headTilt;
    // 왼팔은 왼쪽(-x)으로 뻗어 있어 z 축으로 음의 방향으로 돌려야 올라간다 (오른팔은 반대)
    armL.rotation.z = rest.armL - (pose.armRaise + pose.armWave);
    armR.rotation.z = rest.armR + (pose.armRaise - pose.armWave);
    for (const [part, stage] of PART_STAGES) nodes[part].visible = pose.stage >= stage;
    const shown = pose.stage >= FACE_STAGE ? FACES[pose.face] : [];
    for (const part of FACE_PARTS) nodes[part].visible = shown.includes(part);
    for (const key of FX_PARTS) nodes[key].position.y = (rest.fx[key] ?? 0) + pose.fxBob;
    puddle.visible = pose.puddle > HIDDEN_SCALE;
    puddle.scale.set(pose.puddle, 1, pose.puddle);
    ice.visible = pose.ice > HIDDEN_SCALE;
    ice.scale.setScalar(Math.max(pose.ice, HIDDEN_SCALE));
  };

  return { holder, applyPose };
}
