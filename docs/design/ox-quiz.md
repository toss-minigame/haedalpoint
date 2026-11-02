# O/X 퀴즈 기능 설계

- 상태: 초안
- 작성일: 2026-11-02
- 관련 ADR: [ADR-0003 재화 이름(물고기)](../adr/0003-in-app-currency-name.md), [ADR-0004 사용자 식별](../adr/0004-user-identification-anonymous-key.md), [ADR-0005 퀴즈 보상 방식(Proposed)](../adr/0005-quiz-reward-in-app-currency.md)

## 1. 개요

사용자가 O/X 퀴즈를 풀고 보상형 광고를 끝까지 시청하면 앱 내 재화 **물고기**를 받는 기능이다.
물고기 → 토스 포인트 전환은 이 문서의 범위가 아니다 (전환 비율 확정 후 별도 설계).

### 범위

| 포함 | 제외 (후속 작업) |
|---|---|
| 오늘의 퀴즈 조회, O/X 답변 제출·서버 정답 판정 | 물고기 → 토스 포인트 전환 (프로모션 API, mTLS) |
| 보상형 광고 시청 후 물고기 보상 기록 | 물고기 지갑(`fish-wallet`) 원장 모듈 |
| 참여 제한 (하루 횟수, 퀴즈별 1회) | 운영자용 퀴즈 등록 화면 |
| 퀴즈 화면 (web) | 운영용 사용자 식별 (토스 로그인 / 익명키) |

## 2. 사용자 식별: 임시 방식 사용

