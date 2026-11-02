# Architecture Decision Records

해달해달 프로젝트의 주요 결정 사항을 ADR(Architecture Decision Record) 패턴으로 기록한다.
한 파일에는 하나의 결정만 담는다.

## 작성 규칙

- 파일명: `NNNN-kebab-case-title.md` (번호는 4자리, 순차 증가)
- 상태(Status): `Proposed`(제안·논의 중) / `Accepted`(확정) / `Deprecated`(폐기) / `Superseded by ADR-NNNN`(대체됨)
- 확정된 ADR의 내용은 수정하지 않는다. 결정이 바뀌면 새 ADR을 만들고 기존 ADR의 상태를 `Superseded by ADR-NNNN`으로 바꾼다.

## 템플릿

```markdown
# ADR-NNNN: 제목

- 상태: Proposed | Accepted | Deprecated | Superseded by ADR-NNNN
- 날짜: YYYY-MM-DD

## 맥락 (Context)

결정이 필요한 배경과 제약 조건

## 결정 (Decision)

무엇을 하기로 했는가

## 결과 (Consequences)

이 결정으로 생기는 영향 (긍정 / 부정 / 후속 작업)
```

## 목록

| 번호 | 제목 | 상태 |
|---|---|---|
| [0001](0001-app-name.md) | 앱 이름을 '해달해달'로 정한다 | Accepted |
| [0002](0002-console-category-non-game.md) | 앱인토스 콘솔에 비게임 카테고리로 등록한다 | Accepted |
| [0003](0003-in-app-currency-name.md) | 앱 내 재화 이름을 '물고기'로 정한다 | Accepted |
| [0004](0004-user-identification-anonymous-key.md) | 사용자 식별에 익명키를 사용한다 | Accepted |
| [0005](0005-quiz-reward-in-app-currency.md) | O/X 퀴즈 보상을 앱 내 재화로 지급하고 토스 포인트로 전환한다 | Proposed |
| [0006](0006-server-side-user-authentication.md) | 서버는 일회용 코드 교환으로 사용자를 확인하고 자체 토큰을 발급한다 | Proposed |
