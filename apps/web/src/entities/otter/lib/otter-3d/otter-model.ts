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
import { otterLayout, type SceneState } from '../scene/scene-state';
import { type OtterPose, otterPose } from './otter-pose';

/**
 * 3D 해달 시험판 (otter-3d.glb, Blender 에서 만든 모델).
 * 화면에 붙지 않은 WebGL 캔버스에 해달을 그린 뒤, 장면 캔버스에 그림처럼 붙인다.
 * 모델 단위: 발 아래 끝이 0, 해달 몸 가운데가 x = 0, 낚싯대는 왼쪽(-x)으로 뻗는다.
 */

/** 모델 키 (발 아래 끝 ~ 모자 방울 꼭대기, 모델 단위). 장면의 해달 키(px)에 맞춰 크기를 정한다 */
const MODEL_HEIGHT = 3.22;
/**
 * WebGL 캔버스가 담는 모델 범위. 낚싯대를 들어 올려도, 몸을 기울여도, 끌어서 돌려
 * 낚싯대가 오른쪽을 향해도 잘리지 않게 좌우를 같은 폭으로 둔다
 */
const VIEW = { LEFT: -2.8, RIGHT: 2.8, TOP: 3.6, BOTTOM: -0.15 } as const;
/** 해달이 낚싯대 쪽(왼쪽)으로 살짝 몸을 돌려 앉는다 (3D 느낌이 나도록) */
const BASE_YAW = -0.22;
const MAX_PIXEL_RATIO = 2;

/** 재질 이름(Blender) → 색. 만화처럼 밝은 면·어두운 면 두 단계로 칠한다 */
const TOON_COLORS: Record<string, string> = {
  Fur: '#EDC9A0',
  Belly: '#FBE7CF',
  Hat: '#4F7FC2',
  Scarf: '#DE4B4E',
  Nose: '#86553E',
  Pink: '#E98C86',
  Rod: '#F5C88A',
  Reel: '#F3EBDD',
};
/** 명암 없이 단색으로 칠하는 재질 (눈·선) */
const FLAT_COLORS: Record<string, string> = {
  Eye: '#4A3226',
  White: '#FFFFFF',
  Line: '#7A4A33',
  Hatline: '#2F548F',
};
/** 테두리를 두르는 재질과 테두리 두께 (모델 단위) */
const OUTLINE_WIDTH: Record<string, number> = {
  Fur: 0.03,
  Hat: 0.03,
  Scarf: 0.03,
  Rod: 0.02,
  Reel: 0.02,
};
const OUTLINE_COLOR = '#9A6644';
/** 어두운 면 밝기 = AMBIENT, 밝은 면 = AMBIENT + DIRECT (three.js 조명은 π 를 곱해야 원래 색이 된다) */
const AMBIENT = Math.PI * 0.8;
const DIRECT = Math.PI * 0.2;

const NODE = { ROOT: 'OtterRoot', HEAD: 'HeadPivot', ROD: 'RodPivot', TIP: 'RodTip' } as const;

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

function findNode(root: Object3D, name: string): Object3D {
  const node = root.getObjectByName(name);
  if (!node) throw new Error(`3D 해달 모델에 ${name} 노드가 없어요`);
  return node;
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

/** WebGL 캔버스를 만들어 3D 해달을 불러온다. WebGL 을 못 쓰거나 모델을 못 불러오면 실패한다 */
export async function createOtterModel(url: string): Promise<OtterModelView> {
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
    const nodes = {
      root: findNode(model, NODE.ROOT),
      head: findNode(model, NODE.HEAD),
      rod: findNode(model, NODE.ROD),
      tip: findNode(model, NODE.TIP),
    };
    const rest = { headRotation: nodes.head.rotation.clone(), rodRotation: nodes.rod.rotation.clone() };
    const camera = createCamera();
    const scene = createScene(model);
    const tip = new Vector3();
    const drawSize = new Vector2();

    let userYaw = 0;

    const applyPose = (pose: OtterPose) => {
      const { root, head, rod } = nodes;
      root.rotation.set(0, BASE_YAW + userYaw, pose.lean);
      const side = 1 / Math.sqrt(pose.squash);
      root.scale.set(side, pose.squash, side);
      head.rotation.set(rest.headRotation.x + pose.headNod, rest.headRotation.y, rest.headRotation.z + pose.headRoll);
      // 낚싯대는 왼쪽으로 뻗어 있어, z 축으로 음의 방향으로 돌리면 끝이 올라간다
      rod.rotation.set(rest.rodRotation.x, rest.rodRotation.y, rest.rodRotation.z - pose.rodLift);
    };

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
      applyPose(otterPose(state));
      resize(rect.width, rect.height);
      renderer.render(scene, camera);
      ctx.drawImage(renderer.domElement, rect.x, rect.y, rect.width, rect.height);
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
