import type { Object3D } from 'three';
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OUTFITS, type OutfitCode, type OutfitSlot } from '../otter-outfits';
import { stylize } from './toon';

/**
 * 해달이 입는 소품 (outfit-*.glb, design/otter-3d/build_outfits.py 로 만든 모델).
 * 소품은 입을 때 처음 불러와 해달의 머리·몸통·팔 노드에 붙인다. 붙은 노드를 따라 움직이므로 자세 코드는 건드리지 않는다
 */

/** 소품이 붙는 해달의 노드 */
export type OutfitAnchors = { head: Object3D; torso: Object3D; armL: Object3D; armR: Object3D };

/**
 * 소품 glb 의 맨 위 노드 이름 → 붙일 자리. 노드는 붙일 자리와 같은 위치·방향으로 만들어져 있어,
 * 그 아래로 옮기고 제자리(원점)에 두면 맞는다
 */
const ATTACH_ROOTS: Record<string, keyof OutfitAnchors> = {
  Outfit: 'head',
  OutfitTorso: 'torso',
  OutfitArmL: 'armL',
  OutfitArmR: 'armR',
};

/** 그 부위에 소품을 입으면 숨기는 기본 차림 (build_otter.py 의 이름). 머리는 털모자, 몸은 목도리 */
const DEFAULT_PARTS: Record<OutfitSlot, readonly string[]> = {
  head: ['HatCuff', 'HatDome', 'PomPom'],
  face: [],
  body: ['Scarf', 'ScarfKnot', 'ScarfTail'],
};
const SLOTS = Object.keys(DEFAULT_PARTS) as OutfitSlot[];

export type Wardrobe = {
  /** 입을 소품을 정한다. 처음 입는 소품은 불러온 뒤에 보인다 */
  wear: (codes: readonly OutfitCode[]) => void;
  dispose: () => void;
};

export function createWardrobe(
  loader: GLTFLoader,
  model: Object3D,
  anchors: OutfitAnchors,
  urls: Record<OutfitCode, string>,
  onUpdate: () => void,
): Wardrobe {
  const defaults = SLOTS.map((slot) => ({
    slot,
    parts: DEFAULT_PARTS[slot].flatMap((name) => model.getObjectByName(name) ?? []),
  }));
  const loaded = new Map<OutfitCode, Object3D[]>();
  const loading = new Set<OutfitCode>();
  let worn: readonly OutfitCode[] = [];
  let disposed = false;

  const refresh = () => {
    for (const [code, roots] of loaded) {
      const visible = worn.includes(code);
      for (const root of roots) root.visible = visible;
    }
    // 소품을 다 불러와 보일 때만 기본 차림을 숨긴다 (불러오는 동안 맨몸이 되지 않게)
    for (const { slot, parts } of defaults) {
      const covered = worn.some((code) => OUTFITS[code].slot === slot && loaded.has(code));
      for (const part of parts) part.visible = !covered;
    }
  };

  /** 소품의 맨 위 노드들을 해달의 붙일 자리 아래로 옮긴다 */
  const attach = (scene: Object3D): Object3D[] => {
    const roots = Object.entries(ATTACH_ROOTS).flatMap(([name, anchor]) => {
      const root = scene.getObjectByName(name);
      return root ? [{ root, parent: anchors[anchor] }] : [];
    });
    if (roots.length === 0) throw new Error('소품 모델에 붙일 노드가 없어요');
    for (const { root, parent } of roots) {
      stylize(root);
      root.position.set(0, 0, 0);
      root.quaternion.identity();
      parent.add(root);
    }
    return roots.map(({ root }) => root);
  };

  const load = (code: OutfitCode) => {
    loading.add(code);
    loader
      .loadAsync(urls[code])
      .then((gltf) => {
        if (disposed) return;
        loaded.set(code, attach(gltf.scene));
        refresh();
        onUpdate();
      })
      // 못 불러오면 입기 전 모습 그대로 둔다. 다음에 입힐 때 다시 불러온다
      .catch(() => {})
      .finally(() => loading.delete(code));
  };

  return {
    wear: (codes) => {
      worn = codes;
      for (const code of codes) {
        if (!loaded.has(code) && !loading.has(code)) load(code);
      }
      refresh();
    },
    dispose: () => {
      disposed = true;
    },
  };
}
