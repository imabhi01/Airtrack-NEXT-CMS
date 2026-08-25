'use client';
// FILE: src/app/(cms)/staff/page.tsx
// Staff directory with search, filter, view, edit, deactivate
// Refactored to call the shared staff service (src/lib/cms/staff.ts) instead of
// hitting `api` directly.

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/shared/PageHeader';
import Modal from '@/components/shared/Modal';
import toast from 'react-hot-toast';
import {
  Search, UserPlus, Edit2, UserX, UserCheck,
  Phone, Mail, MapPin, Shield, Calendar,
  ChevronDown, Filter, RefreshCw, Eye,
  Clock, Plane, MoreVertical,
} from 'lucide-react';
import {
  listStaff, listTerminals, updateStaff, deactivateStaff, reactivateStaff,
  apiErrorMessage,
  type Staff, type Terminal, type StaffFormFields,
} from '@/lib/cms/staff';

// ── Config ────────────────────────────────────────────────────────────────────

const JOB_ROLES = [
  { value: 'security_agent',          label: 'Security Agent'          },
  { value: 'passenger_service_agent', label: 'Passenger Service Agent' },
  { value: 'customer_service_agent',  label: 'Customer Service Agent'  },
  { value: 'check_in_agent',          label: 'Check-in Agent'          },
  { value: 'baggage_handler',         label: 'Baggage Handler'         },
  { value: 'team_leader',             label: 'Team Leader'             },
  { value: 'manager',                 label: 'Manager'                 },
  { value: 'director',                label: 'Director'                },
];

const CONTRACT_TYPES = ['full_time', 'part_time', 'agency', 'contractor'];

