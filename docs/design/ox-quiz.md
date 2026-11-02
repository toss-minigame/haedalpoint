# O/X 퀴즈 기능 설계

- 상태: 초안
- 작성일: 2026-11-02
- 관련 ADR: [ADR-0003 재화 이름(물고기)](../adr/0003-in-app-currency-name.md), [ADR-0004 사용자 식별](../adr/0004-user-identification-anonymous-key.md), [ADR-0007 낚시 경제](../adr/0007-fishing-economy.md) (ADR-0005 대체)
- 데이터 시퀀스: [ox-quiz-sequence.md](./ox-quiz-sequence.md)

## 1. 개요

사용자가 O/X 퀴즈를 풀고 보상형 광고를 끝까지 시청하면 **낚싯대가 강화**되는 기능이다 (그날 낚시 속도 +10%).
퀴즈는 물고기를 직접 주지 않는다. 물고기는 해달 낚시로만 얻는다 (ADR-0007, [fishing.md](./fishing.md)).

> 2026-11-02 변경: 처음에는 퀴즈 보상으로 물고기를 지급했으나(ADR-0005), 낚싯대 강화로 바뀌었다.

### 범위

| 포함 | 제외 (후속 작업) |
|---|---|
| 오늘의 퀴즈 조회, O/X 답변 제출·서버 정답 판정 | 물고기 → 토스 포인트 전환 (프로모션 API, mTLS) |
| 보상형 광고 시청 후 보상 기록 + 낚싯대 강화 | |
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
 → O 또는 X 선택 → POST 답변 → 서버가 정답 판정
     ├─ 정답(CORRECT): 정답·해설 표시
     │    → [광고 보고 낚싯대 강화하기] → userEarnedReward → POST ad-reward → 강화 결과 표시
     └─ 오답(WRONG): 정답·해설 숨김
          → [광고 보고 다시 풀기] → userEarnedReward → POST ad-retry (RETRY_READY)
          → 다시 답변 → (맞힐 때까지 반복, 횟수 제한 없음)
 → 다음 퀴즈 (오늘 세트를 다 풀면 "내일 다시 참여" 안내)
