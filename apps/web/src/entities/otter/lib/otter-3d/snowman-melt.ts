import { Float32BufferAttribute, Matrix4, Mesh, type Object3D, Vector3 } from 'three';

/**
 * 눈사람이 녹아내리는 모양 (docs/design/snowman-friend.md).
 * 통째로 눌러 찌그러뜨리지 않고, 몸통 꼭짓점을 옮겨 "위는 가라앉고 아래는 흘러 퍼지는" 모양을 만든다.
 * 모양은 모델 파일에 넣지 않고 불러온 뒤 계산해 변형 목표(morph target)로 붙인다 (모델 용량이 늘지 않는다).
 */

/** 눈사람 몸통 꼭대기 높이 (바닥 기준, 모델 단위). 이보다 위는 내려앉기만 한다 */
const BODY_TOP = 1.34;

/** 다 녹았을 때(melt = 1)의 모양 */
const MELTED = {
  COLLAPSE: 0.5, // 높이가 이만큼 줄어든다 (위쪽이 내려앉는다)
  SPREAD: 0.85, // 바닥에 가까울수록 이만큼까지 옆으로 흘러 퍼진다
  LUMP: 0.16, // 퍼진 가장자리가 울퉁불퉁한 정도
  LOBES: 5, // 가장자리에 생기는 덩어리 수
  LUMP_PHASE: 0.8,
  HEAD_SAG: 0.14, // 머리 아래쪽이 처지는 거리
  HEAD_JOWL: 0.3, // 머리 아래쪽이 옆으로 퍼지는 정도
} as const;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * 다 녹았을 때, 눈사람 몸 기준 좌표(바닥이 y = 0)의 점 `p` 가 옮겨 가는 자리.
 * 몸통 꼭짓점과, 몸통에 붙은 것들(머리·팔·목도리·단추)의 자리에 똑같이 쓴다.
 */
export function meltedBodyPoint(p: Vector3, out: Vector3): Vector3 {
  const height = clamp01(p.y / BODY_TOP);
  // 바닥에 가까울수록 많이 퍼진다
  const low = (1 - height) ** 2;
  const lump = 1 + MELTED.LUMP * Math.sin(MELTED.LOBES * Math.atan2(p.z, p.x) + MELTED.LUMP_PHASE);
  const spread = 1 + MELTED.SPREAD * low * lump;
  return out.set(p.x * spread, p.y * (1 - MELTED.COLLAPSE), p.z * spread);
}

/** 다 녹았을 때 머리 공의 점이 옮겨 가는 자리: 얼굴이 있는 위쪽은 그대로 두고 아래쪽만 처져 퍼진다 */
function meltedHeadPoint(center: Vector3, radius: number) {
  return (p: Vector3, out: Vector3): Vector3 => {
    const below = clamp01((center.y - p.y) / radius) ** 2;
    const spread = 1 + MELTED.HEAD_JOWL * below;
    return out.set(
      center.x + (p.x - center.x) * spread,
      p.y - MELTED.HEAD_SAG * below,
      center.z + (p.z - center.z) * spread,
    );
  };
}

type Deform = (p: Vector3, out: Vector3) => Vector3;

/**
 * 메시에 "다 녹은 모양"을 변형 목표로 붙이고, 녹은 정도(0~1)를 넣는 함수를 돌려준다.
 * deform 은 메시의 부모 좌표에서 점을 옮긴다. 같은 모양을 나눠 쓰는 테두리 메시도 함께 변형한다.
 */
function addMeltShape(mesh: Mesh, deform: Deform): (melt: number) => void {
  const position = mesh.geometry.getAttribute('position');
  const toParent = mesh.matrix.clone();
  const toLocal = new Matrix4().copy(toParent).invert();
  const deltas = new Float32Array(position.count * 3);
  const local = new Vector3();
  const point = new Vector3();
  const moved = new Vector3();
  for (let i = 0; i < position.count; i++) {
    local.fromBufferAttribute(position, i);
    point.copy(local).applyMatrix4(toParent);
    deform(point, moved).applyMatrix4(toLocal);
    deltas[i * 3] = moved.x - local.x;
    deltas[i * 3 + 1] = moved.y - local.y;
    deltas[i * 3 + 2] = moved.z - local.z;
  }
  mesh.geometry.morphAttributes.position = [new Float32BufferAttribute(deltas, 3)];
  mesh.geometry.morphTargetsRelative = true;

  const outlines = mesh.children.filter((child): child is Mesh => child instanceof Mesh);
  const targets = [mesh, ...outlines];
  for (const target of targets) {
    target.updateMorphTargets();
    // 퍼진 모양은 원래 크기를 벗어나므로, 원래 크기로 화면 밖 여부를 판단하지 않게 한다
    target.frustumCulled = false;
  }
  return (melt) => {
    for (const target of targets) {
      if (target.morphTargetInfluences) target.morphTargetInfluences[0] = melt;
    }
  };
}

function asMesh(node: Object3D, name: string): Mesh {
  if (!(node instanceof Mesh)) throw new Error(`3D 모델의 ${name} 가 메시가 아니에요`);
  return node;
}

export type SnowmanMeltParts = {
  body: Object3D;
  headBall: Object3D;
  /** 몸통에 붙어 있어 몸통이 무너지면 함께 내려가는 것들 (머리·팔·목도리·단추) */
  attached: readonly Object3D[];
};

/** 눈사람에 녹는 모양을 준비하고, 녹은 정도(0~1)를 입히는 함수를 돌려준다 */
export function createSnowmanMelt(parts: SnowmanMeltParts): (melt: number) => void {
  parts.body.updateMatrix();
  parts.headBall.updateMatrix();
  const meltBody = addMeltShape(asMesh(parts.body, 'SnowBody'), meltedBodyPoint);
  const headBall = asMesh(parts.headBall, 'SnowHeadBall');
  headBall.geometry.computeBoundingBox();
  const box = headBall.geometry.boundingBox;
  const headRadius = box ? ((box.max.y - box.min.y) / 2) * headBall.scale.y : 1;
  const meltHead = addMeltShape(headBall, meltedHeadPoint(headBall.position.clone(), headRadius));
  const attached = parts.attached.map((node) => ({
    node,
    rest: node.position.clone(),
    melted: meltedBodyPoint(node.position, new Vector3()),
  }));

  return (melt) => {
    meltBody(melt);
    meltHead(melt);
    for (const { node, rest, melted } of attached) node.position.lerpVectors(rest, melted, melt);
  };
}
