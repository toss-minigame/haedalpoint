import type { TossPointGrantStatus } from './attendance';

// 해달 낚시 · 해먹 · 창고 API 응답 타입 (FE/BE 공용)
// 수량은 서버가 시간으로 계산한다. 정책값(속도, 용량 등)도 api 가 응답으로 내려준다.
// 단위: 물고기 1마리 = 1g, 토스 포인트 1원 = 48,000마리. 수량은 소수 셋째 자리까지 올 수 있고 화면은 정수로 내림한다.
//
// 흐름: 해달 낚시 → 해먹(용량 한도) → 창고(영속) → 토스 포인트

// GET /api/fishing/me
export interface FishingStatusResponse {
  serverTime: string; // ISO 8601
  /** 해먹의 물고기 (마리, 소수 셋째 자리까지. 화면에는 정수로 내림해서 표시) */
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
  /** 지금 함께 낚시하는 해달 친구 수 (0 또는 1, 출석 7일차·튜토리얼 완료) */
  otterFriendCount: number;
  /** 해달 친구가 떠나는 시각 (ISO 8601, 온 지 24시간. 얼리면 더 늦어진다). 친구가 없으면 null */
  otterFriendUntil: string | null;
  /** 해달 친구가 녹기 시작하는 시각 (ISO 8601, 떠나기 1시간 전). 친구가 없으면 null */
  otterFriendMeltsAt: string | null;
  /** 이번에 온 친구를 이미 얼렸는지 (광고 보고 연장, 올 때마다 한 번) */
  otterFriendFrozen: boolean;
  /** 지금 광고를 보고 얼릴 수 있는지 (녹는 중이고 아직 얼리지 않음). 시각이 지나면 otterFriendMeltsAt 으로 다시 판단한다 */
  otterFriendFreezable: boolean;
  /** 얼리면 더 머무는 시간 (시간) */
  otterFriendFreezeHours: number;
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
  /** 강화·해먹 넓히기·미끼가 풀리는 시각 = 다음 KST 자정 (ISO 8601). 해달 친구는 otterFriendUntil */
  boostsResetAt: string;
  /** 창고의 물고기 (마리) */
  warehouseFish: number;
}

// POST /api/fishing/ad-enhance-rod, POST /api/fishing/ad-expand-hammock, POST /api/fishing/ad-freeze-friend
// 보상형 광고를 끝까지 본 뒤(`userEarnedReward`)에만 호출한다. 응답은 바뀐 뒤의 현황이다.
export type FishingAdBoostResponse = FishingStatusResponse;

// POST /api/fishing/store
export interface StoreFishResponse {
  /** 이번에 창고로 옮긴 물고기 (해먹 전체) */
  storedFish: number;
  warehouseFish: number;
  /** 옮기고 남은 해먹의 물고기 (모두 옮기므로 0) */
  hammockFish: number;
  /** 해먹이 넘쳤던 물고기 일부를 광고를 보고 다시 잡아올 수 있으면 true (양은 알려주지 않는다) */
  catchBackAvailable: boolean;
}

// POST /api/fishing/ad-catch-back
export interface FishingCatchBackResponse {
  /** 해달이 다시 잡아와 해먹에 넣은 물고기 (마리) */
  caughtBackFish: number;
  hammockFish: number;
}

// GET /api/fishing/warehouse
/** 창고 이력 종류. STORE: 해먹 → 창고 저장 (늘어남), TOSS_POINT: 토스 포인트로 받음 (줄어듦) */
export type WarehouseEntryType = 'STORE' | 'TOSS_POINT';

export interface WarehouseEntry {
  id: string;
  type: WarehouseEntryType;
  /** 늘거나 준 물고기 (마리, 항상 양수. 방향은 type 으로 정해진다) */
  amount: number;
  createdAt: string; // ISO 8601
}

/** 창고 물고기로 토스 포인트 받기 현황 */
export interface WarehouseTossPoint {
  /** 받기를 열었는지 (서버에 프로모션 코드가 있을 때만 true). false 면 화면은 준비 중으로 보여준다 */
  enabled: boolean;
  /** 토스 포인트 1원에 드는 물고기 (마리) */
  fishPerPoint: number;
  /** 지금 받을 수 있는 토스 포인트 (원). 창고 물고기와 오늘 남은 한도 중 작은 쪽 */
  claimablePoints: number;
  /** 하루(KST) 최대로 받을 수 있는 토스 포인트 (원) */
  dailyLimit: number;
  /** 오늘(KST) 받은 토스 포인트 (원) */
  todayClaimedPoints: number;
  /** 받았지만 아직 지급 중인 토스 포인트 (원) */
  pendingPoints: number;
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
  tossPoint: WarehouseTossPoint;
}

// POST /api/fishing/claim-toss-point
// 창고 물고기를 1원 단위로 받을 수 있는 만큼 모두 토스 포인트로 받는다 (오늘 한도 안에서)
export interface ClaimTossPointResponse {
  /** 이번에 받은 토스 포인트 (원) */
  claimedPoints: number;
  /** 이번에 쓴 물고기 (마리) */
  usedFish: number;
  /** 받고 남은 창고 물고기 (마리) */
  warehouseFish: number;
  /** 지급 결과. PENDING 이면 지급 중이고 창고 화면을 열 때 다시 시도한다 */
  tossPointGrant: TossPointGrantStatus;
}
