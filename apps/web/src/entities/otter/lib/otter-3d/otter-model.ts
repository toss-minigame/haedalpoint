import {
  AmbientLight,
  DirectionalLight,
  type Object3D,
  OrthographicCamera,
  Quaternion,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { OutfitCode } from '../otter-outfits';
import type { OtterModelView } from '../scene/scene-render';
import { isShowingFull, otterLayout, type SceneState, snowmanLayout } from '../scene/scene-state';
import { createWardrobe } from './otter-outfit';
import { FULL_TRANSITION_SECONDS, type OtterPose, otterPose } from './otter-pose';
import { VIEW, viewRect, viewUnit } from './otter-view';
import { loadSnowman, SNOWMAN_HEIGHT, type Snowman } from './snowman-model';
import { type SnowmanView, snowmanPose } from './snowman-pose';
import { findNodes, stylize } from './toon';

/**
 * 3D 해달 (otter-3d.glb, design/otter-3d/build_otter.py 로 Blender 에서 만든 모델).
 * 화면에 붙지 않은 WebGL 캔버스에 해달(과 해달 친구인 눈사람)을 그린 뒤, 장면 캔버스에 그림처럼 붙인다.
 * 그리는 자리와 범위는 otter-view.ts 에 있다.
 */

/** 해달이 낚싯대 쪽(왼쪽)으로 살짝 몸을 돌려 앉는다 (3D 느낌이 나도록) */
const BASE_YAW = -0.22;
const MAX_PIXEL_RATIO = 2;
/**
 * 일어섰을 때: 몸이 올라가는 높이(그만큼 짧은 다리가 드러난다), 발이 몸 아래로 들어가는 거리,
 * 발을 벌리는 거리, 발끝을 바깥으로 돌리는 각도 (rad)
 */
const STAND = { RISE: 0.48, FEET_BACK: 0.2, FEET_OUT: 0.03, FEET_YAW: 0.32 } as const;
/** 꼬리 뿌리에서 끝까지 (build_otter.py 의 TAIL_LENGTH 와 같다). 일어서면 끝이 눈밭에 닿게 내린다 */
const TAIL_LENGTH = 0.9;
/** 낚싯대가 이보다 작아지면(치우는 중) 줄을 그리지 않는다 */
const ROD_LINE_MIN_SCALE = 0.95;
const HIDDEN_SCALE = 0.01;
/**
 * 양동이를 놓는 자리 (손잡이 꼭대기, 해달 기준 모델 단위).
 * 해달 오른쪽 눈밭, 꼬리 끝보다 바깥이라 해달과 겹치지 않는다. 좁은 화면(320px)에서도 화면 안에 든다.
 * 양동이는 해달 몸에서 떼어 두어, 낚시하는 동안은 해달이 숨쉬거나 끌려 돌아가도 제자리에 가만히 있다.
 * 가득 차면 오른손으로 뛰어올라 손을 따라다닌다
 */
const BUCKET_GROUND = { x: 1.88, y: 0.92, z: 0.3 } as const;
/** 눈사람 친구는 해달보다 뒤(카메라에서 먼 쪽)에 두어, 낚싯대가 앞을 지나가게 한다 */
const FRIEND_DEPTH = -2;
/** 눈사람 둘레에 두는 여유 (모델 단위). 머리 옆 표시와 든 팔, 녹아서 퍼진 몸·물웅덩이가 잘리지 않게 */
const FRIEND_MARGIN = 0.7;
/** 녹은 정도가 0 ↔ 1 로 바뀌는 데 걸리는 시간 (초). 얼리면 이 시간 동안 원래 모습으로 돌아온다 */
const MELT_FOLLOW_SECONDS = 0.9;

/** 어두운 면 밝기 = AMBIENT, 밝은 면 = AMBIENT + DIRECT (three.js 조명은 π 를 곱해야 원래 색이 된다) */
const AMBIENT = Math.PI * 0.8;
const DIRECT = Math.PI * 0.2;

/** 코드로 움직이는 노드 (build_otter.py 의 이름과 같다) */
const NODE_NAMES = {
  root: 'OtterRoot',
  torso: 'Torso',
  head: 'HeadPivot',
  eyesOpen: 'EyesOpen',
  eyesHappy: 'EyesHappy',
  rod: 'RodPivot',
  tip: 'RodTip',
  bucket: 'Bucket',
  fishPile: 'FishPile',
  footL: 'FootL',
  footR: 'FootR',
  legL: 'LegL',
  legR: 'LegR',
  tail: 'Tail',
  armL: 'ArmL',
  armR: 'ArmR',
  handL: 'HandL',
  handR: 'HandR',
  gripL: 'GripL',
  gripR: 'GripR',
  holdL: 'HoldL',
  holdR: 'HoldR',
} as const;

type NodeKey = keyof typeof NODE_NAMES;
type Nodes = Record<NodeKey, Object3D>;

/** 모델 단위 범위를 그대로 비추는 정사영 카메라 (원근 없이 그림처럼 보인다) */
function createCamera(): OrthographicCamera {
  const camera = new OrthographicCamera(VIEW.LEFT, VIEW.RIGHT, VIEW.TOP, VIEW.BOTTOM, 0.1, 50);
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);
  return camera;
}

