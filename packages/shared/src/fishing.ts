// 해달 낚시 · 해먹 · 창고 API 응답 타입 (FE/BE 공용)
// 수량은 서버가 시간으로 계산한다. 정책값(속도, 용량 등)도 api 가 응답으로 내려준다.
//
// 흐름: 해달 낚시 → 해먹(용량 한도) → 창고(영속) → 토스 포인트 (후속 작업)

// GET /api/fishing/me
export interface FishingStatusResponse {
  serverTime: string; // ISO 8601
  /** 해먹의 물고기 (소수점 포함. 화면에는 내림해서 표시) */
  hammockFish: number;
  hammockCapacity: number;
  /** 해먹이 가득 차는 예상 시각 (ISO 8601). 이미 가득이면 null */
  hammockFullAt: string | null;
  /** 지금 속도 (마리/시간) */
  fishPerHour: number;
  /** 기본 속도 대비 지금 속도 (%). 100 = 기본 */
  speedPercent: number;
  rodLevel: number;
  rodMaxLevel: number;
  /** 낚싯대 강화로 오른 속도 (%) */
  rodSpeedBonusPercent: number;
  otterFriendActive: boolean;
  /** 강화·해달 친구가 풀리는 시각 = 다음 KST 자정 (ISO 8601) */
  boostsResetAt: string;
  warehouseFish: number;
}

// POST /api/fishing/store
export interface StoreFishResponse {
  /** 이번에 창고로 옮긴 물고기 */
  storedFish: number;
  warehouseFish: number;
  /** 옮기고 남은 해먹의 물고기 (1마리 미만 소수) */
  hammockFish: number;
}
