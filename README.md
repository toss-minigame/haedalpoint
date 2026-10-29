# haedalpoint

Turborepo + pnpm 모노레포

| 구분            | 스택                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| 공통            | TypeScript 6, Turborepo, pnpm, Biome (lint + format)                                |
| FE (`apps/web`) | React 19, Vite 8, Tailwind CSS 4, shadcn/ui (Radix), TanStack Query 5, React Router |
| BE (`apps/api`) | NestJS 12, TypeORM, PostgreSQL (Supabase)                                           |

## 시작하기

```bash
nvm use                       # Node 24 (.nvmrc)
corepack enable               # pnpm (package.json 의 packageManager 버전 사용)
pnpm install

cp apps/api/.env.example apps/api/.env   # DATABASE_URL 에 Supabase 연결 문자열 입력
cp apps/web/.env.example apps/web/.env

pnpm dev                      # web: http://localhost:5173, api: http://localhost:3000/api
```

| 명령                                                                               | 설명                                   |
| ---------------------------------------------------------------------------------- | -------------------------------------- |
| `pnpm dev` / `build` / `lint` / `typecheck` / `test`                               | 전체 워크스페이스 실행 (turbo)         |
| `pnpm check` / `pnpm format`                                                       | Biome lint+format 자동 수정 / 포맷만   |
| `pnpm --filter @haedalpoint/web dlx shadcn@latest add <component>`                 | shadcn 컴포넌트 추가 → `src/shared/ui` |
| `pnpm --filter @haedalpoint/api migration:generate src/database/migrations/<Name>` | 엔티티 변경 → 마이그레이션 생성        |
| `pnpm --filter @haedalpoint/api migration:run`                                     | 마이그레이션 적용                      |

## 구조

```
apps/
  web/                    # 프론트엔드
  api/                    # 백엔드
packages/
  shared/                 # FE/BE 공용 타입 (@haedalpoint/shared)
  typescript-config/      # tsconfig 프리셋 (base / react / nestjs)
```

### Frontend — FSD-lite (widgets 제외)

```
src/
  app/        # 앱 초기화: providers, router, 전역 스타일
  pages/      # 라우트 단위 화면
  features/   # 사용자 행동 단위 기능 (생성/수정/삭제 등 mutation)
  entities/   # 비즈니스 엔티티: 타입, API, query 키/옵션, 엔티티 UI
  shared/     # 도메인 무관 공통: ui(shadcn), api(http client), lib, config
```

- **의존 방향**: `app → pages → features → entities → shared` (상위 → 하위만 import 가능)
- 같은 레이어의 슬라이스끼리는 import 하지 않습니다.
- 슬라이스 외부에서는 `index.ts`(Public API)를 통해서만 import 합니다. (`@/entities/user` ⭕ / `@/entities/user/model/types` ❌)
- 슬라이스 내부는 상대경로, 슬라이스 밖은 `@/` 별칭으로 import 합니다.
- 위 규칙은 모두 Biome 이 **error** 로 검사합니다 (`biome.json` 의 `noRestrictedImports` 레이어별 overrides).
- 슬라이스 내부 세그먼트: `ui/`, `api/`, `model/`, `lib/`
- 서버 상태는 TanStack Query 로 관리: 조회는 `entities/*/api/*-queries.ts` 의 `queryOptions`, 변경은 `features/*/api/use-*.ts` 의 `useMutation`.

### Backend — 모듈형 모놀리스 + 계층형 아키텍처

```
src/
  main.ts
  app.module.ts
  config/            # 환경변수 검증
  database/          # TypeORM 설정, CLI data-source, migrations
  common/            # 공통 filter / interceptor / base entity
  modules/
    <domain>/
      <domain>.module.ts
      <domain>.controller.ts   # 표현 계층: HTTP 요청/응답, DTO 검증
      <domain>.service.ts      # 비즈니스 계층: 도메인 로직, 트랜잭션 경계
      <domain>.repository.ts   # 데이터 계층: TypeORM 접근은 여기에만
      entities/
      dto/
      __test__/                # 단위 테스트 (<name>.spec.ts) — 이 폴더 밖의 spec 은 실행되지 않음
```

- **계층 의존 방향**: `controller → service → repository` (역방향/건너뛰기 금지)
- **모듈 경계**: 각 모듈은 `exports` 에 **Service 만** 공개합니다. 다른 모듈의 Repository 를 직접 사용하지 않습니다.
- Biome 이 **error** 로 검사하는 항목 (파일명 접미사 기준이므로 `*.controller.ts` / `*.service.ts` / `*.repository.ts` 명명 규칙을 지켜야 합니다)
  - controller: repository import ❌, `typeorm`·`@nestjs/typeorm` import ❌
  - service: controller import ❌, `@nestjs/typeorm` import ❌ (`typeorm` 의 `DataSource` 로 트랜잭션은 허용), 다른 모듈 repository ❌
  - repository: service·controller import ❌, 다른 모듈 repository ❌
- DB 스키마는 `synchronize: false` — 변경은 반드시 마이그레이션으로 반영합니다.
- `nest g` 로 생성 시 spec 파일은 만들지 않습니다 (`nest-cli.json` → `generateOptions.spec: false`). 테스트는 `__test__/` 에 직접 작성합니다.
- 응답 형식: 성공 `{ success: true, data }`, 실패 `{ success: false, statusCode, message, path, timestamp }` (`@haedalpoint/shared` 타입)

## 린트 규칙 (Biome)

- `any` 금지: `noExplicitAny`, `noImplicitAnyLet` → **error**
- FSD 레이어 / BE 계층 위반 → **error** (위 구조 섹션 참고)
- `apps/web/src/shared/ui` (shadcn 생성 코드)는 `useImportType` 만 끄고 나머지 규칙은 동일하게 적용

## Supabase 연결

Supabase 대시보드 → **Project Settings → Database → Connection string** 에서 **Session pooler** (포트 5432) URI 를 `DATABASE_URL` 에 넣습니다.
Transaction pooler(6543)는 prepared statement 제약이 있어 장기 실행 서버(NestJS)에는 권장하지 않습니다.
