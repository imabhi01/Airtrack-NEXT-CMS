// FILE: src/lib/cms/staff.ts
// Shared service layer for staff CRUD. Both the staff directory (list/view/edit/
// deactivate) and the staff creation page call into these functions instead of
// hitting `api` directly, so the endpoint shapes only need to be defined once.

import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Terminal {
  id:   string;
  name: string;
  code: string;
}

export interface StaffAvailability {
  preferred_shift_types: string[];
  max_hours_per_week:    number;
  unavailable_days:      number[];
}

export interface Staff {
  id:                 string;
  name:               string;
  email:              string;
  employee_id:        string;
  job_role:           string;
  contract_type:      string;
  terminal?:          Terminal | null;
  has_airside_access: boolean;
  has_cargo_pass:     boolean;
  is_active:          boolean;
  phone?:             string | null;
  blue_id_number?:    string | null;
  blue_id_expiry?:    string | null;
  joined_date?:       string | null;
  avatar?:            string | null;
  availability?:      StaffAvailability | null;
}

export interface StaffListParams {
  search?:      string;
  job_role?:    string;
  terminal_id?: string;
  is_active?:   string;   // 'true' | 'false' | '' (all)
}

// Fields shared by create + update. Create additionally requires password fields,
// which live in `StaffCreatePayload` below rather than here, since edit never
// touches credentials.
export interface StaffFormFields {
  name:               string;
  email:              string;
  phone:              string | null;
  job_role:           string;
  contract_type:      string;
  terminal_id:        string | null;
  has_airside_access: boolean;
  has_cargo_pass:     boolean;
  blue_id_number:     string | null;
  blue_id_expiry:     string | null;
  joined_date:        string | null;
}

export interface StaffCreatePayload extends StaffFormFields {
  employee_id:            string;
  password:               string;
  password_confirmation:  string;
}

export type StaffUpdatePayload = Partial<StaffFormFields>;

// Laravel-style validation error bag: { field: ["message", ...] }
export interface ApiValidationError {
  message?: string;
  errors?:  Record<string, string[]>;
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function listStaff(params: StaffListParams = {}): Promise<Staff[]> {
  const res = await api.get('/cms/staff', {
    params: {
      is_active:   params.is_active,
      job_role:    params.job_role    || undefined,
      terminal_id: params.terminal_id || undefined,
      search:      params.search      || undefined,
    },
  });
  return res.data.data ?? [];
}

export async function getStaff(id: string): Promise<Staff> {
  const res = await api.get(`/cms/staff/${id}`);
  return res.data.data ?? res.data;
}

export async function listTerminals(): Promise<Terminal[]> {
  const res = await api.get('/cms/geofence/terminals');
  return res.data.terminals ?? [];
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createStaff(payload: StaffCreatePayload): Promise<Staff> {
  const res = await api.post('/admin/staff', normalizeFormFields(payload));
  return res.data.data ?? res.data;
}

export async function updateStaff(id: string, payload: StaffUpdatePayload): Promise<Staff> {
  const res = await api.put(`/admin/staff/${id}`, normalizeFormFields(payload));
  return res.data.data ?? res.data;
}

export async function setStaffActive(id: string, isActive: boolean): Promise<void> {
  await api.put(`/admin/staff/${id}`, { is_active: isActive });
}

export const deactivateStaff = (id: string) => setStaffActive(id, false);
export const reactivateStaff = (id: string) => setStaffActive(id, true);

// ── Helpers ───────────────────────────────────────────────────────────────────

// Converts empty-string form fields to null before sending, so the API always
// receives explicit nulls rather than empty strings for optional fields.
function normalizeFormFields<T extends Record<string, unknown>>(payload: T): T {
  const NULLABLE_KEYS = [
    'terminal_id', 'phone', 'blue_id_number', 'blue_id_expiry', 'joined_date',
  ];
  const normalized = { ...payload };
  for (const key of NULLABLE_KEYS) {
    if (key in normalized && normalized[key as keyof T] === '') {
      (normalized as Record<string, unknown>)[key] = null;
    }
  }
  return normalized;
}

// Flattens a Laravel-style error bag into { field: firstMessage } for form display.
export function flattenApiErrors(err: unknown): Record<string, string> {
  const apiErrors = (err as { response?: { data?: ApiValidationError } })
    ?.response?.data?.errors;
  if (!apiErrors) return {};
  const flat: Record<string, string> = {};
  Object.entries(apiErrors).forEach(([field, messages]) => {
    flat[field] = Array.isArray(messages) ? messages[0] : String(messages);
  });
  return flat;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: ApiValidationError } })
    ?.response?.data?.message ?? fallback;
}