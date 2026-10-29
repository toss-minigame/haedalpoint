import { Link } from 'react-router';
import { Button } from '@/shared/ui/button';

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">404</h1>
      <Button asChild variant="outline">
        <Link to="/">홈으로</Link>
      </Button>
    </main>
  );
}
