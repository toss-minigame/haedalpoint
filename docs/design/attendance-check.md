# 출석체크 기능 설계

- 상태: 구현 완료 (출석·광고 2배 보너스). 강화·동료 모듈로의 실제 적립은 후속 작업
- 작성일: 2026-11-02
- 구현: PR #2 (`attendance-check`), 광고 2배 PR #16
- 시퀀스: [출석체크 데이터 시퀀스](./attendance-sequence.md)
- 관련 ADR: [ADR-0002 비게임 카테고리](../adr/0002-console-category-non-game.md), [ADR-0004 사용자 식별](../adr/0004-user-identification-anonymous-key.md), [ADR-0006 서버 측 사용자 인증(Proposed)](../adr/0006-server-side-user-authentication.md)

## 1. 개요

사용자가 하루에 한 번 출석하면 일차별 보상을 받는 기능이다.
7일 연속 출석이 한 사이클이며, 1~6일차는 **강화 보너스**, 7일차는 **해달 친구**를 받는다.
사이클을 채운 다음 날이나 하루라도 빠진 날에는 1일차부터 다시 시작한다.

### 범위

| 포함 (구현 완료) | 제외 (후속 작업) |
|---|---|
| 출석하기, 오늘 출석 여부·연속 일차·7칸 스탬프 조회 | 강화 보너스 실제 적립 (강화 모듈) |
| KST 자정 기준 하루 판정 | 해달 친구 지급 (동료 모듈) |
| 일차별 보상 기록, 사이클 완료 판정 | 운영용 광고 그룹 ID 적용 (출시 전) |
| '광고 보고 2배 받기' (보상형 광고, 하루 1회) | |
| 하루 1회 제한 (DB 유니크 제약) | 운영용 사용자 식별 (ADR-0006) |
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
 → GET 출석 현황 → 7칸 스탬프 + 연속 일차 + 다음 보상 표시
 → [출석하기 (N일차 · 보상)] 버튼
     → POST 출석 → "N일차 출석 완료! 강화 보너스 +N" 토스트
     → 7일차면 "7일 연속 출석 달성! 해달 친구가 합류했어요"
     → 현황 다시 조회 → 버튼이 [출석 완료]로 비활성화
 → (오늘 출석했고 광고 보너스 미수령이면) 보상형 광고를 미리 불러오고 [광고 보고 2배 받기] 버튼 노출
     → loadFullScreenAd → showFullScreenAd
     → userEarnedReward 수신 시에만 POST 광고 보너스 → "강화 보너스 +N를 한 번 더 받았어요" / "해달 친구가 한 명 더 합류했어요"
     → 끝까지 보지 않고 닫으면 "광고를 끝까지 보면 보상을 한 번 더 받을 수 있어요" 안내 (요청 안 함)
