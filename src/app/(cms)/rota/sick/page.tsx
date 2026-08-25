'use client';
// FILE: src/app/(cms)/rota/sick/page.tsx
// Sick cover dashboard — see all sick staff, flagged shifts, assign cover

import { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { rotaApi } from '@/lib/rota-api';
import api from '@/lib/api';
import PageHeader from '@/components/shared/PageHeader';
import Modal from '@/components/shared/Modal';
import Badge from '@/components/shared/Badge';
import {
  AlertTriangle, UserMinus, UserCheck, Phone,
  MessageCircle, Smartphone, Mail, CheckCircle,
  XCircle, RefreshCw, ChevronRight, Clock,
  Users, Calendar, Search, Filter, Plus,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SickShift {
  assignment_id: string;
  staff: {
    id:          string;
    name:        string;
    employee_id: string;
  };
  task:        string | null;
  terminal:    string | null;
  start_time:  string;
  end_time:    string;
}

interface AvailableStaff {
  id:          string;
  name:        string;
  employee_id: string;
  job_role:    string;
  terminal:    string | null;
}

interface SickEvent {
  id:           string;
  user_id:      string;
  event_date:   string;
  event_type:   string;
  notified_via: string | null;
  notes:        string | null;
  cover_found:  boolean;
  cover_user_id:string | null;
  recorded_by:  string;
  created_at:   string;
  user?:        { id: string; name: string; employee_id: string };
  coverUser?:   { id: string; name: string } | null;
  recorder?:    { id: string; name: string };
}

// ── Notify via icon map ───────────────────────────────────────────────────────

const NOTIFY_ICONS: Record<string, React.ElementType> = {
  phone:     Phone,
  whatsapp:  MessageCircle,
  app:       Smartphone,
  email:     Mail,
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function SickCoverPage() {
  const [selectedDate, setSelectedDate]  = useState(dayjs().format('YYYY-MM-DD'));
  const [needsCover,   setNeedsCover]    = useState<{ shifts: SickShift[]; available: AvailableStaff[] }>({ shifts: [], available: [] });
  const [sickHistory,  setSickHistory]   = useState<SickEvent[]>([]);
  const [allStaff,     setAllStaff]      = useState<any[]>([]);
  const [loading,      setLoading]       = useState(true);
  const [markModal,    setMarkModal]     = useState(false);
  const [coverModal,   setCoverModal]    = useState<SickShift | null>(null);
  const [search,       setSearch]        = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [coverRes, historyRes, staffRes] = await Promise.all([
        rotaApi.needsCover(selectedDate),
        api.get('/rota/sick/history', { params: { date: selectedDate } }),
        api.get('/cms/staff'),
      ]);

      setNeedsCover({
        shifts:    coverRes.data.shifts_needing_cover ?? [],
        available: coverRes.data.available_staff      ?? [],
      });
      setSickHistory(historyRes.data.events ?? []);
      setAllStaff(staffRes.data.data         ?? []);
    } catch {
      toast.error('Failed to load sick data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  // Navigate dates
  const prevDay = () => setSelectedDate(d => dayjs(d).subtract(1,'day').format('YYYY-MM-DD'));
  const nextDay = () => setSelectedDate(d => dayjs(d).add(1,'day').format('YYYY-MM-DD'));
  const today   = () => setSelectedDate(dayjs().format('YYYY-MM-DD'));

  // Assign cover to a shift
  const handleAssignCover = async (assignmentId: string, coverUserId: string) => {
    try {
      await rotaApi.assignCover(assignmentId, { cover_user_id: coverUserId });
      toast.success('Cover assigned — staff notified by push notification');
      setCoverModal(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to assign cover');
    }
  };

  const isToday    = selectedDate === dayjs().format('YYYY-MM-DD');
  const dayLabel   = isToday ? 'Today' : dayjs(selectedDate).format('ddd D MMM YYYY');
  const uncovered  = needsCover.shifts.length;

  // Filter staff for search
  const filteredAvailable = needsCover.available.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.employee_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Sick Cover Management"
        subtitle="Track sick calls, flag shifts needing cover, assign replacements"
        actions={
          <button
            onClick={() => setMarkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white
              rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
          >
            <UserMinus size={15} /> Mark Staff Sick
          </button>
        }
      />

      {/* Date navigator */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b shrink-0">
        <button onClick={prevDay}
          className="w-8 h-8 flex items-center justify-center rounded-lg border
            border-slate-200 hover:bg-slate-50 transition-colors">
          <ChevronRight size={16} className="rotate-180" />
        </button>

        <div className="flex-1 text-center">
          <p className="font-bold text-slate-900">{dayLabel}</p>
          <p className="text-xs text-slate-400">{dayjs(selectedDate).format('dddd, D MMMM YYYY')}</p>
        </div>

        <button onClick={nextDay}
          className="w-8 h-8 flex items-center justify-center rounded-lg border
            border-slate-200 hover:bg-slate-50 transition-colors">
          <ChevronRight size={16} />
        </button>

        {!isToday && (
          <button onClick={today}
            className="px-3 py-1.5 text-xs font-bold text-blue-600 border border-blue-200
              rounded-lg hover:bg-blue-50 transition-colors">
            Today
          </button>
        )}

        <button onClick={load}
          className="w-8 h-8 flex items-center justify-center rounded-lg border
            border-slate-200 hover:bg-slate-50 transition-colors text-slate-500">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-1 px-5 py-2.5 bg-slate-50 border-b shrink-0">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
          ${uncovered > 0
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'}`}
        >
          {uncovered > 0
            ? <><AlertTriangle size={15} /> {uncovered} shift{uncovered !== 1 ? 's' : ''} need cover</>
            : <><CheckCircle size={15} /> All shifts covered</>
          }
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
          bg-slate-100 text-slate-600 font-semibold">
          <Users size={14} />
          {sickHistory.length} sick call{sickHistory.length !== 1 ? 's' : ''} today
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
          bg-blue-50 text-blue-700 font-semibold">
          <UserCheck size={14} />
          {needsCover.available.length} available for cover
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-0">

        {/* ── Left: Sick events + flagged shifts ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto border-r border-slate-200">

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-4 border-red-500 border-t-transparent
                rounded-full animate-spin" />
            </div>
          ) : (
            <div className="p-5 space-y-5">

              {/* ── Sick calls today ─────────────────────────────────────────── */}
              <section>
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                  Sick Calls — {dayLabel}
                </h2>

                {sickHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 border border-dashed
                    border-slate-200 rounded-2xl">
                    <CheckCircle size={28} className="mx-auto mb-2 text-green-400" />
                    <p className="font-semibold">No sick calls recorded</p>
                    <p className="text-xs mt-1">All staff are in</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sickHistory.map(event => {
                      const NotifyIcon = NOTIFY_ICONS[event.notified_via ?? 'phone'] ?? Phone;
                      return (
                        <div key={event.id}
                          className="bg-white border border-slate-200 rounded-2xl overflow-hidden
                            hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center
                              justify-center text-red-600 font-black shrink-0">
                              {event.user?.name.charAt(0) ?? '?'}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900">{event.user?.name}</p>
                              <p className="text-xs text-slate-400">{event.user?.employee_id}</p>
                            </div>

                            {/* Notified via */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                              <NotifyIcon size={13} />
                              <span className="capitalize">{event.notified_via ?? 'phone'}</span>
                            </div>

                            {/* Cover status */}
                            {event.cover_found ? (
                              <span className="flex items-center gap-1 text-xs font-bold
                                text-green-600 bg-green-100 px-2.5 py-1 rounded-full shrink-0">
                                <CheckCircle size={11} /> Cover Found
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-bold
                                text-red-600 bg-red-100 px-2.5 py-1 rounded-full shrink-0 animate-pulse">
                                <AlertTriangle size={11} /> Needs Cover
                              </span>
                            )}
                          </div>

                          {event.notes && (
                            <div className="px-4 py-2 bg-slate-50 text-xs text-slate-600">
                              📝 {event.notes}
                            </div>
                          )}

                          {event.coverUser && (
                            <div className="px-4 py-2 bg-green-50 text-xs text-green-700
                              flex items-center gap-2">
                              <UserCheck size={12} />
                              Cover: <strong>{event.coverUser.name}</strong>
                            </div>
                          )}

                          <div className="px-4 py-2 text-[10px] text-slate-400">
                            Recorded by {event.recorder?.name} at {dayjs(event.created_at).format('HH:mm')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ── Shifts needing cover ──────────────────────────────────────── */}
              {needsCover.shifts.length > 0 && (
                <section>
                  <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle size={13} className="text-red-500" />
                    Shifts Needing Cover ({needsCover.shifts.length})
                  </h2>

                  <div className="space-y-2">
                    {needsCover.shifts.map(shift => (
                      <div key={shift.assignment_id}
                        className="bg-red-50 border-2 border-red-200 rounded-2xl p-4
                          hover:border-red-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              <p className="text-sm font-bold text-slate-900">
                                {shift.task ?? 'Unspecified shift'}
                              </p>
                              {shift.terminal && (
                                <span className="text-xs bg-slate-200 text-slate-600
                                  px-2 py-0.5 rounded-full font-semibold">
                                  {shift.terminal}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {shift.start_time} – {shift.end_time}
                              </span>
                              <span>Original: <strong>{shift.staff.name}</strong></span>
                            </div>
                          </div>

                          <button
                            onClick={() => setCoverModal(shift)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600
                              text-white rounded-xl text-xs font-bold hover:bg-red-700
                              transition-colors shrink-0"
                          >
                            <UserCheck size={13} /> Assign Cover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── All covered ──────────────────────────────────────────────── */}
              {needsCover.shifts.length === 0 && sickHistory.length > 0 && (
                <div className="text-center py-8 bg-green-50 border border-green-200
                  rounded-2xl">
                  <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                  <p className="font-bold text-green-800">All sick shifts have been covered</p>
                  <p className="text-xs text-green-600 mt-1">
                    Cover staff have been notified via push notification
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Available staff panel ────────────────────────────────────── */}
        <div className="w-72 bg-white overflow-y-auto shrink-0">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider">
              Available Staff — {dayLabel}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Not rostered on this date
            </p>

            {/* Search */}
            <div className="relative mt-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2
                text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search staff..."
                className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg
                  text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          <div className="p-3 space-y-1.5">
            {filteredAvailable.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold">No available staff found</p>
              </div>
            ) : filteredAvailable.map(staff => (
              <div key={staff.id}
                className="flex items-center gap-2.5 px-3 py-2.5 border border-slate-100
                  rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center
                  justify-center text-green-700 text-[10px] font-black shrink-0">
                  {staff.name.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{staff.name}</p>
                  <p className="text-[9px] text-slate-400 truncate">
                    {staff.employee_id}
                    {staff.terminal ? ` · ${staff.terminal}` : ''}
                  </p>
                  <p className="text-[9px] text-slate-400 capitalize truncate">
                    {staff.job_role?.replace(/_/g,' ')}
                  </p>
                </div>

                {/* Quick assign — shows only when a shift is selected */}
                {coverModal && (
                  <button
                    onClick={() => handleAssignCover(coverModal.assignment_id, staff.id)}
                    className="w-7 h-7 bg-blue-500 text-white rounded-lg flex items-center
                      justify-center opacity-0 group-hover:opacity-100 hover:bg-blue-600
                      transition-all shrink-0"
                    title={`Assign ${staff.name} as cover`}
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mark Sick Modal ──────────────────────────────────────────────────── */}
      {markModal && (
        <MarkSickModal
          staff={allStaff}
          selectedDate={selectedDate}
          onClose={() => setMarkModal(false)}
          onMarked={() => { setMarkModal(false); load(); }}
        />
      )}

      {/* ── Assign Cover Modal ───────────────────────────────────────────────── */}
      {coverModal && (
        <AssignCoverModal
          shift={coverModal}
          available={needsCover.available}
          onClose={() => setCoverModal(null)}
          onAssigned={(aId, uId) => handleAssignCover(aId, uId)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK SICK MODAL
// ─────────────────────────────────────────────────────────────────────────────

function MarkSickModal({
  staff, selectedDate, onClose, onMarked,
}: {
  staff:        any[];
  selectedDate: string;
  onClose:      () => void;
  onMarked:     () => void;
}) {
  const [userId,       setUserId]       = useState('');
  const [date,         setDate]         = useState(selectedDate);
  const [notifiedVia,  setNotifiedVia]  = useState('phone');
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [result,       setResult]       = useState<any>(null);

  const handleMark = async () => {
    if (!userId) { toast.error('Select a staff member'); return; }
    setSaving(true);
    try {
      const res = await rotaApi.markSick({
        user_id:      userId,
        date,
        notified_via: notifiedVia,
        notes,
      });
      setResult(res.data);
      toast.success(
        `${res.data.flagged_shifts} shift(s) flagged — cover needed`
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to mark sick');
    } finally {
      setSaving(false);
    }
  };

  const selectedStaff = staff.find(s => s.id === userId);

  return (
    <Modal open title="Mark Staff Sick" onClose={onClose} size="md">
      <div className="space-y-4">

        {!result ? (
          <>
            {/* Staff selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Staff Member *
              </label>
              <select
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="">Select staff member...</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.employee_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            {/* How notified */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                How were you notified?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'phone',    label: 'Phone',     Icon: Phone           },
                  { value: 'whatsapp', label: 'WhatsApp',  Icon: MessageCircle   },
                  { value: 'app',      label: 'App',       Icon: Smartphone      },
                  { value: 'email',    label: 'Email',     Icon: Mail            },
                ].map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setNotifiedVia(value)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2
                      text-xs font-bold transition-all
                      ${notifiedVia === value
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Notes (optional)
              </label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Called at 07:30 — stomach bug, back tomorrow"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            {/* Preview */}
            {selectedStaff && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs font-bold text-red-800">
                  {selectedStaff.name} — {dayjs(date).format('ddd D MMM YYYY')}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  All assigned shifts on this date will be flagged as needing cover.
                  Staff will be notified via push notification.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold
                  text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleMark}
                disabled={saving || !userId}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm
                  font-bold hover:bg-red-700 disabled:opacity-60 flex items-center
                  justify-center gap-2"
              >
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white
                      rounded-full animate-spin" /> Marking...</>
                  : <><UserMinus size={15} /> Mark Sick & Find Cover</>
                }
              </button>
            </div>
          </>
        ) : (
          /* Result screen */
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 border
              border-amber-200 rounded-2xl">
              <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">
                  {result.flagged_shifts} shift{result.flagged_shifts !== 1 ? 's' : ''} flagged
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Shifts are now marked red on the rota and highlighted for cover
                </p>
              </div>
            </div>

            {/* Cover options summary */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                Available Cover Staff ({result.cover_options?.length ?? 0})
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {result.cover_options?.map((s: any) => (
                  <div key={s.id}
                    className="flex items-center gap-2.5 px-3 py-2 bg-green-50 border
                      border-green-200 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-green-200 flex items-center
                      justify-center text-green-700 text-[9px] font-black shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{s.name}</p>
                      <p className="text-[9px] text-slate-500">
                        {s.employee_id} · {s.job_role?.replace(/_/g,' ')}
                      </p>
                    </div>
                    <UserCheck size={13} className="text-green-600 shrink-0" />
                  </div>
                ))}
                {(!result.cover_options || result.cover_options.length === 0) && (
                  <p className="text-xs text-slate-400 text-center py-3">
                    No available staff — check manually
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onMarked}
                className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl
                  text-sm font-bold hover:bg-slate-800">
                Go to Cover Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN COVER MODAL
// ─────────────────────────────────────────────────────────────────────────────

function AssignCoverModal({
  shift, available, onClose, onAssigned,
}: {
  shift:      SickShift;
  available:  AvailableStaff[];
  onClose:    () => void;
  onAssigned: (assignmentId: string, coverUserId: string) => void;
}) {
  const [search,    setSearch]    = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);

  const filtered = available.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.employee_id.toLowerCase().includes(search.toLowerCase()) ||
    s.job_role?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssign = async (staffId: string) => {
    setAssigning(staffId);
    try {
      await onAssigned(shift.assignment_id, staffId);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Modal
      open
      title="Assign Cover Staff"
      onClose={onClose}
      size="md"
    >
      <div className="space-y-4">

        {/* Shift info */}
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-xs font-black text-red-600 uppercase tracking-wide mb-1">
            Shift Needing Cover
          </p>
          <p className="font-bold text-slate-900 text-sm">
            {shift.task ?? 'Unspecified shift'}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={11} /> {shift.start_time} – {shift.end_time}
            </span>
            {shift.terminal && <span>· {shift.terminal}</span>}
            <span>· Original: <strong>{shift.staff.name}</strong></span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or role..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Available staff list */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No available staff found</p>
              <p className="text-xs mt-1">All staff are already rostered at this time</p>
            </div>
          ) : filtered.map(staff => (
            <div
              key={staff.id}
              className="flex items-center gap-3 px-4 py-3 border border-slate-200
                rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center
                justify-center text-blue-700 font-black shrink-0 text-sm">
                {staff.name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm">{staff.name}</p>
                <p className="text-xs text-slate-400">
                  {staff.employee_id}
                  {staff.terminal ? ` · ${staff.terminal}` : ''}
                </p>
                <p className="text-xs text-slate-400 capitalize">
                  {staff.job_role?.replace(/_/g,' ')}
                </p>
              </div>

              <button
                onClick={() => handleAssign(staff.id)}
                disabled={assigning === staff.id}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600
                  text-white rounded-xl text-xs font-bold hover:bg-green-700
                  disabled:opacity-60 transition-colors shrink-0"
              >
                {assigning === staff.id ? (
                  <div className="w-3 h-3 border-2 border-white/50 border-t-white
                    rounded-full animate-spin" />
                ) : (
                  <><UserCheck size={13} /> Assign</>
                )}
              </button>
            </div>
          ))}
        </div>

        <button onClick={onClose}
          className="w-full px-4 py-2.5 border rounded-xl text-sm font-semibold
            text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </Modal>
  );
}