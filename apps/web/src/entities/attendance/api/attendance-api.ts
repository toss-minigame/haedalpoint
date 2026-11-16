import { http } from '@/shared/api';
import type { AttendanceStatus, CheckInResponse } from '../model/types';

export const attendanceApi = {
  getMe: () => http.get<AttendanceStatus>('/attendance/me'),
  // 보상형 광고를 끝까지 본 뒤(`userEarnedReward`)에만 호출한다
  checkIn: () => http.post<CheckInResponse>('/attendance/check-in'),
};
