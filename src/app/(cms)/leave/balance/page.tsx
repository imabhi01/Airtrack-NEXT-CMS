'use client';
// FILE: src/app/(cms)/leave/balance/page.tsx

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { leaveApi } from '@/lib/leave-api';
import PageHeader from '@/components/shared/PageHeader';
import toast from 'react-hot-toast';
import dayjs from '@/lib/dayjs-setup';
import Link from 'next/link';
import { Search, RefreshCw, ChevronDown, Umbrella } from 'lucide-react';

const LEAVE_COLORS: Record<string, string> = {
  annual:        '#3B8BD4',
  sick:          '#E24B4A',
  compassionate: '#534AB7',
  maternity:     '#C45FBD',
  paternity:     '#0F6E56',
  unpaid:        '#888780',
};

export default function LeaveBalancePage() {
  const [staff,      setStaff]      = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [balances,   setBalances]   = useState<Record<string, any[]>>({});
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [year,       setYear]       = useState(dayjs().year());
  const [expanded,   setExpanded]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, typeRes] = await Promise.all([
        api.get('/cms/staff', { params: { per_page: 100 } }),
        leaveApi.types(),
      ]);
      const staffList = staffRes.data.data   ?? [];
      const types     = typeRes.data.types   ?? [];
      setStaff(staffList);
      setLeaveTypes(types);

      // Load all balances in parallel
      const balanceMap: Record<string, any[]> = {};
      await Promise.all(
        staffList.map(async (s: any) => {
          try {
            const res = await leaveApi.balance({ user_id: s.id, year });
            balanceMap[s.id] = res.data.summary ?? [];
          } catch {
            balanceMap[s.id] = [];
          }
        })
      );
      setBalances(balanceMap);
    } catch {
      toast.error('Failed to load balances');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const filtered = staff.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.employee_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Leave Balances"
        subtitle={`All staff leave balances — ${year}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/leave"
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs
                font-bold text-slate-600 hover:bg-slate-50">
              ← Applications
            </Link>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* Search */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl
              text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button onClick={load}
          className="w-8 h-8 flex items-center justify-center border border-slate-200
            rounded-xl text-slate-500 hover:bg-slate-50 transition-colors">
          <RefreshCw size={13} />
        </button>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} staff</span>
      </div>

      {/* Balance list */}
      <div className="flex-1 overflow-auto p-5 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Umbrella size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No staff found</p>
          </div>
        ) : filtered.map(member => {
          const memberBalances = balances[member.id] ?? [];
          const annualBalance  = memberBalances.find((b: any) => b.leave_type === 'annual');
          const isExpanded     = expanded === member.id;

          return (
            <div key={member.id}
              className="bg-white rounded-2xl border overflow-hidden
                hover:border-slate-300 transition-colors">

              {/* Header row — always visible */}
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer
                  hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : member.id)}
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center
                  justify-center text-blue-700 text-xs font-black shrink-0">
                  {member.name.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">
                    {member.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {member.employee_id}
                    {member.terminal ? ` · ${member.terminal.code}` : ''}
                  </p>
                </div>

                {/* Annual leave quick view */}
                {annualBalance ? (
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-black text-slate-900">
                        {annualBalance.remaining} left
                      </p>
                      <p className="text-[9px] text-slate-400">
                        of {annualBalance.entitlement} days
                      </p>
                    </div>
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width:           `${Math.min(100, annualBalance.used_percent)}%`,
                          backgroundColor: LEAVE_COLORS.annual,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 w-8 text-right">
                      {annualBalance.used_percent}%
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 shrink-0">No balance set</span>
                )}

                <ChevronDown
                  size={15}
                  className={`text-slate-400 shrink-0 transition-transform
                    ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>

              {/* Expanded — all leave type balances */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-4 py-4">
                  {memberBalances.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No balance records for {year}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {memberBalances.map((b: any) => {
                        const color = LEAVE_COLORS[b.leave_type] ?? '#888780';
                        return (
                          <div key={b.leave_type}
                            className="p-3 rounded-xl border border-slate-100">

                            {/* Type header */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: color }} />
                              <p className="text-[10px] font-bold text-slate-600 truncate flex-1">
                                {b.name}
                              </p>
                              {!b.is_paid && (
                                <span className="text-[8px] bg-slate-100 text-slate-500
                                  px-1.5 py-0.5 rounded-full shrink-0">
                                  unpaid
                                </span>
                              )}
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-1.5 bg-slate-200 rounded-full
                              overflow-hidden mb-2">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width:           `${Math.min(100, b.used_percent)}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>

                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-1 text-center">
                              <div>
                                <p className="text-[11px] font-black text-slate-700">
                                  {b.entitlement}
                                </p>
                                <p className="text-[9px] text-slate-400">Total</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-black"
                                  style={{ color }}>
                                  {b.used}
                                </p>
                                <p className="text-[9px] text-slate-400">Used</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-slate-700">
                                  {b.remaining}
                                </p>
                                <p className="text-[9px] text-slate-400">Left</p>
                              </div>
                            </div>

                            {/* Pending indicator */}
                            {b.pending > 0 && (
                              <p className="text-[9px] text-amber-600 text-center
                                mt-1.5 bg-amber-50 rounded-lg py-0.5 font-semibold">
                                {b.pending} days pending
                              </p>
                            )}

                            {/* Carried over */}
                            {b.carried_over > 0 && (
                              <p className="text-[9px] text-blue-600 text-center
                                mt-1 bg-blue-50 rounded-lg py-0.5 font-semibold">
                                +{b.carried_over} carried over
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}