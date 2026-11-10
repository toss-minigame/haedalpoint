// 해달 낚시 · 해먹 · 창고 API 응답 타입 (FE/BE 공용)
// 수량은 서버가 시간으로 계산한다. 정책값(속도, 용량 등)도 api 가 응답으로 내려준다.
//
// 흐름: 해달 낚시 → 해먹(용량 한도) → 창고(영속) → 토스 포인트 (후속 작업)

// GET /api/fishing/me
export interface FishingStatusResponse {
  serverTime: string; // ISO 8601
  /** 해먹의 물고기 (소수점 포함. 화면에는 소수 7자리로 내림해서 표시) */
  hammockFish: number;
  hammockCapacity: number;
  /** 해먹이 가득 차는 예상 시각 (ISO 8601). 이미 가득이면 null */
  hammockFullAt: string | null;
  /** 지금 속도 (마리/시간) */
  fishPerHour: number;
  /** 기본 속도 대비 지금 속도 (%). 100 = 기본 */
  speedPercent: number;
  rodLevel: number;
  /** 하루 최대 강화 단계. null 이면 상한 없음 */
  rodMaxLevel: number | null;
  /** 낚싯대 강화로 오른 속도 (%) */
  rodSpeedBonusPercent: number;
  otterFriendActive: boolean;
  /** 오늘 함께 낚시하는 해달 친구 수 (7일차 출석 1, 출석 광고 2배로 +1) */
  otterFriendCount: number;
  /** 오늘 광고로 넓힌 해먹 단계 (0이면 기본 해먹) */
  hammockLevel: number;
  hammockMaxLevel: number;
  /** 해먹 단계로 늘어난 용량 (기본 용량 대비 %, 등비라 소수 첫째 자리까지) */
  hammockLevelBonusPercent: number;
  /** 광고 강화 1회로 오르는 낚시 속도 (%) */
  adRodSpeedBonusPercent: number;
  /** 광고 강화 쿨타임이 끝나는 시각 (ISO 8601). 지금 강화할 수 있으면 null */
  adRodEnhanceAvailableAt: string | null;
  /** 광고 해먹 넓히기 1회로 늘어나는 용량 (직전 용량 대비 %) */
  adHammockBonusPercent: number;
  /** 광고 해먹 넓히기 1회로 함께 오르는 낚시 속도 (%) */
  adHammockRodSpeedBonusPercent: number;
  /** 오늘 적용한 룰렛 미끼로 오른 낚시 속도 (%). 적용 전이면 0 */
  baitSpeedBonusPercent: number;
  /** 광고 해먹 넓히기 쿨타임이 끝나는 시각 (ISO 8601). 지금 넓힐 수 있으면 null */
  adHammockExpandAvailableAt: string | null;
  /** 강화·해달 친구·해먹 넓히기가 풀리는 시각 = 다음 KST 자정 (ISO 8601) */
  boostsResetAt: string;
  /** 창고의 물고기 (소수점 포함) */
  warehouseFish: number;
}

// POST /api/fishing/ad-enhance-rod, POST /api/fishing/ad-expand-hammock
// 보상형 광고를 끝까지 본 뒤(`userEarnedReward`)에만 호출한다. 응답은 바뀐 뒤의 현황이다.
export type FishingAdBoostResponse = FishingStatusResponse;

// POST /api/fishing/store
export interface StoreFishResponse {
  /** 이번에 창고로 옮긴 물고기 (해먹 전체, 소수점 포함) */
  storedFish: number;
  warehouseFish: number;
  /** 옮기고 남은 해먹의 물고기 (모두 옮기므로 0) */
  hammockFish: number;
}

// GET /api/fishing/warehouse
/** 창고 이력 종류. STORE: 해먹 → 창고 저장. (후속) 토스 포인트 전환 이력이 추가된다 */
export type WarehouseEntryType = 'STORE';

export interface WarehouseEntry {
  id: string;
  type: WarehouseEntryType;
  amount: number;
  createdAt: string; // ISO 8601
}

export interface WarehouseResponse {
  serverTime: string; // ISO 8601
  /** 창고에 있는 물고기 */
  warehouseFish: number;
  /** 오늘(KST) 창고에 저장한 물고기 */
  todayStoredFish: number;
  /** 이번 달(KST) 창고에 저장한 물고기 */
  monthStoredFish: number;
  /** 최근 이력 (최신순, 최대 개수는 서버가 정한다) */
  recentEntries: WarehouseEntry[];
}
