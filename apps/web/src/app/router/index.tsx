import { createBrowserRouter } from 'react-router';
import { HomePage } from '@/pages/home';
import { NotFoundPage } from '@/pages/not-found';
import { QuizPage } from '@/pages/quiz';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/quiz', element: <QuizPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
