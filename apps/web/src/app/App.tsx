import { RouterProvider } from 'react-router';
import { Toaster } from '@/shared/ui/sonner';
import { QueryProvider } from './providers/query-provider';
import { router } from './router';

export function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster />
    </QueryProvider>
  );
}
