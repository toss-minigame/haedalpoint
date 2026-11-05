import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  fishingQueries,
  formatFish,
  type Warehouse,
  type WarehouseEntry,
} from '@/entities/fishing';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { formatEntryTime } from '../lib/format-entry-time';
import { WarehouseSkeleton } from './warehouse-skeleton';

// 창고 이력 종류별 문구. 토스 포인트 전환이 생기면 여기에 추가한다
const ENTRY_LABEL: Record<WarehouseEntry['type'], string> = {
  STORE: '해먹에서 저장',
};

function StoredStat({ label, fish }: { label: string; fish: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-lg font-bold">{formatFish(fish)}마리</dd>
    </div>
  );
}

function EntryList({ entries }: { entries: WarehouseEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-base text-muted-foreground">
        아직 저장한 물고기가 없어요. 해먹에 물고기가 쌓이면 창고에 저장해 보세요.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex flex-col">
            <span className="text-base">{ENTRY_LABEL[entry.type]}</span>
            <span className="text-sm text-muted-foreground">
              {formatEntryTime(entry.createdAt)}
            </span>
          </div>
          <span className="text-base font-bold">+{formatFish(entry.amount)}마리</span>
        </li>
      ))}
    </ul>
  );
}

function WarehouseContent({ warehouse }: { warehouse: Warehouse }) {
  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-base text-muted-foreground">창고에 있는 물고기</p>
            <p className="text-3xl font-bold">{formatFish(warehouse.warehouseFish)}마리</p>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <StoredStat label="오늘 저장" fish={warehouse.todayStoredFish} />
            <StoredStat label="이번 달 저장" fish={warehouse.monthStoredFish} />
          </dl>
        </CardContent>
      </Card>

      <section aria-labelledby="warehouse-history-heading">
        <Card>
          <CardHeader>
            <CardTitle id="warehouse-history-heading" className="text-lg font-bold">
              최근 기록
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EntryList entries={warehouse.recentEntries} />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

export function WarehousePage() {
  const { data: warehouse, isPending, isError, error } = useQuery(fishingQueries.warehouse());

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">내 창고</h1>
        <p className="text-base text-muted-foreground">해먹에서 저장한 물고기가 모여 있어요.</p>
      </header>

      {isPending && <WarehouseSkeleton />}
      {isError && <p className="text-destructive">{error.message}</p>}
      {warehouse && <WarehouseContent warehouse={warehouse} />}

      <Button asChild variant="ghost" className="h-11 self-start px-3 text-base">
        <Link to="/">홈으로</Link>
      </Button>
    </main>
  );
}
