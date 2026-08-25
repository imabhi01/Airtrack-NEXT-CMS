import api from './api';
 
// ── Airlines ──────────────────────────────────────────────────────────────────
export const airlinesApi = {
  list:          ()          => api.get('/cms/airlines'),
  show:          (id:string) => api.get(`/cms/airlines/${id}`),
  create:        (data:any)  => api.post('/cms/airlines', data),
  update:        (id:string, data:any) => api.put(`/cms/airlines/${id}`, data),
  delete:        (id:string) => api.delete(`/cms/airlines/${id}`),
  contracts:     (id:string) => api.get(`/cms/airlines/${id}/contracts`),
  addContract:   (id:string, data:any) => api.post(`/cms/airlines/${id}/contracts`, data),
  updateContract:(id:string, data:any) => api.put(`/cms/airlines/contracts/${id}`, data),
};
 
// ── Operations ────────────────────────────────────────────────────────────────
export const operationsApi = {
  types:           ()         => api.get('/cms/operations/types'),
  createType:      (data:any) => api.post('/cms/operations/types', data),
  updateType:      (id:string, data:any) => api.put(`/cms/operations/types/${id}`, data),
  positions:       (params?:any) => api.get('/cms/operations/positions', { params }),
  createPosition:  (data:any) => api.post('/cms/operations/positions', data),
  updatePosition:  (id:string, data:any) => api.put(`/cms/operations/positions/${id}`, data),
  deletePosition:  (id:string) => api.delete(`/cms/operations/positions/${id}`),
  coverage:        (weekStart:string) => api.get('/cms/operations/coverage', { params: { week_start: weekStart } }),
};
 
// ── Roster Weeks ──────────────────────────────────────────────────────────────
export const rosterApi = {
  weeks:           ()         => api.get('/cms/roster-weeks'),
  createWeek:      (data:any) => api.post('/cms/roster-weeks', data),
  showWeek:        (id:string)=> api.get(`/cms/roster-weeks/${id}`),
  autoGenerate:    (id:string)=> api.post(`/cms/roster-weeks/${id}/auto-generate`),
  copyPrevious:    (id:string, sourceWeekId:string) =>
    api.post(`/cms/roster-weeks/${id}/copy-previous`, { source_week_id: sourceWeekId }),
  publish:         (id:string)=> api.post(`/cms/roster-weeks/${id}/publish`),
  lock:            (id:string)=> api.post(`/cms/roster-weeks/${id}/lock`),
  addEntry:        (id:string, data:any) => api.post(`/cms/roster-weeks/${id}/entries`, data),
  uncovered:       (id:string, date:string) =>
    api.get(`/cms/roster-weeks/${id}/uncovered`, { params: { date } }),
};
 
// ── Roster Entries ────────────────────────────────────────────────────────────
export const entriesApi = {
  update:   (id:string, data:any) => api.put(`/cms/roster-entries/${id}`, data),
  delete:   (id:string)           => api.delete(`/cms/roster-entries/${id}`),
  dragDrop: (data:any)            => api.post('/cms/roster-entries/drag-drop', data),
};
 
// ── Geofence ──────────────────────────────────────────────────────────────────
export const geofenceApi = {
  terminals:      ()            => api.get('/cms/geofence/terminals'),
  updateTerminal: (id:string, data:any) => api.put(`/cms/geofence/terminals/${id}`, data),
  zones:          (terminalId:string) => api.get(`/cms/geofence/terminals/${terminalId}/zones`),
  updateZone:     (id:string, data:any) => api.put(`/cms/geofence/zones/${id}`, data),
  getConfig:      (zoneId:string) => api.get(`/cms/geofence/zones/${zoneId}/config`),
  saveConfig:     (zoneId:string, data:any) => api.post(`/cms/geofence/zones/${zoneId}/config`, data),
  addBssid:       (zoneId:string, data:any) => api.post(`/cms/geofence/zones/${zoneId}/bssid`, data),
  removeBssid:    (zoneId:string, bssid:string) =>
    api.delete(`/cms/geofence/zones/${zoneId}/bssid`, { data: { bssid } }),
  testLocation:   (data:any) => api.post('/cms/geofence/test', data),
};
 
// ── Staff CMS ─────────────────────────────────────────────────────────────────
export const staffCmsApi = {
  list:                ()            => api.get('/cms/staff'),
  withAvailability:    (date?:string)=> api.get('/cms/staff/with-availability', { params: { date } }),
  getAvailability:     (id:string)   => api.get(`/cms/staff/${id}/availability`),
  saveAvailability:    (id:string, data:any) => api.post(`/cms/staff/${id}/availability`, data),
  addUnavailability:   (id:string, data:any) => api.post(`/cms/staff/${id}/unavailability`, data),
  removeUnavailability:(id:string)   => api.delete(`/cms/staff/unavailability/${id}`),
  weeklyStats:         (id:string, weekStart:string) =>
    api.get(`/cms/staff/${id}/weekly-stats`, { params: { week_start: weekStart } }),
};
 
// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  rosterVsActual: (weekStart:string) =>
    api.get('/cms/reports/roster-vs-actual', { params: { week_start: weekStart } }),
  staffingGaps:   (weekStart:string) =>
    api.get('/cms/reports/staffing-gaps', { params: { week_start: weekStart } }),
  hoursSummary:   (from:string, to:string) =>
    api.get('/cms/reports/hours-summary', { params: { from, to } }),
};
 
// ── Shift Rules ───────────────────────────────────────────────────────────────
export const shiftRulesApi = {
  list:   ()            => api.get('/cms/shift-rules'),
  create: (data:any)   => api.post('/cms/shift-rules', data),
  update: (id:string, data:any) => api.put(`/cms/shift-rules/${id}`, data),
  delete: (id:string)  => api.delete(`/cms/shift-rules/${id}`),
};