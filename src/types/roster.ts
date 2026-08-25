// src/types/roster.ts

export type DutyCategory = 'boarding' | 'security' | 'baggage' | 'other';

/** A reusable duty template — "SQ Boarding", "Air India Security" etc.
 *  Holds the defaults (staff needed, duration) that get copied onto
 *  each DutyInstance when it's created, so managers don't retype them. */
export interface DutyType {
  id: string;
  name: string;                 // "SQ Boarding"
  code: string;                 // "SQ_BOARDING" — stable key, useful for API/reporting
  category: DutyCategory;
  defaultRequiredStaff: number; // e.g. 4
  defaultDurationMins: number;  // e.g. 45
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;          // "Ramp Agent", "Security Officer", "Boarding Agent"
  initials: string;      // for the avatar chip
}

/** One real occurrence of a duty — a specific flight/shift block on a specific day. */
export interface DutyInstance {
  id: string;
  dutyTypeId: string;
  date: string;              // YYYY-MM-DD
  startTime: string;         // HH:mm, 24hr
  endTime: string;           // HH:mm, 24hr
  requiredStaff: number;     // can be overridden per-instance
  flightNumber?: string;     // "AI131"
  gate?: string;
  notes?: string;
  assignedStaffIds: string[];
}

export interface CoverageStatus {
  assigned: number;
  required: number;
  state: 'understaffed' | 'full' | 'overstaffed';
}

export function getCoverageStatus(instance: DutyInstance): CoverageStatus {
  const assigned = instance.assignedStaffIds.length;
  const required = instance.requiredStaff;
  const state =
    assigned < required ? 'understaffed' : assigned > required ? 'overstaffed' : 'full';
  return { assigned, required, state };
}

/** Two duty instances conflict if they're the same day and their time ranges overlap. */
export function timesOverlap(a: DutyInstance, b: DutyInstance): boolean {
  if (a.date !== b.date) return false;
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

/** A week is locked as a whole — once published, no duty in any of its 7
 *  days can be edited, assigned, duplicated, or deleted until unlocked. */
export interface WeekLock {
  weekStart: string; // YYYY-MM-DD, Monday
  lockedAt: string;  // ISO timestamp
  lockedBy: string;  // name of the manager who locked it
}