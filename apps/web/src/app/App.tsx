import { RouterProvider } from 'react-router';
import { AdDebugPanel } from '@/shared/ui/ad-debug-panel';
import { Toaster } from '@/shared/ui/sonner';
import { QueryProvider } from './providers/query-provider';
import { router } from './router';

export function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster />
      {/* 임시 진단: 광고 로그 창 (광고 불러오기 실패 원인을 찾으면 지운다) */}
      <AdDebugPanel />
    </QueryProvider>
  );
}
