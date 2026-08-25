// src/components/attendance/AnomalyResolveModal.tsx
'use client';

import { useState } from 'react';
import dayjs from '@/lib/dayjs-setup';
import { attendanceApi } from '@/lib/cms/attendance';
import type { Anomaly, ResolveAction } from '@/types/attendance';
import { toast } from 'react-hot-toast';

interface Props {
  anomaly: Anomaly;
  onClose: () => void;
  onResolved: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  EXCESSIVE_SHIFT_DURATION: 'Excessive Shift Duration',
  UNCLOSED_SESSION_AUTO_CLOSED: 'Forgot to Clock Out',
  LATE: 'Late Clock-In',
  NO_AIRSIDE_CLEARANCE: 'No Airside Clearance',
};

type Choice = 'resolve' | 'correct' | 'dismiss';

const ACTION_MAP: Record<Choice, ResolveAction> = {
  resolve: 'approve_as_is',
  correct: 'correct_hours',
  dismiss: 'dismiss',
};

const CHOICE_LABELS: Record<Choice, string> = {
  resolve: 'Approve as-is',
  correct: 'Correct clock-out time',
  dismiss: 'Dismiss',
};

// datetime-local inputs need 'YYYY-MM-DDTHH:mm', not a full ISO string
const toLocalInputValue = (iso?: string | null) =>
  iso ? dayjs(iso).format('YYYY-MM-DDTHH:mm') : '';

export default function AnomalyResolveModal({ anomaly, onClose, onResolved }: Props) {
  const [choice, setChoice] = useState<Choice>('resolve');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clockIn = anomaly.punch_event;
  const clockOut = clockIn?.paired_event;

  // Pre-fill clock-in with the existing punch (usually correct); clock-out starts empty
  // so the manager has to deliberately enter the time they've confirmed with the employee.
  const [correctedIn, setCorrectedIn] = useState(toLocalInputValue(clockIn?.punched_at));
  const [correctedOut, setCorrectedOut] = useState(toLocalInputValue(clockOut?.punched_at));

  const handleSubmit = async () => {
    const trimmed = notes.trim();
    if (trimmed.length < 5) {
      setError('Notes must be at least 5 characters.');
      return;
    }

    if (choice === 'correct') {
      if (!correctedIn || !correctedOut) {
        setError('Both clock-in and clock-out times are required to correct hours.');
        return;
      }
      if (!dayjs(correctedOut).isAfter(dayjs(correctedIn))) {
        setError('Clock-out must be after clock-in.');
        return;
      }
    }

    setError(null);
    setSubmitting(true);
    try {
      await attendanceApi.resolveAnomaly(anomaly.id, {
        action: ACTION_MAP[choice],
        resolution_notes: trimmed,
        ...(choice === 'correct' && {
          corrected_clock_in: dayjs(correctedIn).toISOString(),
          corrected_clock_out: dayjs(correctedOut).toISOString(),
        }),
      });
      toast.success(
        choice === 'dismiss'
          ? 'Anomaly dismissed'
          : choice === 'correct'
          ? 'Hours corrected and anomaly resolved'
          : 'Anomaly resolved'
      );
      onResolved();
    } catch (e: any) {
      const status = e?.response?.status;
      const serverMsg = e?.response?.data?.message;
      const validationErrors = e?.response?.data?.errors;
      const msg =
        status === 422
          ? Object.values(validationErrors ?? {}).flat().join(' ') || 'Validation failed.'
          : serverMsg || 'Failed to resolve anomaly';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {TYPE_LABELS[anomaly.type] ?? anomaly.type}
          </h2>
          <p className="text-sm text-gray-500">
            {anomaly.user.name} · {anomaly.user.employee_id}
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
            {anomaly.description}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-400 text-xs uppercase">Recorded Clock In</div>
              <div className="text-gray-900">
                {clockIn ? dayjs(clockIn.punched_at).format('D MMM, HH:mm') : '—'}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs uppercase">Recorded Clock Out</div>
              <div className="text-gray-900">
                {clockOut ? dayjs(clockOut.punched_at).format('D MMM, HH:mm') : 'Not recorded'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ACTION_MAP) as Choice[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChoice(c)}
                  className={`px-2 py-2 rounded text-xs font-medium border transition-colors ${
                    choice === c
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {CHOICE_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {choice === 'correct' && (
            <div className="grid grid-cols-2 gap-3 bg-blue-50 border border-blue-100 rounded p-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Confirmed Clock In
                </label>
                <input
                  type="datetime-local"
                  value={correctedIn}
                  onChange={(e) => setCorrectedIn(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Confirmed Clock Out
                </label>
                <input
                  type="datetime-local"
                  value={correctedOut}
                  onChange={(e) => setCorrectedOut(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="col-span-2 text-xs text-gray-500">
                Confirm the actual time with the employee and/or operations before entering it here.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(min. 5 characters)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={
                choice === 'correct'
                  ? 'e.g. Staff confirmed they left the terminal at 19:42 but the app failed to register the clock-out — verbally confirmed with ops supervisor.'
                  : 'Explain what happened and how this was resolved…'
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}