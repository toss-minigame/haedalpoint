import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useCreateUser } from '../api/use-create-user';

export function CreateUserForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const { mutate, isPending } = useCreateUser();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutate(
      { email, name },
      {
        onSuccess: () => {
          toast.success('사용자가 생성되었습니다.');
          setEmail('');
          setName('');
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">이름</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? '생성 중...' : '생성'}
      </Button>
    </form>
  );
}
