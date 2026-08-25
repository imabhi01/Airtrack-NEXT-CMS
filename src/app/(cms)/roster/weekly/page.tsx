// src/app/roster/weekly/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  DUTY_TYPES,
  assignStaff,
  createDutyInstance,
  createRepeatingDuties,
  deleteDutyInstance,
  downloadWeekPdf,
  duplicateDutyInstance,
  getDayInstances,
  getDutyType,
  getStaff,
  getWeekInstances,
  getWeekLock,
  loadStaff,
  lockWeek,
  unassignStaff,
  unlockWeek,
} from '@/lib/cms/roster';
import { DutyInstance, StaffMember, WeekLock, getCoverageStatus } from '@/types/roster';
import DutyInstanceCard from '@/components/roster/DutyInstanceCard';
import AssignStaffModal from '@/components/roster/AssignStaffModal';
import AddDutyModal, { NewDutyInput } from '@/components/roster/AddDutyModal';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeeklyRosterPage() {
  const [weekStart, setWeekStart] = useState(() => dayjs().startOf('week').add(1, 'day')); // Monday
  const [selectedDate, setSelectedDate] = useState(() => dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'));
  const [weekInstances, setWeekInstances] = useState<DutyInstance[]>([]);
  const [dayInstances, setDayInstances] = useState<DutyInstance[]>([]);

  const [assignTarget, setAssignTarget] = useState<DutyInstance | null>(null);
  const [showAddDuty, setShowAddDuty] = useState(false);
  const [weekLock, setWeekLock] = useState<WeekLock | null>(null);
  const [lockBusy, setLockBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const isLocked = weekLock !== null;

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);

  useEffect(() => {
    loadStaff()
      .then(setStaffList)
      .catch((err) => {
        console.error('[Roster] failed to load staff', err);
        setStaffError('Could not load staff list — check the API endpoint in loadStaff().');
      });
  }, []);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => weekStart.add(i, 'day')),
    [weekStart]
  );

  const refreshWeek = async () => {
    const data = await getWeekInstances(weekStart.format('YYYY-MM-DD'));
    setWeekInstances(data);
    const lock = await getWeekLock(weekStart.format('YYYY-MM-DD'));
    setWeekLock(lock);
  };

  const refreshDay = async () => {
    const data = await getDayInstances(selectedDate);
    setDayInstances(data);
  };

  useEffect(() => { refreshWeek(); }, [weekStart]);
  useEffect(() => { refreshDay(); }, [selectedDate, weekInstances]);

  // Gap count per day, for the red badge on day tabs.
  const gapsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const day of weekDays) {
      const dateStr = day.format('YYYY-MM-DD');
      map[dateStr] = weekInstances.filter((i) => i.date === dateStr && getCoverageStatus(i).state === 'understaffed').length;
    }
    return map;
  }, [weekInstances, weekDays]);

  // Coverage rolled up by duty type, for the selected day only.
  const coverageByDutyType = useMemo(() => {
    return DUTY_TYPES.map((dt) => {
      const matching = dayInstances.filter((i) => i.dutyTypeId === dt.id);
      const required = matching.reduce((sum, i) => sum + i.requiredStaff, 0);
      const assigned = matching.reduce((sum, i) => sum + i.assignedStaffIds.length, 0);
      return { dutyType: dt, count: matching.length, required, assigned };
    }).filter((c) => c.count > 0);
  }, [dayInstances]);

  const doAssign = async (staffId: string) => {
    if (!assignTarget || isLocked) return;
    await assignStaff(assignTarget.id, staffId);
    const refreshed = await getDayInstances(selectedDate);
    setDayInstances(refreshed);
    setAssignTarget(refreshed.find((i) => i.id === assignTarget.id) ?? null);
  };

  const doUnassign = async (instanceId: string, staffId: string) => {
    if (isLocked) return;
    await unassignStaff(instanceId, staffId);
    refreshDay();
  };

  const doDuplicate = async (instanceId: string) => {
    if (isLocked) return;
    await duplicateDutyInstance(instanceId);
    refreshDay();
    refreshWeek();
  };

  const doDelete = async (instanceId: string) => {
    if (isLocked) return;
    await deleteDutyInstance(instanceId);
    refreshDay();
    refreshWeek();
  };

  const doToggleLock = async () => {
    setLockBusy(true);
    try {
      if (isLocked) {
        const confirmed = window.confirm(
          'Unlock this week? Staff may already be relying on the published version.'
        );
        if (!confirmed) return;
        await unlockWeek(weekStart.format('YYYY-MM-DD'));
      } else {
        const totalGaps = Object.values(gapsByDate).reduce((a, b) => a + b, 0);
        const proceed =
          totalGaps === 0 ||
          window.confirm(
            `${totalGaps} position${totalGaps > 1 ? 's are' : ' is'} still unfilled this week. Lock and publish anyway?`
          );
        if (!proceed) return;
        // TODO: replace 'Manager' with the signed-in user's name
        await lockWeek(weekStart.format('YYYY-MM-DD'), 'Manager');
      }
      refreshWeek();
    } finally {
      setLockBusy(false);
    }
  };

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      await downloadWeekPdf(weekStart.format('YYYY-MM-DD'));
    } catch (err) {
      console.error('[Roster] PDF export failed', err);
      window.alert('Could not generate the PDF. Check that the API server is running and reachable.');
    } finally {
      setPdfBusy(false);
    }
  };

  const doCreate = async (input: NewDutyInput) => {
    if (isLocked) return;
    if (input.repeatCount > 1) {
      await createRepeatingDuties({
        dutyTypeId: input.dutyTypeId,
        date: selectedDate,
        startTime: input.startTime,
        durationMins: input.durationMins,
        requiredStaff: input.requiredStaff,
        repeatCount: input.repeatCount,
        gapMins: input.gapMins,
        flightPrefix: input.flightPrefix,
        flightStartNumber: input.flightStartNumber,
        gate: input.gate,
      });
    } else {
      const [h, m] = input.startTime.split(':').map(Number);
      const endMin = h * 60 + m + input.durationMins;
      const endTime = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
      await createDutyInstance({
        dutyTypeId: input.dutyTypeId,
        date: selectedDate,
        startTime: input.startTime,
        endTime,
        requiredStaff: input.requiredStaff,
        flightNumber: input.flightPrefix ? `${input.flightPrefix}${input.flightStartNumber ?? ''}` : undefined,
        gate: input.gate,
      });
    }
    setShowAddDuty(false);
    refreshWeek();
  };

  const totalGapsThisDay = dayInstances.reduce((sum, i) => {
    const c = getCoverageStatus(i);
    return sum + Math.max(0, c.required - c.assigned);
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#12233F] px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-300">Roster</p>
              <h1 className="mt-0.5 text-xl font-semibold text-white">Weekly duty roster</h1>
            </div>
            {isLocked && (
              <span className="mt-3 flex items-center gap-1 self-start rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="5" y="11" width="14" height="9" rx="1.5" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                Locked
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setWeekStart((w) => w.subtract(7, 'day')); }}
              className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10"
            >
              \u2190 Prev week
            </button>
            <span className="px-2 font-mono text-sm text-white/80">
              {weekStart.format('D MMM')} \u2013 {weekStart.add(6, 'day').format('D MMM YYYY')}
            </span>
            <button
              onClick={() => { setWeekStart((w) => w.add(7, 'day')); }}
              className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10"
            >
              Next week \u2192
            </button>

            <div className="ml-2 flex items-center gap-2 border-l border-white/15 pl-3">
              <button
                onClick={exportPdf}
                disabled={pdfBusy}
                className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" />
                </svg>
                {pdfBusy ? 'Generating\u2026' : 'Export PDF'}
              </button>
              <button
                onClick={doToggleLock}
                disabled={lockBusy}
                className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                  isLocked ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-amber-400 text-slate-900 hover:bg-amber-300'
                }`}
              >
                {isLocked ? 'Unlock week' : 'Lock & publish'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-center text-xs text-amber-800">
          This week is locked. Duties can\u2019t be edited, assigned, or removed until it\u2019s unlocked.
        </div>
      )}
      {staffError && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-center text-xs text-red-700">
          {staffError}
        </div>
      )}

      <div className="mx-auto max-w-5xl px-6 py-6">
        {/* Day tabs */}
        <div className="mb-5 flex gap-1.5">
          {weekDays.map((day, i) => {
            const dateStr = day.format('YYYY-MM-DD');
            const isSelected = dateStr === selectedDate;
            const gaps = gapsByDate[dateStr] ?? 0;
            const isToday = dateStr === dayjs().format('YYYY-MM-DD');
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`relative flex-1 rounded-lg border px-2 py-2.5 text-center transition ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className={`text-[11px] font-semibold uppercase tracking-wide ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                  {DAY_LABELS[i]}
                </div>
                <div className="font-mono text-sm font-semibold">
                  {day.format('D')}
                  {isToday && <span className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-sky-300' : 'bg-sky-600'}`} />}
                </div>
                {gaps > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                    {gaps}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Coverage summary for selected day */}
        {coverageByDutyType.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {coverageByDutyType.map(({ dutyType, count, required, assigned }) => {
              const short = assigned < required;
              return (
                <div key={dutyType.id} className={`rounded-lg border p-3 ${short ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <p className="text-xs font-medium text-slate-600">{dutyType.name}</p>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-slate-900">
                    {assigned}<span className="text-slate-400">/{required}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">{count} duty{count > 1 ? ' slots' : ''}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Day header row */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {dayjs(selectedDate).format('dddd, D MMMM')}
            </h2>
            {totalGapsThisDay > 0 ? (
              <p className="text-xs text-red-600">{totalGapsThisDay} position{totalGapsThisDay > 1 ? 's' : ''} unfilled</p>
            ) : dayInstances.length > 0 ? (
              <p className="text-xs text-emerald-600">Fully staffed</p>
            ) : (
              <p className="text-xs text-slate-400">No duties scheduled</p>
            )}
          </div>
          {!isLocked && (
            <button
              onClick={() => setShowAddDuty(true)}
              className="rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              + Add duty
            </button>
          )}
        </div>

        {/* Duty list */}
        <div className="space-y-2.5">
          {dayInstances.map((instance) => (
            <DutyInstanceCard
              key={instance.id}
              instance={instance}
              dutyType={getDutyType(instance.dutyTypeId)}
              assignedStaff={instance.assignedStaffIds.map((id) => getStaff(id)!).filter(Boolean)}
              locked={isLocked}
              onAssignClick={() => setAssignTarget(instance)}
              onUnassign={(staffId) => doUnassign(instance.id, staffId)}
              onDuplicate={() => doDuplicate(instance.id)}
              onDelete={() => doDelete(instance.id)}
            />
          ))}
          {dayInstances.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-400">
              Nothing on the roster for this day yet.
            </div>
          )}
        </div>
      </div>

      {assignTarget && (
        <AssignStaffModal
          instance={assignTarget}
          allDayInstances={dayInstances}
          staffList={staffList}
          onAssign={doAssign}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {showAddDuty && (
        <AddDutyModal
          date={selectedDate}
          onCreate={doCreate}
          onClose={() => setShowAddDuty(false)}
        />
      )}
    </div>
  );
}