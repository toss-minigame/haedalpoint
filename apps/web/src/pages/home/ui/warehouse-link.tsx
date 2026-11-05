import { ChevronRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import { formatFish } from '@/entities/fishing';
import { Button } from '@/shared/ui/button';

type Props = {
  warehouseFish: number;
};

// 홈의 창고 요약. 누르면 창고 화면으로 간다
export function WarehouseLink({ warehouseFish }: Props) {
  return (
    <Button asChild variant="outline" size="lg" className="h-12 w-full justify-between text-base">
      <Link to="/warehouse">
        <span>내 창고</span>
        <span className="flex items-center gap-1 font-bold">
          {formatFish(warehouseFish)}마리
          <ChevronRightIcon aria-hidden="true" />
        </span>
      </Link>
    </Button>
  );
}
