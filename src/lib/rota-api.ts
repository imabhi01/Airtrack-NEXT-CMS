// FILE: src/lib/rota-api.ts
// All rota API calls to Laravel backend

import api from './api';

export const rotaApi = {
  // ── Weeks ─────────────────────────────────────────────────────────────────
  weeks:         ()               => api.get('/rota/weeks'),
  createWeek:    (data: any)      => api.post('/rota/weeks', data),
  showWeek:      (id: string)     => api.get(`/rota/weeks/${id}`),
  publish:       (id: string)     => api.post(`/rota/weeks/${id}/publish`),
  lock:          (id: string)     => api.post(`/rota/weeks/${id}/lock`),

  markOff: (id: string, data: { user_id: string; work_date: string }) =>
    api.post(`/rota/weeks/${id}/off`, data),

  addAssignment: (id: string, data: {
    user_id:       string;
    work_date:     string;
    start_time:    string;
    end_time:      string;
    task_id?:      string | null;
    terminal_id?:  string | null;
    zone_id?:      string | null;
    airline_id?:   string | null;
    sort_order?:   number;
    is_off_day?:   boolean;
    remarks?:      string;
    display_color?:string | null;
    is_urgent?:    boolean;
  }) => api.post(`/rota/weeks/${id}/assignments`, data),

  // ── Assignments ───────────────────────────────────────────────────────────
  updateAssignment: (id: string, data: any) =>
    api.put(`/rota/assignments/${id}`, data),

  deleteAssignment: (id: string) =>
    api.delete(`/rota/assignments/${id}`),

  dragDrop: (data: {
    assignment_id:  string;
    new_user_id?:   string;
    new_work_date?: string;
    new_task_id?:   string;
  }) => api.post('/rota/assignments/drag-drop', data),

  assignCover: (id: string, data: { cover_user_id: string }) =>
    api.post(`/rota/assignments/${id}/cover`, data),

  // ── Sick management ───────────────────────────────────────────────────────
  markSick: (data: {
    user_id:       string;
    date:          string;
    notified_via?: string;
    notes?:        string;
  }) => api.post('/rota/sick', data),

  needsCover: (date: string) =>
    api.get('/rota/needs-cover', { params: { date } }),

  // ── Tasks ─────────────────────────────────────────────────────────────────
  tasks:      ()          => api.get('/rota/tasks'),
  createTask: (data: any) => api.post('/rota/tasks', data),

  // ── Staff (for dropdowns) ─────────────────────────────────────────────────
  staff: () => api.get('/cms/staff'),
};