const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [staff,       setStaff]       = useState<Staff[]>([]);
  const [terminals,   setTerminals]   = useState<Terminal[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterRole,  setFilterRole]  = useState('');
  const [filterTerm,  setFilterTerm]  = useState('');
  const [filterActive,setFilterActive]= useState('true');
  const [viewStaff,   setViewStaff]   = useState<Staff | null>(null);
  const [editStaff,   setEditStaff]   = useState<Staff | null>(null);
  const [openMenuId,  setOpenMenuId]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffData, terminalData] = await Promise.all([
        listStaff({
          is_active:   filterActive,
          job_role:    filterRole,
          terminal_id: filterTerm,
          search,
        }),
        listTerminals(),
      ]);
      setStaff(staffData);
      setTerminals(terminalData);
    } catch {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, filterTerm, filterActive]);

  useEffect(() => { load(); }, [load]);

  const handleDeactivate = async (member: Staff) => {
    if (!confirm(`Deactivate ${member.name}? They will lose access to the system.`)) return;
    try {
      await deactivateStaff(member.id);
      toast.success(`${member.name} deactivated`);
      load();
    } catch { toast.error('Failed to deactivate'); }
  };

  const handleReactivate = async (member: Staff) => {
    try {
      await reactivateStaff(member.id);
      toast.success(`${member.name} reactivated`);
      load();
    } catch { toast.error('Failed'); }
  };

  const activeCount   = staff.filter(s => s.is_active).length;
  const airsideCount  = staff.filter(s => s.has_airside_access).length;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Staff Directory"
        subtitle={`${activeCount} active staff · ${airsideCount} with airside access`}
        actions={
          <Link
            href="/staff/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
              rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
          >
            <UserPlus size={15} /> Add New Staff
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, ID, email..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl
              text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Roles</option>
          {JOB_ROLES.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Terminals</option>
          {terminals.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
          ))}
        </select>

        <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="true">Active Staff</option>
          <option value="false">Inactive</option>
          <option value="">All</option>
        </select>

        <button onClick={load}
          className="w-9 h-9 flex items-center justify-center border border-slate-200
            rounded-xl text-slate-500 hover:bg-slate-50 transition-colors">
          <RefreshCw size={14} />
        </button>

        <span className="text-xs text-slate-400 ml-auto font-semibold">
          {staff.length} staff
        </span>
      </div>

      {/* Staff grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <UserPlus size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold text-lg">No staff found</p>
            <p className="text-sm mt-1">Add your first staff member to get started</p>
            <Link href="/staff/create"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600
                text-white rounded-xl text-sm font-bold hover:bg-blue-700">
              <UserPlus size={15} /> Add Staff Member
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {staff.map(member => (
              <StaffCard
                key={member.id}
                member={member}
                menuOpen={openMenuId === member.id}
                onMenuToggle={() => setOpenMenuId(
                  openMenuId === member.id ? null : member.id
                )}
                onView={() => { setViewStaff(member); setOpenMenuId(null); }}
                onEdit={() => { setEditStaff(member); setOpenMenuId(null); }}
                onDeactivate={() => { handleDeactivate(member); setOpenMenuId(null); }}
                onReactivate={() => { handleReactivate(member); setOpenMenuId(null); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* View modal */}
      {viewStaff && (
        <ViewStaffModal
          staff={viewStaff}
          onClose={() => setViewStaff(null)}
          onEdit={() => { setEditStaff(viewStaff); setViewStaff(null); }}
        />
      )}

      {/* Edit modal */}
      {editStaff && (
        <EditStaffModal
          staff={editStaff}
          terminals={terminals}
          onClose={() => setEditStaff(null)}
          onSaved={() => { setEditStaff(null); load(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF CARD
// ─────────────────────────────────────────────────────────────────────────────

function StaffCard({
  member, menuOpen, onMenuToggle, onView, onEdit, onDeactivate, onReactivate,
}: {
  member:        Staff;
  menuOpen:      boolean;
  onMenuToggle:  () => void;
  onView:        () => void;
  onEdit:        () => void;
  onDeactivate:  () => void;
  onReactivate:  () => void;
}) {
  const role = JOB_ROLES.find(r => r.value === member.job_role)?.label
    ?? member.job_role?.replace(/_/g,' ') ?? '—';

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden
      hover:shadow-md transition-shadow
      ${!member.is_active ? 'opacity-60' : ''}`}>

      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500
          to-blue-700 flex items-center justify-center text-white font-black
          text-lg shrink-0">
          {member.name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 truncate">{member.name}</p>
          <p className="text-xs text-slate-400">{member.employee_id}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5
              rounded-full font-semibold">
              {role}
            </span>
            {member.has_airside_access && (
              <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5
                rounded-full font-semibold flex items-center gap-0.5">
                <Plane size={8} /> Airside
              </span>
            )}
            {!member.is_active && (
              <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5
                rounded-full font-semibold">
                Inactive
              </span>
            )}
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={onMenuToggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg
              hover:bg-slate-100 transition-colors text-slate-400"
          >
            <MoreVertical size={15} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl
              shadow-xl border border-slate-200 overflow-hidden z-30">
              <button onClick={onView}
                className="flex items-center gap-2 px-3 py-2.5 w-full text-xs
                  text-slate-700 hover:bg-slate-50">
                <Eye size={13} /> View Profile
              </button>
              <button onClick={onEdit}
                className="flex items-center gap-2 px-3 py-2.5 w-full text-xs
                  text-slate-700 hover:bg-slate-50">
                <Edit2 size={13} /> Edit Details
              </button>
              <div className="border-t border-slate-100" />
              {member.is_active ? (
                <button onClick={onDeactivate}
                  className="flex items-center gap-2 px-3 py-2.5 w-full text-xs
                    text-red-600 hover:bg-red-50">
                  <UserX size={13} /> Deactivate
                </button>
              ) : (
                <button onClick={onReactivate}
                  className="flex items-center gap-2 px-3 py-2.5 w-full text-xs
                    text-green-600 hover:bg-green-50">
                  <UserCheck size={13} /> Reactivate
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-3 space-y-2">
        {member.terminal && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin size={12} className="text-slate-400 shrink-0" />
            <span>{member.terminal.name} ({member.terminal.code})</span>
          </div>
        )}
        {member.email && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Mail size={12} className="text-slate-400 shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
        )}
        {member.phone && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Phone size={12} className="text-slate-400 shrink-0" />
            <span>{member.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock size={12} className="text-slate-400 shrink-0" />
          <span className="capitalize">
            {member.contract_type?.replace('_',' ')}
            {member.availability
              ? ` · max ${member.availability.max_hours_per_week}h/wk`
              : ''}
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 py-2.5 border-t border-slate-100 flex gap-2">
        <button onClick={onView}
          className="flex-1 py-1.5 text-xs font-bold text-slate-600 rounded-lg
            hover:bg-slate-100 transition-colors">
          View
        </button>
        <button onClick={onEdit}
          className="flex-1 py-1.5 text-xs font-bold text-blue-600 rounded-lg
            hover:bg-blue-50 transition-colors">
          Edit
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW STAFF MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ViewStaffModal({
  staff, onClose, onEdit,
}: {
  staff:   Staff;
  onClose: () => void;
  onEdit:  () => void;
}) {
  const role = JOB_ROLES.find(r => r.value === staff.job_role)?.label
    ?? staff.job_role?.replace(/_/g,' ') ?? '—';

  return (
    <Modal open title={staff.name} onClose={onClose} size="md">
      <div className="space-y-4">

        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500
            to-blue-700 flex items-center justify-center text-white font-black
            text-2xl shrink-0">
            {staff.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-lg">{staff.name}</p>
            <p className="text-sm text-slate-500">{staff.employee_id}</p>
            <p className="text-sm text-slate-500">{role}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Email',          value: staff.email             },
            { label: 'Phone',          value: staff.phone ?? '—'      },
            { label: 'Contract',       value: staff.contract_type?.replace('_',' ') },
            { label: 'Terminal',       value: staff.terminal?.name ?? '—' },
            { label: 'Blue ID',        value: staff.blue_id_number ?? '—' },
            { label: 'Blue ID Expiry', value: staff.blue_id_expiry ?? '—' },
            { label: 'Airside Access', value: staff.has_airside_access ? 'Yes ✓' : 'No' },
            { label: 'Cargo Pass',     value: staff.has_cargo_pass    ? 'Yes ✓' : 'No' },
            { label: 'Joined',         value: staff.joined_date ?? '—' },
            { label: 'Status',         value: staff.is_active         ? 'Active' : 'Inactive' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {staff.availability && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs font-bold text-blue-700 mb-2">Availability</p>
            <div className="flex gap-4 text-xs text-blue-600">
              <span>Shifts: {staff.availability.preferred_shift_types.join(', ')}</span>
              <span>Max: {staff.availability.max_hours_per_week}h/week</span>
            </div>
            {staff.availability.unavailable_days.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                Off: {staff.availability.unavailable_days.map(d => DAY_NAMES[d-1]).join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold
              text-slate-600 hover:bg-slate-50">
            Close
          </button>
          <button onClick={onEdit}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl
              text-sm font-bold hover:bg-blue-700">
            Edit Staff
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT STAFF MODAL
// ─────────────────────────────────────────────────────────────────────────────

function EditStaffModal({
  staff, terminals, onClose, onSaved,
}: {
  staff:     Staff;
  terminals: Terminal[];
  onClose:   () => void;
  onSaved:   () => void;
}) {
  
  const formatDateForInput = (date?: string | null) => {
    if (!date) return '';

    return date.split('T')[0];
  };

  const [form, setForm] = useState<StaffFormFields>({
    name:               staff.name,
    email:              staff.email,
    phone:              staff.phone              ?? '',
    job_role:           staff.job_role,
    contract_type:      staff.contract_type,
    terminal_id:        staff.terminal?.id       ?? '',
    has_airside_access: staff.has_airside_access,
    has_cargo_pass:     staff.has_cargo_pass,
    blue_id_number:     staff.blue_id_number     ?? '',
    blue_id_expiry:     formatDateForInput(
      staff.blue_id_expiry
    ),
    joined_date:        formatDateForInput(
      staff.joined_date
    ),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateStaff(staff.id, form);
      toast.success('Staff updated');
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={`Edit — ${staff.name}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name *">
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              className={INPUT_CLS} />
          </Field>
          <Field label="Email *">
            <input type="email" value={form.email}
              onChange={e => setForm(f => ({...f, email: e.target.value}))}
              className={INPUT_CLS} />
          </Field>
          <Field label="Phone">
            <input value={form.phone ?? ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
              className={INPUT_CLS} placeholder="+44 7700 000000" />
          </Field>
          <Field label="Job Role *">
            <select value={form.job_role} onChange={e => setForm(f => ({...f, job_role: e.target.value}))}
              className={INPUT_CLS}>
              {JOB_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Contract Type">
            <select value={form.contract_type} onChange={e => setForm(f => ({...f, contract_type: e.target.value}))}
              className={INPUT_CLS}>
              {CONTRACT_TYPES.map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
            </select>
          </Field>
          <Field label="Terminal">
            <select value={form.terminal_id ?? ''} onChange={e => setForm(f => ({...f, terminal_id: e.target.value}))}
              className={INPUT_CLS}>
              <option value="">No terminal</option>
              {terminals.map(t => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
            </select>
          </Field>
          <Field label="Blue ID Number">
            <input value={form.blue_id_number ?? ''}
              onChange={e => setForm(f => ({...f, blue_id_number: e.target.value}))}
              className={INPUT_CLS} placeholder="BID-00000" />
          </Field>
          <Field label="Blue ID Expiry">
            <input type="date" value={form.blue_id_expiry ?? ''}
              onChange={e => setForm(f => ({...f, blue_id_expiry: e.target.value}))}
              className={INPUT_CLS} />
          </Field>
          <Field label="Joined Date">
            <input type="date" value={form.joined_date ?? ''}
              onChange={e => setForm(f => ({...f, joined_date: e.target.value}))}
              className={INPUT_CLS} />
          </Field>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'has_airside_access' as const, label: 'Airside Access (Blue ID)',  color: 'amber' },
            { key: 'has_cargo_pass'     as const, label: 'Cargo Security Pass',       color: 'purple'},
          ].map(({ key, label, color }) => (
            <div key={key}
              onClick={() => setForm(f => ({...f, [key]: !f[key]}))}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer
                transition-all
                ${form[key]
                  ? color === 'amber'
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-purple-400 bg-purple-50'
                  : 'border-slate-200 hover:border-slate-300'}`}
            >
              <button className={`w-10 h-5 rounded-full relative shrink-0 transition-colors
                ${form[key]
                  ? color === 'amber' ? 'bg-amber-500' : 'bg-purple-500'
                  : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow
                  transition-all ${form[key] ? 'left-5' : 'left-0.5'}`} />
              </button>
              <p className="text-xs font-bold text-slate-700">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold
              text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm
              font-bold hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Reusable field wrapper ────────────────────────────────────────────────────

const INPUT_CLS = `w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
  focus:outline-none focus:ring-2 focus:ring-blue-500`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase
        tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}