```

- **보상은 정답을 맞힌 경우에만** 지급하며, 정답을 맞혀도 광고를 봐야 받는다.
- **오답이면 정답·해설을 노출하지 않는다.** O/X는 보기가 둘뿐이라 정답을 보여주면 재도전이 의미가 없어진다.
- 광고 시청을 거부하거나 중간에 닫으면(`userEarnedReward` 없이 `dismissed`) 재도전·보상 요청을 하지 않는다.
- 광고 로드 실패·미지원 환경(`loadFullScreenAd.isSupported() === false`)이면 버튼을 비활성화하고 안내한다.

## 4. API 설계 (`apps/api`)

모든 응답은 기존 envelope(`{ success, data }`)를 따른다. 경로는 전역 prefix `/api` 기준.

| Method | Path | 설명 | 주요 응답 |
|---|---|---|---|
| GET | `/quiz/today` | 오늘의 퀴즈 목록과 내 도전 현황, 퀴즈 보상으로 오르는 속도(%) | 퀴즈(id, 문제), 도전 상태(`status`), 보상 수령 여부 |
| POST | `/quiz/:quizId/answer` | 첫 답변 또는 재도전 답변. 서버가 정답 판정 | `status`, 정답 여부, 틀린 횟수, 정답·해설(맞혔을 때만) |
| POST | `/quiz/:quizId/ad-retry` | 오답 후 광고 시청 완료 → 재도전 기회 열기 | `status: RETRY_READY` |
| POST | `/quiz/:quizId/ad-reward` | 정답 후 광고 시청 완료 → 낚싯대 강화 | 오늘 낚싯대 단계, 낚싯대로 오른 속도(%) |

도전 상태(`status`):

| 상태 | 의미 | 가능한 다음 행동 |
|---|---|---|
| (없음) | 아직 도전 안 함 | 답변 |
| `WRONG` | 틀림 | 재도전 광고 시청(`ad-retry`) |
| `RETRY_READY` | 재도전 기회 받음 | 다시 답변 |
| `CORRECT` | 맞힘 | 보상 광고 시청(`ad-reward`, 1회) |

- 정답은 **서버에서만 판정**한다. 정답·해설은 `CORRECT` 상태에서만 응답에 포함한다.
- 요청 DTO는 `class-validator`로 검증한다 (`answer: boolean` 등).

### 에러 처리

| 상황 | 응답 |
|---|---|
| 존재하지 않거나 오늘의 퀴즈가 아님 | 404 |
| 답변하지 않은 퀴즈에 재도전·보상 요청 | 404 |
| 재도전 광고 없이 다시 답변 (`WRONG`) | 409 |
| 이미 맞힌 퀴즈에 답변·재도전 요청 | 409 |
| 이미 재도전 기회를 받았는데 또 요청 (`RETRY_READY`) | 409 |
| 맞히지 않은 퀴즈에 보상 요청 | 409 |
| 이미 보상을 받은 퀴즈에 다시 요청 | 409 |
| 첫 답변이 동시에 두 번 들어옴 | 409 (유니크 제약) |

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
| user_answer | boolean | 마지막 답변 |
| is_correct | boolean | 마지막 답변의 정답 여부 (true가 되면 더 이상 답변 불가) |
| wrong_count | int, default 0 | 틀린 횟수 (재도전 광고 노출 분석용) |
| retry_unlocked | boolean, default false | 오답 후 광고로 재도전 기회를 받았는지. 재답변하면 다시 false |
| reward_claimed_at | timestamptz, nullable | 광고 보상 수령 시각 |

- 한 행 = 사용자가 그날 한 퀴즈에 도전한 기록. 재도전하면 새 행을 만들지 않고 같은 행을 갱신한다.

- 유니크 제약 `(user_id, attempted_date, quiz_id)`: 같은 날 같은 퀴즈를 두 번 답변하거나 연타해도 중복 기록되지 않는다. 출석체크의 `is-unique-violation` 처리 패턴을 재사용한다.
  - 퀴즈는 날짜별로 순환 출제되므로 같은 퀴즈가 다른 날 다시 나올 수 있다. 그래서 `attempted_date`를 유니크 키에 포함한다. (초안의 `(user_id, quiz_id)`에서 변경)
  - 선두 컬럼 `(user_id, attempted_date)`가 "오늘 내 답변 목록" 조회 인덱스 역할도 하므로 별도 인덱스는 두지 않는다.
- 상태 변경은 모두 **현재 상태 조건부 UPDATE**로 처리해 연타·동시 요청에도 한 번만 반영된다.
  - 재도전 열기: `is_correct = false AND retry_unlocked = false`
  - 재답변: `is_correct = false AND retry_unlocked = true` (또 틀리면 `wrong_count + 1`을 DB에서 원자적으로 계산)
  - 보상: `is_correct = true AND reward_claimed_at IS NULL`

### 낚싯대 강화

보상 기록(`reward_claimed_at`)과 낚싯대 강화(`FishingService.enhanceRod`)를 **한 트랜잭션**으로 처리한다.
보상은 기록됐는데 강화가 안 되는 일이 없다. 초기의 `reward_amount`(지급 물고기 수)는 엔티티에서 제거했고,
DB 컬럼은 배포 후 별도 마이그레이션으로 삭제한다 ([fishing.md](./fishing.md) 7장).

## 6. 보상·참여 정책

정책값은 **api 안의 `apps/api/src/common/globals/quiz.policy.ts` 한 곳에서만** 관리한다.
web은 값을 따로 갖지 않고 API 응답(`rewardSpeedBonusPercent`, `items` 개수)으로만 받는다. 값을 바꿀 때는 api만 재배포하면 되고, 미니앱 번들 재빌드·재출시가 필요 없다.

| 항목 | 상수 | 임시값 |
|---|---|---|
| 하루 퀴즈 수 | `QUIZ_POLICY.DAILY_QUIZ_COUNT` | 3 |
| 퀴즈당 낚싯대 강화 단계 (정답 + 광고 시청 시) | `QUIZ_POLICY.ROD_LEVELS_PER_REWARD` | 1 (단계당 +10%, `ROD_POLICY`) |
| 오답 시 재도전 횟수 | — | 제한 없음 (맞힐 때까지, 매번 광고 시청) |
| 오답 보상 | — | 없음 |

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

- **광고 시청 완료를 서버가 직접 확인할 수 없다.** `userEarnedReward`는 클라이언트 이벤트이므로 조작된 클라이언트가 광고 없이 `ad-retry`·`ad-reward`를 호출할 수 있다.
  - 완화: 보상은 맞힌 퀴즈에 1회만, 하루 세트(3문제) 한도
  - 재도전은 횟수 제한이 없어 광고 없이 무한 재도전이 가능하지만, 보상량에는 영향이 없다 (O/X라 어차피 두 번 안에 맞힘)
- **O/X는 보기가 둘이라 재도전하면 사실상 정답을 맞힌다.** 재도전은 "광고를 보면 정답 처리"에 가깝게 동작한다. 의도된 동작으로 받아들였다.
  - 확인 필요: 앱인토스가 서버 측 광고 시청 검증 수단을 제공하는지 문의
- **임시 사용자 식별은 사칭이 가능하다.** 운영 배포 전 교체한다 (2장).

## 10. 선행 조건

| 항목 | 상태 |
|---|---|
| PR #2 (출석체크): `@CurrentUserId`, `users` 마이그레이션, `kst-date` 유틸 | 완료 (`dev` 머지) |
| PR #4 (앱인토스 SDK 연동): 광고 API, devtools mock | 완료 (`dev` 머지) |
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

- [ ] 하루 퀴즈 수 (현재 임시값 3문제)
- [x] 보상 조건: 정답을 맞힌 경우에만, 광고 시청 후 지급
- [x] 오답 처리: 정답·해설 숨김 → 광고 시청 후 재도전 (맞힐 때까지 제한 없음)
- [ ] 퀴즈 출제 방식: 전체 사용자 동일 문제 / 사용자별 랜덤 / 날짜별 고정 세트
- [ ] 퀴즈 데이터 관리 방식: 마이그레이션 시드 / 운영자 API / 외부 시트
- [x] 보상 방식: 물고기 지급(ADR-0005) → 낚싯대 강화로 변경 (ADR-0007)
