# 출석체크 기능 설계

- 상태: 구현 완료. 2026-11-16 정책 변경: 광고 보고 출석, 누적 일차 보상, 1~6일차 토스 포인트 지급
- 작성일: 2026-11-02 (개정 2026-11-16)
- 구현: PR #2 (`attendance-check`), 광고 2배 PR #16 (2026-11-16 제거)
- 시퀀스: [출석체크 데이터 시퀀스](./attendance-sequence.md) (광고 2배 부분은 옛 흐름)
- 토스 포인트 지급: [toss-point-grant.md](./toss-point-grant.md)
- 관련 ADR: [ADR-0002 비게임 카테고리](../adr/0002-console-category-non-game.md), [ADR-0004 사용자 식별](../adr/0004-user-identification-anonymous-key.md), [ADR-0006 서버 측 사용자 인증(Proposed)](../adr/0006-server-side-user-authentication.md)

## 1. 개요

사용자가 하루에 한 번 **보상형(RV) 광고를 끝까지 보면** 출석이 기록되고, **누적 출석 일차**에 따라 보상을 받는다.
연속이 아니어도 된다 (하루 빠져도 일차는 이어진다).

| 누적 일차 | 보상 |
|---|---|
| 1~6 | 토스 포인트 1원 (프로모션 API로 서버가 지급) |
| 7 | 해달 친구 (온 시각부터 24시간, 속도 +50%, 해먹 용량 +10%) |
| 8~ | 낚싯대 +10단계 (속도 +10%, 그날 KST 자정까지) |

### 범위

| 포함 | 제외 (후속 작업) |
|---|---|
| 광고 보고 출석하기, 오늘 출석 여부·누적 일수·첫 주 7칸 도장 조회 | 운영용 광고 그룹 ID 적용 (출시 전) |
| KST 자정 기준 하루 판정, 하루 1회 제한 (DB 유니크 제약) | 지급 실패 건 운영자 화면 |
| 1~6일차 토스 포인트 지급과 재시도 | |
| 출석 위젯 (web 홈 화면) | |

## 2. 사용자 식별

익명키 교환 기반 인증(ADR-0006)을 쓴다. 흐름은 [사용자 인증 시퀀스](./user-auth-sequence.md)를 본다.

```
[web] 진입 시 User.createAnonymousKeyAuthCode() → POST /auth/anon → 자체 access token
      이후 모든 요청에 Authorization: Bearer (shared/api/http-client.ts, 401 이면 한 번 재발급)
[api] 전역 인증 Guard 가 토큰을 검증해 request.userId 를 붙이고, @CurrentUserId() 가 꺼낸다
```

> 처음에는 임시 식별(`X-User-Id` 헤더)로 구현했고, 아래 원칙 덕분에 출석 모듈의 컨트롤러·서비스를 고치지 않고 교체했다.

### 원칙: 데코레이터만 바꾸면 되도록 구현했다

- 컨트롤러는 사용자 정보를 **`@CurrentUserId() userId: string`으로만** 받는다. API에서 헤더를 직접 읽는 곳은 데코레이터 파일 하나뿐이다.
- 서비스·리포지토리는 `userId`(= `users.id`)만 다룬다. 식별 방식(헤더, 토큰, 익명키)을 알지 못한다.
- `attendance_logs`는 `users`와 TypeORM 관계를 걸지 않고 `user_id` 컬럼으로만 참조한다 (모듈 경계 유지).
- 값 꺼내기는 순수 함수 `extractUserId`로 분리해 단위 테스트했다.

### 운영용 식별(ADR-0006)로 교체하면서 바뀐 곳 (완료)

| 위치 | 변경 내용 |
|---|---|
| `apps/api/src/common/decorators/current-user-id.decorator.ts` | 헤더 대신, 인증 Guard가 토큰을 검증해 request에 붙인 `userId`를 꺼내도록 교체 |
| 인증 Guard (신규) | 전역 등록 권장. 인증이 필요 없는 경로(`/auth/*`, `/health`)는 `@Public()` 표시 |
| `apps/web/src/shared/api/http-client.ts` | `X-User-Id` 대신 `Authorization: Bearer` 주입, 401 시 재인증 |
| `apps/web/src/pages/home/ui/attendance-section.tsx` | `hasUserId` prop과 "테스트용 userId" 안내 제거 (인증 상태는 상위에서 처리) |
| `AttendanceService`의 `usersService.findById` 호출 | Guard가 회원 존재를 보장하면 제거 가능 |
| `dev-user-id.ts`, `dev-user-id-input.tsx` | 삭제 |

출석 모듈의 컨트롤러·서비스 로직·리포지토리는 **변경하지 않았다.** (`usersService.findById` 호출은 그대로 둠)

## 3. 사용자 흐름

