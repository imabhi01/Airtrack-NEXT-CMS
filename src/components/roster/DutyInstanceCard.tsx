// src/components/roster/DutyInstanceCard.tsx
'use client';

import { DutyInstance, DutyType, getCoverageStatus, StaffMember } from '@/types/roster';

const CATEGORY_ACCENT: Record<string, string> = {
  boarding: 'border-l-sky-600',
  security: 'border-l-rose-600',
  baggage:  'border-l-amber-600',
  other:    'border-l-slate-400',
};

const STATUS_STYLES: Record<string, { pill: string; dotFilled: string; dotEmpty: string }> = {
  understaffed: { pill: 'bg-red-50 text-red-700 border-red-200',     dotFilled: 'bg-red-500',   dotEmpty: 'bg-red-100' },
  full:         { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotFilled: 'bg-emerald-500', dotEmpty: 'bg-emerald-100' },
  overstaffed:  { pill: 'bg-amber-50 text-amber-700 border-amber-200', dotFilled: 'bg-amber-500', dotEmpty: 'bg-amber-100' },
};

interface Props {
  instance: DutyInstance;
  dutyType: DutyType | undefined;
  assignedStaff: StaffMember[];
  locked?: boolean;
  onAssignClick: () => void;
  onUnassign: (staffId: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function DutyInstanceCard({
  instance,
  dutyType,
  assignedStaff,
  locked = false,
  onAssignClick,
  onUnassign,
  onDuplicate,
  onDelete,
}: Props) {
  const coverage = getCoverageStatus(instance);
  const styles = STATUS_STYLES[coverage.state];
  const accent = CATEGORY_ACCENT[dutyType?.category ?? 'other'];

  const dots = Array.from({ length: Math.max(coverage.required, coverage.assigned) }).map((_, i) => (
    <span
      key={i}
      className={`h-2 w-2 rounded-full ${i < coverage.assigned ? styles.dotFilled : styles.dotEmpty}`}
    />
  ));

  return (
    <div className={`flex flex-col gap-3 rounded-lg border border-l-4 ${accent} border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between`}>
      {/* Time + duty info */}
      <div className="flex items-start gap-4 sm:min-w-[220px]">
        <div className="font-mono text-sm leading-tight text-slate-500">
          <div className="font-semibold text-slate-900">{instance.startTime}</div>
          <div>{instance.endTime}</div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{dutyType?.name ?? 'Unknown duty'}</span>
            {instance.flightNumber && (
              <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white">
                {instance.flightNumber}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {instance.gate ? `Gate ${instance.gate}` : instance.notes ?? '\u00A0'}
          </div>
        </div>
      </div>

      {/* Coverage meter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">{dots}</div>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${styles.pill}`}>
          {coverage.assigned}/{coverage.required} staffed
        </span>
      </div>

      {/* Assigned staff chips */}
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        {assignedStaff.map((s) =>
          locked ? (
            <span
              key={s.id}
              className="flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2 text-xs text-slate-700"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] font-semibold text-white">
                {s.initials}
              </span>
              {s.name.split(' ')[0]}
            </span>
          ) : (
            <button
              key={s.id}
              onClick={() => onUnassign(s.id)}
              title={`Remove ${s.name}`}
              className="group flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2 text-xs text-slate-700 hover:bg-red-50 hover:text-red-700"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] font-semibold text-white group-hover:bg-red-600">
                {s.initials}
              </span>
              {s.name.split(' ')[0]}
              <span className="text-slate-400 group-hover:text-red-500">\u00d7</span>
            </button>
          )
        )}
        {!locked && (
          <button
            onClick={onAssignClick}
            className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-slate-900 hover:text-slate-900"
          >
            + Assign
          </button>
        )}
      </div>

      {/* Row actions */}
      {!locked && (
        <div className="flex items-center gap-1 self-start sm:self-center">
          <button
            onClick={onDuplicate}
            title="Duplicate this duty right after it ends"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            title="Delete duty"
            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}