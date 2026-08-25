// src/components/roster/AssignStaffModal.tsx
'use client';

import { useMemo, useState } from 'react';
import { DutyInstance, StaffMember } from '@/types/roster';
import { getConflictingStaffIds, getDutyType } from '@/lib/cms/roster';

interface Props {
  instance: DutyInstance;
  allDayInstances: DutyInstance[];
  staffList: StaffMember[];
  onAssign: (staffId: string) => void;
  onClose: () => void;
}

export default function AssignStaffModal({ instance, allDayInstances, staffList, onAssign, onClose }: Props) {
  const [query, setQuery] = useState('');
  const conflicts = useMemo(() => getConflictingStaffIds(instance, allDayInstances), [instance, allDayInstances]);

  const conflictDutyFor = (staffId: string) => {
    const busyOn = allDayInstances.find(
      (i) => i.id !== instance.id && i.assignedStaffIds.includes(staffId)
    );
    if (!busyOn) return null;
    return `${getDutyType(busyOn.dutyTypeId)?.name ?? 'Duty'} \u00b7 ${busyOn.startTime}\u2013${busyOn.endTime}`;
  };

  const filtered = staffList.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));
  const available = filtered.filter((s) => !instance.assignedStaffIds.includes(s.id) && !conflicts.has(s.id));
  const busy = filtered.filter((s) => !instance.assignedStaffIds.includes(s.id) && conflicts.has(s.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Assign staff</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {instance.startTime}\u2013{instance.endTime} \u00b7 needs {instance.requiredStaff}, has {instance.assignedStaffIds.length}
          </p>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff\u2026"
            className="mt-3 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {available.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Available</div>
              {available.map((s) => (
                <StaffRow key={s.id} staff={s} onClick={() => onAssign(s.id)} />
              ))}
            </div>
          )}

          {busy.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Busy \u2014 overlapping duty
              </div>
              {busy.map((s) => (
                <StaffRow key={s.id} staff={s} disabled subtitle={conflictDutyFor(s.id) ?? undefined} />
              ))}
            </div>
          )}

          {available.length === 0 && busy.length === 0 && (
            <p className="p-4 text-center text-sm text-slate-400">
              {staffList.length === 0 ? 'Loading staff\u2026' : `No staff match \u201c${query}\u201d`}
            </p>
          )}
        </div>

        <div className="border-t border-slate-100 p-3">
          <button
            onClick={onClose}
            className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function StaffRow({
  staff,
  onClick,
  disabled,
  subtitle,
}: {
  staff: StaffMember;
  onClick?: () => void;
  disabled?: boolean;
  subtitle?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-50'
      }`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-white">
        {staff.initials}
      </span>
      <span className="flex-1">
        <span className="block text-slate-900">{staff.name}</span>
        <span className="block text-xs text-slate-400">{subtitle ?? staff.role}</span>
      </span>
    </button>
  );
}