```

- 다른 기기나 탭에서 이미 출석한 경우(409)는 에러가 아니라 "이미 출석했어요" 안내 후 현황을 다시 조회한다.
- 요청 중에는 버튼을 비활성화해 연타를 막는다. 최종 방어선은 DB 유니크 제약이다.

## 4. API 설계 (`apps/api`)

모든 응답은 기존 envelope(`{ success, data }`)를 따른다. 경로는 전역 prefix `/api` 기준.

| Method | Path | 설명 | 주요 응답 |
|---|---|---|---|
| POST | `/attendance/check-in` | 오늘 출석 | 출석 날짜, 일차, 보상, 사이클 완료 여부 (`CheckInResponse`) |
| GET | `/attendance/me` | 내 출석 현황 | 오늘 날짜, 오늘 출석 여부, 현재 연속 일차, 다음 일차·보상, 7칸 스탬프, 광고 보너스 가능 여부 (`AttendanceStatusResponse`) |
| POST | `/attendance/ad-bonus` | 광고 보고 2배 받기 (`userEarnedReward` 수신 후에만 호출) | 오늘 출석 보상과 같은 종류·수량의 추가 보상 (`AdBonusResponse`) |

- 날짜와 일차는 **서버 시각으로만** 계산한다. 클라이언트가 날짜를 보내지 않는다.
- `GET /attendance/me`의 `currentStreakDay`는 끊겼거나 새 사이클 시작 전이면 0이다. 7일차 달성 당일에는 7을 그대로 보여준다.

### 에러 처리

| 상황 | 응답 |
|---|---|
| 토큰이 없거나 위조·만료됨 (웹이 한 번 재발급 후 재시도) | 401 |
| 존재하지 않는 사용자 | 404 |
| 오늘 이미 출석함 (조회 시점 확인 + 동시 요청은 유니크 위반 23505로 판정) | 409 |
| 광고 보너스: 오늘 출석 기록 없음 | 404 |
| 광고 보너스: 이미 수령함 (동시 요청은 조건부 UPDATE 로 한 번만 반영) | 409 |

## 5. 데이터 모델

### `attendance_logs`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK (`BaseEntity`) |
| user_id | uuid | `users.id` 참조 (관계 미설정) |
| checked_date | date | KST 기준 `YYYY-MM-DD` |
| streak_day | smallint | 1~7 (CHECK 제약) |
| reward_type | varchar(32) | `ENHANCE_BONUS` / `OTTER_FRIEND` |
| reward_amount | int | 보상 수량 |
| cycle_completed | boolean | 7일차 달성 여부 |
| reward_applied_at | timestamptz, nullable | 강화 모듈이 실제로 적립한 시각 (후속 작업) |
| ad_bonus_claimed_at | timestamptz, nullable | 광고 2배 수령 시각. `IS NULL` 조건부 UPDATE 로 하루 1회만 기록 |
| created_at / updated_at | timestamptz | `BaseEntity` |

- 유니크 제약 `(user_id, checked_date)`: 하루 두 번 출석이나 연타를 막는다. 위반 시 `is-unique-violation`으로 판정해 409로 바꾼다.
- 인덱스 `user_id`: 최근 출석 조회용.
- 마이그레이션: `CreateUsers`, `CreateAttendanceLogs`. **2026-11-02 기준 Supabase DB에 아직 적용되지 않았다.**

### 하루 판정 (`lib/kst-date.ts`)

출석의 하루는 **KST 00:00 기준**이다. 서버나 DB의 타임존 설정에 기대지 않고, UTC 시각에 +9시간을 더해 날짜를 계산한다.
O/X 퀴즈의 `attempted_date`도 이 유틸을 재사용한다.

## 6. 보상·연속 출석 정책

정책 값은 `modules/attendance/lib/attendance-reward.policy.ts` 한 곳에서 관리한다.

| 일차 | 보상 | 비고 |
|---|---|---|
| 1~6 | 강화 보너스 +일차 수 (1, 2, 3, 4, 5, 6) | 임시 값. 밸런스 조정 시 정책 파일만 수정 |
| 7 | 해달 친구 1 | 사이클 완료 |

- **연속 판정**: 직전 출석이 어제이고 사이클이 진행 중이면 +1일차, 아니면 1일차.
- **사이클 완료 후**: 7일차 다음 날은 1일차로 다시 시작한다.

### 정책 제약 (앱인토스)

- 보상은 고정 수량이다. 랜덤 보상을 쓰지 않는다.
- 광고 보너스의 보상 조건은 `userEarnedReward` 이벤트다. **`dismissed`나 광고 클릭을 보상 조건으로 쓰지 않는다.**
- 화면 문구에 '포인트', '출금', '인출', '환전' 등을 쓰지 않는다.

## 7. 웹 구조 (`apps/web`, FSD)

```
src/
  entities/attendance/
    api/attendance-api.ts, attendance-queries.ts   # 조회·출석 요청, 쿼리 키
    lib/format-reward.ts                           # 보상 문구 ("강화 보너스 +N", "해달 친구")
    model/types.ts                                 # shared 타입 재export
    ui/attendance-stamps.tsx                       # 7칸 스탬프 (7일차는 🦦)
  features/check-in/
    api/use-check-in.ts                            # 출석 mutation, 409 안내, 현황 재조회
    ui/check-in-button.tsx
    api/use-claim-ad-bonus.ts                      # 광고 보너스 mutation (일시 오류 재시도, 409 안내)
    ui/ad-bonus-button.tsx                         # 광고 2배 버튼 (shared/ui/rewarded-ad-button 사용)
  pages/home/
    ui/attendance-section.tsx                      # 출석 위젯 카드
