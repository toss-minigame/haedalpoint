// ⚠️ 임시 개발용: 토스 로그인 연동 전까지 X-User-Id 로 보낼 userId 를 직접 입력한다. 로그인 연동 시 삭제.
import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

type Props = {
  userId: string | null;
  onChange: (userId: string | null) => void;
};

export function DevUserIdInput({ userId, onChange }: Props) {
  const [value, setValue] = useState(userId ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onChange(value.trim() || null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-lg border border-dashed p-3"
    >
      <Label htmlFor="dev-user-id" className="text-xs text-muted-foreground">
        테스트용 userId (임시)
      </Label>
      <div className="flex gap-2">
        <Input
          id="dev-user-id"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="users.id (uuid)"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" variant="outline">
          적용
        </Button>
      </div>
    </form>
  );
}
