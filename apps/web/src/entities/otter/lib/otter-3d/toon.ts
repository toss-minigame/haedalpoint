import {
  BackSide,
  DataTexture,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  type Object3D,
  RedFormat,
} from 'three';

/**
 * 3D 모델(해달·눈사람)을 그림처럼 보이게 칠한다: 밝은 면·어두운 면 두 단계 명암 + 테두리.
 * 재질 이름은 Blender 스크립트(design/otter-3d/build_otter.py, build_snowman.py)와 같다.
 */

/** 재질 이름 → 색. 만화처럼 밝은 면·어두운 면 두 단계로 칠한다 */
const TOON_COLORS: Record<string, string> = {
  // 해달
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
  // 눈사람
  Snow: '#FBFAF8',
  SnowHat: '#F2C14E',
  SnowHatGroove: '#DDA83A',
  SnowScarf: '#4F70AE',
  Carrot: '#F4A340',
  Twig: '#9A6B4F',
  Heart: '#F28B8B',
  Sweat: '#C6DDF4',
  Spark: '#F8CC4C',
  Puddle: '#C4E2F5',
  Ice: '#DDF3FF',
};

/** 명암 없이 단색으로 칠하는 재질 (눈·선·볼) */
const FLAT_COLORS: Record<string, string> = {
  Eye: '#4A3226',
  White: '#FFFFFF',
  Line: '#7A4A33',
  Button: '#7A6A5E',
  Cheek: '#F7D3CE',
  MouthIn: '#E8837C',
  Tongue: '#F6AFA6',
};

const OTTER_OUTLINE = '#9A6644';

/** 테두리를 두르는 재질: 두께(모델 단위)와 색 */
const OUTLINES: Record<string, { width: number; color: string }> = {
  Fur: { width: 0.03, color: OTTER_OUTLINE },
  Hat: { width: 0.03, color: OTTER_OUTLINE },
  HatGroove: { width: 0.03, color: OTTER_OUTLINE },
  Scarf: { width: 0.03, color: OTTER_OUTLINE },
  Rod: { width: 0.02, color: OTTER_OUTLINE },
  Reel: { width: 0.02, color: OTTER_OUTLINE },
  Bucket: { width: 0.028, color: OTTER_OUTLINE },
  Goldfish: { width: 0.016, color: OTTER_OUTLINE },
  Bluefish: { width: 0.016, color: OTTER_OUTLINE },
  Snow: { width: 0.032, color: '#8094B8' },
  SnowHat: { width: 0.03, color: '#C8953A' },
  SnowHatGroove: { width: 0.03, color: '#C8953A' },
  SnowScarf: { width: 0.03, color: '#3A5490' },
  Carrot: { width: 0.018, color: '#D98A2B' },
  MouthIn: { width: 0.014, color: '#8A4A40' },
  Heart: { width: 0.016, color: '#D96A6A' },
  Sweat: { width: 0.014, color: '#7FA6D9' },
  Spark: { width: 0.014, color: '#E0A82E' },
  Puddle: { width: 0.014, color: '#9CC8E6' },
  Ice: { width: 0.016, color: '#8CC4E8' },
};

function toonGradient(): DataTexture {
  const texture = new DataTexture(new Uint8Array([0, 255]), 2, 1, RedFormat);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** 법선 방향으로 부풀린 뒷면만 그려 테두리를 만든다 (inverted hull) */
function outlineMaterial(width: number, color: string): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ color, side: BackSide });
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
export function stylize(root: Object3D): void {
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
    const outline = OUTLINES[name];
    if (outline) mesh.add(new Mesh(mesh.geometry, outlineMaterial(outline.width, outline.color)));
  }
}

/** 이름으로 노드를 찾는다. 하나라도 없으면 (모델과 코드가 어긋난 것이므로) 실패한다 */
export function findNodes<Key extends string>(
  root: Object3D,
  names: Record<Key, string>,
): Record<Key, Object3D> {
  const entries = (Object.keys(names) as Key[]).map((key) => {
    const node = root.getObjectByName(names[key]);
    if (!node) throw new Error(`3D 모델에 ${names[key]} 노드가 없어요`);
    return [key, node] as const;
  });
  return Object.fromEntries(entries) as Record<Key, Object3D>;
}