function createScene(): Scene {
  const scene = new Scene();
  scene.add(new AmbientLight(0xffffff, AMBIENT));
  // 왼쪽 위 앞에서 비춘다 (Blender 시안과 같은 방향)
  const sun = new DirectionalLight(0xffffff, DIRECT);
  sun.position.set(-3, 4, 5);
  scene.add(sun);
  return scene;
}

const UP = new Vector3(0, 1, 0);
/** 꼬리를 위아래로 꺾는 축 (꼬리의 로컬 z) */
const FORWARD = new Vector3(0, 0, 1);

/**
 * 모델에 자세를 입히는 함수를 만든다.
 * 팔은 어깨에서 손까지 뻗은 한 덩어리라, 손 자리(낚싯대 또는 양동이·배)를 먼저 정하고 팔을 그쪽으로 돌려 늘인다
 */
function createPoser(nodes: Nodes) {
  const rest = {
    torsoY: nodes.torso.position.y,
    head: nodes.head.rotation.clone(),
    rod: nodes.rod.rotation.clone(),
    footL: nodes.footL.position.clone(),
    footR: nodes.footR.position.clone(),
    footYawL: nodes.footL.rotation.y,
    footYawR: nodes.footR.rotation.y,
    tail: nodes.tail.quaternion.clone(),
    // 다리 길이 = 엉덩이에서 앉았을 때의 발까지 (모델을 만든 그대로의 자세)
    legLengthL: nodes.footL.position.distanceTo(nodes.legL.position),
    legLengthR: nodes.footR.position.distanceTo(nodes.legR.position),
    // 팔 길이 = 어깨에서 낚싯대를 쥔 손까지 (모델을 만든 그대로의 자세)
    armLengthL: nodes.handL.position.distanceTo(nodes.armL.position),
    armLengthR: nodes.handR.position.distanceTo(nodes.armR.position),
  };
  // 양동이를 해달 몸에서 떼어 모델 맨 위에 붙인다. 눈밭에 있을 때 해달의 움직임을 따라가지 않게
  const stage = nodes.root.parent ?? nodes.root;
  stage.add(nodes.bucket);
  const ground = new Vector3(BUCKET_GROUND.x, BUCKET_GROUND.y, BUCKET_GROUND.z);
  const held = new Vector3();
  const grip = new Vector3();
  const hold = new Vector3();
  const reach = new Vector3();
  const droop = new Quaternion();

  /** 한쪽 끝이 원점인 팔·다리를 target(몸 기준)까지 돌려 늘인다 */
  const stretchTo = (limb: Object3D, target: Vector3, restLength: number) => {
    reach.subVectors(target, limb.position);
    const length = reach.length();
    limb.quaternion.setFromUnitVectors(UP, reach.normalize());
    limb.scale.set(1, length / restLength, 1);
  };

  /** 다리를 엉덩이에서 발까지 잇는다 (발은 눈밭에, 엉덩이는 몸과 함께 올라간다) */
  const placeLeg = (leg: Object3D, foot: Object3D, restLength: number) => {
    // 발은 몸(torso) 밖에 있으므로, 이번 프레임에 옮긴 몸의 위치를 먼저 반영해 둔다
    nodes.torso.updateWorldMatrix(true, false);
    nodes.torso.worldToLocal(foot.getWorldPosition(hold));
    stretchTo(leg, hold, restLength);
  };

  /** 손을 낚싯대 쥔 자리와 양동이 든 자리 사이에 두고, 팔을 어깨에서 손까지 잇는다 */
  const placeArm = (
    arm: Object3D,
    hand: Object3D,
    gripNode: Object3D,
    holdNode: Object3D,
    restLength: number,
    blend: number,
  ) => {
    nodes.torso.worldToLocal(gripNode.getWorldPosition(grip));
    nodes.torso.worldToLocal(holdNode.getWorldPosition(hold));
    hand.position.lerpVectors(grip, hold, blend);
    stretchTo(arm, hand.position, restLength);
  };

  return (pose: OtterPose, yaw: number) => {
    const { root, torso, head, rod, bucket, footL, footR } = nodes;
    root.rotation.set(0, yaw, pose.lean);
    const side = 1 / Math.sqrt(pose.squash);
    root.scale.set(side, pose.squash, side);
    torso.position.y = rest.torsoY + STAND.RISE * pose.stand + pose.hop;
    // 발은 눈밭에 둔 채 몸 아래로 들어가고, 살짝 벌려 발끝을 바깥으로 돌린다 (모델의 앞쪽이 +z)
    footL.position.set(
      rest.footL.x - STAND.FEET_OUT * pose.stand,
      rest.footL.y + pose.hop,
      rest.footL.z - STAND.FEET_BACK * pose.stand,
    );
    footR.position.set(
      rest.footR.x + STAND.FEET_OUT * pose.stand,
      rest.footR.y + pose.hop,
      rest.footR.z - STAND.FEET_BACK * pose.stand,
    );
    footL.rotation.y = rest.footYawL - STAND.FEET_YAW * pose.stand;
    footR.rotation.y = rest.footYawR + STAND.FEET_YAW * pose.stand;
    placeLeg(nodes.legL, footL, rest.legLengthL);
    placeLeg(nodes.legR, footR, rest.legLengthR);
    // 꼬리는 몸에 붙어 함께 올라간다. 뿌리가 올라간 만큼 끝을 내려 눈밭에 닿게 한다
    const lifted = STAND.RISE * pose.stand;
    droop.setFromAxisAngle(FORWARD, -Math.asin(Math.min(lifted / TAIL_LENGTH, 1)));
    nodes.tail.quaternion.copy(rest.tail).multiply(droop);
    head.rotation.set(rest.head.x + pose.headNod, rest.head.y, rest.head.z + pose.headRoll);
    nodes.eyesOpen.visible = !pose.happy;
    nodes.eyesHappy.visible = pose.happy;
    // 낚싯대는 왼쪽으로 뻗어 있어, z 축으로 음의 방향으로 돌리면 끝이 올라간다
    rod.rotation.set(rest.rod.x, rest.rod.y, rest.rod.z - pose.rodLift);
    rod.visible = pose.rodScale > HIDDEN_SCALE;
    rod.scale.setScalar(Math.max(pose.rodScale, HIDDEN_SCALE));
    nodes.fishPile.visible = pose.fishScale > HIDDEN_SCALE;
    nodes.fishPile.scale.setScalar(Math.max(pose.fishScale, HIDDEN_SCALE));
    placeArm(nodes.armL, nodes.handL, nodes.gripL, nodes.holdL, rest.armLengthL, pose.hold);
    placeArm(nodes.armR, nodes.handR, nodes.gripR, nodes.holdR, rest.armLengthR, pose.hold);
    // 양동이: 눈밭 자리에서 오른손으로. 손에 들면 손과 해달이 도는 방향을 따라간다
    stage.worldToLocal(nodes.handR.getWorldPosition(held));
    bucket.position.lerpVectors(ground, held, pose.bucketLift);
    bucket.position.y += pose.bucketHop;
    bucket.rotation.set(0, yaw * pose.bucketLift, pose.bucketSwing);
  };
}

