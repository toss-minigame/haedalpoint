import { Link } from 'react-router';
import { Button } from '@/shared/ui/button';
import { AttendanceSection } from './attendance-section';

export function HomePage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 p-8">
      <h1 className="text-2xl font-bold">haedalpoint</h1>
      <AttendanceSection />
      <Button asChild size="lg" variant="outline" className="h-12 w-full text-base">
        <Link to="/quiz">오늘의 O/X 퀴즈 풀기</Link>
      </Button>
    </main>
  );
}