운영용 사용자 식별(토스 로그인 또는 익명키)은 **출석체크·O/X 퀴즈 기능이 붙은 뒤에 결정**한다.
그동안 O/X 퀴즈는 출석체크(PR #2)에서 도입한 **임시 식별 방식**을 그대로 사용한다.

```
[web] localStorage의 userId(users.id) → X-User-Id 헤더 (shared/api/http-client.ts)
[api] @CurrentUserId() 데코레이터가 헤더를 읽어 userId(uuid) 반환
```

### 원칙: 데코레이터만 바꾸면 되도록 구현한다

- 컨트롤러는 사용자 정보를 **`@CurrentUserId() userId: string`으로만** 받는다. 요청 헤더를 직접 읽지 않는다.
- 서비스·리포지토리는 `userId`(= `users.id`)만 다룬다. 식별 방식(헤더, 토큰, 익명키)을 알지 못한다.
- 퀴즈 테이블은 `users`와 TypeORM 관계를 걸지 않고 `user_id` 컬럼으로만 참조한다 (출석체크와 동일한 모듈 경계 원칙).

### 운영용 식별로 교체할 때 바뀌는 곳

| 위치 | 변경 내용 |
|---|---|
| `apps/api/src/common/decorators/current-user-id.decorator.ts` | `X-User-Id` 대신 세션 토큰(또는 토스 로그인 토큰) 검증 후 `users.id` 반환 |
| `apps/web/src/shared/api/http-client.ts` | `X-User-Id` 대신 인증 헤더 주입 |
| `users` 테이블 | 식별 방식에 맞는 컬럼 추가 (예: `anon_key` 또는 토스 `user_key`) |
| `dev-user-id.ts`, `dev-user-id-input.tsx` | 삭제 |

퀴즈 모듈의 컨트롤러·서비스·리포지토리·화면 코드는 **변경하지 않는다.**

> ⚠️ 임시 방식은 아무 uuid로 다른 사용자를 사칭할 수 있으므로 **운영 배포 전 반드시 교체**한다.

## 3. 사용자 흐름

```
퀴즈 화면 진입
 → GET 오늘의 퀴즈 (정답 미포함)
 → O 또는 X 선택 → POST 답변 → 정답 여부·해설 표시
 → [광고 보고 물고기 받기] 버튼
     → loadFullScreenAd → showFullScreenAd
     → userEarnedReward 이벤트 수신 시에만 POST 보상 요청
     → 지급 결과 표시
 → 다음 퀴즈 (하루 한도 도달 시 "내일 다시 참여" 안내)
```

- 광고 시청을 거부하거나 중간에 닫으면(`userEarnedReward` 없이 `dismissed`) 보상을 요청하지 않는다.
- 광고 로드 실패·미지원 환경(`loadFullScreenAd.isSupported() === false`)이면 버튼을 비활성화하고 안내한다.

## 4. API 설계 (`apps/api`)

모든 응답은 기존 envelope(`{ success, data }`)를 따른다. 경로는 전역 prefix `/api` 기준.

| Method | Path | 설명 | 주요 응답 |
|---|---|---|---|
| GET | `/quiz/today` | 오늘의 퀴즈 목록과 내 참여 현황 | 퀴즈(id, 문제), 답변 여부, 보상 수령 여부, 남은 참여 횟수 |
| POST | `/quiz/:quizId/answer` | O/X 답변 제출, 서버가 정답 판정 | 정답 여부, 정답, 해설 |
| POST | `/quiz/:quizId/ad-reward` | 광고 시청 완료 후 물고기 보상 요청 | 지급한 물고기 수 |

- 정답은 **서버에서만 판정**한다. `GET /quiz/today` 응답에는 정답을 포함하지 않는다.
- 요청 DTO는 `class-validator`로 검증한다 (`answer: boolean` 등).

### 에러 처리

| 상황 | 응답 |
|---|---|
| 존재하지 않거나 오늘의 퀴즈가 아님 | 404 |
| 이미 답변한 퀴즈에 다시 답변 | 409 |
| 답변하지 않은 퀴즈에 보상 요청 | 409 |
| 이미 보상을 받은 퀴즈에 다시 요청 | 409 |
| 하루 참여 한도 초과 | 409 (또는 429, 구현 시 결정) |

## 5. 데이터 모델

### `quizzes`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK (`BaseEntity`) |
| question | varchar | 문제 |
| answer | boolean | 정답 (true = O, false = X) |
| explanation | varchar, nullable | 해설 |
| active | boolean | 출제 대상 여부 |
| created_at / updated_at | timestamptz | `BaseEntity` |

### `quiz_attempts`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | `users.id` 참조 (관계 미설정) |
| quiz_id | uuid | `quizzes.id` |
| attempted_date | date | KST 기준 `YYYY-MM-DD` (출석체크의 `kst-date` 유틸 재사용) |
| user_answer | boolean | 사용자 답변 |
| is_correct | boolean | 정답 여부 |
| reward_amount | int, nullable | 지급한 물고기 수 |
| ad_reward_claimed_at | timestamptz, nullable | 광고 보상 수령 시각 |

- 유니크 제약 `(user_id, quiz_id)`: 같은 퀴즈를 두 번 답변하거나 연타해도 중복 기록되지 않는다. 출석체크의 `is-unique-violation` 처리 패턴을 재사용한다.
- 인덱스 `(user_id, attempted_date)`: 하루 참여 횟수 조회용.
- 보상 중복 방지: `ad_reward_claimed_at IS NULL` 조건부 UPDATE로 한 번만 수령되게 한다.

### 물고기 지급

물고기 지갑(`fish-wallet`) 모듈은 아직 없다. 우선 `quiz_attempts.reward_amount` / `ad_reward_claimed_at`에 지급 내역을 기록하고,
지갑 모듈이 생기면 서비스에서 지갑 적립을 호출하도록 연결한다 (출석체크의 `reward_applied_at` TODO와 같은 방식).

## 6. 보상·참여 정책

정책 값은 `modules/quiz/lib/quiz-reward.policy.ts` 한 곳에서 관리한다 (출석체크의 `attendance-reward.policy.ts`와 동일한 구조).

| 항목 | 초기값 | 비고 |
|---|---|---|
| 하루 퀴즈 수 | 미정 | 결정 필요 |
| 퀴즈당 물고기 보상 | 미정 | 결정 필요 |
| 정답 여부에 따른 보상 차등 | 미정 | 아래 '결정 필요' 참고 |

### 정책 제약 (앱인토스)

- 보상 조건은 광고의 `userEarnedReward` 이벤트다. **광고 클릭을 보상 조건으로 쓰지 않는다.**
- 재화 이름은 '물고기'. 화면 문구에 '포인트', '출금', '인출', '환전' 등을 쓰지 않는다.
- 랜덤 보상을 쓰지 않는다 (고정 수량).
- 참여가 시간·노동을 많이 요구하지 않도록 한다.

## 7. 웹 구조 (`apps/web`, FSD)

```
src/
  entities/quiz/
    api/quiz-api.ts, quiz-queries.ts     # TanStack Query 키·조회
    model/types.ts
    ui/quiz-card.tsx                     # 문제 + O/X 버튼
  features/answer-quiz/
    api/use-answer-quiz.ts               # 답변 mutation
    ui/answer-result.tsx                 # 정답 여부·해설
  features/watch-reward-ad/
    model/use-reward-ad.ts               # load → show → userEarnedReward 처리, cleanup
    ui/reward-ad-button.tsx
  pages/quiz/
    ui/quiz-page.tsx
  app/router/index.tsx                   # /quiz 라우트 추가
```

- `features/watch-reward-ad`는 출석체크의 '광고 보고 2배'(`ad-bonus-button.tsx`)도 함께 쓸 수 있게 범용으로 만든다.
- 광고 그룹 ID는 하드코딩하지 않고 환경 변수(예: `VITE_AD_GROUP_ID_QUIZ`)로 받는다.
- 로컬 개발에서는 `@apps-in-toss/devtools` mock(AIT 패널)으로 광고 성공·실패·중간 닫기를 재현해 테스트한다.

## 8. 공유 타입 (`packages/shared`)

`src/quiz.ts`에 FE/BE 공통 응답 타입을 정의하고 `index.ts`에서 export 한다.

- `TodayQuizResponse`, `QuizItem`, `AnswerQuizRequest`, `AnswerQuizResponse`, `ClaimQuizRewardResponse`

## 9. 알려진 한계

- **광고 시청 완료를 서버가 직접 확인할 수 없다.** `userEarnedReward`는 클라이언트 이벤트이므로 조작된 클라이언트가 광고 없이 보상 API를 호출할 수 있다.
  - 완화: 퀴즈당 1회, 하루 한도, 답변한 퀴즈에만 보상
  - 확인 필요: 앱인토스가 서버 측 광고 시청 검증 수단을 제공하는지 문의
- **임시 사용자 식별은 사칭이 가능하다.** 운영 배포 전 교체한다 (2장).

## 10. 선행 조건

| 항목 | 상태 |
|---|---|
| PR #2 (출석체크): `@CurrentUserId`, `users` 마이그레이션, `kst-date` 유틸 | 열림. 대상 브랜치를 `dev`로 변경 후 머지 필요 |
| PR #4 (앱인토스 SDK 연동): 광고 API, devtools mock | 열림 |
| 콘솔 보상형 광고 그룹 생성 (`adGroupId`) | 미진행. 로컬 개발은 mock으로 가능 |

## 11. 구현 순서

1. `packages/shared`: 퀴즈 타입 정의
2. `apps/api`
   1. `quizzes`, `quiz_attempts` 엔티티·마이그레이션
   2. `quiz-reward.policy.ts` (테스트 먼저)
   3. 리포지토리 → 서비스(정답 판정, 참여 제한, 보상 기록) → 컨트롤러
   4. 단위 테스트 (`__test__/`), 커버리지 80% 이상
3. `apps/web`
   1. `entities/quiz`, `features/answer-quiz`
   2. `features/watch-reward-ad` (devtools mock으로 성공·실패·닫기 확인)
   3. `pages/quiz`, 라우트 연결
4. 시드 퀴즈 데이터 추가

## 12. 결정 필요

- [ ] 하루 퀴즈 수, 퀴즈당 물고기 보상량
- [ ] 정답일 때만 보상할지, 참여만 해도 보상할지 (오답 시 보상 축소 등)
- [ ] 광고 시청이 보상의 필수 조건인지, 광고 없이 기본 보상 + 광고 시 추가 보상인지
- [ ] 퀴즈 출제 방식: 전체 사용자 동일 문제 / 사용자별 랜덤 / 날짜별 고정 세트
- [ ] 퀴즈 데이터 관리 방식: 마이그레이션 시드 / 운영자 API / 외부 시트
- [ ] ADR-0005(보상을 물고기로 지급) 확정 여부
