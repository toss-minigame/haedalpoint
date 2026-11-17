import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// 화면과 상관없는 순수 함수만 테스트한다. 앱 빌드용 플러그인(React·Tailwind·AIT devtools)은 싣지 않는다
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/__test__/**/*.test.ts'],
  },
});
