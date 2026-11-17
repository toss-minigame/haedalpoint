# 원본 에셋

이미지 생성 AI로 만든 원본. 앱(`src/`)은 이 파일을 직접 쓰지 않고, 잡티를 지우고 크기를 줄여 잘라낸 복사본을 `src/shared/assets/` 에서 쓴다.
다시 다듬거나 재생성할 때 기준으로 쓴다.

| 원본 | 앱에서 쓰는 복사본 |
|---|---|
| `otter-moods/otter_1~6.png` | `src/shared/assets/otter/otter-idle·surprised·awkward·excited·happy·love.png` (그대로 복사) |
| `otter-fishing/*-1~5.png` (낚싯대를 쥔 낚시 프레임) | `src/shared/assets/otter/otter-fishing-idle·notice·pull·lift·caught.png` |
| `otter-hammock-full.png` (물고기 양동이를 든 해달) | `src/shared/assets/otter/otter-hammock-full.png` |

낚시 프레임·양동이 해달 복사본은 알파 16 이하 잡티를 지우고 절반 크기로 줄여 그림 둘레 20px 여백만 남기고 잘랐다.
기준점(몸 가운데·발 끝·낚싯대 끝)은 `src/entities/otter/lib/scene/scene-state.ts` 의 `OTTER_SCENE_FRAMES`·`OTTER_FULL_FRAME` 에 있다.
