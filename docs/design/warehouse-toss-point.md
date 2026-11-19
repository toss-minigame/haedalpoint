# 창고 물고기로 토스 포인트 받기

- 상태: 서버·웹 구현 (2026-11-19). 프로모션 코드(`TOSS_WAREHOUSE_PROMOTION_CODE`)를 넣기 전까지 화면은 "준비하고 있어요"로 막혀 있다
- 코드: 서버 `modules/fishing` (`claimTossPoint`, `lib/warehouse-toss-point.ts`), 지급은 `modules/toss-point`. 웹 `features/claim-toss-point`
- 관련: [toss-point-grant.md](./toss-point-grant.md), [fishing.md](./fishing.md), [ADR-0003 재화 이름](../adr/0003-in-app-currency-name.md), [ADR-0007 낚시 경제](../adr/0007-fishing-economy.md)
- 문서: 앱인토스 개발자센터 `/guide/marketing/promotion` (자체 포인트, 사전 점검 체크리스트), `/documentation/common/growth/promotion`

## 1. 규칙

| 항목 | 정한 것 |
|---|---|
| 비율 | 물고기 48,000마리 = 토스 포인트 1원 (`FISHING_POLICY.FISH_PER_TOSS_POINT`, 확정) |
| 단위 | 1원 단위. 받을 수 있는 만큼 **한 번에 모두** 받는다. 사용자가 금액을 고르지 않는다. 1원이 안 되는 나머지는 창고에 남는다 |
| 하루 한도 | 1인 하루(KST) 200원 (`WAREHOUSE_TOSS_POINT_POLICY.DAILY_LIMIT`). 콘솔 프로모션의 '1인 하루 최대 지급 금액'과 같은 값으로 둔다 |
| 광고 | 없다. 창고 저장에서 이미 광고를 본다 |
| 받을 수 없는 경우 | 프로모션 코드 없음 → 준비 중, 익명키가 없는 옛 계정 → 막음 (물고기를 차감하기 전에 막는다), 1원 미만 → 막음, 오늘 한도 다 씀 → 막음. 모두 409 |

하루 한도를 200원으로 둔 이유: 최악의 한 달 적립(`fishing-budget.spec.ts`, 약 148원)을 한 번에 받을 수 있어야
한 달 모아 둔 사람도 콘솔 한도에 걸리지 않는다. 콘솔 값과 다르면 토스가 지급을 거절하니 둘을 함께 바꾼다.

## 2. 흐름

```
POST /api/fishing/claim-toss-point
  프로모션 코드·계정 확인 (아니면 409)
  [트랜잭션] fishing_states 행 잠금
             오늘 TOSS_POINT 이력 합계로 오늘 받은 금액 계산 → 받을 금액 = min(창고 ÷ 48,000, 200 - 오늘 받은 금액)
             창고 차감 → warehouse_ledger(TOSS_POINT, 쓴 물고기) → toss_point_grants(WAREHOUSE, 이력 id, 금액, PENDING)
  [커밋 뒤]  settle (get-key → execute-promotion → execution-result, toss-point-grant.md 2장)
  응답: claimedPoints, usedFish, warehouseFish, tossPointGrant(SUCCESS | PENDING | FAILED)

GET /api/fishing/warehouse
  PENDING 지급 건을 먼저 다시 settle → 응답 tossPoint 에 받을 수 있는 금액·오늘 받은 금액·지급 중 금액
```

- 행 잠금 안에서 오늘 받은 양을 세므로 연타해도 한도를 넘지 않는다.
- 지급 건의 `source_id`는 창고 이력 id다. `(source, source_id)` 유니크라 한 이력으로 두 번 주지 않는다.
- 프로모션 코드는 지급 이유마다 따로 쓴다 (`TossPointService`의 `PROMOTION_CODE_ENV`). 가이드가 승인된 코드를 다른 프로모션에 쓰는 것을 금지한다.
- 새 테이블·칼럼은 없다 (`warehouse_ledger.type`, `toss_point_grants.source`에 값만 추가). 마이그레이션이 필요 없다.

## 3. 화면

- 창고 화면 첫 카드 아래 "토스 포인트로 받기" 카드: 포인트 동전 아이콘, 지금 받을 수 있는 금액, 다음 1원까지 남은 물고기, 버튼 "토스 포인트 N원 받기".
- 받으면 결과 창: 포인트 동전과 "토스 포인트 N원을 받았어요 / 물고기 M마리가 토스 포인트 N원이 됐어요". 지급 중이면 "지급하고 있어요"로 바꿔 보여준다.
- 카드 아래 안내 4줄 (가이드의 필수 안내): 지급 시점, 하루 한도, 부정 참여 시 지급 안 함, "이 프로모션은 사전 고지 없이 중단될 수 있어요".
- 최근 기록에 "토스 포인트로 받음 -M마리"가 남는다.
- 문구는 '받기'·'지급'만 쓴다. '교환'·'환전'·'출금'·'인출'은 쓰지 않는다 (ADR-0003).
- 포인트 동전(`PointCoinIcon`)은 해달해달 자체 그림이다 (앱 주색 파란 동전 + P). 토스 포인트 공식 아이콘 파일을 가져다 쓰지 않는다.

## 4. 운영 (출시 전에 할 일)

1. 앱인토스에 확인: 가이드 사전 점검 체크리스트의 "사용자가 가진 재화를 토스 포인트로 교환·전환해 주는 형태는 아닌가요?"와 '자체 포인트' 절이 어떻게 함께 적용되는지, 서버 지급을 익명키로 해도 되는지.
2. 콘솔 > 프로모션에서 창고용 프로모션을 **자체 포인트**로 만든다. 1인 하루 최대 지급 금액 = 200원.
3. 테스트 코드(`TEST_{코드}`)로 최소 1회 지급한 뒤 시작하고, 코드를 `TOSS_WAREHOUSE_PROMOTION_CODE`에 넣는다.
4. 매월 말 자체 포인트 발행 총액(그달 `warehouse_ledger` STORE 합계), 단위, 전환 비율을 콘솔에 입력한다.
5. 튜토리얼 4단계 문구를 "받을 수 있어요"로 바꾼다 ([tutorial.md](./tutorial.md) 129줄).
6. FAILED 지급 건은 출석과 같이 처리한다 ([toss-point-grant.md](./toss-point-grant.md) 4장). 물고기는 이미 차감됐으므로 PENDING 으로 되돌려 다시 지급한다.
