# 해달 낚시 데이터 시퀀스

[해달 낚시 설계](./fishing.md)의 구현(`apps/api/src/modules/fishing`, `apps/web/src/entities/fishing`, `apps/web/src/features/store-fish`)을 바탕으로 흐름을 간략히 그린 문서다.

- 모든 요청에는 자체 access token(`Authorization: Bearer`)이 붙는다. 다이어그램에서는 생략한다. 인증은 [사용자 인증 시퀀스](./user-auth-sequence.md)를 본다.
- 물고기 수량은 **서버가 시각으로 계산**한다. 클라이언트는 수량을 보내지 않는다.
- "하루"는 KST 00:00 기준이다. 낚싯대 강화·해달 친구는 자정에 풀린다.

## 1. 전체 흐름

```mermaid
flowchart LR
    Q[O/X 퀴즈 정답 + 광고] -->|낚싯대 +10%| R[낚시 속도]
    C[출석 1~6일차] -->|낚싯대 +10%| R
    F[출석 7일차] -->|해달 친구: 속도 +100%, 용량 +50%| R
    R --> H[(해먹<br/>용량 한도)]
    H -->|창고에 저장하기| W[(창고<br/>영속 재화)]
    W -.->|후속 작업| T[토스 포인트<br/>500마리 = 1원]
```

## 2. 해먹 현황 조회

조회는 계산만 하고 DB에 쓰지 않는다. 처음 들어온 사용자면 이때 `fishing_states` 행을 만들고 낚시가 시작된다.

```mermaid
sequenceDiagram
    autonumber
    participant W as Web (홈 화면)
    participant A as API
    participant D as DB

    W->>A: GET /fishing/me
    A->>D: fishing_states 조회 (없으면 settled_at = 지금으로 생성)
    A->>A: settled_at → 지금까지 정산 (자정에서 구간을 나눔, 용량에서 멈춤)
    A-->>W: 해먹 수량·용량, 속도, 강화 단계, 해달 친구 여부, 창고 수량
    loop 1초마다 (화면 표시용)
        W->>W: 응답 수량 + 경과 시간 × 속도 (용량·자정에서 멈춤)
    end
    Note over W,A: 60초마다 다시 조회해 서버 값으로 맞춘다
```

## 3. 창고에 저장하기

```mermaid
sequenceDiagram
    autonumber
    actor U as 사용자
    participant W as Web
    participant A as API
    participant D as DB

    U->>W: [창고에 저장하기]
    W->>A: POST /fishing/store
    rect rgb(240, 240, 240)
        Note over A,D: 트랜잭션
        A->>D: fishing_states 행 잠금 (SELECT … FOR UPDATE)
        A->>A: 지금까지 정산 → 정수 마리만 꺼냄 (소수는 해먹에 남김)
        alt 1마리 미만
            A-->>W: 409 해먹에 저장할 물고기가 없어요
        else 1마리 이상
            A->>D: 해먹 수량·settled_at·창고 수량 갱신
            A->>D: warehouse_ledger 에 STORE 기록
            A-->>W: 저장한 수량, 창고 수량
        end
    end
    W->>A: GET /fishing/me (다시 조회)
```

같은 사용자의 요청이 동시에 와도 행 잠금 때문에 차례로 처리되고, 두 번째 요청은 꺼낼 물고기가 없어 409가 된다.

## 4. 퀴즈 광고 보상 → 낚싯대 강화

```mermaid
sequenceDiagram
    autonumber
    actor U as 사용자
    participant W as Web (퀴즈 화면)
    participant S as 토스 광고 SDK
    participant A as API
    participant D as DB

    U->>W: [광고 보고 낚싯대 강화하기 (+10%)]
    W->>S: 보상형 광고 표시
    S-->>W: userEarnedReward
    W->>A: POST /quiz/{id}/ad-reward
    rect rgb(240, 240, 240)
        Note over A,D: 트랜잭션 (요청 시각 하나로 날짜를 정함)
        A->>D: quiz_attempts 보상 기록 (아직 안 받은 경우만)
        A->>D: fishing_states 행 잠금
        A->>A: 지금까지 정산 → 오늘 강화 단계 +1 (최대 단계에서 멈춤)
        A->>D: 해먹 수량·settled_at·rod_level·rod_level_date 갱신
    end
    A-->>W: rodLevel, rodSpeedBonusPercent
    W->>A: GET /fishing/me (다시 조회)
```

## 5. 출석 → 낚싯대 강화 / 해달 친구

```mermaid
sequenceDiagram
    autonumber
    actor U as 사용자
    participant W as Web (홈 화면)
    participant A as API
    participant D as DB

    U->>W: [출석하기]
    W->>A: POST /attendance/check-in
    rect rgb(240, 240, 240)
        Note over A,D: 트랜잭션 (요청 시각 하나로 날짜를 정함)
        A->>D: attendance_logs 기록 (reward_applied_at 포함)
        A->>D: fishing_states 행 잠금
        A->>A: 지금까지 정산
        alt 1~6일차
            A->>A: 오늘 강화 단계 +1
        else 7일차
            A->>A: otter_friend_date = 오늘 (자정까지 속도 +100%, 용량 +50%)
        end
        A->>D: fishing_states 갱신
    end
    A-->>W: 출석 결과
    W->>A: GET /attendance/me, GET /fishing/me (다시 조회)
```

## 6. 자정 처리

배치 작업은 없다. 강화·해달 친구에는 유효 날짜(`rod_level_date`, `otter_friend_date`)가 있고, 정산할 때 자정에서 구간을 나눠 계산한다.

```mermaid
sequenceDiagram
    autonumber
    participant A as API
    participant D as DB

    Note over A: 23:00 마지막 정산 (강화 3단계, 해달 친구)
    Note over A: 00:00 자정 — 아무 요청 없음
    A->>D: (다음 요청 시) fishing_states 조회
    A->>A: 23:00~00:00 = 강화·친구 속도·용량으로 계산
    A->>A: 00:00~지금 = 기본 속도·기본 용량으로 계산
    Note over A: 용량이 줄어도 이미 잡은 물고기는 줄이지 않는다
```
