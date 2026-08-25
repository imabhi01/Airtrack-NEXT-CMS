'use client';
import { useState } from 'react';
import { reportsApi } from '@/lib/cms-api';
import PageHeader from '@/components/shared/PageHeader';
import Badge from '@/components/shared/Badge';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import dayjs from '@/lib/dayjs-setup';
import { Download, BarChart3 } from 'lucide-react';
 
type ReportType = 'roster_vs_actual' | 'staffing_gaps' | 'hours_summary';
 
export default function ReportsPage() {
  const [type,       setType]       = useState<ReportType>('roster_vs_actual');
  const [weekStart,  setWeekStart]  = useState(dayjs().isoWeekday(1).format('YYYY-MM-DD'));
  const [fromDate,   setFromDate]   = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [toDate,     setToDate]     = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [data,       setData]       = useState<any>(null);
  const [loading,    setLoading]    = useState(false);
 
  const runReport = async () => {
    setLoading(true);
    setData(null);
    try {
      let res;
      if (type === 'roster_vs_actual') res = await reportsApi.rosterVsActual(weekStart);
      if (type === 'staffing_gaps')    res = await reportsApi.staffingGaps(weekStart);
      if (type === 'hours_summary')    res = await reportsApi.hoursSummary(fromDate, toDate);
      setData(res?.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Report failed');
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Attendance, coverage and hours analytics"
      />
 
      <div className="p-6 space-y-5">
 
        {/* Controls */}
        <div className="bg-white rounded-xl border p-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Report Type</label>
              <select value={type} onChange={e => setType(e.target.value as ReportType)}
                className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="roster_vs_actual">Roster vs Actual Attendance</option>
                <option value="staffing_gaps">Staffing Gaps</option>
                <option value="hours_summary">Hours Summary</option>
              </select>
            </div>
 
            {(type === 'roster_vs_actual' || type === 'staffing_gaps') && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Week Start (Monday)</label>
                <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
                  className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
 
            {type === 'hours_summary' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">From</label>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">To</label>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </>
            )}
 
            <button onClick={runReport} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1A2B4A] text-white rounded-xl text-sm font-semibold hover:bg-[#2D4A7A] disabled:opacity-60">
              <BarChart3 size={15} />
              {loading ? 'Running...' : 'Run Report'}
            </button>
          </div>
        </div>
 
        {/* Results */}
        {data && (
          <>
            {/* Roster vs Actual */}
            {type === 'roster_vs_actual' && (
              <RosterVsActualReport data={data} />
            )}
 
            {/* Staffing Gaps */}
            {type === 'staffing_gaps' && (
              <StaffingGapsReport data={data} />
            )}
 
            {/* Hours Summary */}
            {type === 'hours_summary' && (
              <HoursSummaryReport data={data} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
 
function RosterVsActualReport({ data }: { data: any }) {
  const s = data.summary;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Scheduled',     value: s.total_scheduled, color: 'bg-blue-50 text-blue-700' },
          { label: 'Attended',      value: s.attended,        color: 'bg-green-50 text-green-700' },
          { label: 'Absent',        value: s.absent,          color: 'bg-red-50 text-red-700' },
          { label: 'Late',          value: s.late,            color: 'bg-amber-50 text-amber-700' },
          { label: 'Attendance %',  value: `${s.attendance_rate}%`, color: 'bg-purple-50 text-purple-700' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl p-4 text-center ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs mt-1 opacity-70">{stat.label}</p>
          </div>
        ))}
      </div>
 
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {['Staff','Date','Position','Scheduled','Actual In','Actual Out','Status','Hours'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.report?.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{row.staff?.name}</td>
                <td className="px-4 py-3 text-gray-500">{row.date}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{row.position ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{row.scheduled_start?.slice(0,5)} – {row.scheduled_end?.slice(0,5)}</td>
                <td className="px-4 py-3 text-gray-500">{row.actual_clock_in ? dayjs(row.actual_clock_in).format('HH:mm') : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{row.actual_clock_out ? dayjs(row.actual_clock_out).format('HH:mm') : '—'}</td>
                <td className="px-4 py-3">
                  <Badge
                    label={row.status}
                    color={row.status === 'on_time' ? 'green' : row.status === 'late' ? 'amber' : 'red'}
                  />
                </td>
                <td className="px-4 py-3 text-gray-700 font-medium">{row.hours_worked ? `${row.hours_worked}h` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 
function StaffingGapsReport({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
        <div className="text-2xl font-bold text-red-600">{data.total_gap_shifts}</div>
        <div>
          <p className="font-semibold text-red-800">Total gap shifts across the week</p>
          <p className="text-sm text-red-600">Positions where not enough staff were assigned</p>
        </div>
      </div>
 
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {['Date','Position','Airline','Operation','Terminal','Required','Assigned','Gap'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.gaps?.map((gap: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{gap.date}</td>
                <td className="px-4 py-3 font-medium text-gray-900 text-xs">{gap.position}</td>
                <td className="px-4 py-3 text-gray-500">{gap.airline}</td>
                <td className="px-4 py-3 text-gray-500">{gap.operation}</td>
                <td className="px-4 py-3 text-gray-500">{gap.terminal}</td>
                <td className="px-4 py-3 text-center">{gap.required}</td>
                <td className="px-4 py-3 text-center text-amber-600 font-semibold">{gap.assigned}</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                    -{gap.gap}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 
function HoursSummaryReport({ data }: { data: any }) {
  const chartData = (data.staff ?? [])
    .sort((a: any, b: any) => b.total_hours - a.total_hours)
    .slice(0, 15);
 
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-700">{data.totals?.total_hours_all_staff}h</p>
          <p className="text-xs text-blue-600 mt-1">Total hours all staff</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-700">{data.totals?.avg_hours_per_staff}h</p>
          <p className="text-xs text-green-600 mt-1">Average per staff member</p>
        </div>
      </div>
 
      <div className="bg-white rounded-xl border p-4">
        <p className="text-sm font-bold text-gray-700 mb-3">Top 15 staff by hours worked</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="total_hours" fill="#3B8BD4" radius={[0,4,4,0]}>
              {chartData.map((entry: any, i: number) => (
                <Cell key={i} fill={entry.over_under_hours > 0 ? '#EF9F27' : '#3B8BD4'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
 
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {['Staff','Role','Contract','Scheduled','Attended','Hours Worked','Contract Hours','Variance'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.staff?.map((s: any) => (
              <tr key={s.employee_id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.employee_id}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{s.job_role?.replace(/_/g,' ')}</td>
                <td className="px-4 py-3">
                  <Badge label={s.contract_type?.replace('_',' ')} color={s.contract_type === 'full_time' ? 'green' : 'blue'} />
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{s.scheduled_shifts}</td>
                <td className="px-4 py-3 text-center text-gray-600">{s.attended_shifts}</td>
                <td className="px-4 py-3 text-center font-semibold text-gray-900">{s.total_hours}h</td>
                <td className="px-4 py-3 text-center text-gray-500">{s.contract_hours}h</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-bold ${s.over_under_hours > 0 ? 'text-amber-600' : s.over_under_hours < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {s.over_under_hours > 0 ? '+' : ''}{s.over_under_hours}h
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}