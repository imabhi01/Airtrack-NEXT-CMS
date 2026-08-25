'use client';
import { useEffect, useState } from 'react';
import { staffCmsApi } from '@/lib/cms-api';
import PageHeader from '@/components/shared/PageHeader';
import Badge from '@/components/shared/Badge';
import Modal from '@/components/shared/Modal';
import toast from 'react-hot-toast';
import { Search, ChevronDown, Edit2, Calendar, Clock } from 'lucide-react';
import dayjs from '@/lib/dayjs-setup';
 
const SHIFT_TYPES = ['morning','late','night','any'];
const JOB_ROLES   = [
  'security_agent','passenger_service_agent','customer_service_agent',
  'check_in_agent','baggage_handler','manager','director','other',
];
 
export default function StaffPage() {
  const [staff,     setStaff]     = useState<any[]>([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<any | null>(null);
  const [availModal,setAvailModal]= useState(false);
 
  useEffect(() => {
    staffCmsApi.list().then(r => {
      setStaff(r.data.data ?? []);
    }).finally(() => setLoading(false));
  }, []);
 
  const filtered = staff.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    s.job_role?.toLowerCase().includes(search.toLowerCase())
  );
 
  const contractColor: Record<string, any> = {
    full_time: 'green',
    part_time: 'blue',
    agency:    'amber',
  };
 
  return (
    <div>
      <PageHeader
        title="Staff Management"
        subtitle={`${staff.length} active staff members`}
      />
 
      <div className="p-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, employee ID or role..."
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
 
        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Staff</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contract</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Terminal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Preferences</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No staff found</td></tr>
              )}
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-blue-600 text-xs font-bold">{s.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.employee_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {s.job_role?.replace(/_/g,' ')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={s.contract_type?.replace('_',' ') ?? '—'}
                      color={contractColor[s.contract_type] ?? 'gray'}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {s.terminal?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(s.availability?.preferred_shift_types ?? ['—']).map((t: string) => (
                        <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setSelected(s); setAvailModal(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                    >
                      <Edit2 size={12} /> Availability
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
 
      {availModal && selected && (
        <AvailabilityModal
          staff={selected}
          onClose={() => { setAvailModal(false); setSelected(null); }}
          onSave={() => {
            staffCmsApi.list().then(r => setStaff(r.data.data ?? []));
            setAvailModal(false);
          }}
        />
      )}
    </div>
  );
}
 
function AvailabilityModal({ staff, onClose, onSave }: any) {
  const [form, setForm] = useState({
    preferred_shift_types: [] as string[],
    preferred_days:        null as number[] | null,
    unavailable_days:      [] as number[],
    max_hours_per_week:    40,
    min_hours_per_week:    0,
    accepts_split_shifts:  false,
    notes:                 '',
  });
  const [saving, setSaving] = useState(false);
 
  useEffect(() => {
    staffCmsApi.getAvailability(staff.id).then(r => {
      const a = r.data.availability;
      if (a) setForm({
        preferred_shift_types: a.preferred_shift_types ?? [],
        preferred_days:        a.preferred_days,
        unavailable_days:      a.unavailable_days ?? [],
        max_hours_per_week:    a.max_hours_per_week ?? 40,
        min_hours_per_week:    a.min_hours_per_week ?? 0,
        accepts_split_shifts:  a.accepts_split_shifts ?? false,
        notes:                 a.notes ?? '',
      });
    });
  }, [staff.id]);
 
  const toggleShiftType = (type: string) => {
    setForm(f => ({
      ...f,
      preferred_shift_types: f.preferred_shift_types.includes(type)
        ? f.preferred_shift_types.filter(t => t !== type)
        : [...f.preferred_shift_types, type],
    }));
  };
 
  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      unavailable_days: f.unavailable_days.includes(day)
        ? f.unavailable_days.filter(d => d !== day)
        : [...f.unavailable_days, day],
    }));
  };
 
  const handleSave = async () => {
    if (form.preferred_shift_types.length === 0) {
      toast.error('Please select at least one preferred shift type');
      return;
    }
    setSaving(true);
    try {
      await staffCmsApi.saveAvailability(staff.id, form);
      toast.success('Availability saved');
      onSave();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };
 
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 
  return (
    <Modal open title={`Availability — ${staff.name}`} onClose={onClose} size="lg">
      <div className="space-y-5">
 
        {/* Preferred shift types */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Preferred Shift Types
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Select which shift types this staff member prefers. The roster engine will
            respect these preferences when generating rosters.
          </p>
          <div className="flex gap-2 flex-wrap">
            {SHIFT_TYPES.map(t => (
              <button
                key={t}
                onClick={() => toggleShiftType(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all capitalize
                  ${form.preferred_shift_types.includes(t)
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
              >
                {t === 'any' ? '✓ Any shift' : t}
              </button>
            ))}
          </div>
        </div>
 
        {/* Unavailable days */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Recurring Unavailable Days
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Days this staff member cannot work (e.g. university days, childcare days).
          </p>
          <div className="flex gap-2">
            {days.map((d, i) => {
              const dayNum = i + 1;
              const blocked = form.unavailable_days.includes(dayNum);
              return (
                <button
                  key={d}
                  onClick={() => toggleDay(dayNum)}
                  className={`w-10 h-10 rounded-lg text-xs font-bold border-2 transition-all
                    ${blocked
                      ? 'bg-red-500 text-white border-red-500'
                      : 'border-gray-200 text-gray-600 hover:border-red-300'
                    }`}
                >
                  {d.slice(0,2)}
                </button>
              );
            })}
          </div>
        </div>
 
        {/* Hours */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Max Hours / Week
            </label>
            <input
              type="number"
              value={form.max_hours_per_week}
              onChange={e => setForm(f => ({...f, max_hours_per_week: +e.target.value}))}
              min={1} max={60}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Min Hours / Week
            </label>
            <input
              type="number"
              value={form.min_hours_per_week}
              onChange={e => setForm(f => ({...f, min_hours_per_week: +e.target.value}))}
              min={0} max={60}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
 
        {/* Split shifts */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setForm(f => ({...f, accepts_split_shifts: !f.accepts_split_shifts}))}
            className={`w-11 h-6 rounded-full transition-colors relative
              ${form.accepts_split_shifts ? 'bg-blue-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all
              ${form.accepts_split_shifts ? 'left-5' : 'left-0.5'}`} />
          </button>
          <div>
            <p className="text-sm font-semibold text-gray-800">Accepts Split Shifts</p>
            <p className="text-xs text-gray-400">
              Comes in morning, goes home, returns in the evening
            </p>
          </div>
        </div>
 
        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({...f, notes: e.target.value}))}
            rows={2}
            placeholder="e.g. University Mondays until 3pm, childcare Wednesdays..."
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
 
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>
    </Modal>
  );
}