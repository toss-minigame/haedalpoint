import { http } from '@/shared/api';
import type { AttendanceStatus, CheckInResponse } from '../model/types';

export const attendanceApi = {
  getMe: () => http.get<AttendanceStatus>('/attendance/me'),
  checkIn: () => http.post<CheckInResponse>('/attendance/check-in'),
};
