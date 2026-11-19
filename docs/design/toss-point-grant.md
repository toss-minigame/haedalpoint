# 토스 포인트 지급 설계 (프로모션 API)

- 상태: 구현 (출석 1~6일차, 창고 물고기로 받기 [warehouse-toss-point.md](./warehouse-toss-point.md))
- 작성일: 2026-11-16
- 코드: `apps/api/src/modules/toss-point`, 파트너 API 호출은 `modules/toss-partner/toss-partner.client.ts`
- 관련: [attendance-check.md](./attendance-check.md), [ADR-0004 사용자 식별](../adr/0004-user-identification-anonymous-key.md), [ADR-0006](../adr/0006-server-side-user-authentication.md)
- 문서: 앱인토스 개발자센터 `/documentation/common/growth/promotion` (비게임 · 서버를 통해 지급)

## 1. 왜 서버에서 주는가

비게임 미니앱은 SDK `grantPromotionReward`로 서버 없이도 줄 수 있지만, 클라이언트가 부르는 방식은 중복 지급을 막기 어렵다.
출석 기록과 지급을 서버가 같은 기준으로 묶어 **한 출석에 한 번만** 주도록 서버 지급을 쓴다.
대상 식별은 `x-anon-key`이며, 서버가 익명키 교환(ADR-0006)으로 직접 받아 `users.anon_key`에 둔 값만 쓴다.

## 2. 흐름

```
[출석 트랜잭션]  attendance_logs INSERT + toss_point_grants INSERT (status PENDING)
[커밋 뒤]        settle(grant)
                   1) claim: next_attempt_at 을 1분 뒤로 미루는 조건부 UPDATE (동시에 두 곳이 처리하지 않게)
                   2) 저장된 reward_key 가 있으면 execution-result 먼저 조회
                        SUCCESS → 끝, PENDING → 다음에 다시, FAILED·4111(지급 내역 없음) → 3) 으로
                   3) get-key → reward_key 저장 → execute-promotion → execution-result
                        SUCCESS → status SUCCESS, 그 밖 → PENDING 유지
                   실패 → attempts + 1, last_error 기록. 20번 실패하면 FAILED
[다음 GET /attendance/me]  PENDING 건을 다시 settle
```

- **키를 지급 요청 전에 저장한다.** 지급 요청 뒤 응답을 못 받아도(타임아웃) 다음 시도에서 그 키로 결과를 조회해, 이미 지급된 건을 새 키로 또 주지 않는다.
- 지급 키는 1시간 유효하고 한 번만 쓸 수 있다(재사용 시 4113). 키가 만료됐거나 지급되지 않았으면 새 키를 받는다.
- 프로모션 API 호출 한도는 사용자당 분당 10회다. 재시도 간격 1분, 한 번 시도에 최대 4회 호출.
- 프로모션 코드는 이유마다 다르다 (`TOSS_ATTENDANCE_PROMOTION_CODE`, `TOSS_WAREHOUSE_PROMOTION_CODE`). 코드가 없으면 지급하지 않고 PENDING으로 쌓아 둔다 (다음 시도 시각만 1분 미룬다). 설정한 뒤 다음 조회 때 지급된다.
- 익명키가 `legacy:`로 시작하는 옛 사용자는 대상이 아니다 → 바로 FAILED (`NO_ANON_KEY`).

## 3. 데이터 모델 `toss_point_grants`

| 컬럼 | 설명 |
|---|---|
| user_id | `users.id` (관계 미설정) |
| source, source_id | 주는 이유와 그 기록 id. `ATTENDANCE` + `attendance_logs.id`, `WAREHOUSE` + `warehouse_ledger.id`. 유니크라 같은 이유로 두 번 만들 수 없다 |
| amount | 원 |
| status | `PENDING` / `SUCCESS` / `FAILED` |
| reward_key | 마지막으로 쓴 지급 키 |
| last_error | 마지막 실패 코드 (파트너 errorCode, `HTTP_xxx`, `NO_ANON_KEY` 등) |
| attempts, next_attempt_at | 실패 횟수, 다음 시도 가능 시각 (잠금 겸 재시도 간격) |
| granted_at | 지급 확인 시각 |

## 4. 운영

- 콘솔 > 프로모션에서 출석용 프로모션을 만들고 코드를 `TOSS_ATTENDANCE_PROMOTION_CODE`에 넣는다.
- 실제 프로모션 시작 전에 **테스트용 프로모션 코드로 최소 1회 지급**해야 승인 상태가 된다 (토스앱 QR 테스트에서).
- 예산이 다 되면 4109/4112로 실패한다. 지급 건은 PENDING으로 남아 예산을 늘린 뒤 다음 조회 때 지급된다 (20회 한도 안에서).
- FAILED 건 조회: `SELECT * FROM toss_point_grants WHERE status = 'FAILED'`. 다시 주려면 `status = 'PENDING', attempts = 0, next_attempt_at = NULL`로 되돌린다.
- 로컬: `pnpm dev:fake-partner`의 가짜 파트너 API가 get-key / execute-promotion / execution-result를 흉내 낸다 (메모리 저장, 바로 SUCCESS).
