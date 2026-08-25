'use client';
// FILE: src/app/(cms)/rota/page.tsx
// Weekly drag-drop rota planner — matches the Excel rota image exactly:
// Staff rows × Day columns, coloured task cells, multi-task days

import { useEffect, useState, useCallback } from 'react';
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import toast from 'react-hot-toast';
import { rotaApi } from '@/lib/rota-api';
import PageHeader from '@/components/shared/PageHeader';
import Modal from '@/components/shared/Modal';
import {
  ChevronLeft, ChevronRight, Plus, Zap, Eye,
  Lock, AlertTriangle, UserMinus, RefreshCw,
  Clock, Plane, X, Check, GripVertical,
} from 'lucide-react';

dayjs.extend(isoWeek);

// ── Types ─────────────────────────────────────────────────────────────────────

interface Assignment {
  id:            string;
  task:          string | null;
  task_id:       string | null;
  airline:       string | null;
  terminal:      string | null;
  zone:          string | null;
  start_time:    string;
  end_time:      string;
  status:        string;
  is_urgent:     boolean;
  display_color: string | null;
  remarks:       string | null;
  label:         string;
  cover_user?:   { id: string; name: string } | null;
}

interface DayData {
  date:        string;
  day_label:   string;
  day_number:  number;
  is_off:      boolean;
  assignments: Assignment[];
}

interface StaffRow {
  staff: {
    id:          string;
    name:        string;
    employee_id: string;
    job_role:    string;
  };
  days: Record<string, DayData>;
}

interface Roster {
  id:           string;
  week_start:   string;
  week_end:     string;
  status:       string;
  published_at: string | null;
}

