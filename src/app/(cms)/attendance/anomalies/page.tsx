// src/app/(cms)/attendance/anomalies/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import dayjs from '@/lib/dayjs-setup';
import { attendanceApi } from '@/lib/cms/attendance';
import type { Anomaly, ResolveAction } from '@/types/attendance';
import PageHeader from '@/components/shared/PageHeader';
import Badge from '@/components/shared/Badge';
import AnomalyResolveModal from '@/components/attendance/AnomalyResolveModal';
import { toast } from 'react-hot-toast'; // matches your ToasterProvider

const TYPE_LABELS: Record<string, string> = {
  EXCESSIVE_SHIFT_DURATION: 'Excessive Shift Duration',
  UNCLOSED_SESSION_AUTO_CLOSED: 'Forgot to Clock Out',
  LATE: 'Late Clock-In',
  NO_AIRSIDE_CLEARANCE: 'No Airside Clearance',
};

// Must match Badge's supported color union exactly — 'orange'/'yellow' don't exist there
const TYPE_COLORS: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple'> = {
  EXCESSIVE_SHIFT_DURATION: 'red',
  UNCLOSED_SESSION_AUTO_CLOSED: 'amber',
  LATE: 'blue',
  NO_AIRSIDE_CLEARANCE: 'red',
};

const ACTION_LABELS: Record<string, string> = {
  approve_as_is: 'Approved as-is',
  correct_hours: 'Hours corrected',
  dismiss: 'Dismissed',
};

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | 'dismissed'>('open');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Anomaly | null>(null);

  const isReviewedTab = statusFilter !== 'open';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.listAnomalies({ status: statusFilter, per_page: 50 });
      setAnomalies(res.data);
    } catch (e) {
      toast.error('Failed to load anomalies');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleResolved = () => {
    setSelected(null);
    load();
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Attendance Anomalies"
        subtitle="Review and correct flagged clock-in/out sessions"
      />

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {(['open', 'resolved', 'dismissed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              statusFilter === s
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : anomalies.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No {statusFilter} anomalies.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Clock In</th>
                <th className="px-4 py-3">Clock Out</th>
                <th className="px-4 py-3">Hours</th>
                {isReviewedTab ? (
                  <>
                    <th className="px-4 py-3">Resolved At</th>
                    <th className="px-4 py-3">Notes</th>
                  </>
                ) : (
                  <th className="px-4 py-3"></th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {anomalies.map((a) => {
                const clockIn = a.punch_event;
                const clockOut = clockIn?.paired_event;
                const hours = clockOut
                  ? (dayjs(clockOut.punched_at).diff(dayjs(clockIn.punched_at), 'minute') / 60).toFixed(2)
                  : '—';

                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{a.user.name}</div>
                      <div className="text-xs text-gray-400">{a.user.employee_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        color={TYPE_COLORS[a.type] ?? 'gray'}
                        label={TYPE_LABELS[a.type] ?? a.type}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {dayjs(a.anomaly_date).format('D MMM YYYY')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {dayjs(clockIn.punched_at).format('HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {clockOut ? dayjs(clockOut.punched_at).format('HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{hours}h</td>
                    {isReviewedTab ? (
                      <>
                        <td className="px-4 py-3 text-gray-600">
                          {a.resolved_at ? dayjs(a.resolved_at).format('D MMM, HH:mm') : '—'}
                          {a.resolution_action && (
                            <div className="text-xs text-gray-400">
                              {ACTION_LABELS[a.resolution_action] ?? a.resolution_action}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs">
                          <span className="line-clamp-2" title={a.resolution_notes ?? ''}>
                            {a.resolution_notes ?? '—'}
                          </span>
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelected(a)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Review
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <AnomalyResolveModal
          anomaly={selected}
          onClose={() => setSelected(null)}
          onResolved={handleResolved}
        />
      )}
    </div>
  );
}