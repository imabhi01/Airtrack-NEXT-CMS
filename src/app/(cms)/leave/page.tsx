'use client';

import { useEffect, useState, useCallback } from 'react';
import dayjs from '@/lib/dayjs-setup';
import toast from 'react-hot-toast';
import { leaveApi } from '@/lib/leave-api';
import PageHeader from '@/components/shared/PageHeader';
import Modal from '@/components/shared/Modal';
import Link from 'next/link';
import {
  CheckCircle, XCircle, Clock, Search,
  Filter, RefreshCw, Eye, Umbrella,
  ChevronDown, CalendarDays, FileText,
  AlertTriangle, UserCheck, Plus,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Application {
  id:           string;
  leave_type:   string;
  start_date:   string;
  end_date:     string;
  total_days:   number;
  reason:       string | null;
  status:       string;
  status_label: string;
  status_color: string;
  created_at:   string;
  user: {
    id:          string;
    name:        string;
    employee_id: string;
    job_role:    string;
    terminal?:   { code: string } | null;
  };
  leave_type_detail?: {
    name:  string;
    color: string;
  } | null;
  reviewer?:   { name: string } | null;
  approved_at?: string | null;
  reviewed_at?: string | null;
  review_notes?:string | null;
  document_path?: string | null;
}

interface Summary {
  pending:   number;
  approved:  number;
  rejected:  number;
  cancelled: number;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS = {
  pending:   { label: 'Pending',   bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500'  },
  approved:  { label: 'Approved',  bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
  rejected:  { label: 'Rejected',  bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
  cancelled: { label: 'Cancelled', bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400'  },
} as Record<string, { label: string; bg: string; text: string; dot: string }>;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function LeavePage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [summary,      setSummary]      = useState<Summary | null>(null);
  const [leaveTypes,   setLeaveTypes]   = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);

  // Modals
  const [viewModal,    setViewModal]    = useState<Application | null>(null);
  const [approveModal, setApproveModal] = useState<Application | null>(null);
  const [rejectModal,  setRejectModal]  = useState<Application | null>(null);
  const [applyModal,   setApplyModal]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, typeRes] = await Promise.all([
        leaveApi.list({
          status:     filterStatus || undefined,
          leave_type: filterType   || undefined,
          search:     search       || undefined,
          page,
          per_page:   15,
        }),
        leaveApi.types(),
      ]);

      setApplications(appRes.data.applications?.data  ?? []);
      setSummary(appRes.data.summary);
      setTotalPages(appRes.data.applications?.last_page ?? 1);
      setLeaveTypes(typeRes.data.types ?? []);
    } catch {
      toast.error('Failed to load leave applications');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, search, page]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string, notes: string) => {
    try {
      await leaveApi.approve(id, notes);
      toast.success('Leave approved — staff notified');
      setApproveModal(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Approval failed');
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await leaveApi.reject(id, reason);
      toast.success('Leave rejected — staff notified');
      setRejectModal(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Rejection failed');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this leave application?')) return;
    try {
      await leaveApi.cancel(id);
      toast.success('Leave cancelled');
      load();
    } catch {
      toast.error('Failed to cancel');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Leave Management"
        subtitle="Review, approve and track all staff leave applications"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/leave/calendar"
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200
                rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">
              <CalendarDays size={13} /> Calendar
            </Link>
            <Link href="/leave/balance"
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200
                rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">
              <Umbrella size={13} /> Balances
            </Link>
            <button
              onClick={() => setApplyModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white
                rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              <Plus size={13} /> Apply Leave
            </button>
          </div>
        }
      />

      {/* Summary strip */}
      {summary && (
        <div className="grid grid-cols-4 gap-3 px-5 py-3 bg-white border-b shrink-0">
          {[
            { key: 'pending',   label: 'Pending',   icon: Clock,        color: 'amber' },
            { key: 'approved',  label: 'Approved',  icon: CheckCircle,  color: 'green' },
            { key: 'rejected',  label: 'Rejected',  icon: XCircle,      color: 'red'   },
            { key: 'cancelled', label: 'Cancelled', icon: AlertTriangle, color: 'slate'},
          ].map(({ key, label, icon: Icon, color }) => {
            const count = (summary as any)[key] ?? 0;
            const colors: Record<string, string> = {
              amber: 'bg-amber-50 text-amber-700',
              green: 'bg-green-50 text-green-700',
              red:   'bg-red-50 text-red-700',
              slate: 'bg-slate-100 text-slate-600',
            };
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all border-2
                  ${filterStatus === key
                    ? 'border-blue-500 ring-2 ring-blue-100'
                    : 'border-transparent'
                  }
                  ${colors[color]}`}
              >
                <Icon size={18} className="shrink-0" />
                <div className="text-left">
                  <p className="text-xl font-black leading-none">{count}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide
                    opacity-70 mt-0.5">{label}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 border-b shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search staff name or ID..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl
              text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-xs
            bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Leave Types</option>
          {leaveTypes.map(t => (
            <option key={t.code} value={t.code}>{t.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-xs
            bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button onClick={load}
          className="w-8 h-8 flex items-center justify-center border border-slate-200
            rounded-xl text-slate-500 hover:bg-white transition-colors">
          <RefreshCw size={13} />
        </button>

        <span className="text-xs text-slate-400 ml-auto">
          {applications.length} applications
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Umbrella size={32} className="mb-2 opacity-30" />
            <p className="font-semibold">No leave applications found</p>
            <p className="text-xs mt-1">Try adjusting the filters above</p>
          </div>
        ) : (
          <div className="min-w-[900px]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-bold w-48">Staff</th>
                  <th className="text-left px-4 py-3 font-bold">Leave Type</th>
                  <th className="text-left px-4 py-3 font-bold">Dates</th>
                  <th className="text-center px-4 py-3 font-bold">Days</th>
                  <th className="text-left px-4 py-3 font-bold">Status</th>
                  <th className="text-left px-4 py-3 font-bold">Applied</th>
                  <th className="text-center px-4 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, idx) => {
                  const statusCfg = STATUS[app.status] ?? STATUS.cancelled;
                  const typeColor = app.leave_type_detail?.color ?? '#3B8BD4';
                  const isPending = app.status === 'pending';

                  return (
                    <tr
                      key={app.id}
                      className={`border-b border-slate-100 hover:bg-blue-50/30
                        transition-colors
                        ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                        ${isPending ? 'border-l-4 border-l-amber-400' : ''}`}
                    >
                      {/* Staff */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center
                            justify-center text-blue-700 text-xs font-black shrink-0">
                            {app.user.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {app.user.name}
                            </p>
                            <p className="text-[9px] text-slate-400">
                              {app.user.employee_id}
                              {app.user.terminal ? ` · ${app.user.terminal.code}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Leave type */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: typeColor }}
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            {app.leave_type_detail?.name ?? app.leave_type}
                          </span>
                        </div>
                        {app.document_path && (
                          <span className="text-[9px] text-blue-600 flex items-center
                            gap-0.5 mt-0.5">
                            <FileText size={8} /> Doc attached
                          </span>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-800">
                          {dayjs(app.start_date).format('D MMM YYYY')}
                        </p>
                        {app.start_date !== app.end_date && (
                          <p className="text-[10px] text-slate-400">
                            → {dayjs(app.end_date).format('D MMM YYYY')}
                          </p>
                        )}
                      </td>

                      {/* Days */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-black text-slate-800">
                          {app.total_days}
                        </span>
                        <span className="text-[9px] text-slate-400 block">days</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1
                            rounded-full text-[10px] font-bold w-fit
                            ${statusCfg.bg} ${statusCfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                          {app.reviewer && (
                            <p className="text-[9px] text-slate-400">
                              by {app.reviewer.name}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Applied */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-600">
                          {dayjs(app.created_at).format('D MMM')}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {dayjs(app.created_at).format('HH:mm')}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View */}
                          <button
                            onClick={() => setViewModal(app)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500
                              transition-colors" title="View details"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Approve */}
                          {isPending && (
                            <button
                              onClick={() => setApproveModal(app)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500
                                text-white rounded-lg text-[10px] font-bold
                                hover:bg-green-600 transition-colors"
                            >
                              <CheckCircle size={11} /> Approve
                            </button>
                          )}

                          {/* Reject */}
                          {isPending && (
                            <button
                              onClick={() => setRejectModal(app)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500
                                text-white rounded-lg text-[10px] font-bold
                                hover:bg-red-600 transition-colors"
                            >
                              <XCircle size={11} /> Reject
                            </button>
                          )}

                          {/* Cancel approved */}
                          {app.status === 'approved' &&
                            dayjs(app.start_date).isAfter(dayjs()) && (
                            <button
                              onClick={() => handleCancel(app.id)}
                              className="px-2.5 py-1.5 border border-slate-200 text-slate-500
                                rounded-lg text-[10px] font-bold hover:bg-slate-50
                                transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 border-t">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 border rounded-lg text-xs font-semibold
                    disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border rounded-lg text-xs font-semibold
                    disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {viewModal    && <ViewModal    app={viewModal}    onClose={() => setViewModal(null)}    />}
      {approveModal && <ApproveModal app={approveModal} onClose={() => setApproveModal(null)} onApprove={handleApprove} />}
      {rejectModal  && <RejectModal  app={rejectModal}  onClose={() => setRejectModal(null)}  onReject={handleReject}   />}
      {applyModal   && (
        <ApplyLeaveModal
          leaveTypes={leaveTypes}
          onClose={() => setApplyModal(false)}
          onSaved={() => { setApplyModal(false); load(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW APPLICATION MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ViewModal({ app, onClose }: { app: Application; onClose: () => void }) {
  const statusCfg  = STATUS[app.status] ?? STATUS.cancelled;
  const typeColor  = app.leave_type_detail?.color ?? '#3B8BD4';

  return (
    <Modal open title="Leave Application" onClose={onClose} size="md">
      <div className="space-y-4">

        {/* Staff info */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center
            justify-center text-blue-700 font-black text-sm shrink-0">
            {app.user.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900">{app.user.name}</p>
            <p className="text-xs text-slate-500">
              {app.user.employee_id} · {app.user.job_role?.replace(/_/g,' ')}
            </p>
          </div>
          <span className={`ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full
            ${statusCfg.bg} ${statusCfg.text}`}>
            {statusCfg.label}
          </span>
        </div>

        {/* Leave details grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Leave Type', value: app.leave_type_detail?.name ?? app.leave_type, color: typeColor },
            { label: 'Total Days', value: `${app.total_days} working days` },
            { label: 'From',       value: dayjs(app.start_date).format('ddd D MMM YYYY') },
            { label: 'To',         value: dayjs(app.end_date).format('ddd D MMM YYYY')   },
            { label: 'Applied On', value: dayjs(app.created_at).format('D MMM YYYY HH:mm') },
            { label: 'Document',   value: app.document_path ? 'Attached ✓' : 'None' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5" style={color ? { color } : {}}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Reason */}
        {app.reason && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Reason</p>
            <p className="text-sm text-slate-700">{app.reason}</p>
          </div>
        )}

        {/* Review info */}
        {app.reviewer && (
          <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
            <p className="text-[10px] font-bold text-green-600 uppercase mb-1">
              {app.status === 'approved' ? 'Approved' : 'Reviewed'} By
            </p>
            <p className="text-sm font-semibold text-slate-800">{app.reviewer.name}</p>
            {app.reviewed_at && (
              <p className="text-xs text-slate-500 mt-0.5">
                {dayjs(app.reviewed_at).format('D MMM YYYY HH:mm')}
              </p>
            )}
            {app.review_notes && (
              <p className="text-xs text-slate-600 mt-1 italic">"{app.review_notes}"</p>
            )}
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

// ─────────────────────────────────────────────────────────────────────────────
// APPROVE MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ApproveModal({
  app, onClose, onApprove,
}: {
  app:       Application;
  onClose:   () => void;
  onApprove: (id: string, notes: string) => void;
}) {
  const [notes,    setNotes]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async () => {
    setLoading(true);
    await onApprove(app.id, notes);
    setLoading(false);
  };

  return (
    <Modal open title="Approve Leave" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <UserCheck size={20} className="text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-green-900">{app.user.name}</p>
              <p className="text-xs text-green-700 mt-0.5">
                {app.leave_type_detail?.name ?? app.leave_type} ·{' '}
                {dayjs(app.start_date).format('D MMM')} –{' '}
                {dayjs(app.end_date).format('D MMM YYYY')} ·{' '}
                {app.total_days} days
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Notes for staff (optional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Approved — please ensure handover notes are left for the team"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
          Approving will deduct <strong>{app.total_days} days</strong> from{' '}
          {app.user.name}'s{' '}
          {app.leave_type_detail?.name ?? app.leave_type} balance
          and send them a push notification.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold
              text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl
              text-sm font-bold hover:bg-green-700 disabled:opacity-60
              flex items-center justify-center gap-2"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-white
                  rounded-full animate-spin" />
              : <><CheckCircle size={15} /> Approve Leave</>
            }
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REJECT MODAL
// ─────────────────────────────────────────────────────────────────────────────

function RejectModal({
  app, onClose, onReject,
}: {
  app:      Application;
  onClose:  () => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [reason,  setReason]  = useState('');
  const [loading, setLoading] = useState(false);

  const QUICK_REASONS = [
    'Insufficient leave balance',
    'Operational requirements — too many staff off',
    'Peak period — leave restricted',
    'Minimum notice period not met',
    'Shift cover not available',
  ];

  const submit = async () => {
    if (!reason.trim()) { toast.error('Rejection reason is required'); return; }
    setLoading(true);
    await onReject(app.id, reason);
    setLoading(false);
  };

  return (
    <Modal open title="Reject Leave" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="font-bold text-red-900">{app.user.name}</p>
          <p className="text-xs text-red-700 mt-0.5">
            {app.leave_type_detail?.name ?? app.leave_type} ·{' '}
            {dayjs(app.start_date).format('D MMM')} –{' '}
            {dayjs(app.end_date).format('D MMM YYYY')} ·{' '}
            {app.total_days} days
          </p>
        </div>

        {/* Quick reason buttons */}
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">
            Quick Reasons
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold
                  border transition-all
                  ${reason === r
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Rejection Reason *
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder="Explain why the leave cannot be approved..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
          The leave balance will be restored and {app.user.name} will
          receive a push notification with your reason.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold
              text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || !reason.trim()}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl
              text-sm font-bold hover:bg-red-700 disabled:opacity-60
              flex items-center justify-center gap-2"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-white
                  rounded-full animate-spin" />
              : <><XCircle size={15} /> Reject Leave</>
            }
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY LEAVE MODAL — manager applying on behalf of staff
// ─────────────────────────────────────────────────────────────────────────────

function ApplyLeaveModal({
  leaveTypes, onClose, onSaved,
}: {
  leaveTypes: any[];
  onClose:    () => void;
  onSaved:    () => void;
}) {
  const [staff,      setStaff]      = useState<any[]>([]);
  const [form,       setForm]       = useState({
    user_id:    '',
    leave_type: 'annual',
    start_date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    end_date:   dayjs().add(1, 'day').format('YYYY-MM-DD'),
    reason:     '',
  });
  const [workingDays, setWorkingDays] = useState<number | null>(null);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    import('@/lib/api').then(({ default: api }) => {
      api.get('/cms/staff').then(r => setStaff(r.data.data ?? []));
    });
  }, []);

  // Estimate working days client-side
  useEffect(() => {
    if (!form.start_date || !form.end_date) return;
    const start = dayjs(form.start_date);
    const end   = dayjs(form.end_date);
    if (end.isBefore(start)) { setWorkingDays(0); return; }
    let days = 0;
    let cur  = start.clone();
    while (cur.isBefore(end) || cur.isSame(end)) {
      if (cur.day() !== 0 && cur.day() !== 6) days++;
      cur = cur.add(1, 'day');
    }
    setWorkingDays(days);
  }, [form.start_date, form.end_date]);

  const handleSave = async () => {
    if (!form.user_id)    { toast.error('Select a staff member'); return; }
    if (!form.leave_type) { toast.error('Select leave type');     return; }
    setSaving(true);
    try {
      await leaveApi.apply(form);
      toast.success('Leave application submitted');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to apply');
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal open title="Apply Leave — On Behalf of Staff" onClose={onClose} size="md">
      <div className="space-y-4">

        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs
          text-blue-700">
          As a manager you can apply leave on behalf of any staff member.
          The application will go through the normal approval process.
        </div>

        {/* Staff */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Staff Member *
          </label>
          <select value={form.user_id} onChange={e => set('user_id', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select staff member...</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.employee_id})
              </option>
            ))}
          </select>
        </div>

        {/* Leave type */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Leave Type *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {leaveTypes.map(t => (
              <button
                key={t.code}
                onClick={() => set('leave_type', t.code)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border-2
                  text-xs font-semibold transition-all
                  ${form.leave_type === t.code
                    ? 'text-white border-transparent'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                style={form.leave_type === t.code
                  ? { backgroundColor: t.color, borderColor: t.color }
                  : {}
                }
              >
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: form.leave_type === t.code ? 'white' : t.color }} />
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Start Date *
            </label>
            <input type="date" value={form.start_date}
              onChange={e => set('start_date', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              End Date *
            </label>
            <input type="date" value={form.end_date}
              onChange={e => set('end_date', e.target.value)}
              min={form.start_date}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Working days indicator */}
        {workingDays !== null && workingDays > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border
            border-blue-200 rounded-xl text-xs text-blue-700">
            <CalendarDays size={13} />
            <span>
              <strong>{workingDays}</strong> working day{workingDays !== 1 ? 's' : ''}
              {' '}(weekends excluded, public holidays may reduce this)
            </span>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Reason
          </label>
          <input
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
            placeholder="e.g. Family holiday, medical appointment..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold
              text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl
              text-sm font-bold hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </Modal>
  );
}