'use client';
import { useEffect, useState } from 'react';
import { operationsApi, airlinesApi } from '@/lib/cms-api';
import PageHeader from '@/components/shared/PageHeader';
import Modal from '@/components/shared/Modal';
import Badge from '@/components/shared/Badge';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, Shield, Plane, Users,
  ChevronDown, ChevronUp, Clock, MapPin, Search,
} from 'lucide-react';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OperationType {
  id:                      string;
  name:                    string;
  code:                    string;
  description:             string | null;
  color:                   string;
  icon:                    string | null;
  default_min_staff:       number;
  default_max_staff:       number;
  eligible_job_roles:      string[];
  requires_airside_access: boolean;
  is_active:               boolean;
  positions_count?:        number;
}

interface OperationPosition {
  id:                   string;
  position_name:        string;
  gate_number:          string | null;
  min_staff_required:   number;
  max_staff_required:   number;
  start_time:           string;
  end_time:             string;
  days_of_week:         number[];
  is_active:            boolean;
  airline_contract?:    { id: string; airline: { name: string; iata_code: string; color: string } };
  operation_type?:      { id: string; name: string; color: string };
  terminal?:            { id: string; name: string; code: string };
  zone?:                { id: string; name: string; code: string } | null;
}

const JOB_ROLES = [
  { value: 'security_agent',           label: 'Security Agent' },
  { value: 'passenger_service_agent',  label: 'Passenger Service Agent' },
  { value: 'customer_service_agent',   label: 'Customer Service Agent' },
  { value: 'check_in_agent',           label: 'Check-in Agent' },
  { value: 'baggage_handler',          label: 'Baggage Handler' },
  { value: 'manager',                  label: 'Manager' },
  { value: 'director',                 label: 'Director' },
];

