import { Group } from 'three';
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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

const NODE_NAMES = {
  root: 'SnowRoot',
  head: 'SnowHead',
  armL: 'SnowArmL',
  armR: 'SnowArmR',
  eyesOpen: 'SnowEyesOpen',
  eyesHappy: 'SnowEyesHappy',
  brows: 'SnowBrows',
  mouthSmile: 'SnowMouthSmile',
  mouthO: 'SnowMouthO',
  mouthFrown: 'SnowMouthFrown',
  mouthOpen: 'SnowMouthOpen',
  fxHeart: 'SnowFxHeart',
  fxNotice: 'SnowFxNotice',
  fxSweat: 'SnowFxSweat',
  fxSparkle: 'SnowFxSparkle',
} as const;

type NodeKey = keyof typeof NODE_NAMES;
type FacePart = Exclude<NodeKey, 'root' | 'head' | 'armL' | 'armR'>;

const FACE_PARTS: readonly FacePart[] = [
  'eyesOpen',
  'eyesHappy',
  'brows',
  'mouthSmile',
  'mouthO',
  'mouthFrown',
  'mouthOpen',
  'fxHeart',
  'fxNotice',
  'fxSweat',
  'fxSparkle',
];

/** 표정마다 보이는 눈·입·머리 옆 표시 */
const FACES: Record<SnowmanFace, readonly FacePart[]> = {
  idle: ['eyesOpen', 'mouthSmile', 'fxHeart'],
  notice: ['eyesOpen', 'mouthO', 'fxNotice'],
  pull: ['eyesOpen', 'brows', 'mouthFrown', 'fxSweat'],
  cheer: ['eyesOpen', 'mouthOpen', 'fxNotice'],
  happy: ['eyesHappy', 'mouthOpen', 'fxSparkle'],
};

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
  const rest = {
    armL: nodes.armL.rotation.z,
    armR: nodes.armR.rotation.z,
    head: nodes.head.rotation.z,
    fx: Object.fromEntries(
      (['fxHeart', 'fxNotice', 'fxSweat', 'fxSparkle'] as const).map((key) => [
        key,
        nodes[key].position.y,
      ]),
    ),
  };

  const applyPose = (pose: SnowmanPose) => {
    const { root, head, armL, armR } = nodes;
    root.rotation.z = pose.lean;
    const side = 1 / Math.sqrt(pose.squash);
    root.scale.set(side, pose.squash, side);
    root.position.y = pose.hop;
    head.rotation.z = rest.head + pose.headTilt;
    // 왼팔은 왼쪽(-x)으로 뻗어 있어 z 축으로 음의 방향으로 돌려야 올라간다 (오른팔은 반대)
    armL.rotation.z = rest.armL - (pose.armRaise + pose.armWave);
    armR.rotation.z = rest.armR + (pose.armRaise - pose.armWave);
    const shown = FACES[pose.face];
    for (const part of FACE_PARTS) nodes[part].visible = shown.includes(part);
    for (const key of ['fxHeart', 'fxNotice', 'fxSweat', 'fxSparkle'] as const) {
      nodes[key].position.y = (rest.fx[key] ?? 0) + pose.fxBob;
    }
  };

  return { holder, applyPose };
}
