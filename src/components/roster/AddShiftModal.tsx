'use client';
import { useState, useEffect } from 'react';
import { rosterApi } from '@/lib/cms-api';
import { staffCmsApi } from '@/lib/cms-api';
import { operationsApi } from '@/lib/cms-api';
import Modal from '@/components/shared/Modal';
import toast from 'react-hot-toast';
 
export default function AddShiftModal({
  weekId, onClose, onComplete,
}: {
  weekId: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [staff,     setStaff]     = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [form, setForm] = useState({
    user_id:               '',
    work_date:             '',
    operation_position_id: '',
    scheduled_start:       '09:00',
    scheduled_end:         '17:00',
    duty_mode:             'landside',
    shift_type:            'morning',
    notes:                 '',
  });
 
  useEffect(() => {
    Promise.all([
      staffCmsApi.list(),
      operationsApi.positions(),
    ]).then(([s, p]) => {
      setStaff(s.data.data ?? []);
      setPositions(p.data.positions ?? []);
    });
  }, []);
 
  // Auto-fill times when position selected
  const handlePositionChange = (posId: string) => {
    const pos = positions.find(p => p.id === posId);
    setForm(f => ({
      ...f,
      operation_position_id: posId,
      scheduled_start: pos?.start_time?.slice(0,5) ?? f.scheduled_start,
      scheduled_end:   pos?.end_time?.slice(0,5)   ?? f.scheduled_end,
      duty_mode:       pos?.zone?.is_airside ? 'airside' : 'landside',
    }));
  };
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await rosterApi.addEntry(weekId, form);
      toast.success('Shift added');
      onComplete();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? err?.response?.data?.message ?? 'Failed to add shift');
    } finally {
      setSaving(false);
    }
  };
 
  return (
    <Modal open title="Add Shift" onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Staff Member</label>
          <select
            required
            value={form.user_id}
            onChange={e => setForm(f => ({...f, user_id: e.target.value}))}
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select staff...</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.employee_id}) — {s.job_role?.replace(/_/g,' ')}
              </option>
            ))}
          </select>
        </div>
 
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Work Date</label>
          <input
            type="date"
            required
            value={form.work_date}
            onChange={e => setForm(f => ({...f, work_date: e.target.value}))}
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
 
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Operation Position</label>
          <select
            value={form.operation_position_id}
            onChange={e => handlePositionChange(e.target.value)}
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No position (manual shift)</option>
            {positions.map(p => (
              <option key={p.id} value={p.id}>
                {p.airline_contract?.airline?.iata_code} — {p.position_name}
              </option>
            ))}
          </select>
        </div>
 
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Start Time</label>
            <input
              type="time"
              required
              value={form.scheduled_start}
              onChange={e => setForm(f => ({...f, scheduled_start: e.target.value}))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">End Time</label>
            <input
              type="time"
              required
              value={form.scheduled_end}
              onChange={e => setForm(f => ({...f, scheduled_end: e.target.value}))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
 
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Shift Type</label>
            <select
              value={form.shift_type}
              onChange={e => setForm(f => ({...f, shift_type: e.target.value}))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="morning">Morning</option>
              <option value="late">Late</option>
              <option value="night">Night</option>
              <option value="split_morning">Split (AM)</option>
              <option value="split_evening">Split (PM)</option>
              <option value="standard">Standard</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Duty Mode</label>
            <select
              value={form.duty_mode}
              onChange={e => setForm(f => ({...f, duty_mode: e.target.value}))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="landside">Landside</option>
              <option value="airside">Airside</option>
            </select>
          </div>
        </div>
 
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Notes (optional)</label>
          <input
            type="text"
            value={form.notes}
            onChange={e => setForm(f => ({...f, notes: e.target.value}))}
            placeholder="Any additional notes..."
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
 
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Adding...' : 'Add Shift'}
          </button>
        </div>
      </form>
    </Modal>
  );
}