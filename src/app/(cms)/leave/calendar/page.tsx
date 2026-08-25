'use client';
// FILE: src/app/(cms)/leave/calendar/page.tsx

import { useEffect, useState, useCallback } from 'react';
import dayjs from '@/lib/dayjs-setup';
import { leaveApi } from '@/lib/leave-api';
import PageHeader from '@/components/shared/PageHeader';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Users, Sun } from 'lucide-react';

const LEAVE_COLORS: Record<string, string> = {
  annual:        '#3B8BD4',
  sick:          '#E24B4A',
  compassionate: '#534AB7',
  maternity:     '#C45FBD',
  paternity:     '#0F6E56',
  unpaid:        '#888780',
};

export default function LeaveCalendarPage() {
  const [month,    setMonth]    = useState(dayjs().format('YYYY-MM'));
  const [data,     setData]     = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leaveApi.calendar(month);
      setData(res.data);
    } catch {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => setMonth(dayjs(month).subtract(1, 'month').format('YYYY-MM'));
  const nextMonth = () => setMonth(dayjs(month).add(1, 'month').format('YYYY-MM'));

  const startOfMonth = dayjs(month + '-01');
  const endOfMonth   = startOfMonth.endOf('month');
  const startPad     = startOfMonth.day() === 0 ? 6 : startOfMonth.day() - 1;
  const totalCells   = Math.ceil((startPad + endOfMonth.date()) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const date = startOfMonth.subtract(startPad, 'day').add(i, 'day');
    return {
      date:        date.format('YYYY-MM-DD'),
      day:         date.date(),
      isThisMonth: date.month() === startOfMonth.month(),
      isToday:     date.isSame(dayjs(), 'day'),
      isWeekend:   date.day() === 0 || date.day() === 6,
    };
  });

  const holidays        = data?.holidays ?? [];
  const byDate          = data?.by_date  ?? {};
  const selectedEntries = selected ? (byDate[selected] ?? []) : [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Leave Calendar"
        subtitle="See who is on leave each day"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/leave"
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs
                font-bold text-slate-600 hover:bg-slate-50">
              ← Applications
            </Link>
            <Link href="/leave/balance"
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs
                font-bold text-slate-600 hover:bg-slate-50">
              Balances
            </Link>
          </div>
        }
      />

      {/* Month navigator */}
      <div className="flex items-center gap-4 px-5 py-3 bg-white border-b shrink-0">
        <button onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg border
            border-slate-200 hover:bg-slate-50 transition-colors">
          <ChevronLeft size={16} />
        </button>

        <h2 className="text-lg font-black text-slate-900 flex-1 text-center">
          {dayjs(month).format('MMMM YYYY')}
        </h2>

        <button onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg border
            border-slate-200 hover:bg-slate-50 transition-colors">
          <ChevronRight size={16} />
        </button>

        {data && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users size={13} />
            <span>{data.total_on_leave_today} on leave today</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* Calendar grid */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent
                rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 bg-slate-900 text-white">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                  <div key={d} className="text-center py-3 text-xs font-bold">{d}</div>
                ))}
              </div>

              {/* Date cells */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
                {cells.map(cell => {
                  const entries    = byDate[cell.date] ?? [];
                  const holiday    = holidays.find((h: any) =>
                    dayjs(h.date).format('YYYY-MM-DD') === cell.date
                  );
                  const isSelected = selected === cell.date;

                  return (
                    <div
                      key={cell.date}
                      onClick={() =>
                        setSelected(cell.isThisMonth
                          ? isSelected ? null : cell.date
                          : null
                        )
                      }
                      className={`min-h-[90px] p-1.5 transition-colors
                        ${!cell.isThisMonth ? 'bg-slate-50/60 opacity-40' : ''}
                        ${cell.isWeekend && cell.isThisMonth ? 'bg-slate-50' : ''}
                        ${cell.isToday ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}
                        ${isSelected ? 'bg-amber-50 ring-2 ring-inset ring-amber-400' : ''}
                        ${cell.isThisMonth && !cell.isWeekend
                          ? 'cursor-pointer hover:bg-slate-50' : ''}
                      `}
                    >
                      {/* Date number */}
                      <div className={`w-6 h-6 flex items-center justify-center
                        text-xs font-bold rounded-full mb-1
                        ${cell.isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                        {cell.day}
                      </div>

                      {/* Public holiday */}
                      {holiday && (
                        <div className="flex items-center gap-0.5 mb-0.5">
                          <Sun size={8} className="text-amber-500 shrink-0" />
                          <p className="text-[8px] text-amber-600 font-semibold truncate">
                            {holiday.name}
                          </p>
                        </div>
                      )}

                      {/* Leave entries */}
                      {entries.slice(0, 3).map((e: any, i: number) => (
                        <div
                          key={i}
                          className="text-[9px] font-bold text-white px-1.5 py-0.5
                            rounded mb-0.5 truncate"
                          style={{ backgroundColor: LEAVE_COLORS[e.leave_type] ?? '#3B8BD4' }}
                          title={`${e.user.name} — ${e.type_name}`}
                        >
                          {e.user.name.split(' ')[0]}
                        </div>
                      ))}
                      {entries.length > 3 && (
                        <div className="text-[9px] text-slate-500 font-bold px-1">
                          +{entries.length - 3} more
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-64 border-l bg-white overflow-y-auto shrink-0">
          {selected ? (
            <div className="p-4">
              <p className="font-bold text-slate-900 text-sm mb-1">
                {dayjs(selected).format('dddd D MMMM YYYY')}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                {selectedEntries.length} staff on leave
              </p>

              {selectedEntries.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Sun size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold">All staff in</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEntries.map((e: any, i: number) => (
                    <div key={i}
                      className="p-3 rounded-xl border border-slate-100
                        hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center
                          justify-center text-blue-700 text-[10px] font-black shrink-0">
                          {e.user.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {e.user.name}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            {e.user.employee_id}
                            {e.user.terminal ? ` · ${e.user.terminal}` : ''}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[9px] font-bold text-white px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: LEAVE_COLORS[e.leave_type] ?? '#3B8BD4' }}
                      >
                        {e.type_name ?? e.leave_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full
              text-slate-400 p-4 text-center">
              <Users size={28} className="mb-2 opacity-30" />
              <p className="text-xs font-semibold">
                Click a date to see who is on leave
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}