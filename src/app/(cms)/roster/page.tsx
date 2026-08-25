'use client';
import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import toast from 'react-hot-toast';
import { rosterApi, entriesApi } from '@/lib/cms-api';
import PageHeader from '@/components/shared/PageHeader';
import RosterBoard from '@/components/roster/RosterBoard';
import WeekNavigator from '@/components/roster/WeekNavigator';
import RosterStats from '@/components/roster/RosterStats';
import UncoveredPanel from '@/components/roster/UncoveredPanel';
import AutoGenerateModal from '@/components/roster/AutoGenerateModal';
import AddShiftModal from '@/components/roster/AddShiftModal';
import { Zap, Plus, Copy, Eye, Lock } from 'lucide-react';
 
dayjs.extend(isoWeek);
 
export default function RosterPage() {
  const [weekId,      setWeekId]      = useState<string | null>(null);
  const [weekData,    setWeekData]    = useState<any>(null);
  const [weeks,       setWeeks]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [autoModal,   setAutoModal]   = useState(false);
  const [addModal,    setAddModal]    = useState(false);
  const [selectedDate,setSelectedDate]= useState<string | null>(null);
 
  // Load all weeks on mount
  useEffect(() => {
    rosterApi.weeks().then(r => {
      const list = r.data.data ?? r.data.weeks ?? [];
      setWeeks(list);
      if (list.length > 0) {
        setWeekId(list[0].id);
      } else {
        setLoading(false);
      }
    });
  }, []);
 
  // Load week detail when weekId changes
  useEffect(() => {
    if (!weekId) return;
    setLoading(true);
    rosterApi.showWeek(weekId).then(r => {
      setWeekData(r.data);
    }).finally(() => setLoading(false));
  }, [weekId]);
 
  const reload = () => {
    if (!weekId) return;
    rosterApi.showWeek(weekId).then(r => setWeekData(r.data));
  };
 
  const handleDragDrop = async (payload: {
    entry_id: string;
    new_user_id?: string;
    new_work_date?: string;
    new_operation_position_id?: string;
  }) => {
    try {
      await entriesApi.dragDrop(payload);
      reload();
      toast.success('Shift moved');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Move failed');
    }
  };
 
  const handleDeleteEntry = async (entryId: string) => {
    try {
      await entriesApi.delete(entryId);
      reload();
      toast.success('Shift cancelled');
    } catch {
      toast.error('Could not cancel shift');
    }
  };
 
  const handlePublish = async () => {
    if (!weekId) return;
    try {
      await rosterApi.publish(weekId);
      reload();
      toast.success('Roster published — staff can now see their shifts');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Publish failed');
    }
  };
 
  const handleLock = async () => {
    if (!weekId) return;
    if (!confirm('Lock this roster? No further changes will be possible.')) return;
    try {
      await rosterApi.lock(weekId);
      reload();
      toast.success('Roster locked');
    } catch {
      toast.error('Lock failed');
    }
  };
 
  const handleCopyPrevious = async () => {
    if (!weekId || weeks.length < 2) return;
    const currentIdx = weeks.findIndex(w => w.id === weekId);
    if (currentIdx >= weeks.length - 1) {
      toast.error('No previous week found');
      return;
    }
    const sourceWeek = weeks[currentIdx + 1];
    try {
      const res = await rosterApi.copyPrevious(weekId, sourceWeek.id);
      reload();
      toast.success(`Copied ${res.data.copied} shifts from ${dayjs(sourceWeek.week_start).format('D MMM')}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Copy failed');
    }
  };
 
  const currentWeek = weeks.find(w => w.id === weekId);
  const isDraft     = currentWeek?.status === 'draft';
  const isPublished = currentWeek?.status === 'published';
  const isLocked    = currentWeek?.status === 'locked';
 
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Roster Management"
        subtitle={currentWeek
          ? `${dayjs(currentWeek.week_start).format('D MMM')} – ${dayjs(currentWeek.week_end).format('D MMM YYYY')}`
          : 'Select a week'}
        actions={
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <button
                  onClick={() => setAutoModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  <Zap size={15} /> Auto-Generate
                </button>
                <button
                  onClick={handleCopyPrevious}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  <Copy size={15} /> Copy Previous
                </button>
                <button
                  onClick={() => setAddModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus size={15} /> Add Shift
                </button>
                <button
                  onClick={handlePublish}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <Eye size={15} /> Publish
                </button>
              </>
            )}
            {isPublished && (
              <button
                onClick={handleLock}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
              >
                <Lock size={15} /> Lock Roster
              </button>
            )}
            <StatusBadge status={currentWeek?.status} />
          </div>
        }
      />
 
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Week selector */}
        <WeekNavigator
          weeks={weeks}
          currentWeekId={weekId}
          onSelect={setWeekId}
          onCreateWeek={async (weekStart) => {
            try {
              const res = await rosterApi.createWeek({ week_start: weekStart });
              const newWeek = res.data.week;
              const updated = await rosterApi.weeks();
              setWeeks(updated.data.data ?? []);
              setWeekId(newWeek.id);
              toast.success('New roster week created');
            } catch (err: any) {
              toast.error(err?.response?.data?.error ?? 'Failed to create week');
            }
          }}
        />
 
        {/* Stats bar */}
        {weekData && <RosterStats week={weekData.week} stats={weekData.stats} />}
 
        {/* Main board + uncovered panel */}
        <div className="flex-1 overflow-hidden flex">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : weekData ? (
            <>
              <div className="flex-1 overflow-auto">
                <RosterBoard
                  week={currentWeek}
                  entries={weekData.entries ?? {}}
                  coverage={weekData.coverage ?? {}}
                  onDragDrop={handleDragDrop}
                  onDelete={handleDeleteEntry}
                  readOnly={isLocked}
                  onSelectDate={setSelectedDate}
                />
              </div>
              <UncoveredPanel
                weekId={weekId!}
                selectedDate={selectedDate}
                onAssign={reload}
                readOnly={isLocked}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-lg font-semibold">No roster week selected</p>
                <p className="text-sm mt-1">Select or create a week above</p>
              </div>
            </div>
          )}
        </div>
      </div>
 
      {autoModal && weekId && (
        <AutoGenerateModal
          weekId={weekId}
          onClose={() => setAutoModal(false)}
          onComplete={() => { setAutoModal(false); reload(); }}
        />
      )}
 
      {addModal && weekId && (
        <AddShiftModal
          weekId={weekId}
          onClose={() => setAddModal(false)}
          onComplete={() => { setAddModal(false); reload(); }}
        />
      )}
    </div>
  );
}
 
function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    draft:     'bg-amber-100 text-amber-700',
    published: 'bg-green-100 text-green-700',
    locked:    'bg-gray-100 text-gray-600',
  };
  if (!status) return null;
  return (
    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${map[status] ?? ''}`}>
      {status}
    </span>
  );
}