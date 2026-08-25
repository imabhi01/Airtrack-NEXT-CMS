// src/lib/cms/roster.ts
//
// Service layer for roster/weekly management. Mirrors the pattern used in
// staff.ts: functions are async and return the same shapes the real Laravel
// endpoints will, so swapping the mock store for `fetch` calls later is a
// find-and-replace inside this file — nothing above it needs to change.
//
// Suggested Laravel routes when you're ready to wire this up:
//   GET    /api/roster/week?start=YYYY-MM-DD
//   POST   /api/duty-instances
//   POST   /api/duty-instances/bulk            (repeat/back-to-back creation)
//   PATCH  /api/duty-instances/:id
//   DELETE /api/duty-instances/:id
//   POST   /api/duty-instances/:id/assign      { staff_id }
//   DELETE /api/duty-instances/:id/assign/:staffId

import dayjs from 'dayjs';
import api from '@/lib/api'; // shared axios instance — attaches airtrack_token cookie via interceptor
import { DutyInstance, DutyType, StaffMember, timesOverlap, WeekLock } from '@/types/roster';

// ── Duty type templates ─────────────────────────────────────────────────────
// Add new templates here as you introduce new duty categories.

export const DUTY_TYPES: DutyType[] = [
  { id: 'dt-sq',  name: 'SQ Boarding',        code: 'SQ_BOARDING',   category: 'boarding', defaultRequiredStaff: 4, defaultDurationMins: 45 },
  { id: 'dt-tg',  name: 'TG Boarding',        code: 'TG_BOARDING',   category: 'boarding', defaultRequiredStaff: 3, defaultDurationMins: 45 },
  { id: 'dt-ai',  name: 'Air India Security', code: 'AI_SECURITY',   category: 'security', defaultRequiredStaff: 4, defaultDurationMins: 40 },
  { id: 'dt-bag', name: 'Baggage Make-up',    code: 'BAGGAGE_MAKEUP',category: 'baggage',   defaultRequiredStaff: 2, defaultDurationMins: 180 },
];

// ── Staff — fetched from your existing staff/users API, not hardcoded ──────
//
// Since you already have a staff directory with full CRUD (src/lib/cms/staff.ts
// per your CMS), the cleanest move is to import and reuse whatever that file
// already exports rather than duplicating a fetch call here. Two ways to wire
// this up — pick whichever matches what staff.ts actually exports:
//
//   OPTION A (preferred) — reuse the existing service:
//     import { getStaffList } from '@/lib/cms/staff';
//     export async function loadStaff(): Promise<StaffMember[]> {
//       if (staffCache) return staffCache;
//       const raw = await getStaffList(); // adjust to your real function name
//       staffCache = raw.map(mapApiStaffToStaffMember);
//       return staffCache;
//     }
//
//   OPTION B — fetch directly (used below as a working default; swap the
//   endpoint path once you confirm it — likely /cms/staff or /admin/staff
//   given your route-list conventions):

let staffCache: StaffMember[] | null = null;

function mapApiStaffToStaffMember(u: any): StaffMember {
  const name: string = u.name ?? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return {
    id: String(u.id),
    name,
    role: u.role ?? u.job_title ?? u.position ?? 'Staff',
    initials: initials || '?',
  };
}

/** Fetches the staff list once and caches it for the session. Call this on
 *  page mount (see the weekly page's useEffect) before relying on getStaff(). */
export async function loadStaff(): Promise<StaffMember[]> {
  if (staffCache) return staffCache;

  const res = await api.get('/cms/staff'); // baseURL already includes /api/v1
  const json = res.data;
  // Handle either a bare array or a wrapped { data: [...] } / { staff: [...] } response
  const list: any[] = Array.isArray(json) ? json : json.data ?? json.staff ?? [];
  staffCache = list.map(mapApiStaffToStaffMember);
  return staffCache;
}

/** Synchronous lookup — only reliable after loadStaff() has resolved at least
 *  once (the weekly page does this on mount). Returns undefined otherwise. */
export function getStaff(staffId: string): StaffMember | undefined {
  return staffCache?.find((s) => s.id === staffId);
}

/** Synchronous accessor for the whole list, same caveat as getStaff(). */
export function getCachedStaff(): StaffMember[] {
  return staffCache ?? [];
}

// ── In-memory instance store (seeded so the page is useful immediately) ────

function today(offsetDays = 0) {
  return dayjs().startOf('week').add(1, 'day').add(offsetDays, 'day').format('YYYY-MM-DD'); // Monday + offset
}

let instanceSeq = 0;
function nextId() {
  instanceSeq += 1;
  return `di-${instanceSeq}`;
}

