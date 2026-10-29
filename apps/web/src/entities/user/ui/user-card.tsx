import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import type { User } from '../model/types';

export function UserCard({ user }: { user: User }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
    </Card>
  );
}
