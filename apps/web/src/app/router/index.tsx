import { createBrowserRouter } from 'react-router';
import { HomePage } from '@/pages/home';
import { NotFoundPage } from '@/pages/not-found';
import { QuizPage } from '@/pages/quiz';
import { WarehousePage } from '@/pages/warehouse';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/quiz', element: <QuizPage /> },
  { path: '/warehouse', element: <WarehousePage /> },
  { path: '*', element: <NotFoundPage /> },
]);