// ── Day columns (Mon–Sun) ─────────────────────────────────────────────────────
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function RotaPage() {
  const [weeks,       setWeeks]       = useState<Roster[]>([]);
  const [currentWeek, setCurrentWeek] = useState<Roster | null>(null);
  const [grid,        setGrid]        = useState<StaffRow[]>([]);
  const [stats,       setStats]       = useState<any>(null);
  const [tasks,       setTasks]       = useState<any[]>([]);
  const [staff,       setStaff]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [dragging,    setDragging]    = useState<{assignment: Assignment; staffId: string; date: string} | null>(null);

  // Modals
  const [addModal,    setAddModal]    = useState<{staffId: string; date: string} | null>(null);
  const [editModal,   setEditModal]   = useState<{assignment: Assignment; staffId: string} | null>(null);
  const [sickModal,   setSickModal]   = useState<{staffId: string; date: string; name: string} | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Load weeks list on mount
  useEffect(() => {
    Promise.all([
      rotaApi.weeks(),
      rotaApi.tasks(),
    ]).then(([w, t]) => {
      const weekList = w.data.weeks ?? [];
      setWeeks(weekList);
      setTasks(t.data.tasks ?? []);
      if (weekList.length > 0) loadWeek(weekList[0]);
      else setLoading(false);
    });
  }, []);

  const loadWeek = useCallback(async (week: Roster) => {
    setLoading(true);
    setCurrentWeek(week);
    try {
      const res = await rotaApi.showWeek(week.id);
      setGrid(res.data.grid ?? []);
      setStats(res.data.stats);
    } catch {
      toast.error('Failed to load roster');
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = () => { if (currentWeek) loadWeek(currentWeek); };

  // ── Drag end ────────────────────────────────────────────────────────────────
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDragging(null);

    if (!over || !dragging) return;

    // over.id format: "staffId::date"
    const [newStaffId, newDate] = String(over.id).split('::');
    const isSameCell = newStaffId === dragging.staffId && newDate === dragging.date;
    if (isSameCell) return;

    try {
      await rotaApi.dragDrop({
        assignment_id: dragging.assignment.id,
        new_user_id:   newStaffId !== dragging.staffId ? newStaffId : undefined,
        new_work_date: newDate !== dragging.date ? newDate : undefined,
      });
      toast.success('Shift moved');
      reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Move failed');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    // active.id format: "assignmentId::staffId::date"
    const [aId, staffId, date] = String(event.active.id).split('::');
    const row  = grid.find(r => r.staff.id === staffId);
    const day  = row?.days[date];
    const asgn = day?.assignments.find(a => a.id === aId);
    if (asgn) setDragging({ assignment: asgn, staffId, date });
  };

  // ── Publish ─────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!currentWeek) return;
    if (!confirm('Publish this roster? All staff will receive a push notification.')) return;
    try {
      await rotaApi.publish(currentWeek.id);
      toast.success('✓ Roster published — staff notified');
      const res = await rotaApi.weeks();
      const updated = res.data.weeks ?? [];
      setWeeks(updated);
      const fresh = updated.find((w: Roster) => w.id === currentWeek.id);
      if (fresh) setCurrentWeek(fresh);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Publish failed');
    }
  };

  // ── Lock ────────────────────────────────────────────────────────────────────
  const handleLock = async () => {
    if (!currentWeek) return;
    if (!confirm('Lock this roster? No further changes will be possible.')) return;
    try {
      await rotaApi.lock(currentWeek.id);
      toast.success('Roster locked');
      reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Lock failed');
    }
  };

  // ── Mark OFF ────────────────────────────────────────────────────────────────
  const handleMarkOff = async (staffId: string, date: string) => {
    if (!currentWeek) return;
    try {
      await rotaApi.markOff(currentWeek.id, { user_id: staffId, work_date: date });
      toast.success('Day marked as OFF');
      reload();
    } catch {
      toast.error('Failed to mark off');
    }
  };

  // ── Create week ─────────────────────────────────────────────────────────────
  const handleCreateWeek = async () => {
    const nextMonday = dayjs().isoWeekday(1).add(1, 'week').format('YYYY-MM-DD');
    const input = prompt('Enter week start date (Monday):', nextMonday);
    if (!input) return;
    try {
      const res = await rotaApi.createWeek({ week_start: input });
      toast.success('Roster week created');
      const wRes = await rotaApi.weeks();
      setWeeks(wRes.data.weeks ?? []);
      loadWeek(res.data.roster);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to create week');
    }
  };

  const isDraft     = currentWeek?.status === 'draft';
  const isPublished = currentWeek?.status === 'published';
  const isLocked    = currentWeek?.status === 'locked';

  // Build day columns for the header
  const dayColumns = currentWeek
    ? DAY_LABELS.map((label, i) => {
        const date = dayjs(currentWeek.week_start).add(i, 'day');
        return { label, date, dateStr: date.format('YYYY-MM-DD') };
      })
    : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Weekly Rota"
        subtitle={currentWeek
          ? `${dayjs(currentWeek.week_start).format('D MMM')} – ${dayjs(currentWeek.week_end).format('D MMM YYYY')}`
          : 'Select a week'}
        actions={
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <button onClick={handlePublish}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white
                    rounded-lg text-xs font-bold hover:bg-green-700 transition-colors">
                  <Eye size={13} /> Publish
                </button>
              </>
            )}
            {isPublished && (
              <button onClick={handleLock}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 text-white
                  rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors">
                <Lock size={13} /> Lock
              </button>
            )}
            <StatusPill status={currentWeek?.status} />
          </div>
        }
      />

      {/* Week selector bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b overflow-x-auto shrink-0">
        {weeks.map(w => (
          <button
            key={w.id}
            onClick={() => loadWeek(w)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold
              border-2 transition-all
              ${currentWeek?.id === w.id
                ? 'bg-slate-900 text-white border-slate-900'
                : `bg-white text-slate-600 hover:bg-slate-50 ${
                    w.status === 'published' ? 'border-green-400' :
                    w.status === 'locked'    ? 'border-slate-400' :
                    'border-slate-200'
                  }`
              }`}
          >
            <div>{dayjs(w.week_start).format('D MMM')}</div>
            <div className="text-[9px] opacity-60 mt-0.5 uppercase">{w.status}</div>
          </button>
        ))}
        <button
          onClick={handleCreateWeek}
          className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs
            font-semibold border-2 border-dashed border-slate-300 text-slate-400
            hover:border-blue-400 hover:text-blue-500 transition-all"
        >
          <Plus size={12} /> New Week
        </button>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="flex items-center gap-6 px-5 py-2 bg-slate-50 border-b text-xs shrink-0">
          <span className="text-slate-500">Assignments: <strong className="text-slate-900">{stats.total_assignments}</strong></span>
          <span className="text-slate-500">Staff: <strong className="text-slate-900">{stats.staff_count}</strong></span>
          {stats.sick_shifts > 0 && (
            <span className="text-red-600 font-bold flex items-center gap-1">
              <AlertTriangle size={11} /> {stats.sick_shifts} sick
            </span>
          )}
          {stats.cover_shifts > 0 && (
            <span className="text-amber-600 font-bold">{stats.cover_shifts} cover shifts</span>
          )}
        </div>
      )}

      {/* Main grid */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : grid.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <p className="font-semibold">No staff assigned this week</p>
            <p className="text-xs mt-1">Add assignments using the + button in each cell</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full border-collapse min-w-[900px]">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-900 text-white">
                  {/* Staff name column */}
                  <th className="text-left px-4 py-3 text-xs font-bold w-36 border-r border-slate-700">
                    Staff
                  </th>
                  {/* Day columns */}
                  {dayColumns.map(({ label, date, dateStr }) => {
                    const isToday = dateStr === dayjs().format('YYYY-MM-DD');
                    const isWeekend = date.day() === 0 || date.day() === 6;
                    return (
                      <th
                        key={dateStr}
                        className={`px-2 py-3 text-center text-xs font-bold
                          ${isToday ? 'bg-blue-600' : isWeekend ? 'bg-slate-800' : ''}`}
                      >
                        <div className="font-bold">{label.toUpperCase()}</div>
                        <div className="text-lg font-black">{date.format('D')}</div>
                        <div className="text-[9px] opacity-60">{date.format('MMM')}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {grid.map((row, rowIdx) => (
                  <tr
                    key={row.staff.id}
                    className={`border-b border-slate-100 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    {/* Staff name */}
                    <td className="px-3 py-2 border-r border-slate-200 w-36">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center
                          justify-center text-blue-700 text-[10px] font-black shrink-0">
                          {row.staff.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {row.staff.name}
                          </p>
                          <p className="text-[9px] text-slate-400 truncate">
                            {row.staff.employee_id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Day cells */}
                    {dayColumns.map(({ dateStr }) => {
                      const day = row.days[dateStr];
                      return (
                        <DayCell
                          key={dateStr}
                          staffId={row.staff.id}
                          staffName={row.staff.name}
                          date={dateStr}
                          day={day}
                          readOnly={isLocked}
                          onAddClick={() => setAddModal({ staffId: row.staff.id, date: dateStr })}
                          onMarkOff={() => handleMarkOff(row.staff.id, dateStr)}
                          onMarkSick={() => setSickModal({ staffId: row.staff.id, date: dateStr, name: row.staff.name })}
                          onEditClick={(a) => setEditModal({ assignment: a, staffId: row.staff.id })}
                          onDeleteClick={async (aId) => {
                            try {
                              await rotaApi.deleteAssignment(aId);
                              toast.success('Removed');
                              reload();
                            } catch { toast.error('Failed'); }
                          }}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Drag overlay */}
            <DragOverlay>
              {dragging && (
                <div className="rotate-2 shadow-2xl opacity-90">
                  <TaskPill assignment={dragging.assignment} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* ── Add Assignment Modal ─────────────────────────────────────────────── */}
      {addModal && currentWeek && (
        <AddAssignmentModal
          rosterId={currentWeek.id}
          staffId={addModal.staffId}
          date={addModal.date}
          tasks={tasks}
          onClose={() => setAddModal(null)}
          onSaved={() => { setAddModal(null); reload(); }}
        />
      )}

      {/* ── Edit Assignment Modal ────────────────────────────────────────────── */}
      {editModal && (
        <EditAssignmentModal
          assignment={editModal.assignment}
          tasks={tasks}
          onClose={() => setEditModal(null)}
          onSaved={() => { setEditModal(null); reload(); }}
        />
      )}

      {/* ── Sick Modal ──────────────────────────────────────────────────────── */}
      {sickModal && (
        <SickModal
          staffId={sickModal.staffId}
          staffName={sickModal.name}
          date={sickModal.date}
          onClose={() => setSickModal(null)}
          onMarked={() => { setSickModal(null); reload(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DAY CELL — droppable, shows task pills
// ─────────────────────────────────────────────────────────────────────────────

import { useDroppable } from '@dnd-kit/core';

function DayCell({
  staffId, staffName, date, day, readOnly,
  onAddClick, onMarkOff, onMarkSick, onEditClick, onDeleteClick,
}: {
  staffId:      string;
  staffName:    string;
  date:         string;
  day:          DayData | undefined;
  readOnly:     boolean;
  onAddClick:   () => void;
  onMarkOff:    () => void;
  onMarkSick:   () => void;
  onEditClick:  (a: Assignment) => void;
  onDeleteClick:(id: string) => void;
}) {
  const droppableId = `${staffId}::${date}`;
  const { isOver, setNodeRef } = useDroppable({ id: droppableId });
  const [menuOpen, setMenuOpen] = useState(false);

  const isOff     = day?.is_off ?? false;
  const assigns   = day?.assignments ?? [];
  const isToday   = date === dayjs().format('YYYY-MM-DD');
  const isWeekend = dayjs(date).day() === 0 || dayjs(date).day() === 6;

  return (
    <td
      ref={setNodeRef}
      className={`border-r border-slate-100 align-top p-1.5 relative group
        transition-colors min-w-[120px] max-w-[160px]
        ${isOff     ? 'bg-yellow-50'  : ''}
        ${isToday   ? 'ring-2 ring-inset ring-blue-400' : ''}
        ${isWeekend && !isOff ? 'bg-slate-50/80' : ''}
        ${isOver    ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}
      `}
    >
      {/* OFF day */}
      {isOff ? (
        <div className="flex items-center justify-center h-14">
          <span className="text-xs font-black text-yellow-600 bg-yellow-200
            px-3 py-1 rounded-full">OFF</span>
        </div>
      ) : (
        <div className="space-y-1 min-h-[56px]">
          {assigns.map(a => (
            <DraggableTaskPill
              key={a.id}
              assignment={a}
              staffId={staffId}
              date={date}
              readOnly={readOnly}
              onEdit={() => onEditClick(a)}
              onDelete={() => onDeleteClick(a.id)}
            />
          ))}
        </div>
      )}

      {/* Cell action buttons — visible on hover */}
      {!readOnly && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100
          transition-opacity flex gap-0.5">
          <button
            onClick={onAddClick}
            className="w-5 h-5 bg-blue-500 text-white rounded flex items-center
              justify-center hover:bg-blue-600 transition-colors"
            title="Add task"
          >
            <Plus size={10} />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(m => !m)}
              className="w-5 h-5 bg-slate-500 text-white rounded flex items-center
                justify-center hover:bg-slate-600 transition-colors text-[9px] font-black"
              title="More options"
            >
              ···
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl
                shadow-xl border border-slate-200 overflow-hidden z-30 w-36"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => { setMenuOpen(false); onMarkOff(); }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700
                    hover:bg-yellow-50 w-full text-left"
                >
                  <span className="text-yellow-600 font-bold">OFF</span> Mark Day Off
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onMarkSick(); }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-red-600
                    hover:bg-red-50 w-full text-left"
                >
                  <UserMinus size={11} /> Mark Sick
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </td>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAGGABLE TASK PILL
// ─────────────────────────────────────────────────────────────────────────────

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function DraggableTaskPill({
  assignment, staffId, date, readOnly, onEdit, onDelete,
}: {
  assignment: Assignment;
  staffId:    string;
  date:       string;
  readOnly:   boolean;
  onEdit:     () => void;
  onDelete:   () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:       `${assignment.id}::${staffId}::${date}`,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity:   isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/pill">
      <TaskPill
        assignment={assignment}
        dragListeners={listeners}
        dragAttributes={attributes}
        readOnly={readOnly}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK PILL — the coloured cell content
// Matches your rota: "13:30 Alaska OOG 17:30" blue/red/default
// ─────────────────────────────────────────────────────────────────────────────

function TaskPill({
  assignment, dragListeners, dragAttributes, readOnly, onEdit, onDelete,
}: {
  assignment:     Assignment;
  dragListeners?: any;
  dragAttributes?: any;
  readOnly?:      boolean;
  onEdit?:        () => void;
  onDelete?:      () => void;
}) {
  const bgColor = assignment.display_color ?? '#3B8BD4';
  const isRed   = bgColor === '#E24B4A';
  const isBlue  = bgColor === '#3B8BD4';
  const textColor = 'white';

  return (
    <div
      className="rounded-lg px-2 py-1.5 text-white text-[10px] font-semibold
        cursor-grab active:cursor-grabbing group/pill relative select-none"
      style={{ backgroundColor: bgColor }}
    >
      {/* Drag handle */}
      {!readOnly && (
        <div
          {...dragListeners}
          {...dragAttributes}
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0
            group-hover/pill:opacity-60 cursor-grab"
        >
          <GripVertical size={10} />
        </div>
      )}

      <div className="pl-2">
        {/* Times */}
        <div className="flex items-center gap-1 text-white/80 text-[9px] mb-0.5">
          <Clock size={8} />
          <span>{assignment.start_time}–{assignment.end_time}</span>
        </div>

        {/* Task name */}
        <p className="font-bold text-white leading-tight text-[10px] truncate">
          {assignment.task ?? assignment.remarks ?? '—'}
        </p>

        {/* Airline + terminal */}
        {(assignment.airline || assignment.terminal) && (
          <div className="flex items-center gap-1 mt-0.5 text-white/70 text-[9px]">
            {assignment.airline && <span>{assignment.airline}</span>}
            {assignment.terminal && <span>· {assignment.terminal}</span>}
          </div>
        )}

        {/* Status badges */}
        {assignment.status === 'sick' && (
          <span className="text-[8px] bg-white/30 px-1 py-0.5 rounded font-black">SICK</span>
        )}
        {assignment.status === 'swapped' && assignment.cover_user && (
          <span className="text-[8px] bg-white/30 px-1 py-0.5 rounded">
            COVER: {assignment.cover_user.name.split(' ')[0]}
          </span>
        )}
      </div>

      {/* Edit / delete on hover */}
      {!readOnly && (
        <div className="absolute top-0.5 right-0.5 hidden group-hover/pill:flex gap-0.5">
          {onEdit && (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="w-4 h-4 bg-white/30 hover:bg-white/50 rounded
                flex items-center justify-center transition-colors"
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="w-4 h-4 bg-white/30 hover:bg-red-500 rounded
                flex items-center justify-center transition-colors"
            >
              <X size={8} color="white" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PILL
// ─────────────────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    draft:     'bg-amber-100 text-amber-700',
    published: 'bg-green-100 text-green-700',
    locked:    'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase
      tracking-wider ${map[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD ASSIGNMENT MODAL
// ─────────────────────────────────────────────────────────────────────────────

function AddAssignmentModal({
  rosterId, staffId, date, tasks, onClose, onSaved,
}: {
  rosterId: string;
  staffId:  string;
  date:     string;
  tasks:    any[];
  onClose:  () => void;
  onSaved:  () => void;
}) {
  const [taskId,     setTaskId]     = useState('');
  const [startTime,  setStartTime]  = useState('13:00');
  const [endTime,    setEndTime]    = useState('21:00');
  const [remarks,    setRemarks]    = useState('');
  const [isUrgent,   setIsUrgent]   = useState(false);
  const [saving,     setSaving]     = useState(false);

  // When task selected — auto-fill times from task defaults
  const handleTaskChange = (id: string) => {
    setTaskId(id);
    const task = tasks.find(t => t.id === id);
    if (task?.default_start_time) setStartTime(task.default_start_time.slice(0,5));
    if (task?.default_end_time)   setEndTime(task.default_end_time.slice(0,5));
    if (task?.name) setRemarks(task.name);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await rotaApi.addAssignment(rosterId, {
        user_id:    staffId,
        work_date:  date,
        task_id:    taskId || null,
        start_time: startTime,
        end_time:   endTime,
        remarks,
        is_urgent:  isUrgent,
        display_color: isUrgent ? '#E24B4A' : null,
      });
      toast.success('Assignment added');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  const dayLabel = dayjs(date).format('ddd D MMM YYYY');

  return (
    <Modal open title={`Add Task — ${dayLabel}`} onClose={onClose} size="md">
      <div className="space-y-4">

        {/* Task selector */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Task
          </label>
          <select
            value={taskId}
            onChange={e => handleTaskChange(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select task...</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.airline?.iata_code ? `(${t.airline.iata_code})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Start Time
            </label>
            <input type="time" value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              End Time
            </label>
            <input type="time" value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
            Remarks (shown on rota cell)
          </label>
          <input
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="e.g. Alaska OOG / QF"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Urgent toggle */}
        <div
          onClick={() => setIsUrgent(u => !u)}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer
            transition-all ${isUrgent
              ? 'border-red-400 bg-red-50'
              : 'border-slate-200 hover:border-slate-300'}`}
        >
          <button className={`w-10 h-5 rounded-full transition-colors relative shrink-0
            ${isUrgent ? 'bg-red-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow
              transition-all ${isUrgent ? 'left-5' : 'left-0.5'}`} />
          </button>
          <div>
            <p className="text-sm font-bold text-slate-800">Mark as Urgent</p>
            <p className="text-xs text-slate-400">Shows in red on the rota</p>
          </div>
        </div>

        {/* Preview */}
        {(taskId || remarks) && (
          <div className="p-3 bg-slate-50 rounded-xl border">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Preview</p>
            <TaskPill assignment={{
              id: 'preview',
              task: tasks.find(t => t.id === taskId)?.name ?? remarks,
              task_id: taskId,
              airline: tasks.find(t => t.id === taskId)?.airline?.iata_code ?? null,
              terminal: tasks.find(t => t.id === taskId)?.terminal?.code ?? null,
              zone: null,
              start_time: startTime,
              end_time: endTime,
              status: 'scheduled',
              is_urgent: isUrgent,
              display_color: isUrgent ? '#E24B4A' : '#3B8BD4',
              remarks,
              label: '',
            }} />
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
              font-semibold hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Adding...' : 'Add to Rota'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT ASSIGNMENT MODAL
// ─────────────────────────────────────────────────────────────────────────────

function EditAssignmentModal({
  assignment, tasks, onClose, onSaved,
}: {
  assignment: Assignment;
  tasks:      any[];
  onClose:    () => void;
  onSaved:    () => void;
}) {
  const [taskId,    setTaskId]    = useState(assignment.task_id ?? '');
  const [startTime, setStartTime] = useState(assignment.start_time);
  const [endTime,   setEndTime]   = useState(assignment.end_time);
  const [remarks,   setRemarks]   = useState(assignment.remarks ?? '');
  const [isUrgent,  setIsUrgent]  = useState(assignment.is_urgent);
  const [saving,    setSaving]    = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await rotaApi.updateAssignment(assignment.id, {
        task_id:       taskId || null,
        start_time:    startTime,
        end_time:      endTime,
        remarks,
        is_urgent:     isUrgent,
        display_color: isUrgent ? '#E24B4A' : '#3B8BD4',
      });
      toast.success('Assignment updated');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title="Edit Assignment" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Task</label>
          <select value={taskId} onChange={e => setTaskId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">No specific task</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Start</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">End</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Remarks</label>
          <input value={remarks} onChange={e => setRemarks(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold text-slate-600">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm
              font-semibold hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SICK MODAL — mark staff sick + show cover options
// ─────────────────────────────────────────────────────────────────────────────

function SickModal({
  staffId, staffName, date, onClose, onMarked,
}: {
  staffId:   string;
  staffName: string;
  date:      string;
  onClose:   () => void;
  onMarked:  () => void;
}) {
  const [notifiedVia, setNotifiedVia] = useState('phone');
  const [notes,       setNotes]       = useState('');
  const [marking,     setMarking]     = useState(false);
  const [result,      setResult]      = useState<any>(null);

  const handleMark = async () => {
    setMarking(true);
    try {
      const res = await rotaApi.markSick({
        user_id:      staffId,
        date,
        notified_via: notifiedVia,
        notes,
      });
      setResult(res.data);
      toast.success(`${staffName} marked sick — ${res.data.flagged_shifts} shifts need cover`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed');
    } finally {
      setMarking(false);
    }
  };

  const handleAssignCover = async (assignmentId: string, coverUserId: string) => {
    try {
      await rotaApi.assignCover(assignmentId, { cover_user_id: coverUserId });
      toast.success('Cover assigned and staff notified');
      onMarked();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to assign cover');
    }
  };

  return (
    <Modal open title={`Mark Sick — ${staffName}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        {!result ? (
          <>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm font-semibold text-red-800">
                {staffName} — {dayjs(date).format('ddd D MMM YYYY')}
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                All shifts on this date will be flagged as needing cover
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                How were you notified?
              </label>
              <div className="flex gap-2">
                {['phone','whatsapp','app','email'].map(via => (
                  <button key={via}
                    onClick={() => setNotifiedVia(via)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize
                      border-2 transition-all
                      ${notifiedVia === via
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    {via}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Called in at 07:30, unwell"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>

            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button onClick={handleMark} disabled={marking}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm
                  font-semibold hover:bg-red-700 disabled:opacity-60">
                {marking ? 'Marking...' : 'Mark Sick & Find Cover'}
              </button>
            </div>
          </>
        ) : (
          /* Cover selection screen */
          <>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-bold text-amber-800">
                {result.flagged_shifts} shift(s) need cover
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Select a cover staff member for each flagged shift
              </p>
            </div>

            {/* Flagged shifts */}
            <div className="space-y-3">
              {result.shifts?.map((shift: any) => (
                <div key={shift.id} className="border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <p className="text-xs font-bold text-slate-800">
                      {shift.task?.name ?? 'Shift'} · {shift.start_time}–{shift.end_time}
                    </p>
                  </div>

                  {/* Available cover staff */}
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                    Available Staff ({result.cover_options?.length ?? 0})
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.cover_options?.map((staff: any) => (
                      <button
                        key={staff.id}
                        onClick={() => handleAssignCover(shift.id, staff.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 border
                          border-slate-200 rounded-lg hover:border-green-400 hover:bg-green-50
                          transition-all text-left"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center
                          justify-center text-blue-600 text-[9px] font-black shrink-0">
                          {staff.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-slate-800 truncate">{staff.name}</p>
                          <p className="text-[9px] text-slate-400">{staff.job_role?.replace(/_/g,' ')} · {staff.terminal}</p>
                        </div>
                        <Check size={12} className="text-green-500 shrink-0" />
                      </button>
                    ))}
                    {(!result.cover_options || result.cover_options.length === 0) && (
                      <p className="text-xs text-slate-400 text-center py-2">
                        No available staff found for this time
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={onMarked}
              className="w-full px-4 py-2.5 border rounded-xl text-sm font-semibold
                text-slate-600 hover:bg-slate-50">
              Done
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}