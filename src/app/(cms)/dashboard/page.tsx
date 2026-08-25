'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import {
  Users, Clock, AlertTriangle, Calendar,
  TrendingUp, CheckCircle, XCircle, Plane,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid,
} from 'recharts';
import dayjs from 'dayjs';
 
export default function DashboardPage() {
  const [overview,  setOverview]  = useState<any>(null);
  const [live,      setLive]      = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
 
  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard/overview'),
      api.get('/admin/dashboard/live'),
    ]).then(([ov, lv]) => {
      setOverview(ov.data);
      setLive(lv.data);
    }).finally(() => setLoading(false));
 
    // Auto-refresh live data every 60s
    const interval = setInterval(() => {
      api.get('/admin/dashboard/live').then(r => setLive(r.data));
    }, 60000);
    return () => clearInterval(interval);
  }, []);
 
  if (loading) return <LoadingSpinner />;
 
  const totals = overview?.totals ?? {};
 
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Live overview · ${dayjs().format('dddd, D MMMM YYYY')}`}
      />
 
      <div className="p-6 space-y-6">
 
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Staff"    value={totals.total_staff   ?? 0} icon={Users}        color="blue"   />
          <StatCard label="Clocked In"     value={totals.clocked_in    ?? 0} icon={Clock}        color="green"  />
          <StatCard label="On Shift"       value={totals.total_on_shift?? 0} icon={Calendar}     color="purple" />
          <StatCard label="Open Anomalies" value={totals.open_anomalies?? 0} icon={AlertTriangle} color="red"   />
        </div>
 
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 
          {/* Live attendance */}
          <div className="lg:col-span-2 bg-white rounded-xl border">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Live Attendance</h2>
              <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {live?.clocked_in?.length === 0 && (
                <p className="text-center text-gray-400 py-10 text-sm">No staff currently clocked in</p>
              )}
              {live?.clocked_in?.map((entry: any) => (
                <div key={entry.staff?.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-blue-600 text-xs font-bold">
                      {entry.staff?.name?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{entry.staff?.name}</p>
                    <p className="text-xs text-gray-400">
                      {entry.staff?.employee_id} · {entry.terminal?.name ?? 'Unknown terminal'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold
                      ${entry.duty_mode === 'airside'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'}`}>
                      {entry.duty_mode}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Since {dayjs(entry.clock_in_at).format('HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
 
          {/* By terminal */}
          <div className="bg-white rounded-xl border">
            <div className="px-5 py-4 border-b">
              <h2 className="font-bold text-gray-900">By Terminal</h2>
            </div>
            <div className="p-5">
              {overview?.by_terminal?.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={overview?.by_terminal ?? []}>
                    <XAxis dataKey="terminal" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B8BD4" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
 
        {/* Recent anomalies */}
        <div className="bg-white rounded-xl border">
          <div className="px-5 py-4 border-b">
            <h2 className="font-bold text-gray-900">Recent Anomalies</h2>
          </div>
          <div className="divide-y">
            {overview?.recent_anomalies?.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">No open anomalies — all clear ✓</p>
            )}
            {overview?.recent_anomalies?.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{a.user?.name}</p>
                  <p className="text-xs text-gray-500">{a.description}</p>
                </div>
                <p className="text-xs text-gray-400">{dayjs(a.anomaly_date).format('D MMM')}</p>
              </div>
            ))}
          </div>
        </div>
 
        {/* Pending leave */}
        {(overview?.pending_leave_applications?.length ?? 0) > 0 && (
          <div className="bg-white rounded-xl border">
            <div className="px-5 py-4 border-b">
              <h2 className="font-bold text-gray-900">
                Pending Leave ({overview.pending_leave_applications.length})
              </h2>
            </div>
            <div className="divide-y">
              {overview.pending_leave_applications.map((app: any) => (
                <div key={app.id} className="flex items-center gap-3 px-5 py-3">
                  <Plane size={16} className="text-blue-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{app.user?.name}</p>
                    <p className="text-xs text-gray-500">
                      {app.leave_type} · {dayjs(app.start_date).format('D MMM')} – {dayjs(app.end_date).format('D MMM YYYY')}
                    </p>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
 
      </div>
    </div>
  );
}
 
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}