```
홈 화면 진입
 → GET 출석 현황 (서버는 아직 지급되지 않은 출석 토스 포인트를 먼저 다시 지급해 본다)
 → 첫 주(7일차)를 마치기 전: 7칸 도장(일차별 보상) + "오늘 출석 보상 · 토스 포인트 1원"
   첫 주를 마친 뒤: 도장 없이 "오늘 출석 보상 · 낚싯대 10단계 강화"
 → [광고 보고 출석하기]
     → loadFullScreenAd → showFullScreenAd
     → userEarnedReward 수신 시에만 POST 출석
         → 1~6일차: "N일째 출석했어요. 토스 포인트 1원을 지급했어요" (지급 확인 전이면 "지급하고 있어요")
         → 7일차: "해달 친구가 24시간 함께 낚시해요"
         → 8일차~: "오늘 자정까지 낚싯대를 10단계 강화했어요"
     → 끝까지 보지 않고 닫으면 출석하지 않는다
     → 현황·낚시 현황 다시 조회 → 버튼이 [출석 완료]로 바뀐다
```

- 다른 기기나 탭에서 이미 출석한 경우(409)는 에러가 아니라 "이미 출석했어요" 안내 후 현황을 다시 조회한다.
- 광고를 쓸 수 없는 환경이면 출석할 수 없다고 안내한다 (광고 없이 출석하는 경로는 없다).

## 4. API 설계 (`apps/api`)

모든 응답은 기존 envelope(`{ success, data }`)를 따른다. 경로는 전역 prefix `/api` 기준.

| Method | Path | 설명 | 주요 응답 |
|---|---|---|---|
| POST | `/attendance/check-in` | 출석 (`userEarnedReward` 수신 후에만 호출) | 출석 날짜, 누적 일차, 보상, 토스 포인트 지급 상태 (`CheckInResponse`) |
| GET | `/attendance/me` | 내 출석 현황 | 오늘 날짜, 오늘 출석 여부, 누적 일수, 첫 주 완료 여부, 다음 보상, 첫 주 도장, 지급 중인 토스 포인트 (`AttendanceStatusResponse`) |

- 날짜와 일차는 **서버 시각·서버 기록으로만** 계산한다. 클라이언트가 날짜를 보내지 않는다.
- `POST /attendance/ad-bonus`(광고 2배)는 없앴다.

### 에러 처리

| 상황 | 응답 |
|---|---|
| 토큰이 없거나 위조·만료됨 (웹이 한 번 재발급 후 재시도) | 401 |
| 존재하지 않는 사용자 | 404 |
| 오늘 이미 출석함 (조회 시점 확인 + 동시 요청은 유니크 위반 23505로 판정) | 409 |
| 토스 포인트 지급 실패 | 출석은 성공(200), `tossPointGrant: 'PENDING'`. 서버가 다시 시도한다 |

## 5. 데이터 모델

### `attendance_logs`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK (`BaseEntity`) |
| user_id | uuid | `users.id` 참조 (관계 미설정) |
| checked_date | date | KST 기준 `YYYY-MM-DD` |
| attendance_day | smallint | 누적 출석 일차 (1부터, CHECK ≥ 1) |
| reward_type | varchar(32) | `TOSS_POINT` / `OTTER_FRIEND` / `ENHANCE_BONUS` |
| reward_amount | int | 원 / 명 / 강화 단계 |
| reward_applied_at | timestamptz, nullable | 보상을 적용한 시각 (출석 기록과 같은 트랜잭션) |
| created_at / updated_at | timestamptz | `BaseEntity` |

- 유니크 제약 `(user_id, checked_date)`, `(user_id, attendance_day)`: 하루 두 번 출석이나 연타를 막는다. 위반 시 409.
- 마이그레이션 `FishPolicyGram`(1794200000000)이 `streak_day` → `attendance_day`로 바꾸고 기존 기록을 날짜순 누적 일차로 다시 매긴다. `cycle_completed`, `ad_bonus_claimed_at`은 삭제.
- 토스 포인트 지급 건은 `toss_point_grants`(source `ATTENDANCE`, source_id = 출석 로그 id)에 따로 둔다.

### 하루 판정 (`lib/kst-date.ts`)

출석의 하루는 **KST 00:00 기준**이다. 서버나 DB의 타임존 설정에 기대지 않고, UTC 시각에 +9시간을 더해 날짜를 계산한다.
O/X 퀴즈의 `attempted_date`도 이 유틸을 재사용한다.

## 6. 보상 정책

정책 값은 `apps/api/src/common/globals/attendance.policy.ts`(`ATTENDANCE_POLICY`)에만 둔다. 일차 → 보상 계산은 `modules/attendance/lib/attendance-reward.policy.ts`.

