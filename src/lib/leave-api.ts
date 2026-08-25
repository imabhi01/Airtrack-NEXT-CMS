// FILE: src/lib/leave-api.ts
// All leave API calls matching LeaveController endpoints

import api from './api';

export const leaveApi = {

  // ── Applications ───────────────────────────────────────────────────────────

  list: (params?: {
    status?:      string;
    leave_type?:  string;
    user_id?:     string;
    terminal_id?: string;
    from?:        string;
    to?:          string;
    search?:      string;
    per_page?:    number;
    page?:        number;
  }) => api.get('/leave', { params }),

  pending: () =>
    api.get('/leave/pending'),

  show: (id: string) =>
    api.get(`/leave/${id}`),

  apply: (data: {
    user_id?:    string;
    leave_type:  string;
    start_date:  string;
    end_date:    string;
    reason?:     string;
    document?:   File;
  }) => {
    // Use FormData if document attached
    if (data.document) {
      const form = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined) form.append(k, v as any);
      });
      return api.post('/leave/apply', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/leave/apply', data);
  },

  approve: (id: string, notes?: string) =>
    api.post(`/leave/${id}/approve`, { notes }),

  reject: (id: string, reason: string) =>
    api.post(`/leave/${id}/reject`, { reason }),

  cancel: (id: string, reason?: string) =>
    api.post(`/leave/${id}/cancel`, { reason }),

  // ── Balance ────────────────────────────────────────────────────────────────

  balance: (params?: { user_id?: string; year?: number }) =>
    api.get('/leave/balance', { params }),

  // ── Calendar ───────────────────────────────────────────────────────────────

  calendar: (month: string) =>
    api.get('/leave/calendar', { params: { month } }),

  // ── Types ──────────────────────────────────────────────────────────────────

  types: () =>
    api.get('/leave/types'),

  createType: (data: any) =>
    api.post('/leave/types', data),
};