```

- 광고 상태별 버튼(준비 중·보는 중·실패 시 다시 불러오기)은 퀴즈와 함께 `shared/ui/rewarded-ad-button.tsx`를 쓴다.
- `pages/home/ui/attendance-ad-bonus.tsx`는 광고 보너스를 받을 수 있을 때만 붙어 보상형 광고를 미리 불러온다.
- devtools mock 의 전면 광고는 `userEarnedReward`를 보내지 않아, 브라우저에서는 "끝까지 보지 않고 닫음" 경로만 재현된다. 보상 경로는 실기기(테스트 광고 ID)에서 확인한다.

## 8. 공유 타입 (`packages/shared`)

`src/attendance.ts`에 FE/BE 공통 타입을 정의하고 `index.ts`에서 export 한다.

- `AttendanceRewardType`, `AttendanceReward`, `AttendanceStreakDay`, `AttendanceCycleStamp`, `CheckInResponse`, `AttendanceStatusResponse`

## 9. 테스트

`apps/api/src/modules/attendance/__test__/` (`pnpm --filter @haedalpoint/api test`)

| 파일 | 대상 |
|---|---|
| `attendance-reward.policy.spec.ts` | 일차별 보상, 연속 판정, 사이클 완료 |
| `attendance-status.spec.ts` | 현황 응답 조립 (끊김, 7일차 당일, 스탬프) |
| `attendance.service.spec.ts` | 출석, 중복 출석 409, 동시 요청 유니크 위반 처리, 광고 보너스(지급·7일차 해달 친구·중복·동시 요청) |
| `attendance.repository.spec.ts` | 조회 조건·정렬 |
| `attendance.controller.spec.ts` | 서비스 위임 |
| `kst-date.spec.ts` | KST 날짜 변환, 날짜 더하기 |
| `common/decorators/__test__/current-user-id.decorator.spec.ts` | 헤더 파싱, 401 |

## 10. 알려진 한계

- **보상이 기록만 되고 적립되지 않는다.** 강화·동료 모듈이 생기면 서비스에서 적립을 호출하고 `reward_applied_at`을 기록한다. 이때 같은 트랜잭션 안에서 `reward_applied_at IS NULL` 조건으로 처리해 한 번만 적립되게 한다.
- **광고 시청 완료를 서버가 직접 확인할 수 없다.** `userEarnedReward`는 클라이언트 이벤트이므로 조작된 클라이언트가 광고 없이 보너스 API를 호출할 수 있다.
  - 완화: 하루 1회, 오늘 출석한 경우에만 수령
- **임시 사용자 식별은 사칭이 가능하다.** 운영 배포 전 교체한다 (2장).
- **사용자 API가 인증 없이 열려 있다.** `GET /api/users`가 전체 사용자 이메일 목록을 반환한다. 운영용 식별로 교체할 때 함께 제거한다.

## 11. 후속 작업

1. Supabase DB에 마이그레이션 적용 (팀 합의 후)
2. ADR-0006 확정 → 인증 Guard, `@CurrentUserId` 구현 교체, `users` 테이블 `anon_key` 전환
3. 강화 모듈 연동: `ENHANCE_BONUS` 적립 + `reward_applied_at` 기록
4. 동료 모듈 연동: `OTTER_FRIEND` 지급
5. 출시 전: `VITE_REWARDED_AD_GROUP_ID`를 콘솔에서 발급한 운영용 광고 그룹 ID로 교체 (지금은 QR 테스트용 테스트 ID)
6. 검수 전 정리: 홈 화면 제목 `haedalpoint` → '해달해달' (ADR-0001), 개발용 userId 입력란·사용자 생성 폼·사용자 목록 제거

## 12. 결정 필요

- [ ] 강화 보너스의 의미: 강화 성공 확률 보너스라면, 채굴 → 물고기 → 토스 포인트로 이어져 ADR-0002("확률형 요소를 토스 포인트 지급과 연결하지 않는다")와 간접적으로 충돌하는지 확인
- [ ] 일차별 보상 수량 확정 (현재 임시 값)
- [ ] 연속 방식 유지 여부: 하루 빠지면 1일차로 초기화 (현재) / 빠져도 누적
- [x] 광고 2배 보너스의 대상: 7일차 해달 친구를 포함한 모든 일차 (오늘 보상과 같은 종류·수량을 한 번 더 지급)
