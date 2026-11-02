import { Button } from '@/shared/ui/button';
import { useStoreFish } from '../api/use-store-fish';

type Props = {
  /** 해먹에 1마리 이상 있을 때만 저장할 수 있다 */
  canStore: boolean;
};

export function StoreFishButton({ canStore }: Props) {
  const { mutate, isPending } = useStoreFish();

  return (
    <Button
      type="button"
      size="lg"
      className="h-12 w-full text-base"
      // isPending 동안 비활성화해 더블 탭 방어 (서버 행 잠금이 최종 방어선)
      disabled={!canStore || isPending}
      onClick={() => mutate()}
    >
      {isPending ? '저장하고 있어요' : '창고에 저장하기'}
    </Button>
  );
}
