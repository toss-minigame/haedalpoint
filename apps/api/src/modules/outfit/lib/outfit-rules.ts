import type { OutfitCode, OutfitItem } from '@haedalpoint/shared';
import { OUTFIT_POLICY, OUTFIT_SLOTS } from '../../../common/globals/index.js';

// 옷장 규칙 (순수 함수, docs/design/otter-outfit.md). 정책값은 common/globals/outfit.policy.ts.

export const OUTFIT_CODES = Object.keys(OUTFIT_SLOTS) as OutfitCode[];

/** 사용자가 연 소품 */
export interface OwnedOutfit {
  code: OutfitCode;
  equipped: boolean;
}

/** 소품을 여는 데 드는 창고 물고기 (마리). 지금은 모두 같다 */
export function priceFishOf(_code: OutfitCode): number {
  return OUTFIT_POLICY.PRICE_FISH;
}

/** 소품 목록 (정책에 있는 순서). 정책에서 뺀 소품의 행은 무시한다 */
export function buildOutfits(owned: readonly OwnedOutfit[]): OutfitItem[] {
  return OUTFIT_CODES.map((code) => {
    const mine = owned.find((outfit) => outfit.code === code);
    return {
      code,
      slot: OUTFIT_SLOTS[code],
      priceFish: priceFishOf(code),
      owned: mine !== undefined,
      equipped: mine?.equipped ?? false,
    };
  });
}

/** code 를 입힌 뒤의 입은 목록: 같은 부위에 입고 있던 소품은 벗는다 */
export function equipWith(equipped: readonly OutfitCode[], code: OutfitCode): OutfitCode[] {
  const slot = OUTFIT_SLOTS[code];
  return [...equipped.filter((other) => OUTFIT_SLOTS[other] !== slot), code];
}

export type EquipProblem = 'NOT_OWNED' | 'SLOT_TAKEN';

/** 이 소품들을 함께 입을 수 없는 이유. 입을 수 있으면 null */
export function equipProblem(
  codes: readonly OutfitCode[],
  ownedCodes: readonly OutfitCode[],
): EquipProblem | null {
  if (codes.some((code) => !ownedCodes.includes(code))) return 'NOT_OWNED';
  const slots = codes.map((code) => OUTFIT_SLOTS[code]);
  return new Set(slots).size === slots.length ? null : 'SLOT_TAKEN';
}
