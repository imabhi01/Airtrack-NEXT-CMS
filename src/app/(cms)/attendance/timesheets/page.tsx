'use client';
// FILE: src/app/(cms)/attendance/timesheets/page.tsx
// Timesheets — view all punch events, hours worked, anomalies per staff per week

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import PageHeader from '@/components/shared/PageHeader';
import Modal from '@/components/shared/Modal';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  Clock, Download, Search, ChevronLeft,
  ChevronRight, CheckCircle, AlertTriangle,
  XCircle, RefreshCw, FileText, User,
  Calendar, TrendingUp, Filter,
} from 'lucide-react';

dayjs.extend(isoWeek);

// ── Types ─────────────────────────────────────────────────────────────────────

interface PunchEvent {
  id:            string;
  type:          'clock_in' | 'clock_out';
  punched_at:    string;
  terminal?:     { name: string; code: string } | null;
  zone?:         { name: string } | null;
  duty_mode:     string;
  location_method?: string | null;
  is_anomaly:    boolean;
}

interface StaffTimesheet {
  staff: {
    id:          string;
    name:        string;
    employee_id: string;
    job_role:    string;
    contract_type: string;
  };
  punches:       PunchEvent[];
  days:          DaySummary[];
  total_hours:   number;
  contract_hours:number;
  variance:      number;
  anomaly_count: number;
}

interface DaySummary {
  date:         string;
  day:          string;
  clock_in?:    string | null;
  clock_out?:   string | null;
  hours_worked: number;
  status:       'present' | 'absent' | 'late' | 'partial' | 'off';
  is_rostered:  boolean;
  anomaly?:     string | null;
}

