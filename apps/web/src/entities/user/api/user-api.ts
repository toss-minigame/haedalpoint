import { http } from '@/shared/api';
import type { User } from '../model/types';

export interface CreateUserBody {
  email: string;
  name: string;
}

export const userApi = {
  getList: () => http.get<User[]>('/users'),
  getById: (id: string) => http.get<User>(`/users/${id}`),
  create: (body: CreateUserBody) => http.post<User>('/users', body),
};
