import type { OutfitCode, OutfitSlot } from '@haedalpoint/shared';

export type { OutfitCode, OutfitSlot };

/**
 * 해달이 입는 소품의 이름과 부위 (docs/design/otter-outfit.md). 코드와 부위는 서버 정책
 * (apps/api/src/common/globals/outfit.policy.ts)과 같아야 한다.
 * 3D 모델은 design/otter-3d/build_outfits.py 로 만든다 (소품 하나가 glb 하나).
 * 같은 부위에는 하나만 입는다. 머리 소품을 쓰면 기본 털모자를, 몸에 옷을 입으면 기본 목도리를 벗는다
 */
export const OUTFITS: Record<OutfitCode, { name: string; slot: OutfitSlot }> = {
  straw_hat: { name: '밀짚모자', slot: 'head' },
  captain_hat: { name: '선장 모자', slot: 'head' },
  sunglasses: { name: '선글라스', slot: 'face' },
  aquarium_tee: { name: '아쿠아리움 티셔츠', slot: 'body' },
  busan_tee: { name: '부산 티셔츠', slot: 'body' },
  sailor_top: { name: '세일러 셔츠', slot: 'body' },
  aloha_shirt: { name: '하와이안 셔츠', slot: 'body' },
  santa_hat: { name: '산타 모자', slot: 'head' },
  santa_suit: { name: '산타 옷', slot: 'body' },
  santa_beard: { name: '산타 수염', slot: 'face' },
  rudolph_antlers: { name: '루돌프 뿔', slot: 'head' },
  rudolph_nose: { name: '루돌프 코', slot: 'face' },
  rudolph_suit: { name: '루돌프 옷', slot: 'body' },
};

export const OUTFIT_CODES = Object.keys(OUTFITS) as OutfitCode[];

/** 소품을 눌렀을 때 입은 목록: 입고 있던 것이면 벗고, 아니면 같은 부위의 다른 소품을 벗기고 입는다 */
export function toggleOutfit(worn: readonly OutfitCode[], code: OutfitCode): OutfitCode[] {
  if (worn.includes(code)) return worn.filter((other) => other !== code);
  const slot = OUTFITS[code].slot;
  return [...worn.filter((other) => OUTFITS[other].slot !== slot), code];
}
