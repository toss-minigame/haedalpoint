// ESM 으로 실행되는 테스트에는 jest 전역 객체가 주입되지 않는다.
// 기존 테스트가 쓰는 전역 jest(jest.fn 등)를 그대로 쓸 수 있도록 @jest/globals 의 jest 를 전역에 둔다.
import { jest } from '@jest/globals';

(globalThis as { jest?: unknown }).jest = jest;
