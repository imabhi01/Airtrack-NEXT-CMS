'use client';
// FILE: src/app/(cms)/tasks/page.tsx
// Task CRUD — create Alaska OOG, SQ Boarding, T3 Check-in Zone C etc.
// Tasks are the building blocks of the rota — they replace free-text Excel entries

import { useEffect, useState, useCallback } from 'react';
import { rotaApi } from '@/lib/rota-api';
import api from '@/lib/api';
import PageHeader from '@/components/shared/PageHeader';
import Modal from '@/components/shared/Modal';
import Badge from '@/components/shared/Badge';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, Search, Filter,
  Plane, Clock, MapPin, Shield, RefreshCw,
  ChevronDown, ChevronUp, Tag,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Task {
  id:                  string;
  name:                string;
  code:                string;
  category:            string;
  color:               string;
  default_start_time:  string | null;
  default_end_time:    string | null;
  requires_airside:    boolean;
  is_active:           boolean;
  notes:               string | null;
  airline?:            { id: string; name: string; iata_code: string; color: string } | null;
  terminal?:           { id: string; name: string; code: string } | null;
  zone?:               { id: string; name: string; code: string } | null;
}

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES: Record<string, { label: string; color: string; icon: string }> = {
  checkin:  { label: 'Check-in',     color: '#3B8BD4', icon: '🪑' },
  boarding: { label: 'Boarding',     color: '#0F6E56', icon: '✈️' },
  baggage:  { label: 'Baggage',      color: '#888780', icon: '🧳' },
  oog:      { label: 'OOG / Oversize',color: '#534AB7', icon: '📦' },
  ramp:     { label: 'Ramp',         color: '#BA7517', icon: '🛞' },
  security: { label: 'Security',     color: '#E24B4A', icon: '🛡' },
  lounge:   { label: 'Lounge',       color: '#C45FBD', icon: '🛋' },
  bma:      { label: 'BMA',          color: '#E24B4A', icon: '🚨' },
  general:  { label: 'General',      color: '#64748B', icon: '📋' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [airlines,   setAirlines]   = useState<any[]>([]);
  const [terminals,  setTerminals]  = useState<any[]>([]);
  const [zones,      setZones]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterCat,  setFilterCat]  = useState('');
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState<Task | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, aRes, termRes] = await Promise.all([
        rotaApi.tasks(),
        api.get('/cms/airlines'),
        api.get('/cms/geofence/terminals'),
      ]);
      setTasks(tRes.data.tasks ?? []);
      setAirlines(aRes.data.airlines ?? []);
      setTerminals(termRes.data.terminals ?? []);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (task: Task) => {
    if (!confirm(`Deactivate "${task.name}"?`)) return;
    try {
      await api.put(`/rota/tasks/${task.id}`, { is_active: false });
      toast.success('Task deactivated');
      load();
    } catch { toast.error('Failed'); }
  };

  // Filtered list
  const filtered = tasks.filter(t => {
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      t.airline?.name.toLowerCase().includes(search.toLowerCase() ?? '');
    const matchCat = !filterCat || t.category === filterCat;
    return matchSearch && matchCat && t.is_active;
  });

  // Group by category
  const grouped = Object.entries(CATEGORIES).map(([cat, cfg]) => ({
    category: cat,
    ...cfg,
    tasks: filtered.filter(t => t.category === cat),
  })).filter(g => g.tasks.length > 0);

  const totalActive = tasks.filter(t => t.is_active).length;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Tasks"
        subtitle={`${totalActive} active tasks — OOG, Boarding, Check-in, Baggage and more`}
        actions={
          <button
            onClick={() => { setEditing(null); setModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
              rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} /> New Task
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks, airlines, codes..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORIES).map(([cat, cfg]) => (
            <option key={cat} value={cat}>{cfg.icon} {cfg.label}</option>
          ))}
        </select>

        <button onClick={load}
          className="w-9 h-9 flex items-center justify-center border border-slate-200
            rounded-xl text-slate-500 hover:bg-slate-50 transition-colors">
          <RefreshCw size={14} />
        </button>

        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} task{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Tag size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-lg">No tasks yet</p>
            <p className="text-sm mt-1">
              Create tasks to use in the weekly rota planner
            </p>
            <button
              onClick={() => setModal(true)}
              className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl
                text-sm font-bold hover:bg-blue-700"
            >
              Create First Task
            </button>
          </div>
        ) : grouped.map(group => (
          <div key={group.category} className="bg-white rounded-2xl border overflow-hidden">
            {/* Category header */}
            <div
              className="flex items-center gap-3 px-5 py-3 border-b cursor-pointer
                hover:bg-slate-50 transition-colors"
              style={{ borderLeftWidth: 4, borderLeftColor: group.color }}
              onClick={() => setExpandedId(
                expandedId === group.category ? null : group.category
              )}
            >
              <span className="text-xl">{group.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-slate-900">{group.label}</p>
                <p className="text-xs text-slate-400">{group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}</p>
              </div>
              {expandedId === group.category
                ? <ChevronUp size={16} className="text-slate-400" />
                : <ChevronDown size={16} className="text-slate-400" />
              }
            </div>

            {/* Task rows */}
            {(expandedId === null || expandedId === group.category) && (
              <div className="divide-y divide-slate-50">
                {group.tasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onEdit={() => { setEditing(task); setModal(true); }}
                    onDelete={() => handleDelete(task)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <TaskModal
          editing={editing}
          airlines={airlines}
          terminals={terminals}
          onClose={() => { setModal(false); setEditing(null); }}
          onSaved={() => { setModal(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK ROW
// ─────────────────────────────────────────────────────────────────────────────

function TaskRow({
  task, onEdit, onDelete,
}: {
  task:     Task;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const cat = CATEGORIES[task.category] ?? CATEGORIES.general;

  return (
    <div className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50
      transition-colors group">

      {/* Color swatch */}
      <div
        className="w-3 h-10 rounded-full shrink-0"
        style={{ backgroundColor: task.color }}
      />

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-slate-900 text-sm">{task.name}</p>
          <code className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5
            rounded font-mono">{task.code}</code>
          {task.requires_airside && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5
              rounded-full font-bold flex items-center gap-0.5">
              <Shield size={9} /> Airside
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
          {task.airline && (
            <span className="flex items-center gap-1">
              <Plane size={10} />
              <span
                className="font-semibold"
                style={{ color: task.airline.color }}
              >
                {task.airline.iata_code}
              </span>
              {task.airline.name}
            </span>
          )}
          {task.terminal && (
            <span className="flex items-center gap-1">
              <MapPin size={10} /> {task.terminal.code}
              {task.zone ? ` / ${task.zone.name}` : ''}
            </span>
          )}
          {(task.default_start_time || task.default_end_time) && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {task.default_start_time?.slice(0,5) ?? '--:--'}
              {' – '}
              {task.default_end_time?.slice(0,5) ?? '--:--'}
            </span>
          )}
        </div>
      </div>

      {/* Rota pill preview */}
      <div
        className="px-3 py-1.5 rounded-lg text-white text-[10px] font-bold
          shrink-0 hidden sm:block"
        style={{ backgroundColor: task.color }}
      >
        {task.default_start_time?.slice(0,5)} {task.name}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100
        transition-opacity shrink-0">
        <button onClick={onEdit}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
          <Edit2 size={14} />
        </button>
        <button onClick={onDelete}
          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-400
            hover:text-red-600">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK MODAL — create + edit
// ─────────────────────────────────────────────────────────────────────────────

function TaskModal({
  editing, airlines, terminals, onClose, onSaved,
}: {
  editing:   Task | null;
  airlines:  any[];
  terminals: any[];
  onClose:   () => void;
  onSaved:   () => void;
}) {
  const [form, setForm] = useState({
    name:               editing?.name               ?? '',
    code:               editing?.code               ?? '',
    category:           editing?.category           ?? 'checkin',
    color:              editing?.color              ?? '#3B8BD4',
    airline_id:         editing?.airline?.id        ?? '',
    terminal_id:        editing?.terminal?.id       ?? '',
    zone_id:            editing?.zone?.id           ?? '',
    default_start_time: editing?.default_start_time?.slice(0,5) ?? '',
    default_end_time:   editing?.default_end_time?.slice(0,5)   ?? '',
    requires_airside:   editing?.requires_airside   ?? false,
    notes:              editing?.notes              ?? '',
  });

  const [zones,  setZones]  = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Auto-fill color from category
  const handleCategoryChange = (cat: string) => {
    const catColor = CATEGORIES[cat]?.color ?? '#3B8BD4';
    setForm(f => ({
      ...f,
      category: cat,
      color:    f.color === CATEGORIES[f.category]?.color ? catColor : f.color,
    }));
  };

  // Auto-generate code from name
  const handleNameChange = (name: string) => {
    const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/__+/g, '_');
    setForm(f => ({ ...f, name, code: editing ? f.code : code }));
  };

  // Load zones when terminal changes
  const handleTerminalChange = async (terminalId: string) => {
    setForm(f => ({ ...f, terminal_id: terminalId, zone_id: '' }));
    if (!terminalId) { setZones([]); return; }
    try {
      const res = await api.get(`/cms/geofence/terminals/${terminalId}/zones`);
      setZones(res.data.zones ?? []);
    } catch { setZones([]); }
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Task name is required'); return; }
    if (!form.code) { toast.error('Task code is required'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        airline_id:         form.airline_id  || null,
        terminal_id:        form.terminal_id || null,
        zone_id:            form.zone_id     || null,
        default_start_time: form.default_start_time || null,
        default_end_time:   form.default_end_time   || null,
        notes:              form.notes       || null,
      };

      if (editing) {
        await api.put(`/rota/tasks/${editing.id}`, payload);
        toast.success('Task updated');
      } else {
        await rotaApi.createTask(payload);
        toast.success('Task created');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const selectedAirline  = airlines.find(a => a.id === form.airline_id);
  const previewColor     = form.color;

  return (
    <Modal
      open
      title={editing ? `Edit — ${editing.name}` : 'New Task'}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-5">

        {/* Name + Code */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Task Name *
            </label>
            <input
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. SQ Boarding"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Code * (unique, no spaces)
            </label>
            <input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="SQ_BOARDING"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
            Category *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(CATEGORIES).map(([cat, cfg]) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2
                  text-sm font-semibold text-left transition-all
                  ${form.category === cat
                    ? 'text-white border-transparent'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                  }`}
                style={form.category === cat
                  ? { backgroundColor: cfg.color, borderColor: cfg.color }
                  : {}
                }
              >
                <span>{cfg.icon}</span>
                <span className="text-xs">{cfg.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Airline + Terminal + Zone */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Airline
            </label>
            <select
              value={form.airline_id}
              onChange={e => setForm(f => ({ ...f, airline_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any / None</option>
              {airlines.map(a => (
                <option key={a.id} value={a.id}>
                  {a.iata_code} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Terminal
            </label>
            <select
              value={form.terminal_id}
              onChange={e => handleTerminalChange(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any / None</option>
              {terminals.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Zone
            </label>
            <select
              value={form.zone_id}
              onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}
              disabled={zones.length === 0}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            >
              <option value="">No specific zone</option>
              {zones.map((z: any) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Default times + Colour */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Default Start
            </label>
            <input
              type="time"
              value={form.default_start_time}
              onChange={e => setForm(f => ({ ...f, default_start_time: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Default End
            </label>
            <input
              type="time"
              value={form.default_end_time}
              onChange={e => setForm(f => ({ ...f, default_end_time: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Rota Cell Colour
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-10 h-10 rounded-lg border cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-500">{form.color}</span>
            </div>
          </div>
        </div>

        {/* Airside toggle */}
        <div
          onClick={() => setForm(f => ({ ...f, requires_airside: !f.requires_airside }))}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer
            transition-all
            ${form.requires_airside
              ? 'border-amber-400 bg-amber-50'
              : 'border-slate-200 hover:border-slate-300'}`}
        >
          <button
            className={`w-10 h-5 rounded-full transition-colors relative shrink-0
              ${form.requires_airside ? 'bg-amber-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow
              transition-all ${form.requires_airside ? 'left-5' : 'left-0.5'}`} />
          </button>
          <div>
            <p className="text-sm font-bold text-slate-800">Requires Airside Access</p>
            <p className="text-xs text-slate-400">
              Only staff with a valid Blue ID badge can be assigned this task
            </p>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Notes
          </label>
          <input
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. Alaska Airlines oversize baggage handling at T3 ramp"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Live preview */}
        {form.name && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
              Rota Cell Preview
            </p>
            <div className="flex gap-3 items-start">
              {/* How it looks on the rota */}
              <div
                className="px-3 py-2 rounded-xl text-white text-xs font-bold
                  min-w-[140px]"
                style={{ backgroundColor: form.color }}
              >
                <div className="text-white/70 text-[9px] mb-0.5">
                  {form.default_start_time || '--:--'} – {form.default_end_time || '--:--'}
                </div>
                <div className="font-bold">{form.name}</div>
                {selectedAirline && (
                  <div className="text-white/70 text-[9px] mt-0.5">
                    {selectedAirline.iata_code}
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-400 pt-1">
                ← This is how the task will appear in the weekly rota grid
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold
              text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm
              font-bold hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving...' : editing ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </div>
    </Modal>
  );
}