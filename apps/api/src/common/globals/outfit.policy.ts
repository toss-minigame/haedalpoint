import type { OutfitCode, OutfitSlot } from '@haedalpoint/shared';

// 해달 옷장 정책값 (docs/design/otter-outfit.md). 값만 둔다. 계산은 modules/outfit/lib 에 둔다.
// 소품은 창고 물고기를 내고 연다. 꾸미기 전용이라 낚시 속도·용량·지급에 영향이 없고,
// 물고기를 쓰기만 하므로 월 예산(fishing-budget.spec.ts)을 늘리지 않는다.

/** 소품 코드 → 입는 부위. 코드는 DB 에 그대로 남으므로 한 번 쓴 코드는 바꾸지 않는다 */
export const OUTFIT_SLOTS = {
  straw_hat: 'head',
  captain_hat: 'head',
  sunglasses: 'face',
  aquarium_tee: 'body',
  busan_tee: 'body',
  sailor_top: 'body',
  aloha_shirt: 'body',
  santa_hat: 'head',
  santa_suit: 'body',
  santa_beard: 'face',
} as const satisfies Record<OutfitCode, OutfitSlot>;

export const OUTFIT_POLICY = {
  /** 소품 하나를 여는 데 드는 창고 물고기 (마리 = 토스 포인트 1원어치). 임시값 */
  PRICE_FISH: 48_000,
} as const;
