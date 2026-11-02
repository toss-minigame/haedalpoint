import { fileURLToPath, URL } from 'node:url';
import aitDevtools from '@apps-in-toss/devtools/unplugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // dev에서만 SDK를 mock으로 치환하고 AIT 패널을 띄움 (production 빌드에서는 자동 비활성화)
    // 모노레포라 SDK 버전 자동 감지가 애매할 수 있어 3.x로 명시
    aitDevtools.vite({ sdkVersion: '3' }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 워크스페이스 패키지(CJS 빌드)를 ESM 으로 변환
  optimizeDeps: {
    include: ['@haedalpoint/shared'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
