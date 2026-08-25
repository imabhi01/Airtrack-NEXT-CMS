'use client';
export default function RosterStats({ week, stats }: { week: any; stats: any }) {
  const pct = stats?.coverage_percent ?? 0;
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
 
  return (
    <div className="flex items-center gap-6 px-5 py-2.5 bg-gray-50 border-b text-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Shifts:</span>
        <span className="font-bold text-gray-900">{stats?.total_shifts ?? 0}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Staff rostered:</span>
        <span className="font-bold text-gray-900">{stats?.staff_scheduled ?? 0}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Uncovered:</span>
        <span className={`font-bold ${(stats?.uncovered_positions ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {stats?.uncovered_positions ?? 0}
        </span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-gray-500">Coverage:</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="font-bold text-gray-900">{pct}%</span>
        </div>
      </div>
    </div>
  );
}