/**
 * 양동이를 든 모습으로 넘어간 정도(0~1)를 장면 시각에 맞춰 따라간다.
 * 동작 줄이기 모드나 처음 그릴 때는 넘어가는 연출 없이 바로 그 모습이 된다
 */
function createFullTracker(reducedMotion: boolean) {
  let full = 0;
  let lastTime: number | null = null;
  return (state: SceneState): number => {
    const target = isShowingFull(state) ? 1 : 0;
    if (reducedMotion || lastTime === null) {
      full = target;
    } else {
      const step = Math.max(state.time - lastTime, 0) / FULL_TRANSITION_SECONDS;
      full = target > full ? Math.min(full + step, target) : Math.max(full - step, target);
    }
    lastTime = state.time;
    return full;
  };
}

export type OtterModelOptions = {
  /** '동작 줄이기' 설정 사용자: 넘어가는 연출 없이 바로 바뀐다 */
  reducedMotion: boolean;
  /** 해달 친구(눈사람) 모델 주소. 친구가 처음 올 때 불러온다 */
  friendUrl: string;
  /** 해달 소품 모델 주소. 소품을 처음 입을 때 불러온다 */
  outfitUrls: Record<OutfitCode, string>;
  /** 눈사람이 이미 보여야 하면(친구가 와 있거나 만드는 중) true. 해달 모델과 동시에 눈사람도 불러온다 */
  preloadFriend: boolean;
  /** 늦게 불러온 모델이 준비돼 다시 그려야 할 때 부른다 */
  onUpdate: () => void;
  /**
   * WebGL 컨텍스트를 잃어 더 그릴 수 없게 됐을 때 부른다 (앱을 오래 뒤에 두면 기기가 거둬 갈 수 있다).
   * 이 모델은 다시 쓸 수 없으니 dispose 하고 새로 만들어야 한다
   */
  onContextLost: () => void;
};

