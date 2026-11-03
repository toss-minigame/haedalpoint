# 해달 낚시 데이터 시퀀스

[해달 낚시 설계](./fishing.md)의 구현(`apps/api/src/modules/fishing`, `apps/web/src/entities/fishing`, `apps/web/src/features/store-fish`, `apps/web/src/features/fishing-ad-boosts`)을 바탕으로 흐름을 간략히 그린 문서다.

- 모든 요청에는 자체 access token(`Authorization: Bearer`)이 붙는다. 다이어그램에서는 생략한다. 인증은 [사용자 인증 시퀀스](./user-auth-sequence.md)를 본다.
- 물고기 수량은 **서버가 시각으로 계산**한다. 클라이언트는 수량을 보내지 않는다.
- "하루"는 KST 00:00 기준이다. 낚싯대 강화·해달 친구·해먹 넓히기는 자정에 풀린다.

## 1. 전체 흐름

```mermaid
flowchart LR
    Q[O/X 퀴즈 정답 + 광고] -->|낚싯대 +10%| R[낚시 속도]
    C[출석 1~6일차<br/>+ 광고 2배] -->|낚싯대 +10%| R
    F[출석 7일차<br/>+ 광고 2배] -->|해달 친구 한 명당: 속도 +100%, 용량 +50%| R
    AR[홈 광고 강화<br/>20분 쿨타임] -->|낚싯대 +10%| R
    R --> H[(해먹<br/>용량 한도)]
    AE[홈 광고 해먹 넓히기<br/>하루 1회] -->|용량 +50%| H
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
            A->>A: 오늘 해달 친구 +1명 (자정까지 한 명당 속도 +100%, 용량 +50%)
        end
        A->>D: fishing_states 갱신
    end
    A-->>W: 출석 결과
    W->>A: GET /attendance/me, GET /fishing/me (다시 조회)
```

출석 '광고 보고 2배'(`POST /attendance/ad-bonus`)도 같은 트랜잭션 구조다. `ad_bonus_claimed_at` 조건부 UPDATE와
같은 보상 한 번 더(1~6일차 강화 +1단계, 7일차 해달 친구 한 명 더)를 함께 처리하고, 적용이 실패하면 수령 기록도 롤백된다.

## 6. 홈 광고 부스트 (낚싯대 강화 · 해먹 넓히기)

```mermaid
sequenceDiagram
    autonumber
    actor U as 사용자
    participant W as Web (홈 화면)
    participant S as 토스 광고 SDK
    participant A as API
    participant D as DB

    Note over W: 홈 진입 시 보상형 광고 1개를 미리 불러와 홈의 광고 버튼이 함께 쓴다
    W->>A: GET /fishing/me
    A-->>W: rodLevel, adRodEnhanceAvailableAt, hammockExpanded ...
    alt 쿨타임 중 · 최대 단계 · 이미 넓힘
        W->>W: 막힌 버튼 ("N분 뒤에 다시 강화할 수 있어요" 등), 광고를 띄우지 않음
    else 받을 수 있음
        U->>W: [광고 보고 낚싯대 강화하기] 또는 [광고 보고 해먹 넓히기]
        W->>S: showFullScreenAd
        alt 광고를 끝까지 봄
            S-->>W: userEarnedReward
            W->>A: POST /fishing/ad-enhance-rod 또는 /fishing/ad-expand-hammock
            rect rgb(240, 240, 240)
                Note over A,D: 트랜잭션
                A->>D: fishing_states 행 잠금
                A->>A: 쿨타임(20분)·최대 단계 또는 오늘 넓혔는지 확인 → 아니면 409
                A->>A: 지금까지 정산
                A->>A: 오늘 강화 +1단계 (ad_rod_enhanced_at = 지금) 또는 hammock_expanded_date = 오늘
                A->>D: fishing_states 갱신
            end
            A-->>W: 바뀐 뒤의 현황 → 화면에 바로 반영
        else 끝까지 보지 않고 닫음
            S-->>W: dismissed (userEarnedReward 없음)
            W->>W: "광고를 끝까지 보면 ..." 안내 (요청 안 함)
        end
    end
```

## 7. 자정 처리

배치 작업은 없다. 강화·해달 친구·해먹 넓히기에는 유효 날짜(`rod_level_date`, `otter_friend_date`, `hammock_expanded_date`)가 있고, 정산할 때 자정에서 구간을 나눠 계산한다.

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