const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function OperationsPage() {
  const [tab, setTab] = useState<'types' | 'positions'>('types');

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Operations"
        subtitle="Manage operation types and airline position assignments"
      />

      {/* Tab bar */}
      <div className="flex border-b bg-white px-6">
        {[
          { key: 'types',     label: 'Operation Types', icon: Shield },
          { key: 'positions', label: 'Positions',        icon: MapPin  },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors
              ${tab === key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'types'     && <OperationTypesTab />}
        {tab === 'positions' && <OperationPositionsTab />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATION TYPES TAB
// ─────────────────────────────────────────────────────────────────────────────

function OperationTypesTab() {
  const [types,   setTypes]   = useState<OperationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<OperationType | null>(null);

  const load = () => {
    operationsApi.types().then(r => {
      setTypes(r.data.types ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (type: OperationType) => {
    if (!confirm(`Deactivate "${type.name}"? Existing positions will be unaffected.`)) return;
    try {
      await operationsApi.updateType(type.id, { is_active: false });
      toast.success('Operation type deactivated');
      load();
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{types.length} operation types</p>
        <button
          onClick={() => { setEditing(null); setModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          <Plus size={15} /> New Type
        </button>
      </div>

      {loading && <p className="text-center text-gray-400 py-10">Loading...</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {types.map(type => (
          <div
            key={type.id}
            className="bg-white rounded-xl border overflow-hidden hover:shadow-sm transition-shadow"
          >
            {/* Colour bar */}
            <div className="h-1.5" style={{ backgroundColor: type.color }} />

            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: type.color + '18' }}
                  >
                    <Shield size={18} style={{ color: type.color }} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{type.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{type.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setEditing(type); setModal(true); }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-blue-600"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(type)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-500 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {type.description && (
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">{type.description}</p>
              )}

              {/* Staffing */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Users size={13} />
                  <span>{type.default_min_staff}–{type.default_max_staff} staff</span>
                </div>
                {type.requires_airside_access && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                    ✈ Airside required
                  </span>
                )}
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {type.positions_count ?? 0} positions
                </span>
              </div>

              {/* Eligible roles */}
              <div className="flex flex-wrap gap-1.5">
                {(type.eligible_job_roles ?? []).map(role => (
                  <span
                    key={role}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-200 text-gray-600"
                  >
                    {role.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <OperationTypeModal
          editing={editing}
          onClose={() => { setModal(false); setEditing(null); }}
          onSave={() => { setModal(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATION TYPE MODAL (create + edit)
// ─────────────────────────────────────────────────────────────────────────────

function OperationTypeModal({
  editing,
  onClose,
  onSave,
}: {
  editing: OperationType | null;
  onClose: () => void;
  onSave:  () => void;
}) {
  const [form, setForm] = useState({
    name:                    editing?.name                    ?? '',
    code:                    editing?.code                    ?? '',
    description:             editing?.description             ?? '',
    color:                   editing?.color                   ?? '#3B8BD4',
    default_min_staff:       editing?.default_min_staff       ?? 3,
    default_max_staff:       editing?.default_max_staff       ?? 7,
    eligible_job_roles:      editing?.eligible_job_roles      ?? [] as string[],
    requires_airside_access: editing?.requires_airside_access ?? false,
  });
  const [saving, setSaving] = useState(false);

  const toggleRole = (role: string) => {
    setForm(f => ({
      ...f,
      eligible_job_roles: f.eligible_job_roles.includes(role)
        ? f.eligible_job_roles.filter(r => r !== role)
        : [...f.eligible_job_roles, role],
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.code) {
      toast.error('Name and code are required');
      return;
    }
    if (form.eligible_job_roles.length === 0) {
      toast.error('Select at least one eligible job role');
      return;
    }
    if (form.default_min_staff > form.default_max_staff) {
      toast.error('Min staff cannot exceed max staff');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await operationsApi.updateType(editing.id, form);
        toast.success('Operation type updated');
      } else {
        await operationsApi.createType(form);
        toast.success('Operation type created');
      }
      onSave();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={editing ? `Edit — ${editing.name}` : 'New Operation Type'}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-5">

        {/* Name and code */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Operation Name *
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Access Control"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Code * (unique identifier)
            </label>
            <input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '_') }))}
              placeholder="ACCESS_CONTROL"
              disabled={!!editing}
              className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {editing && <p className="text-xs text-gray-400 mt-1">Code cannot be changed after creation</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            placeholder="Describe what this operation involves..."
            className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Staffing numbers */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Min Staff *
            </label>
            <input
              type="number"
              value={form.default_min_staff}
              onChange={e => setForm(f => ({ ...f, default_min_staff: +e.target.value }))}
              min={1} max={50}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Max Staff *
            </label>
            <input
              type="number"
              value={form.default_max_staff}
              onChange={e => setForm(f => ({ ...f, default_max_staff: +e.target.value }))}
              min={1} max={50}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Brand Colour
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-10 h-10 rounded-lg border cursor-pointer"
              />
              <span className="text-sm text-gray-500 font-mono">{form.color}</span>
            </div>
          </div>
        </div>

        {/* Airside toggle */}
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <button
            onClick={() => setForm(f => ({ ...f, requires_airside_access: !f.requires_airside_access }))}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0
              ${form.requires_airside_access ? 'bg-amber-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all
              ${form.requires_airside_access ? 'left-5' : 'left-0.5'}`}
            />
          </button>
          <div>
            <p className="text-sm font-semibold text-gray-800">Requires Airside Access</p>
            <p className="text-xs text-gray-500">
              Only staff with a valid Blue ID badge can be assigned to this operation
            </p>
          </div>
        </div>

        {/* Eligible job roles */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            Eligible Job Roles * (who can do this operation)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {JOB_ROLES.map(({ value, label }) => {
              const selected = form.eligible_job_roles.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleRole(value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left text-sm transition-all
                    ${selected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-colors
                    ${selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}
                  >
                    {selected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium">{label}</span>
                </button>
              );
            })}
          </div>
          {form.eligible_job_roles.length === 0 && (
            <p className="text-xs text-red-500 mt-1.5">At least one role must be selected</p>
          )}
        </div>

        {/* Summary preview */}
        {form.name && (
          <div
            className="p-3 rounded-xl flex items-center gap-3 text-sm"
            style={{ backgroundColor: form.color + '15', border: `1px solid ${form.color}40` }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: form.color }}
            >
              <Shield size={15} className="text-white" />
            </div>
            <div>
              <p className="font-bold" style={{ color: form.color }}>{form.name}</p>
              <p className="text-xs text-gray-500">
                {form.default_min_staff}–{form.default_max_staff} staff
                {form.requires_airside_access ? ' · Airside only' : ''}
                {' · '}{form.eligible_job_roles.length} eligible role{form.eligible_job_roles.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : editing ? 'Update Type' : 'Create Type'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATION POSITIONS TAB
// ─────────────────────────────────────────────────────────────────────────────

function OperationPositionsTab() {
  const [positions, setPositions] = useState<OperationPosition[]>([]);
  const [types,     setTypes]     = useState<OperationType[]>([]);
  const [airlines,  setAirlines]  = useState<any[]>([]);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState<OperationPosition | null>(null);
  const [search,    setSearch]    = useState('');
  const [filterType,setFilterType]= useState('');
  const [filterAL,  setFilterAL]  = useState('');

  const load = () => {
    Promise.all([
      operationsApi.positions(),
      operationsApi.types(),
      airlinesApi.list(),
      api.get('/admin/dashboard/overview').catch(() => ({ data: {} })),
    ]).then(([pos, typ, air]) => {
      setPositions(pos.data.positions ?? []);
      setTypes(typ.data.types ?? []);
      setAirlines(air.data.airlines ?? []);
    }).finally(() => setLoading(false));

    api.get('/cms/geofence/terminals').then(r => {
      setTerminals(r.data.terminals ?? []);
    }).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (pos: OperationPosition) => {
    if (!confirm(`Deactivate "${pos.position_name}"?`)) return;
    try {
      await operationsApi.deletePosition(pos.id);
      toast.success('Position deactivated');
      load();
    } catch {
      toast.error('Failed');
    }
  };

  const filtered = positions.filter(p => {
    const matchSearch = !search ||
      p.position_name.toLowerCase().includes(search.toLowerCase()) ||
      p.airline_contract?.airline?.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || p.operation_type?.id === filterType;
    const matchAL   = !filterAL  || p.airline_contract?.airline?.iata_code === filterAL;
    return matchSearch && matchType && matchAL;
  });

  return (
    <div className="p-6 space-y-4">

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search positions..."
              className="pl-8 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All operation types</option>
            {types.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={filterAL}
            onChange={e => setFilterAL(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All airlines</option>
            {airlines.map(a => (
              <option key={a.id} value={a.iata_code}>{a.iata_code} — {a.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => { setEditing(null); setModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          <Plus size={15} /> New Position
        </button>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} positions</p>

      {loading && <p className="text-center text-gray-400 py-10">Loading...</p>}

      {/* Positions list */}
      <div className="space-y-3">
        {filtered.map(pos => (
          <PositionCard
            key={pos.id}
            position={pos}
            onEdit={() => { setEditing(pos); setModal(true); }}
            onDelete={() => handleDelete(pos)}
          />
        ))}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <MapPin size={36} className="mx-auto mb-2 opacity-30" />
            <p className="font-semibold">No positions found</p>
            <p className="text-sm mt-1">Create your first operation position to assign staff to airline duties</p>
          </div>
        )}
      </div>

      {modal && (
        <OperationPositionModal
          editing={editing}
          types={types}
          airlines={airlines}
          terminals={terminals}
          onClose={() => { setModal(false); setEditing(null); }}
          onSave={() => { setModal(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POSITION CARD
// ─────────────────────────────────────────────────────────────────────────────

function PositionCard({
  position,
  onEdit,
  onDelete,
}: {
  position: OperationPosition;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const airline  = position.airline_contract?.airline;
  const opType   = position.operation_type;

  return (
    <div className="bg-white rounded-xl border overflow-hidden hover:shadow-sm transition-shadow">
      {/* Main row */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Airline colour dot */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: airline?.color ?? '#888' }}
        >
          {airline?.iata_code ?? '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900">{position.position_name}</p>
            {position.gate_number && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">
                Gate {position.gate_number}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
            <span>{airline?.name}</span>
            <span>·</span>
            <span
              className="font-semibold"
              style={{ color: opType?.color ?? '#888' }}
            >
              {opType?.name}
            </span>
            <span>·</span>
            <span>{position.terminal?.name ?? 'No terminal'}</span>
          </div>
        </div>

        {/* Staffing */}
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 shrink-0">
          <Users size={14} className="text-gray-400" />
          {position.min_staff_required}–{position.max_staff_required}
        </div>

        {/* Time */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500 shrink-0">
          <Clock size={14} className="text-gray-400" />
          {position.start_time?.slice(0,5)} – {position.end_time?.slice(0,5)}
        </div>

        {/* Days */}
        <div className="flex gap-0.5 shrink-0">
          {DAY_NAMES.map((d, i) => {
            const active = position.days_of_week?.includes(i + 1);
            return (
              <span
                key={d}
                className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold
                  ${active ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-300'}`}
              >
                {d[0]}
              </span>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-blue-600"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t bg-gray-50 px-5 py-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Zone</p>
            <p className="text-gray-700">{position.zone?.name ?? 'No zone restriction'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Staffing</p>
            <p className="text-gray-700">Min {position.min_staff_required} · Max {position.max_staff_required}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Hours</p>
            <p className="text-gray-700">{position.start_time?.slice(0,5)} – {position.end_time?.slice(0,5)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Active Days</p>
            <p className="text-gray-700">
              {position.days_of_week?.map(d => DAY_NAMES[d - 1]).join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATION POSITION MODAL (create + edit)
// ─────────────────────────────────────────────────────────────────────────────

function OperationPositionModal({
  editing,
  types,
  airlines,
  terminals,
  onClose,
  onSave,
}: {
  editing:   OperationPosition | null;
  types:     OperationType[];
  airlines:  any[];
  terminals: any[];
  onClose:   () => void;
  onSave:    () => void;
}) {
  const [form, setForm] = useState({
    airline_contract_id:  '',
    operation_type_id:    editing?.operation_type?.id ?? '',
    terminal_id:          editing?.terminal?.id       ?? '',
    zone_id:              editing?.zone?.id            ?? '',
    position_name:        editing?.position_name       ?? '',
    gate_number:          editing?.gate_number         ?? '',
    min_staff_required:   editing?.min_staff_required  ?? 3,
    max_staff_required:   editing?.max_staff_required  ?? 7,
    start_time:           editing?.start_time?.slice(0,5) ?? '05:00',
    end_time:             editing?.end_time?.slice(0,5)   ?? '13:00',
    days_of_week:         editing?.days_of_week ?? [1,2,3,4,5,6,7] as number[],
  });

  const [contracts, setContracts] = useState<any[]>([]);
  const [zones,     setZones]     = useState<any[]>([]);
  const [saving,    setSaving]    = useState(false);

  // Load contracts for selected airline
  const handleAirlineChange = async (airlineId: string) => {
    const airline = airlines.find(a => a.id === airlineId);
    if (!airline) return;
    const res = await airlinesApi.contracts(airlineId);
    setContracts(res.data.contracts ?? []);
    setForm(f => ({ ...f, airline_contract_id: '' }));
  };

  // Load zones for selected terminal
  const handleTerminalChange = async (terminalId: string) => {
    setForm(f => ({ ...f, terminal_id: terminalId, zone_id: '' }));
    if (!terminalId) { setZones([]); return; }
    const res = await api.get(`/cms/geofence/terminals/${terminalId}/zones`);
    setZones(res.data.zones ?? []);
  };

  // Auto-fill staff numbers from operation type defaults
  const handleTypeChange = (typeId: string) => {
    const type = types.find(t => t.id === typeId);
    setForm(f => ({
      ...f,
      operation_type_id:  typeId,
      min_staff_required: type?.default_min_staff ?? f.min_staff_required,
      max_staff_required: type?.default_max_staff ?? f.max_staff_required,
    }));
  };

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter(d => d !== day)
        : [...f.days_of_week, day].sort(),
    }));
  };

  const setDayPreset = (preset: 'all' | 'weekdays' | 'weekends') => {
    const presets = {
      all:      [1,2,3,4,5,6,7],
      weekdays: [1,2,3,4,5],
      weekends: [6,7],
    };
    setForm(f => ({ ...f, days_of_week: presets[preset] }));
  };

  const handleSave = async () => {
    if (!form.airline_contract_id) { toast.error('Select an airline contract'); return; }
    if (!form.operation_type_id)   { toast.error('Select an operation type');    return; }
    if (!form.terminal_id)         { toast.error('Select a terminal');           return; }
    if (!form.position_name)       { toast.error('Enter a position name');       return; }
    if (form.days_of_week.length === 0) { toast.error('Select at least one day'); return; }
    if (form.min_staff_required > form.max_staff_required) {
      toast.error('Min staff cannot exceed max staff');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await operationsApi.updatePosition(editing.id, form);
        toast.success('Position updated');
      } else {
        await operationsApi.createPosition(form);
        toast.success('Position created');
      }
      onSave();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const selectedType = types.find(t => t.id === form.operation_type_id);

  return (
    <Modal
      open
      title={editing ? `Edit — ${editing.position_name}` : 'New Operation Position'}
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-5">

        {/* Airline + contract */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Airline *
            </label>
            <select
              onChange={e => handleAirlineChange(e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select airline...</option>
              {airlines.map(a => (
                <option key={a.id} value={a.id}>
                  {a.iata_code} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Contract (Terminal) *
            </label>
            <select
              value={form.airline_contract_id}
              onChange={e => setForm(f => ({ ...f, airline_contract_id: e.target.value }))}
              disabled={contracts.length === 0}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">
                {contracts.length === 0 ? 'Select airline first...' : 'Select contract...'}
              </option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.terminal?.name} ({c.contract_start})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Operation type */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
            Operation Type *
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {types.map(type => (
              <button
                key={type.id}
                onClick={() => handleTypeChange(type.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left text-xs font-semibold transition-all
                  ${form.operation_type_id === type.id
                    ? 'text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                  }`}
                style={form.operation_type_id === type.id
                  ? { backgroundColor: type.color, borderColor: type.color }
                  : {}
                }
              >
                <Shield size={13} style={{ color: form.operation_type_id === type.id ? 'white' : type.color }} />
                {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Terminal + zone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Terminal *
            </label>
            <select
              value={form.terminal_id}
              onChange={e => handleTerminalChange(e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select terminal...</option>
              {terminals.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Zone (optional)
            </label>
            <select
              value={form.zone_id}
              onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}
              disabled={zones.length === 0}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">No specific zone</option>
              {zones.map((z: any) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.zone_type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Position name + gate */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Position Name *
            </label>
            <input
              value={form.position_name}
              onChange={e => setForm(f => ({ ...f, position_name: e.target.value }))}
              placeholder="e.g. BA Check-in Zone A Morning"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Gate Number
            </label>
            <input
              value={form.gate_number}
              onChange={e => setForm(f => ({ ...f, gate_number: e.target.value }))}
              placeholder="e.g. A22"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Staffing numbers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Min Staff Required *
            </label>
            <input
              type="number"
              value={form.min_staff_required}
              onChange={e => setForm(f => ({ ...f, min_staff_required: +e.target.value }))}
              min={1} max={50}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {selectedType && (
              <p className="text-xs text-gray-400 mt-1">
                Default for {selectedType.name}: {selectedType.default_min_staff}–{selectedType.default_max_staff}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Max Staff Allowed *
            </label>
            <input
              type="number"
              value={form.max_staff_required}
              onChange={e => setForm(f => ({ ...f, max_staff_required: +e.target.value }))}
              min={1} max={50}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Shift times */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Start Time *
            </label>
            <input
              type="time"
              value={form.start_time}
              onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              End Time *
            </label>
            <input
              type="time"
              value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Days of week */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Days of Week *
            </label>
            <div className="flex gap-1.5">
              {(['all','weekdays','weekends'] as const).map(preset => (
                <button
                  key={preset}
                  onClick={() => setDayPreset(preset)}
                  className="px-2.5 py-1 text-[10px] font-semibold bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg capitalize transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {DAY_NAMES.map((day, i) => {
              const dayNum = i + 1;
              const active = form.days_of_week.includes(dayNum);
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(dayNum)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all
                    ${active
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-200 text-gray-500 hover:border-blue-300'
                    }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary card */}
        {form.position_name && form.operation_type_id && (
          <div className="p-4 bg-gray-50 rounded-xl border space-y-2 text-sm">
            <p className="font-bold text-gray-800">Position Summary</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-400">Name: </span>{form.position_name}</div>
              <div><span className="text-gray-400">Operation: </span>{selectedType?.name ?? '—'}</div>
              <div><span className="text-gray-400">Staffing: </span>{form.min_staff_required}–{form.max_staff_required} staff</div>
              <div><span className="text-gray-400">Hours: </span>{form.start_time} – {form.end_time}</div>
              <div className="col-span-2"><span className="text-gray-400">Days: </span>
                {form.days_of_week.map(d => DAY_NAMES[d-1]).join(', ')}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : editing ? 'Update Position' : 'Create Position'}
          </button>
        </div>
      </div>
    </Modal>
  );
}