// ── Status colours ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  present: { label: 'Present',  color: 'bg-green-100 text-green-700',  dot: 'bg-green-500'  },
  late:    { label: 'Late',     color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500'  },
  partial: { label: 'Partial',  color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'   },
  absent:  { label: 'Absent',   color: 'bg-red-100 text-red-700',      dot: 'bg-red-500'    },
  off:     { label: 'Day Off',  color: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-300'  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function TimesheetsPage() {
  const [weekStart,    setWeekStart]    = useState(
    dayjs().isoWeekday(1).format('YYYY-MM-DD')
  );
  const [timesheets,   setTimesheets]   = useState<StaffTimesheet[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected,     setSelected]     = useState<StaffTimesheet | null>(null);
  const [detailModal,  setDetailModal]  = useState(false);
  const [exporting,    setExporting]    = useState(false);

  const weekEnd = dayjs(weekStart).add(6, 'day').format('YYYY-MM-DD');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/timesheets', {
        params: { from: weekStart, to: weekEnd },
      });
      setTimesheets(res.data.staff ?? []);
    } catch {
      toast.error('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => { load(); }, [load]);

  const prevWeek = () =>
    setWeekStart(dayjs(weekStart).subtract(7, 'day').format('YYYY-MM-DD'));
  const nextWeek = () =>
    setWeekStart(dayjs(weekStart).add(7, 'day').format('YYYY-MM-DD'));
  const thisWeek = () =>
    setWeekStart(dayjs().isoWeekday(1).format('YYYY-MM-DD'));

  const isCurrentWeek = weekStart === dayjs().isoWeekday(1).format('YYYY-MM-DD');

  // Summary totals
  const totals = {
    staff:        timesheets.length,
    total_hours:  timesheets.reduce((s, t) => s + t.total_hours, 0),
    anomalies:    timesheets.reduce((s, t) => s + t.anomaly_count, 0),
    absent_days:  timesheets.reduce((s, t) =>
      s + t.days.filter(d => d.status === 'absent' && d.is_rostered).length, 0),
  };

  // Filtered list
  const filtered = timesheets.filter(t => {
    const matchSearch = !search ||
      t.staff.name.toLowerCase().includes(search.toLowerCase()) ||
      t.staff.employee_id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus ||
      t.days.some(d => d.status === filterStatus);
    return matchSearch && matchStatus;
  });

  // Export CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = [
        ['Employee ID', 'Name', 'Contract', 'Total Hours', 'Contract Hours',
         'Variance', 'Anomalies'],
        ...filtered.map(t => [
          t.staff.employee_id,
          t.staff.name,
          t.staff.contract_type,
          t.total_hours.toFixed(2),
          t.contract_hours,
          t.variance.toFixed(2),
          t.anomaly_count,
        ]),
      ];
      const csv  = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `timesheets-${weekStart}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } finally {
      setExporting(false);
    }
  };

  const days = Array.from({ length: 7 }, (_, i) =>
    dayjs(weekStart).add(i, 'day')
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Timesheets"
        subtitle={`${dayjs(weekStart).format('D MMM')} – ${dayjs(weekEnd).format('D MMM YYYY')}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200
                rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50
                disabled:opacity-50 transition-colors"
            >
              <Download size={13} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button onClick={load}
              className="w-9 h-9 flex items-center justify-center border border-slate-200
                rounded-xl text-slate-500 hover:bg-slate-50 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      {/* Week navigator */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b shrink-0">
        <button onClick={prevWeek}
          className="w-8 h-8 flex items-center justify-center rounded-lg border
            border-slate-200 hover:bg-slate-50 transition-colors">
          <ChevronLeft size={16} />
        </button>

        <div className="flex gap-1">
          {days.map(d => (
            <div
              key={d.format('YYYY-MM-DD')}
              className={`px-3 py-1.5 rounded-lg text-center text-xs
                ${d.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-500'
                }`}
            >
              <div className="font-semibold">{d.format('ddd')}</div>
              <div className="text-[11px] opacity-70">{d.format('D')}</div>
            </div>
          ))}
        </div>

        <button onClick={nextWeek}
          className="w-8 h-8 flex items-center justify-center rounded-lg border
            border-slate-200 hover:bg-slate-50 transition-colors">
          <ChevronRight size={16} />
        </button>

        {!isCurrentWeek && (
          <button onClick={thisWeek}
            className="px-3 py-1.5 text-xs font-bold text-blue-600 border
              border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
            This Week
          </button>
        )}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3 px-5 py-3 bg-slate-50 border-b shrink-0">
        {[
          { label: 'Staff',         value: totals.staff,                         color: 'text-slate-900', icon: <User size={14} />          },
          { label: 'Total Hours',   value: `${totals.total_hours.toFixed(1)}h`,  color: 'text-blue-700',  icon: <Clock size={14} />         },
          { label: 'Absent Days',   value: totals.absent_days,                   color: 'text-red-700',   icon: <XCircle size={14} />       },
          { label: 'Anomalies',     value: totals.anomalies,                     color: 'text-amber-700', icon: <AlertTriangle size={14} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white rounded-xl border px-4 py-3
            flex items-center gap-3">
            <div className="text-slate-400">{icon}</div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-xl font-black ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-5 py-2.5 bg-white border-b shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-xs
            focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="absent">Has Absent Days</option>
          <option value="late">Has Late Days</option>
          <option value="partial">Has Partial Days</option>
        </select>

        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} staff
        </span>
      </div>

      {/* Timesheet grid */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        ) : (
          <div className="min-w-[900px]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold w-44">Staff</th>
                  {days.map(d => (
                    <th key={d.format('YYYY-MM-DD')}
                      className={`text-center px-2 py-3 text-xs font-bold
                        ${d.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
                          ? 'bg-blue-600' : ''}`}>
                      <div>{d.format('ddd').toUpperCase()}</div>
                      <div className="text-base font-black">{d.format('D')}</div>
                    </th>
                  ))}
                  <th className="text-center px-3 py-3 text-xs font-bold">Hours</th>
                  <th className="text-center px-3 py-3 text-xs font-bold">Variance</th>
                  <th className="text-center px-3 py-3 text-xs font-bold w-16">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ts, idx) => (
                  <TimesheetRow
                    key={ts.staff.id}
                    timesheet={ts}
                    days={days}
                    odd={idx % 2 === 1}
                    onViewDetail={() => { setSelected(ts); setDetailModal(true); }}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-slate-400">
                      <FileText size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="font-semibold">No timesheet data</p>
                      <p className="text-xs mt-1">No punch events found for this week</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detailModal && selected && (
        <TimesheetDetailModal
          timesheet={selected}
          weekStart={weekStart}
          onClose={() => { setDetailModal(false); setSelected(null); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMESHEET ROW
// ─────────────────────────────────────────────────────────────────────────────

function TimesheetRow({
  timesheet, days, odd, onViewDetail,
}: {
  timesheet:    StaffTimesheet;
  days:         dayjs.Dayjs[];
  odd:          boolean;
  onViewDetail: () => void;
}) {
  const variance       = timesheet.variance;
  const varianceColor  = variance >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <tr className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors
      ${odd ? 'bg-slate-50/50' : 'bg-white'}`}>

      {/* Staff */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center
            justify-center text-blue-700 text-[10px] font-black shrink-0">
            {timesheet.staff.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {timesheet.staff.name}
            </p>
            <p className="text-[9px] text-slate-400 truncate">
              {timesheet.staff.employee_id}
            </p>
          </div>
          {timesheet.anomaly_count > 0 && (
            <AlertTriangle size={11} className="text-amber-500 shrink-0" />
          )}
        </div>
      </td>

      {/* Day cells */}
      {days.map(d => {
        const dateStr = d.format('YYYY-MM-DD');
        const day     = timesheet.days.find(x => x.date === dateStr);
        const cfg     = STATUS_CONFIG[day?.status ?? 'absent'];
        const isToday = dateStr === dayjs().format('YYYY-MM-DD');

        return (
          <td key={dateStr}
            className={`px-1 py-2 text-center
              ${isToday ? 'bg-blue-50' : ''}`}>
            {day ? (
              <div className="flex flex-col items-center gap-0.5">
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />

                {/* Times */}
                {day.status !== 'off' && day.status !== 'absent' ? (
                  <>
                    <p className="text-[9px] font-bold text-slate-700 leading-tight">
                      {day.clock_in
                        ? dayjs(day.clock_in).format('HH:mm')
                        : '—'}
                    </p>
                    <p className="text-[9px] text-slate-400 leading-tight">
                      {day.clock_out
                        ? dayjs(day.clock_out).format('HH:mm')
                        : '…'}
                    </p>
                    {day.hours_worked > 0 && (
                      <p className="text-[9px] font-bold text-blue-600 leading-tight">
                        {day.hours_worked.toFixed(1)}h
                      </p>
                    )}
                  </>
                ) : day.status === 'off' ? (
                  <p className="text-[9px] font-black text-slate-400">OFF</p>
                ) : (
                  <p className="text-[9px] font-black text-red-400">ABS</p>
                )}

                {/* Anomaly indicator */}
                {day.anomaly && (
                  <AlertTriangle size={9} className="text-amber-500" />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-slate-200" />
                <p className="text-[9px] text-slate-300 mt-0.5">—</p>
              </div>
            )}
          </td>
        );
      })}

      {/* Total hours */}
      <td className="px-3 py-2.5 text-center">
        <p className="text-sm font-black text-slate-900">
          {timesheet.total_hours.toFixed(1)}h
        </p>
        <p className="text-[9px] text-slate-400">
          / {timesheet.contract_hours}h
        </p>
      </td>

      {/* Variance */}
      <td className="px-3 py-2.5 text-center">
        <p className={`text-sm font-black ${varianceColor}`}>
          {variance >= 0 ? '+' : ''}{variance.toFixed(1)}h
        </p>
      </td>

      {/* Detail button */}
      <td className="px-3 py-2.5 text-center">
        <button
          onClick={onViewDetail}
          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600
            rounded-lg text-[10px] font-bold transition-colors"
        >
          View
        </button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMESHEET DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────

function TimesheetDetailModal({
  timesheet, weekStart, onClose,
}: {
  timesheet: StaffTimesheet;
  weekStart: string;
  onClose:   () => void;
}) {
  const variance    = timesheet.variance;
  const varianceColor = variance >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <Modal
      open
      title={`Timesheet — ${timesheet.staff.name}`}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-5">

        {/* Staff summary header */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center
            justify-center text-blue-700 text-lg font-black shrink-0">
            {timesheet.staff.name.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">{timesheet.staff.name}</p>
            <p className="text-xs text-slate-500">
              {timesheet.staff.employee_id} · {timesheet.staff.job_role?.replace(/_/g,' ')}
              · {timesheet.staff.contract_type?.replace('_',' ')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-slate-900">
              {timesheet.total_hours.toFixed(1)}h
            </p>
            <p className={`text-sm font-bold ${varianceColor}`}>
              {variance >= 0 ? '+' : ''}{variance.toFixed(1)}h vs {timesheet.contract_hours}h contract
            </p>
          </div>
        </div>

        {/* Day-by-day breakdown */}
        <div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
            Daily Breakdown
          </p>
          <div className="space-y-2">
            {timesheet.days.map(day => {
              const cfg = STATUS_CONFIG[day.status];
              return (
                <div key={day.date}
                  className="flex items-center gap-3 p-3 border border-slate-100
                    rounded-xl hover:bg-slate-50 transition-colors"
                >
                  {/* Day label */}
                  <div className="w-16 shrink-0">
                    <p className="text-xs font-bold text-slate-700">{day.day}</p>
                    <p className="text-[10px] text-slate-400">
                      {dayjs(day.date).format('D MMM')}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                    shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>

                  {/* Times */}
                  <div className="flex-1 flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">In:</span>
                      <span className="font-bold text-slate-700">
                        {day.clock_in
                          ? dayjs(day.clock_in).format('HH:mm')
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Out:</span>
                      <span className="font-bold text-slate-700">
                        {day.clock_out
                          ? dayjs(day.clock_out).format('HH:mm')
                          : day.status === 'present' ? '…still in' : '—'}
                      </span>
                    </div>
                    {day.hours_worked > 0 && (
                      <div className="ml-auto flex items-center gap-1.5">
                        <Clock size={11} className="text-slate-400" />
                        <span className="font-black text-blue-600">
                          {day.hours_worked.toFixed(2)}h
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Anomaly */}
                  {day.anomaly && (
                    <div className="flex items-center gap-1 text-amber-600 shrink-0">
                      <AlertTriangle size={12} />
                      <span className="text-[10px] font-bold">{day.anomaly}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Punch events log */}
        {timesheet.punches.length > 0 && (
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
              Raw Punch Events ({timesheet.punches.length})
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-100
              rounded-xl p-3 bg-slate-50">
              {timesheet.punches.map(punch => (
                <div key={punch.id}
                  className="flex items-center gap-3 text-xs py-1"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0
                    ${punch.type === 'clock_in' ? 'bg-green-500' : 'bg-red-400'}`}
                  />
                  <span className={`font-bold w-16 shrink-0
                    ${punch.type === 'clock_in' ? 'text-green-600' : 'text-red-500'}`}>
                    {punch.type === 'clock_in' ? 'Clock In' : 'Clock Out'}
                  </span>
                  <span className="font-mono text-slate-700 font-bold">
                    {dayjs(punch.punched_at).format('ddd D MMM HH:mm:ss')}
                  </span>
                  {punch.terminal && (
                    <span className="text-slate-400">
                      {punch.terminal.code}
                      {punch.zone ? ` / ${punch.zone.name}` : ''}
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-auto
                    ${punch.duty_mode === 'airside'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'}`}>
                    {punch.duty_mode}
                  </span>
                  {punch.is_anomaly && (
                    <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose}
          className="w-full px-4 py-2.5 border rounded-xl text-sm font-semibold
            text-slate-600 hover:bg-slate-50">
          Close
        </button>
      </div>
    </Modal>
  );
}