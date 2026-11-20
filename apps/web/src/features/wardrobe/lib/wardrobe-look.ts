import type { OutfitCode, OutfitItem } from '@/entities/otter';

// 옷장을 연 동안 해달에게 보이는 차림(look) 계산 (순수 함수).
// look 에는 연 소품과, 잠긴 채 입어 보는 소품이 함께 들어 있다. 저장하는 것은 연 소품뿐이다.

/** 서버에 저장된, 지금 입고 있는 소품 */
export function equippedOf(outfits: readonly OutfitItem[]): OutfitCode[] {
  return outfits.filter((outfit) => outfit.equipped).map((outfit) => outfit.code);
}

/**
 * 보이는 차림에서 저장할 소품: 보이는 연 소품, 그리고 잠긴 소품을 입어 보느라 잠시 가려진 부위에
 * 원래 입고 있던 소품 (입어 보기는 저장된 차림을 바꾸지 않는다. 닫으면 원래 차림으로 돌아온다)
 */
export function savableOf(
  look: readonly OutfitCode[],
  outfits: readonly OutfitItem[],
): OutfitCode[] {
  const previewSlots = previewsOf(look, outfits).map((outfit) => outfit.slot);
  return outfits
    .filter(
      (outfit) =>
        outfit.owned &&
        (look.includes(outfit.code) || (outfit.equipped && previewSlots.includes(outfit.slot))),
    )
    .map((outfit) => outfit.code);
}

/** 잠긴 채 입어 보는 소품 */
export function previewsOf(
  look: readonly OutfitCode[],
  outfits: readonly OutfitItem[],
): OutfitItem[] {
  return outfits.filter((outfit) => !outfit.owned && look.includes(outfit.code));
}

/** 순서와 상관없이 같은 소품들인지 */
export function isSameSet(a: readonly OutfitCode[], b: readonly OutfitCode[]): boolean {
  return a.length === b.length && a.every((code) => b.includes(code));
}

/** 소품을 여는 데 모자란 물고기 (마리, 올림). 충분하면 0 */
export function shortFish(priceFish: number, warehouseFish: number): number {
  return Math.max(0, Math.ceil(priceFish - warehouseFish));
}
