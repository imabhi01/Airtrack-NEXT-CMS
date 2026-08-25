'use client';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { useState } from 'react';
 
export default function WeekNavigator({
  weeks,
  currentWeekId,
  onSelect,
  onCreateWeek,
}: {
  weeks: any[];
  currentWeekId: string | null;
  onSelect: (id: string) => void;
  onCreateWeek: (weekStart: string) => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
 
  const handleCreate = async () => {
    // Default to next Monday
    const nextMonday = dayjs().isoWeekday(1).add(1, 'week').format('YYYY-MM-DD');
    setCreating(true);
    await onCreateWeek(nextMonday);
    setCreating(false);
  };
 
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-white border-b overflow-x-auto">
      {weeks.map(w => {
        const active = w.id === currentWeekId;
        const statusColors: Record<string, string> = {
          draft:     'border-amber-400',
          published: 'border-green-500',
          locked:    'border-gray-400',
        };
        return (
          <button
            key={w.id}
            onClick={() => onSelect(w.id)}
            className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all
              ${active
                ? 'bg-[#1A2B4A] text-white border-[#1A2B4A]'
                : `bg-white text-gray-600 hover:bg-gray-50 ${statusColors[w.status] ?? 'border-gray-200'}`
              }`}
          >
            <div>{dayjs(w.week_start).format('D MMM')}</div>
            <div className="text-[10px] opacity-60 mt-0.5">{w.status}</div>
          </button>
        );
      })}
      <button
        onClick={handleCreate}
        disabled={creating}
        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
          border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all"
      >
        <Plus size={12} />
        {creating ? 'Creating...' : 'New Week'}
      </button>
    </div>
  );
}
 