/** 눈사람을 못 불러왔을 때 다시 시도하기까지 기다리는 시간 (ms). 다 써도 못 불러오면 친구 없이 둔다 */
const FRIEND_RETRY_DELAYS_MS = [1000, 3000, 6000];

/**
 * 해달 친구(눈사람)를 불러와 장면에 놓는다.
 * 불러오는 동안이나 끝내 못 불러오면 친구를 그리지 않는다
 */
function createFriend(loader: GLTFLoader, scene: Scene, options: OtterModelOptions) {
  let snowman: Snowman | null = null;
  let status: 'idle' | 'loading' | 'ready' | 'failed' = 'idle';
  let attempts = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const load = () => {
    status = 'loading';
    loadSnowman(loader, options.friendUrl)
      .then((loaded) => {
        if (disposed) return;
        snowman = loaded;
        scene.add(loaded.holder);
        status = 'ready';
        options.onUpdate();
      })
      .catch(() => {
        const delay = FRIEND_RETRY_DELAYS_MS[attempts];
        attempts += 1;
        if (disposed || delay === undefined) {
          status = 'failed';
          return;
        }
        retryTimer = setTimeout(load, delay);
      });
  };

  let meltShown = 0;
  let lastTime: number | null = null;

  /** 녹은 정도가 갑자기 바뀌어도(얼린 직후 등) 눈사람은 천천히 따라가게 한다 */
  const followMelt = (target: number, time: number) => {
    if (options.reducedMotion || lastTime === null) {
      meltShown = target;
    } else {
      const step = Math.max(time - lastTime, 0) / MELT_FOLLOW_SECONDS;
      meltShown =
        target > meltShown
          ? Math.min(meltShown + step, target)
          : Math.max(meltShown - step, target);
    }
    lastTime = time;
    return meltShown;
  };

  /**
   * 눈사람을 제자리에 놓고 자세를 입힌다. 해달 기준 모델 단위로 눈사람이 차지하는 범위를 돌려준다
   * (보이지 않으면 null). unit 은 px / 모델 단위
   */
  const place = (state: SceneState, view: SnowmanView, unit: number) => {
    // 친구로 와 있거나, 출석으로 만드는 중이면 보인다
    const visible = view.alive || view.buildStage > 0;
    if (visible && status === 'idle') load();
    if (!snowman) return null;
    snowman.holder.visible = visible;
    if (!visible) return null;
    const melt = followMelt(view.alive ? view.melt : 0, state.time);
    const otter = otterLayout(state);
    const layout = snowmanLayout(state);
    const x = (layout.centerX - otter.centerX) / unit;
    const y = (otter.bottomY - layout.bottomY) / unit;
    const height = layout.height / unit;
    snowman.holder.position.set(x, y, FRIEND_DEPTH);
    snowman.holder.scale.setScalar(height / SNOWMAN_HEIGHT);
    snowman.applyPose(snowmanPose(state, { ...view, melt }));
    return {
      left: x - layout.halfWidth / unit - FRIEND_MARGIN,
      top: y + height + FRIEND_MARGIN,
    };
  };

  return {
    place,
    /** 눈사람을 다 불러와 그릴 수 있는지 */
    isReady: () => status === 'ready',
    /** 친구가 와 있으면 해달 모델과 함께 미리 불러온다 */
    preload: () => {
      if (status === 'idle') load();
    },
    dispose: () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
    },
  };
}