function makeInstance(partial: Omit<DutyInstance, 'id' | 'assignedStaffIds'> & { assignedStaffIds?: string[] }): DutyInstance {
  return { id: nextId(), assignedStaffIds: [], ...partial };
}

// NOTE: the seed instances below no longer pre-assign staff (assignedStaffIds
// is empty on all of them) because staff IDs now come from your real API and
// won't match any hardcoded mock IDs. Assign staff through the UI once your
// staff list is loading correctly.
const aiFlights = Array.from({ length: 7 }).map((_, i) => {
  const startMinutes = 6 * 60 + i * 40; // 06:00, then every 40 min
  const start = dayjs().hour(0).minute(0).add(startMinutes, 'minute').format('HH:mm');
  const end = dayjs().hour(0).minute(0).add(startMinutes + 40, 'minute').format('HH:mm');
  return makeInstance({
    dutyTypeId: 'dt-ai',
    date: today(2), // Wednesday
    startTime: start,
    endTime: end,
    requiredStaff: 4,
    flightNumber: `AI${131 + i}`,
  });
});

let instances: DutyInstance[] = [
  makeInstance({ dutyTypeId: 'dt-sq', date: today(0), startTime: '09:20', endTime: '10:05', requiredStaff: 4, flightNumber: 'SQ322', gate: 'A5' }),
  makeInstance({ dutyTypeId: 'dt-sq', date: today(0), startTime: '21:40', endTime: '22:25', requiredStaff: 4, flightNumber: 'SQ308', gate: 'A5' }),
  makeInstance({ dutyTypeId: 'dt-tg', date: today(0), startTime: '13:15', endTime: '14:00', requiredStaff: 3, flightNumber: 'TG917', gate: 'B2' }),
  makeInstance({ dutyTypeId: 'dt-bag', date: today(0), startTime: '06:00', endTime: '14:00', requiredStaff: 2, notes: 'Morning shift, T3' }),
  ...aiFlights,
  makeInstance({ dutyTypeId: 'dt-bag', date: today(2), startTime: '14:00', endTime: '22:00', requiredStaff: 2, notes: 'Afternoon shift, T3' }),
];

// ── Reads ────────────────────────────────────────────────────────────────────

export async function getWeekInstances(weekStart: string): Promise<DutyInstance[]> {
  // TODO(API): return fetch(`/api/roster/week?start=${weekStart}`).then(r => r.json())
  const start = dayjs(weekStart);
  const end = start.add(7, 'day');
  return instances.filter((i) => dayjs(i.date).isAfter(start.subtract(1, 'day')) && dayjs(i.date).isBefore(end));
}

