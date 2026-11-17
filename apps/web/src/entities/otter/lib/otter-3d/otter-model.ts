import {
  AmbientLight,
  BackSide,
  DataTexture,
  DirectionalLight,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  type Object3D,
  OrthographicCamera,
  RedFormat,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { OtterModelView } from '../scene/scene-render';
import { isShowingFull, otterLayout, type SceneState } from '../scene/scene-state';
import { FULL_TRANSITION_SECONDS, type OtterPose, otterPose } from './otter-pose';

/**
 * 3D 해달 시험판 (otter-3d.glb, design/otter-3d/build_otter.py 로 Blender 에서 만든 모델).
 * 화면에 붙지 않은 WebGL 캔버스에 해달을 그린 뒤, 장면 캔버스에 그림처럼 붙인다.
 * 모델 단위: 발 아래 끝이 0, 해달 몸 가운데가 x = 0, 낚싯대는 왼쪽(-x)으로 뻗는다.
 */

/** 모델 키 (앉았을 때 발 아래 끝 ~ 모자 방울 꼭대기, 모델 단위). 장면의 해달 키(px)에 맞춰 크기를 정한다 */
const MODEL_HEIGHT = 3.37;
/**
 * WebGL 캔버스가 담는 모델 범위. 낚싯대를 들어 올려도, 일어서며 뛰어올라도, 끌어서 돌려
 * 낚싯대가 오른쪽을 향해도 잘리지 않게 여유를 두고 좌우를 같은 폭으로 둔다
 */
const VIEW = { LEFT: -2.8, RIGHT: 2.8, TOP: 4.1, BOTTOM: -0.15 } as const;
/** 해달이 낚싯대 쪽(왼쪽)으로 살짝 몸을 돌려 앉는다 (3D 느낌이 나도록) */
const BASE_YAW = -0.22;
const MAX_PIXEL_RATIO = 2;
/** 일어섰을 때 몸이 올라가는 높이와, 발이 몸 아래로 들어가는 거리 */
const STAND = { RISE: 0.34, FEET_BACK: 0.22, FEET_IN: 0.05 } as const;
/** 낚싯대가 이보다 작아지면(치우는 중) 줄을 그리지 않는다 */
const ROD_LINE_MIN_SCALE = 0.95;
const HIDDEN_SCALE = 0.01;

/** 재질 이름(Blender) → 색. 만화처럼 밝은 면·어두운 면 두 단계로 칠한다 */
const TOON_COLORS: Record<string, string> = {
  Fur: '#EDC9A0',
  Belly: '#FBE7CF',
  Hat: '#4F7FC2',
  HatGroove: '#3F6CB0',
  Scarf: '#DE4B4E',
  Nose: '#86553E',
  Pink: '#E98C86',
  Rod: '#F5C88A',
  Reel: '#F3EBDD',
  Bucket: '#4A80C8',
  Goldfish: '#F7B64A',
  Bluefish: '#8CC4EE',
};
/** 명암 없이 단색으로 칠하는 재질 (눈·선) */
const FLAT_COLORS: Record<string, string> = {
  Eye: '#4A3226',
  White: '#FFFFFF',
  Line: '#7A4A33',
};
/** 테두리를 두르는 재질과 테두리 두께 (모델 단위) */
const OUTLINE_WIDTH: Record<string, number> = {
  Fur: 0.03,
  Hat: 0.03,
  HatGroove: 0.03,
  Scarf: 0.03,
  Rod: 0.02,
  Reel: 0.02,
  Bucket: 0.028,
  Goldfish: 0.016,
  Bluefish: 0.016,
};
const OUTLINE_COLOR = '#9A6644';
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
  footL: 'FootL',
  footR: 'FootR',
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

function toonGradient(): DataTexture {
  const texture = new DataTexture(new Uint8Array([0, 255]), 2, 1, RedFormat);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** 법선 방향으로 부풀린 뒷면만 그려 테두리를 만든다 (inverted hull) */
function outlineMaterial(width: number): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ color: OUTLINE_COLOR, side: BackSide });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 transformed = position + normal * ${width.toFixed(4)};`,
    );
  };
  // 두께가 다른 테두리가 같은 셰이더를 나눠 쓰지 않게 한다
  material.customProgramCacheKey = () => `otter-outline-${width}`;
  return material;
}

/** glTF 재질을 만화풍 재질로 바꾸고, 필요한 부품에 테두리 메시를 붙인다 */
function stylize(root: Object3D) {
  const gradient = toonGradient();
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh) meshes.push(object);
  });
  for (const mesh of meshes) {
    const name = (mesh.material as Material).name;
    const toon = TOON_COLORS[name];
    const flat = FLAT_COLORS[name] ?? '#000000';
    mesh.material = toon
      ? new MeshToonMaterial({ color: toon, gradientMap: gradient })
      : new MeshBasicMaterial({ color: flat });
    const width = OUTLINE_WIDTH[name];
    if (width) mesh.add(new Mesh(mesh.geometry, outlineMaterial(width)));
  }
}

function findNodes(root: Object3D): Nodes {
  const entries = (Object.keys(NODE_NAMES) as NodeKey[]).map((key) => {
    const node = root.getObjectByName(NODE_NAMES[key]);
    if (!node) throw new Error(`3D 해달 모델에 ${NODE_NAMES[key]} 노드가 없어요`);
    return [key, node] as const;
  });
  return Object.fromEntries(entries) as Nodes;
}

/** 모델 단위 범위를 그대로 비추는 정사영 카메라 (원근 없이 그림처럼 보인다) */
function createCamera(): OrthographicCamera {
  const camera = new OrthographicCamera(VIEW.LEFT, VIEW.RIGHT, VIEW.TOP, VIEW.BOTTOM, 0.1, 50);
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);
  return camera;
}

function createScene(model: Object3D): Scene {
  const scene = new Scene();
  scene.add(model);
  scene.add(new AmbientLight(0xffffff, AMBIENT));
  // 왼쪽 위 앞에서 비춘다 (Blender 시안과 같은 방향)
  const sun = new DirectionalLight(0xffffff, DIRECT);
  sun.position.set(-3, 4, 5);
  scene.add(sun);
  return scene;
}

const UP = new Vector3(0, 1, 0);

/**
 * 모델에 자세를 입히는 함수를 만든다.
 * 팔은 어깨에서 손까지 뻗은 한 덩어리라, 손 자리(낚싯대 또는 양동이·배)를 먼저 정하고 팔을 그쪽으로 돌려 늘인다
 */
function createPoser(nodes: Nodes) {
  const rest = {
    torsoY: nodes.torso.position.y,
    head: nodes.head.rotation.clone(),
    rod: nodes.rod.rotation.clone(),
    bucket: nodes.bucket.rotation.clone(),
    footL: nodes.footL.position.clone(),
    footR: nodes.footR.position.clone(),
    // 팔 길이 = 어깨에서 낚싯대를 쥔 손까지 (모델을 만든 그대로의 자세)
    armLengthL: nodes.handL.position.distanceTo(nodes.armL.position),
    armLengthR: nodes.handR.position.distanceTo(nodes.armR.position),
  };
  const grip = new Vector3();
  const hold = new Vector3();
  const reach = new Vector3();

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
    reach.subVectors(hand.position, arm.position);
    const length = reach.length();
    arm.quaternion.setFromUnitVectors(UP, reach.normalize());
    arm.scale.set(1, length / restLength, 1);
  };

  return (pose: OtterPose, yaw: number) => {
    const { root, torso, head, rod, bucket, footL, footR } = nodes;
    root.rotation.set(0, yaw, pose.lean);
    const side = 1 / Math.sqrt(pose.squash);
    root.scale.set(side, pose.squash, side);
    torso.position.y = rest.torsoY + STAND.RISE * pose.stand + pose.hop;
    // 발은 눈밭에 둔 채 몸 아래로 들어간다 (모델의 앞쪽이 +z)
    footL.position.set(
      rest.footL.x + STAND.FEET_IN * pose.stand,
      rest.footL.y + pose.hop,
      rest.footL.z - STAND.FEET_BACK * pose.stand,
    );
    footR.position.set(
      rest.footR.x - STAND.FEET_IN * pose.stand,
      rest.footR.y + pose.hop,
      rest.footR.z - STAND.FEET_BACK * pose.stand,
    );
    head.rotation.set(rest.head.x + pose.headNod, rest.head.y, rest.head.z + pose.headRoll);
    nodes.eyesOpen.visible = !pose.happy;
    nodes.eyesHappy.visible = pose.happy;
    // 낚싯대는 왼쪽으로 뻗어 있어, z 축으로 음의 방향으로 돌리면 끝이 올라간다
    rod.rotation.set(rest.rod.x, rest.rod.y, rest.rod.z - pose.rodLift);
    rod.visible = pose.rodScale > HIDDEN_SCALE;
    rod.scale.setScalar(Math.max(pose.rodScale, HIDDEN_SCALE));
    bucket.rotation.set(rest.bucket.x, rest.bucket.y, rest.bucket.z + pose.bucketSwing);
    bucket.visible = pose.bucketScale > HIDDEN_SCALE;
    bucket.scale.setScalar(Math.max(pose.bucketScale, HIDDEN_SCALE));
    placeArm(nodes.armL, nodes.handL, nodes.gripL, nodes.holdL, rest.armLengthL, pose.hold);
    placeArm(nodes.armR, nodes.handR, nodes.gripR, nodes.holdR, rest.armLengthR, pose.hold);
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

/** WebGL 캔버스를 만들어 3D 해달을 불러온다. WebGL 을 못 쓰거나 모델을 못 불러오면 실패한다 */
export async function createOtterModel(
  url: string,
  reducedMotion: boolean,
): Promise<OtterModelView> {
  const renderer = new WebGLRenderer({
    canvas: document.createElement('canvas'),
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  try {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene;
    stylize(model);
    const nodes = findNodes(model);
    const applyPose = createPoser(nodes);
    const trackFull = createFullTracker(reducedMotion);
    const camera = createCamera();
    const scene = createScene(model);
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

    const draw = (ctx: CanvasRenderingContext2D, state: SceneState) => {
      const layout = otterLayout(state);
      const unit = layout.bodyHeight / MODEL_HEIGHT; // px / 모델 단위
      const rect = {
        x: layout.centerX + VIEW.LEFT * unit,
        y: layout.bottomY - VIEW.TOP * unit,
        width: (VIEW.RIGHT - VIEW.LEFT) * unit,
        height: (VIEW.TOP - VIEW.BOTTOM) * unit,
      };
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

    const dispose = () => {
      renderer.dispose();
      renderer.forceContextLoss();
    };

    const setUserYaw = (yaw: number) => {
      userYaw = yaw;
    };

    return { draw, setUserYaw, dispose };
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}
