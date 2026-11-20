// 해달 옷장 (docs/design/otter-outfit.md). 창고 물고기를 내고 소품을 열어 해달에게 입힌다.

/** 소품 코드. 한 번 쓴 코드는 바꾸지 않는다 (DB 에 그대로 남는다) */
export type OutfitCode =
  | 'straw_hat'
  | 'captain_hat'
  | 'sunglasses'
  | 'aquarium_tee'
  | 'busan_tee'
  | 'sailor_top'
  | 'aloha_shirt'
  | 'santa_hat'
  | 'santa_suit'
  | 'santa_beard';

/** 입는 부위. 같은 부위에는 하나만 입는다 (머리 소품은 기본 털모자를, 몸 소품은 기본 목도리를 대신한다) */
export type OutfitSlot = 'head' | 'face' | 'body';

export interface OutfitItem {
  code: OutfitCode;
  slot: OutfitSlot;
  /** 여는 데 드는 창고 물고기 (마리) */
  priceFish: number;
  /** 열었는지. 연 소품은 계속 가지고 있는다 */
  owned: boolean;
  /** 지금 입고 있는지 (연 소품만 입을 수 있다) */
  equipped: boolean;
}

// GET /api/outfits, POST /api/outfits/:code/unlock, PUT /api/outfits/equipped 의 응답
export interface OutfitsResponse {
  /** 창고의 물고기 (마리) */
  warehouseFish: number;
  outfits: OutfitItem[];
}

// PUT /api/outfits/equipped
export interface EquipOutfitsRequest {
  /** 입을 소품 전체 (빈 배열이면 모두 벗는다). 연 소품만, 부위마다 하나만 */
  codes: OutfitCode[];
}
