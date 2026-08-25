// src/lib/cms/attendance.ts
import api from '@/lib/api';
import type { Anomaly, AnomalyDetail, AnomalyStats, ResolvePayload } from '@/types/attendance';

interface AnomalyListParams {
  status?: 'open' | 'resolved' | 'dismissed';
  type?: string;
  from?: string;
  to?: string;
  user_id?: string;
  page?: number;
  per_page?: number;
}

export const attendanceApi = {
  async listAnomalies(params: AnomalyListParams = {}) {
    const res = await api.get<{ data: Anomaly[]; meta: any }>('/admin/anomalies', { params });
    return res.data;
  },
  async getAnomalyStats() {
    const res = await api.get<AnomalyStats>('/admin/anomalies/stats');
    return res.data;
  },
  async getAnomaly(id: string) {
    const res = await api.get<AnomalyDetail>(`/admin/anomalies/${id}`);
    return res.data;
  },
  async resolveAnomaly(id: string, payload: ResolvePayload) {
    const res = await api.post<{ message: string; anomaly: Anomaly }>(
      `/admin/anomalies/${id}/resolve`,
      payload
    );
    return res.data;
  },
};