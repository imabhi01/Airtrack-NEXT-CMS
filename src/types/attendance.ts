// src/types/attendance.ts

export interface AnomalyUser {
  id: string;
  name: string;
  employee_id: string;
  job_title?: string | null;
}

export interface AnomalyPunchEvent {
  id: string;
  type: 'clock_in' | 'clock_out';
  punched_at: string;
  session_status: 'open' | 'completed' | 'auto_closed' | 'flagged';
  paired_event_id: string | null;
  terminal?: { name: string } | null;
  zone?: { name: string } | null;
  paired_event?: AnomalyPunchEvent | null;
}

export type AnomalyType =
  | 'LATE'
  | 'NO_AIRSIDE_CLEARANCE'
  | 'EXCESSIVE_SHIFT_DURATION'
  | 'UNCLOSED_SESSION_AUTO_CLOSED';

export interface Anomaly {
  id: string;
  user_id: string;
  punch_event_id: string;
  anomaly_date: string;
  type: AnomalyType;
  description: string;
  status: 'open' | 'resolved' | 'dismissed';
  resolution_action?: string | null;
  resolution_notes?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  user: AnomalyUser;
  punch_event: AnomalyPunchEvent;
  created_at: string;
}

export interface AnomalyDetail {
  anomaly: Anomaly;
  day_punches: AnomalyPunchEvent[];
}

export interface AnomalyStats {
  open: number;
  resolved_today: number;
}

export type ResolveAction = 'approve_as_is' | 'correct_hours' | 'dismiss';

export interface ResolvePayload {
  action: ResolveAction;
  corrected_clock_in?: string;
  corrected_clock_out?: string;
  resolution_notes: string;
}