export async function getDayInstances(date: string): Promise<DutyInstance[]> {
  return instances.filter((i) => i.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function getDutyType(dutyTypeId: string): DutyType | undefined {
  return DUTY_TYPES.find((d) => d.id === dutyTypeId);
}

/** Staff already booked on an overlapping duty that day — used to grey out the assign list. */
export function getConflictingStaffIds(instance: DutyInstance, allDayInstances: DutyInstance[]): Set<string> {
  const conflicts = new Set<string>();
  for (const other of allDayInstances) {
    if (other.id === instance.id) continue;
    if (!timesOverlap(instance, other)) continue;
    other.assignedStaffIds.forEach((id) => conflicts.add(id));
  }
  return conflicts;
}

// ── Writes ───────────────────────────────────────────────────────────────────

export async function createDutyInstance(input: Omit<DutyInstance, 'id' | 'assignedStaffIds'>): Promise<DutyInstance> {
  // TODO(API): POST /api/duty-instances
  const created = makeInstance(input);
  instances = [...instances, created];
  return created;
}

/** Generates N back-to-back (or gapped) instances from one duty type — the
 *  "7 Air India flights" case. gapMins = 0 means each instance starts the
 *  moment the previous one ends. */
export async function createRepeatingDuties(input: {
  dutyTypeId: string;
  date: string;
  startTime: string;
  durationMins: number;
  requiredStaff: number;
  repeatCount: number;
  gapMins: number;
  flightPrefix?: string;   // "AI" -> AI1, AI2, AI3...
  flightStartNumber?: number;
  gate?: string;
}): Promise<DutyInstance[]> {
  // TODO(API): POST /api/duty-instances/bulk
  const created: DutyInstance[] = [];
  let cursor = dayjs(`${input.date}T${input.startTime}`);

  for (let i = 0; i < input.repeatCount; i++) {
    const start = cursor;
    const end = start.add(input.durationMins, 'minute');
    const flightNumber =
      input.flightPrefix != null && input.flightStartNumber != null
        ? `${input.flightPrefix}${input.flightStartNumber + i}`
        : undefined;

    created.push(
      makeInstance({
        dutyTypeId: input.dutyTypeId,
        date: input.date,
        startTime: start.format('HH:mm'),
        endTime: end.format('HH:mm'),
        requiredStaff: input.requiredStaff,
        flightNumber,
        gate: input.gate,
      })
    );
    cursor = end.add(input.gapMins, 'minute');
  }

  instances = [...instances, ...created];
  return created;
}

export async function duplicateDutyInstance(id: string): Promise<DutyInstance | undefined> {
  const source = instances.find((i) => i.id === id);
  if (!source) return undefined;
  const durationMins = dayjs(`2000-01-01T${source.endTime}`).diff(dayjs(`2000-01-01T${source.startTime}`), 'minute');
  const newStart = dayjs(`2000-01-01T${source.endTime}`);
  const newEnd = newStart.add(durationMins, 'minute');

  const copy = makeInstance({
    dutyTypeId: source.dutyTypeId,
    date: source.date,
    startTime: newStart.format('HH:mm'),
    endTime: newEnd.format('HH:mm'),
    requiredStaff: source.requiredStaff,
    flightNumber: source.flightNumber,
    gate: source.gate,
    notes: source.notes,
  });
  instances = [...instances, copy];
  return copy;
}

export async function deleteDutyInstance(id: string): Promise<void> {
  // TODO(API): DELETE /api/duty-instances/:id
  instances = instances.filter((i) => i.id !== id);
}

export async function assignStaff(instanceId: string, staffId: string): Promise<void> {
  // TODO(API): POST /api/duty-instances/:id/assign
  instances = instances.map((i) =>
    i.id === instanceId && !i.assignedStaffIds.includes(staffId)
      ? { ...i, assignedStaffIds: [...i.assignedStaffIds, staffId] }
      : i
  );
}

export async function unassignStaff(instanceId: string, staffId: string): Promise<void> {
  // TODO(API): DELETE /api/duty-instances/:id/assign/:staffId
  instances = instances.map((i) =>
    i.id === instanceId ? { ...i, assignedStaffIds: i.assignedStaffIds.filter((id) => id !== staffId) } : i
  );
}

// ── Week locking ─────────────────────────────────────────────────────────────
// Locking is a separate record keyed by weekStart rather than a flag on each
// instance — this keeps "is this week final" a single source of truth, and
// means locking doesn't require touching every duty row.

const weekLocks: Record<string, WeekLock> = {};

export async function getWeekLock(weekStart: string): Promise<WeekLock | null> {
  // TODO(API): GET /api/roster/week/:start/lock
  return weekLocks[weekStart] ?? null;
}

export async function lockWeek(weekStart: string, lockedBy: string): Promise<WeekLock> {
  // TODO(API): POST /api/roster/week/lock { week_start }
  // Server-side, also worth validating no duty in the week is understaffed
  // before allowing a lock, or at least warning the manager — see the
  // confirmation step in the weekly page.
  const lock: WeekLock = { weekStart, lockedAt: new Date().toISOString(), lockedBy };
  weekLocks[weekStart] = lock;
  return lock;
}

export async function unlockWeek(weekStart: string): Promise<void> {
  // TODO(API): POST /api/roster/week/unlock { week_start }
  // Consider restricting this to a manager role, and logging who unlocked
  // and why — a published roster changing after staff have seen it is the
  // kind of thing worth an audit trail for.
  delete weekLocks[weekStart];
}

/** Where the PDF export button should point once the Laravel endpoint exists.
 *  See roster-pdf-controller.php for the server-side implementation.
 *
 *  NEXT_PUBLIC_API_URL already includes the /api/v1 prefix in this project
 *  (e.g. http://localhost:8000/api/v1) — don't add /api/v1 again here, or
 *  the request ends up as .../api/v1/api/v1/admin/roster/... and 404s.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export function getWeekPdfPath(weekStart: string): string {
  return `/admin/roster/week/${weekStart}/pdf`;
}

/** Downloads the PDF with the user's auth token attached, then saves it via
 *  a temporary blob link. Use this instead of window.open()/a plain <a href>
 *  whenever the endpoint is behind auth — window.open can't attach an
 *  Authorization header, so a token-protected route would 401/403 even
 *  once the URL itself is correct.
 *
 *  Adjust the token lookup to match how your CMS actually stores it
 *  (e.g. your auth store/zustand, an httpOnly cookie via credentials:
 *  'include', etc). */
export async function downloadWeekPdf(weekStart: string): Promise<void> {
  const res = await api.get(getWeekPdfPath(weekStart), { responseType: 'blob' });
  const blob = res.data as Blob;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `roster-${weekStart}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}