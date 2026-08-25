// src/components/roster/AddDutyModal.tsx
'use client';

import { useState } from 'react';
import { DUTY_TYPES } from '@/lib/cms/roster';

export interface NewDutyInput {
  dutyTypeId: string;
  startTime: string;
  durationMins: number;
  requiredStaff: number;
  repeatCount: number;
  gapMins: number;
  flightPrefix?: string;
  flightStartNumber?: number;
  gate?: string;
}

interface Props {
  date: string; // YYYY-MM-DD, for display only
  onCreate: (input: NewDutyInput) => void;
  onClose: () => void;
}

export default function AddDutyModal({ date, onCreate, onClose }: Props) {
  const [dutyTypeId, setDutyTypeId] = useState(DUTY_TYPES[0].id);
  const dutyType = DUTY_TYPES.find((d) => d.id === dutyTypeId)!;

  const [startTime, setStartTime] = useState('09:00');
  const [durationMins, setDurationMins] = useState(dutyType.defaultDurationMins);
  const [requiredStaff, setRequiredStaff] = useState(dutyType.defaultRequiredStaff);
  const [repeatCount, setRepeatCount] = useState(1);
  const [gapMins, setGapMins] = useState(0);
  const [flightPrefix, setFlightPrefix] = useState('');
  const [flightStartNumber, setFlightStartNumber] = useState<number | ''>('');
  const [gate, setGate] = useState('');

  const handleDutyTypeChange = (id: string) => {
    setDutyTypeId(id);
    const dt = DUTY_TYPES.find((d) => d.id === id)!;
    setDurationMins(dt.defaultDurationMins);
    setRequiredStaff(dt.defaultRequiredStaff);
  };

  const submit = () => {
    onCreate({
      dutyTypeId,
      startTime,
      durationMins,
      requiredStaff,
      repeatCount,
      gapMins,
      flightPrefix: flightPrefix || undefined,
      flightStartNumber: flightStartNumber === '' ? undefined : Number(flightStartNumber),
      gate: gate || undefined,
    });
  };

  // Quick preview of the generated slots, so the manager can see exactly what
  // "7 flights back to back" will produce before confirming.
  const preview = Array.from({ length: Math.min(repeatCount, 7) }).map((_, i) => {
    const [h, m] = startTime.split(':').map(Number);
    const startMin = h * 60 + m + i * (durationMins + gapMins);
    const endMin = startMin + durationMins;
    const fmt = (mins: number) => `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    const flight = flightPrefix && flightStartNumber !== '' ? `${flightPrefix}${Number(flightStartNumber) + i}` : null;
    return { time: `${fmt(startMin)}\u2013${fmt(endMin)}`, flight };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Add duty</h3>
          <p className="mt-0.5 text-xs text-slate-500">{date}</p>
        </div>

        <div className="space-y-4 p-4">
          {/* Duty type */}
          <Field label="Duty">
            <select
              value={dutyTypeId}
              onChange={(e) => handleDutyTypeChange(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
            >
              {DUTY_TYPES.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Start time">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
              />
            </Field>
            <Field label="Duration (min)">
              <input
                type="number"
                min={5}
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
              />
            </Field>
            <Field label="Staff required">
              <input
                type="number"
                min={1}
                value={requiredStaff}
                onChange={(e) => setRequiredStaff(Number(e.target.value))}
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
              />
            </Field>
          </div>

          <Field label="Gate (optional)">
            <input
              value={gate}
              onChange={(e) => setGate(e.target.value)}
              placeholder="A5"
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
            />
          </Field>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Back-to-back / repeating
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Number of flights/shifts">
                <input
                  type="number"
                  min={1}
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-900"
                />
              </Field>
              <Field label="Gap between (min)">
                <input
                  type="number"
                  min={0}
                  value={gapMins}
                  onChange={(e) => setGapMins(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-900"
                />
              </Field>
            </div>

            {repeatCount > 1 && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Flight prefix">
                  <input
                    value={flightPrefix}
                    onChange={(e) => setFlightPrefix(e.target.value.toUpperCase())}
                    placeholder="AI"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-900"
                  />
                </Field>
                <Field label="Starting flight no.">
                  <input
                    type="number"
                    value={flightStartNumber}
                    onChange={(e) => setFlightStartNumber(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="131"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-900"
                  />
                </Field>
              </div>
            )}

            {repeatCount > 1 && (
              <div className="mt-3 space-y-1 border-t border-slate-200 pt-3">
                <p className="text-[11px] font-medium text-slate-500">
                  Preview {repeatCount > 7 ? '(first 7 shown)' : ''}
                </p>
                {preview.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 font-mono text-xs text-slate-600">
                    <span>{p.time}</span>
                    {p.flight && <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white">{p.flight}</span>}
                    <span className="text-slate-400">\u00b7 needs {requiredStaff}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 p-4">
          <button onClick={onClose} className="flex-1 rounded-md border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={submit} className="flex-1 rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">
            {repeatCount > 1 ? `Create ${repeatCount} duties` : 'Create duty'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}