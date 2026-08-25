'use client';
// FILE: src/app/(cms)/attendance/live/page.tsx
// Live clock-in board — who is in right now, by terminal, with elapsed time

import { useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import PageHeader from '@/components/shared/PageHeader';
import toast from 'react-hot-toast';
import dayjs from '@/lib/dayjs-setup';
import duration from 'dayjs/plugin/duration';
import {
  Clock, Users, MapPin, RefreshCw,
  CheckCircle, XCircle, AlertTriangle,
  Wifi, Navigation, Search, Filter,
  UserCheck, UserX, Radio,
} from 'lucide-react';

dayjs.extend(duration);

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveEntry {
  staff: {
    id:          string;
    name:        string;
    employee_id: string;
    job_role:    string;
    avatar?:     string | null;
  };
  clock_in_at:      string;
  duty_mode:        'landside' | 'airside';
  terminal?:        { id: string; name: string; code: string } | null;
  zone?:            { id: string; name: string; code: string } | null;
  location_method?: string | null;
  hours_elapsed?:   number;
}

interface LiveStats {
  total_clocked_in:  number;
  airside:           number;
  landside:          number;
  by_terminal:       { terminal: string; count: number }[];
  late_today:        number;
  not_clocked_in:    number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function LiveAttendancePage() {
  const [entries,       setEntries]       = useState<LiveEntry[]>([]);
  const [stats,         setStats]         = useState<LiveStats | null>(null);
  const [absentStaff,   setAbsentStaff]   = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [filterTerminal,setFilterTerminal]= useState('');
  const [filterMode,    setFilterMode]    = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(dayjs());
  const [autoRefresh,   setAutoRefresh]   = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Elapsed timer — re-renders every second
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [liveRes, statsRes] = await Promise.all([
        api.get('/admin/dashboard/live'),
        api.get('/admin/dashboard/overview'),
      ]);

      const live = liveRes.data;
      setEntries(live.clocked_in ?? []);
      setAbsentStaff(live.expected_not_clocked_in ?? []);

      const ov = statsRes.data;
      setStats({
        total_clocked_in: ov.totals?.clocked_in       ?? 0,
        airside:          ov.totals?.airside           ?? 0,
        landside:         ov.totals?.landside          ?? 0,
        by_terminal:      ov.by_terminal               ?? [],
        late_today:       ov.totals?.late_today        ?? 0,
        not_clocked_in:   ov.totals?.not_clocked_in    ?? 0,
      });

      setLastRefreshed(dayjs());
    } catch {
      if (!silent) toast.error('Failed to load live attendance');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => load(true), 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, load]);

  // Filtered entries
  const filtered = entries.filter(e => {
    const matchSearch = !search ||
      e.staff.name.toLowerCase().includes(search.toLowerCase()) ||
      e.staff.employee_id.toLowerCase().includes(search.toLowerCase());
    const matchTerminal = !filterTerminal ||
      e.terminal?.code === filterTerminal;
    const matchMode = !filterMode || e.duty_mode === filterMode;
    return matchSearch && matchTerminal && matchMode;
  });

  // Unique terminals for filter
  const terminals = [...new Set(entries.map(e => e.terminal?.code).filter(Boolean))];

  // Elapsed time string from clock_in_at
  const elapsed = (clockInAt: string) => {
    const diff = dayjs().diff(dayjs(clockInAt), 'second');
    const h    = Math.floor(diff / 3600);
    const m    = Math.floor((diff % 3600) / 60);
    const s    = diff % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Live Attendance"
        subtitle={`Real-time clock-in board · Last updated ${lastRefreshed.format('HH:mm:ss')}`}
        actions={
          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(a => !a)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs
                font-bold border-2 transition-all
                ${autoRefresh
                  ? 'border-green-400 bg-green-50 text-green-700'
                  : 'border-slate-200 text-slate-500'}`}
            >
              <Radio size={13} className={autoRefresh ? 'animate-pulse' : ''} />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>

            <button
              onClick={() => load()}
              className="w-9 h-9 flex items-center justify-center border border-slate-200
                rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 px-5 py-3
          bg-white border-b shrink-0">
          <StatPill
            label="Clocked In"
            value={stats.total_clocked_in}
            color="green"
            icon={<UserCheck size={14} />}
          />
          <StatPill
            label="Airside"
            value={stats.airside}
            color="amber"
            icon={<Navigation size={14} />}
          />
          <StatPill
            label="Landside"
            value={stats.landside}
            color="blue"
            icon={<MapPin size={14} />}
          />
          <StatPill
            label="Late Today"
            value={stats.late_today}
            color="red"
            icon={<Clock size={14} />}
          />
          <StatPill
            label="Not In Yet"
            value={stats.not_clocked_in}
            color="slate"
            icon={<UserX size={14} />}
          />
          {/* By terminal mini-bars */}
          <div className="bg-slate-50 rounded-xl px-3 py-2 md:col-span-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">
              By Terminal
            </p>
            <div className="space-y-1">
              {stats.by_terminal.slice(0,3).map(t => (
                <div key={t.terminal} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-600 w-5">
                    {t.terminal}
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (t.count / (stats.total_clocked_in || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 w-4 text-right">
                    {t.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 border-b shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs
              focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <select
          value={filterTerminal}
          onChange={e => setFilterTerminal(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Terminals</option>
          {terminals.map(t => (
            <option key={t} value={t!}>{t}</option>
          ))}
        </select>

        <select
          value={filterMode}
          onChange={e => setFilterMode(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Duty Modes</option>
          <option value="airside">Airside</option>
          <option value="landside">Landside</option>
        </select>

        <span className="text-xs text-slate-400 ml-auto font-semibold">
          {filtered.length} / {entries.length} staff
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex gap-0">

        {/* ── Left: Live clock-in table ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="flex flex-col items-center gap-3">
                <div className="w-7 h-7 border-4 border-green-500 border-t-transparent
                  rounded-full animate-spin" />
                <p className="text-xs text-slate-400">Loading live data...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <Users size={32} className="mb-2 opacity-30" />
              <p className="font-semibold">No staff currently clocked in</p>
              <p className="text-xs mt-1">
                {search || filterTerminal || filterMode
                  ? 'Try adjusting your filters'
                  : 'Staff will appear here as they clock in'}
              </p>
            </div>
          ) : (
            <div className="p-4">
              {/* Group by terminal */}
              {terminals.length > 0 && !filterTerminal ? (
                terminals.map(termCode => {
                  const termEntries = filtered.filter(
                    e => e.terminal?.code === termCode
                  );
                  if (termEntries.length === 0) return null;
                  return (
                    <TerminalGroup
                      key={termCode}
                      termCode={termCode!}
                      entries={termEntries}
                      elapsed={elapsed}
                      tick={tick}
                    />
                  );
                })
              ) : (
                <div className="bg-white rounded-2xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Staff</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Terminal / Zone</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Mode</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Clock-in</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Elapsed</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map(e => (
                        <LiveRow key={e.staff.id} entry={e} elapsed={elapsed} tick={tick} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Expected but not clocked in ──────────────────────────── */}
        {absentStaff.length > 0 && (
          <div className="w-64 border-l border-slate-200 bg-white overflow-y-auto shrink-0">
            <div className="px-4 py-3 border-b bg-amber-50 sticky top-0">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-600" />
                <p className="text-xs font-black text-amber-800 uppercase tracking-wide">
                  Expected — Not In
                </p>
              </div>
              <p className="text-[10px] text-amber-600 mt-0.5">
                Rostered today but not clocked in yet
              </p>
            </div>
            <div className="p-3 space-y-2">
              {absentStaff.map((s: any) => (
                <div key={s.staff?.id ?? s.id}
                  className="flex items-center gap-2.5 p-2.5 border border-amber-100
                    rounded-xl bg-amber-50/50"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center
                    justify-center text-amber-700 text-xs font-black shrink-0">
                    {(s.staff?.name ?? s.name ?? '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {s.staff?.name ?? s.name}
                    </p>
                    <p className="text-[9px] text-slate-400 truncate">
                      {s.scheduled_start} · {s.task ?? s.staff?.job_role ?? '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TERMINAL GROUP — groups entries by terminal with a header
// ─────────────────────────────────────────────────────────────────────────────

function TerminalGroup({
  termCode, entries, elapsed, tick,
}: {
  termCode: string;
  entries:  LiveEntry[];
  elapsed:  (t: string) => string;
  tick:     number;
}) {
  const TERM_COLORS: Record<string, string> = {
    T2: 'bg-purple-600',
    T3: 'bg-emerald-600',
    T4: 'bg-amber-600',
  };

  return (
    <div className="mb-4 bg-white rounded-2xl border overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-slate-50">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center
          text-white text-xs font-black shrink-0
          ${TERM_COLORS[termCode] ?? 'bg-slate-600'}`}>
          {termCode}
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm">Terminal {termCode}</p>
          <p className="text-xs text-slate-400">
            {entries.length} staff clocked in
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-green-600 font-semibold">Live</span>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-white">
            <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Staff</th>
            <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Zone</th>
            <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Mode</th>
            <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">In Since</th>
            <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Elapsed</th>
            <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Method</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {entries.map(e => (
            <LiveRow key={e.staff.id} entry={e} elapsed={elapsed} tick={tick} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE ROW — single staff clock-in entry with live elapsed timer
// ─────────────────────────────────────────────────────────────────────────────

function LiveRow({
  entry, elapsed, tick,
}: {
  entry:   LiveEntry;
  elapsed: (t: string) => string;
  tick:    number;
}) {
  const elapsedStr = elapsed(entry.clock_in_at);
  const [h, m]     = elapsedStr.split(':').map(Number);
  const isLong     = h >= 8;
  const isMedium   = h >= 6;

  const methodIcon = (method: string | null | undefined) => {
    switch (method) {
      case 'gps_precise': return <span title="GPS" className="text-green-600">📡</span>;
      case 'wifi':        return <span title="Wi-Fi" className="text-blue-600">📶</span>;
      case 'gps_coarse':  return <span title="GPS Coarse" className="text-amber-600">📍</span>;
      case 'beacon':      return <span title="BLE Beacon" className="text-purple-600">🔵</span>;
      default:            return <span className="text-slate-400">—</span>;
    }
  };

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      {/* Staff */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center
            justify-center text-green-700 text-[10px] font-black shrink-0">
            {entry.staff.name.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">{entry.staff.name}</p>
            <p className="text-[9px] text-slate-400">
              {entry.staff.employee_id} · {entry.staff.job_role?.replace(/_/g,' ')}
            </p>
          </div>
        </div>
      </td>

      {/* Terminal / Zone */}
      <td className="px-4 py-2.5">
        <p className="text-xs text-slate-600 font-semibold">
          {entry.zone?.name ?? entry.terminal?.name ?? '—'}
        </p>
        {entry.zone && entry.terminal && (
          <p className="text-[9px] text-slate-400">{entry.terminal.code}</p>
        )}
      </td>

      {/* Duty mode */}
      <td className="px-4 py-2.5">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
          ${entry.duty_mode === 'airside'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-green-100 text-green-700'}`}>
          {entry.duty_mode}
        </span>
      </td>

      {/* Clock-in time */}
      <td className="px-4 py-2.5">
        <p className="text-xs font-semibold text-slate-700">
          {dayjs(entry.clock_in_at).format('HH:mm')}
        </p>
        <p className="text-[9px] text-slate-400">
          {dayjs(entry.clock_in_at).format('D MMM')}
        </p>
      </td>

      {/* Elapsed — live ticking */}
      <td className="px-4 py-2.5">
        <span className={`text-xs font-black font-mono
          ${isLong ? 'text-red-600' : isMedium ? 'text-amber-600' : 'text-green-600'}`}>
          {elapsedStr}
        </span>
      </td>

      {/* Location method */}
      <td className="px-4 py-2.5 text-sm">
        <div className="flex items-center gap-1">
          {methodIcon(entry.location_method)}
          <span className="text-[9px] text-slate-400 capitalize">
            {entry.location_method?.replace('_',' ') ?? ''}
          </span>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT PILL
// ─────────────────────────────────────────────────────────────────────────────

function StatPill({
  label, value, color, icon,
}: {
  label: string;
  value: number;
  color: 'green' | 'amber' | 'blue' | 'red' | 'slate';
  icon:  React.ReactNode;
}) {
  const colors = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    blue:  'bg-blue-50 text-blue-700',
    red:   'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className={`${colors[color]} rounded-xl px-3 py-2.5`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      </div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}