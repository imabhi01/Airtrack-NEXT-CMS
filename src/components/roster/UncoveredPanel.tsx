'use client';
import { useEffect, useState } from 'react';
import { rosterApi, entriesApi } from '@/lib/cms-api';
import toast from 'react-hot-toast';
import { AlertTriangle, UserPlus } from 'lucide-react';
 
export default function UncoveredPanel({
  weekId, selectedDate, onAssign, readOnly,
}: {
  weekId: string;
  selectedDate: string | null;
  onAssign: () => void;
  readOnly: boolean;
}) {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
 
  useEffect(() => {
    if (!selectedDate || !weekId) { setData(null); return; }
    setLoading(true);
    rosterApi.uncovered(weekId, selectedDate)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [selectedDate, weekId]);
 
  const handleAssign = async (staffId: string, position: any) => {
    setAssigning(staffId);
    try {
      await rosterApi.addEntry(weekId, {
        user_id:               staffId,
        work_date:             selectedDate,
        scheduled_start:       position.operationPosition?.start_time ?? '09:00',
        scheduled_end:         position.operationPosition?.end_time   ?? '17:00',
        duty_mode:             position.operationPosition?.zone?.is_airside ? 'airside' : 'landside',
        shift_type:            'standard',
        operation_position_id: position.operation_position_id,
        terminal_id:           position.operationPosition?.terminal_id,
      });
      toast.success('Staff assigned');
      onAssign();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Assignment failed');
    } finally {
      setAssigning(null);
    }
  };
 
  if (!selectedDate) {
    return (
      <div className="w-64 border-l bg-gray-50 flex items-center justify-center p-4">
        <p className="text-center text-gray-400 text-xs">
          Click a date column to see uncovered positions
        </p>
      </div>
    );
  }
 
  return (
    <div className="w-64 border-l bg-white flex flex-col shrink-0">
      <div className="px-4 py-3 border-b bg-gray-50">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
          {selectedDate}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">Uncovered positions & available staff</p>
      </div>
 
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? null : (
        <div className="flex-1 overflow-y-auto">
 
          {/* Uncovered positions */}
          {data.uncovered?.length > 0 && (
            <div className="p-3 border-b">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                <AlertTriangle size={10} /> {data.uncovered.length} UNCOVERED
              </p>
              {data.uncovered.map((c: any) => (
                <div key={c.id} className="mb-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-[11px] font-semibold text-gray-800 truncate">
                    {c.operation_position?.position_name}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {c.operation_position?.operation_type?.name} · Gap: {c.required_staff - c.assigned_staff} staff
                  </p>
                </div>
              ))}
            </div>
          )}
 
          {/* Available staff */}
          {data.available_staff?.length > 0 && (
            <div className="p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                {data.available_staff.length} Available
              </p>
              {data.available_staff.map((s: any) => (
                <div
                  key={s.id}
                  className="mb-1.5 p-2 border rounded-lg flex items-center gap-2 hover:border-blue-300 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-blue-600 text-[10px] font-bold">
                      {s.name?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-800 truncate">{s.name}</p>
                    <p className="text-[9px] text-gray-400 truncate">
                      {s.job_role?.replace(/_/g,' ')} · {(s.preferences ?? []).join(', ')}
                    </p>
                  </div>
                  {!readOnly && data.uncovered?.[0] && (
                    <button
                      onClick={() => handleAssign(s.id, data.uncovered[0])}
                      disabled={assigning === s.id}
                      className="shrink-0 p-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      <UserPlus size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
 
          {data.uncovered?.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-green-600 text-xs font-medium">✓ All positions covered</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
 