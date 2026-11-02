# O/X 퀴즈 데이터 시퀀스

[O/X 퀴즈 설계](./ox-quiz.md)의 구현(`apps/api/src/modules/quiz`)을 바탕으로 데이터 흐름을 단순화해 그린 문서다.

- API 쪽은 구현 기준이다. Web·광고 SDK 쪽은 이후 PR(② 퀴즈 화면, ③ 보상형 광고)에서 구현할 예정이다.
- 모든 요청에는 임시 사용자 식별 헤더 `X-User-Id`가 붙는다. 다이어그램에서는 생략한다.
- "하루"는 KST 기준이다.

## 1. 도전 상태

`quiz_attempts` 한 행이 "사용자가 그날 한 퀴즈에 도전한 기록"이다. 재도전하면 같은 행을 갱신한다.

```mermaid
stateDiagram-v2
    [*] --> WRONG: 답변 (오답)
    [*] --> CORRECT: 답변 (정답)
    WRONG --> RETRY_READY: 광고 시청 → ad-retry
    RETRY_READY --> WRONG: 다시 답변 (오답)
    RETRY_READY --> CORRECT: 다시 답변 (정답)
    CORRECT --> REWARDED: 광고 시청 → ad-reward
    REWARDED --> [*]

    note right of WRONG: 정답·해설 숨김
    note right of CORRECT: 정답·해설 공개
```

| 상태 | `is_correct` | `retry_unlocked` | `reward_claimed_at` |
|---|---|---|---|
| WRONG | false | false | null |
| RETRY_READY | false | true | null |
| CORRECT | true | false | null |
| REWARDED (`status`는 CORRECT, `rewardClaimed: true`) | true | false | 시각 |

## 2. 오늘의 퀴즈 조회

```mermaid
sequenceDiagram
    autonumber
    participant W as Web (미니앱)
    participant A as API
    participant D as DB

    W->>A: GET /quiz/today
    A->>D: 활성 퀴즈 id 조회 (생성순)
    A->>A: 날짜로 오늘의 3문제 선택 (모든 사용자 동일)
    A->>D: 3문제 + 내 오늘 도전 기록 조회
    A-->>W: 문제 목록, 각 문제 상태, rewardPerQuiz
    Note over A,W: 정답·해설은 CORRECT 인 문제에만 포함
```

## 3. 정답 → 광고 → 보상

```mermaid
sequenceDiagram
    autonumber
    actor U as 사용자
    participant W as Web (미니앱)
    participant S as 토스 광고 SDK
    participant A as API
    participant D as DB

    U->>W: O 선택
    W->>A: POST /quiz/{id}/answer {answer: true}
    A->>A: 오늘 세트인지 확인, 정답 판정
    A->>D: INSERT quiz_attempts (is_correct=true)
    A-->>W: CORRECT + 정답·해설

    U->>W: [광고 보고 물고기 받기]
    W->>S: 보상형 광고 load → show
    S-->>W: userEarnedReward
    W->>A: POST /quiz/{id}/ad-reward
    A->>D: UPDATE ... WHERE is_correct=true AND reward_claimed_at IS NULL
    A-->>W: rewardAmount: 10
```

## 4. 오답 → 광고 → 재도전

```mermaid
sequenceDiagram
    autonumber
    actor U as 사용자
    participant W as Web (미니앱)
    participant S as 토스 광고 SDK
    participant A as API
    participant D as DB

    U->>W: X 선택
    W->>A: POST /quiz/{id}/answer {answer: false}
    A->>D: INSERT quiz_attempts (is_correct=false, wrong_count=1)
    A-->>W: WRONG (정답·해설 null)

    U->>W: [광고 보고 다시 풀기]
    W->>S: 보상형 광고 load → show
    S-->>W: userEarnedReward
    W->>A: POST /quiz/{id}/ad-retry
    A->>D: UPDATE SET retry_unlocked=true WHERE is_correct=false AND retry_unlocked=false
    A-->>W: RETRY_READY

    U->>W: 다시 선택
    W->>A: POST /quiz/{id}/answer
    A->>D: UPDATE ... WHERE is_correct=false AND retry_unlocked=true
    alt 정답
        A-->>W: CORRECT + 정답·해설 → 3번 흐름(보상)으로
    else 또 오답
        A->>D: wrong_count + 1, retry_unlocked=false
        A-->>W: WRONG → 다시 광고 보고 재도전 (횟수 제한 없음)
    end
```

## 5. 막히는 경우 (409 / 404)

| 요청 | 조건 | 응답 |
|---|---|---|
| answer | 오늘 세트에 없는 퀴즈 | 404 |
| answer | WRONG 상태 (재도전 광고를 안 봄) | 409 |
| answer, ad-retry | 이미 CORRECT | 409 |
| ad-retry | 이미 RETRY_READY | 409 |
| ad-retry, ad-reward | 답변 기록 없음 | 404 |
| ad-reward | 아직 맞히지 않음 | 409 |
| ad-reward | 이미 보상 받음 | 409 |

같은 요청이 동시에 들어와도 위 조건부 UPDATE(첫 답변은 유니크 제약)로 한 번만 반영되고, 나머지는 409를 받는다.

> ⚠️ 서버는 광고 시청 여부를 검증할 수 없다. Web은 `userEarnedReward`를 받은 뒤에만 `ad-retry`·`ad-reward`를 호출해야 한다. (`dismissed`만으로 호출 금지)
