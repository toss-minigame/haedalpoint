import { Link } from 'react-router';
import { OtterScene } from '@/entities/otter';
import { Button } from '@/shared/ui/button';
import { AttendanceSection } from './attendance-section';
import { FishingSection } from './fishing-section';

export function HomePage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <h1 className="text-2xl font-bold">해달해달</h1>
      <OtterScene />
      <FishingSection />
      <AttendanceSection />
      <Button asChild size="lg" variant="outline" className="h-12 w-full text-base">
        <Link to="/quiz">오늘의 O/X 퀴즈 풀기</Link>
      </Button>
    </main>
  );
}