| 상수 | 값 | 의미 |
|---|---|---|
| `TOSS_POINT_LAST_DAY` | 6 | 1일차부터 이 일차까지 토스 포인트 |
| `TOSS_POINTS_PER_DAY` | 1 | 하루 토스 포인트 (원) |
| `OTTER_FRIEND_DAY` | 7 | 해달 친구가 오는 일차 |
| `ROD_LEVELS_AFTER_FIRST_WEEK` | 10 | 8일차부터 매일 낚싯대 강화 단계 |

- 사용자 한 명이 출석으로 받는 토스 포인트는 평생 6원이다. 해달 친구도 한 번 온다.
- 월 예산 테스트(`fishing-budget.spec.ts`)가 출석 토스 포인트 6원과 8일차부터의 강화 10단계를 최악값에 넣는다.

### 정책 제약 (앱인토스)

- 보상은 고정 수량이다. 랜덤 보상을 쓰지 않는다.
- 보상 조건은 `userEarnedReward` 이벤트다. **`dismissed`나 광고 클릭을 보상 조건으로 쓰지 않는다.**
- 토스 포인트를 줄 때는 "토스 포인트 지급"이라고 쓴다. 앱 내 재화(물고기)에 '포인트', '출금', '인출', '환전'을 쓰지 않는다.
- 프로모션 참여 전에 지급 시점을 알려야 한다 ("출석하면 바로 지급돼요" 등). 지급이 늦어질 수 있음을 화면 문구에 반영한다.

## 7. 웹 구조 (`apps/web`, FSD)

```
src/
  entities/attendance/
    api/attendance-api.ts, attendance-queries.ts   # 조회·출석 요청, 쿼리 키
    lib/format-reward.ts                           # 보상 문구 ("토스 포인트 1원", "해달 친구", "낚싯대 10단계 강화")
    model/types.ts                                 # shared 타입 재export
    ui/attendance-stamps.tsx                       # 첫 주 7칸 도장 (일차별 보상)
  features/check-in/
    api/use-check-in.ts                            # 출석 mutation, 보상별 안내, 409 안내, 출석·낚시 현황 재조회
    ui/check-in-button.tsx                         # [광고 보고 출석하기] (shared/ui/rewarded-ad-button 사용)
  pages/home/
    ui/attendance-section.tsx                      # 출석 위젯 카드
```

- 보상형 광고는 `pages/home/ui/home-page.tsx`에서 한 번만 미리 불러와 홈의 광고 버튼이 함께 쓴다. 같은 광고 그룹은 한 번에 하나만 미리 불러올 수 있다.
- devtools mock 의 전면 광고는 `userEarnedReward`를 보내지 않아, 브라우저에서는 "끝까지 보지 않고 닫음" 경로만 재현된다. 보상 경로는 실기기(테스트 광고 ID)에서 확인한다.

## 8. 공유 타입 (`packages/shared`)

`src/attendance.ts`: `AttendanceRewardType`, `AttendanceReward`, `AttendanceWeekDay`, `AttendanceWeekStamp`, `TossPointGrantStatus`, `CheckInResponse`, `AttendanceStatusResponse`

## 9. 테스트

`apps/api/src/modules/attendance/__test__/` (`pnpm --filter @haedalpoint/api test`)

| 파일 | 대상 |
|---|---|
| `attendance-reward.policy.spec.ts` | 일차별 보상 (1~6 토스 포인트, 7 해달 친구, 8~ 강화) |
| `attendance-status.spec.ts` | 현황 응답 조립 (띄엄띄엄 출석, 첫 주 완료) |
| `attendance.service.spec.ts` | 출석, 보상 적용, 커밋 뒤 지급, 중복 출석 409, 유니크 위반 처리 |
| `attendance.repository.spec.ts` | 조회 조건·정렬 |
| `attendance.controller.spec.ts` | 서비스 위임 |

## 10. 알려진 한계

- **광고 시청 완료를 서버가 직접 확인할 수 없다.** `userEarnedReward`는 클라이언트 이벤트이므로 조작된 클라이언트가 광고 없이 출석 API를 호출할 수 있다.
  - 완화: 하루 1회, 토스 포인트는 사용자당 평생 6원
- 토스 포인트 지급이 PENDING인 채로 남으면 다음 출석 현황 조회 때 다시 시도한다. 20번 실패하면 FAILED로 두고 더 시도하지 않는다 (운영자 확인 필요).

## 11. 후속 작업

1. 출시 전: `VITE_REWARDED_AD_GROUP_ID`를 콘솔에서 발급한 운영용 광고 그룹 ID로 교체
2. 출시 전: 콘솔에서 출석 프로모션을 만들고 `TOSS_ATTENDANCE_PROMOTION_CODE` 설정, 테스트 프로모션 코드로 1회 이상 지급 (토스앱 QR 테스트)
3. FAILED 지급 건 확인·재지급 방법 (운영자)