/** WebGL 캔버스를 만들어 3D 해달을 불러온다. WebGL 을 못 쓰거나 모델을 못 불러오면 실패한다 */
export async function createOtterModel(
  url: string,
  options: OtterModelOptions,
): Promise<OtterModelView> {
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    // 그린 직후 같은 프레임 안에서 장면 캔버스로 복사하므로, 그린 내용을 다음 프레임까지 붙들어 둘 필요가 없다
    preserveDrawingBuffer: false,
  });
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const scene = createScene();
  const friend = createFriend(loader, scene, options);
  let disposeWardrobe = () => {};
  /** 캔버스와 WebGL 컨텍스트를 놓아 준다 (다시 만들 때마다 컨텍스트가 쌓이지 않게 바로 놓는다) */
  const release = () => {
    // 아래 forceContextLoss 가 내는 webglcontextlost 를 잃은 것으로 알리지 않게 먼저 뗀다
    canvas.removeEventListener('webglcontextlost', options.onContextLost);
    friend.dispose();
    disposeWardrobe();
    renderer.dispose();
    renderer.forceContextLoss();
  };
  try {
    if (options.preloadFriend) friend.preload();
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene;
    stylize(model);
    scene.add(model);
    const nodes: Nodes = findNodes(model, NODE_NAMES);
    const applyPose = createPoser(nodes);
    const wardrobe = createWardrobe(
      loader,
      model,
      { head: nodes.head, torso: nodes.torso, armL: nodes.armL, armR: nodes.armR },
      options.outfitUrls,
      options.onUpdate,
    );
    disposeWardrobe = wardrobe.dispose;
    const trackFull = createFullTracker(options.reducedMotion);
    const camera = createCamera();
    const tip = new Vector3();
    const drawSize = new Vector2();
    let userYaw = 0;

    const resize = (width: number, height: number) => {
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
      const size = renderer.getSize(drawSize);
      if (Math.abs(size.x - width) > 0.5 || Math.abs(size.y - height) > 0.5) {
        renderer.setSize(width, height, false);
      }
    };

    /** 카메라가 비추는 범위를 맞춘다 (눈사람 친구가 있으면 왼쪽·위로 넓힌다) */
    const frame = (left: number, top: number) => {
      if (camera.left === left && camera.top === top) return;
      camera.left = left;
      camera.top = top;
      camera.updateProjectionMatrix();
    };

    const draw = (ctx: CanvasRenderingContext2D, state: SceneState, friendView: SnowmanView) => {
      const layout = otterLayout(state);
      const unit = viewUnit(layout); // px / 모델 단위
      const friendBounds = friend.place(state, friendView, unit);
      const left = Math.min(VIEW.LEFT, friendBounds?.left ?? VIEW.LEFT);
      const top = Math.max(VIEW.TOP, friendBounds?.top ?? VIEW.TOP);
      frame(left, top);
      const rect = viewRect(layout, left, top);
      const pose = otterPose(state, trackFull(state));
      applyPose(pose, BASE_YAW + userYaw);
      resize(rect.width, rect.height);
      renderer.render(scene, camera);
      ctx.drawImage(renderer.domElement, rect.x, rect.y, rect.width, rect.height);
      // 낚싯대를 치우는 중이거나 치웠으면 줄을 그리지 않는다
      if (pose.rodScale < ROD_LINE_MIN_SCALE) return null;
      // 낚싯대 끝을 화면 좌표로 옮긴다 (정규화 장치 좌표 -1~1 → 장면 px)
      nodes.tip.getWorldPosition(tip).project(camera);
      return {
        x: rect.x + ((tip.x + 1) / 2) * rect.width,
        y: rect.y + ((1 - tip.y) / 2) * rect.height,
      };
    };

    const setUserYaw = (yaw: number) => {
      userYaw = yaw;
    };

    // 불러오는 사이에 이미 컨텍스트를 잃었으면 못 불러온 것으로 본다 (그 뒤로는 알림이 오지 않는다)
    if (renderer.getContext().isContextLost()) throw new Error('WebGL 컨텍스트를 잃었어요');
    canvas.addEventListener('webglcontextlost', options.onContextLost);

    return {
      draw,
      hasFriend: friend.isReady,
      setUserYaw,
      setOutfits: wardrobe.wear,
      dispose: release,
    };
  } catch (error) {
    release();
    throw error;
  }
}
