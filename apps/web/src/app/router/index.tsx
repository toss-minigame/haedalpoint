import { createBrowserRouter } from 'react-router';
import { HomePage } from '@/pages/home';
import { NotFoundPage } from '@/pages/not-found';
import { QuizPage } from '@/pages/quiz';
import { RoulettePage } from '@/pages/roulette';
import { WarehousePage } from '@/pages/warehouse';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/quiz', element: <QuizPage /> },
  { path: '/roulette', element: <RoulettePage /> },
  { path: '/warehouse', element: <WarehousePage /> },
  { path: '*', element: <NotFoundPage /> },
]);
