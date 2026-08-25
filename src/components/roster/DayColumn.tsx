'use client';
import dayjs from 'dayjs';
import { useDroppable } from '@dnd-kit/core';
import { ShiftCard } from './ShiftCard';
import { AlertTriangle } from 'lucide-react';
 
export function DayColumn({
  label, date, dateStr, entries, coverage,
  onDelete, readOnly, onClick,
}: {
  label: string;
  date: dayjs.Dayjs;
  dateStr: string;
  entries: any[];
  coverage: any[];
  onDelete: (id: string) => void;
  readOnly: boolean;
  onClick: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: dateStr });
  const isToday    = dateStr === dayjs().format('YYYY-MM-DD');
  const isWeekend  = date.day() === 0 || date.day() === 6;
  const uncovered  = coverage.filter(c => !c.is_covered).length;
 
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`border-r last:border-r-0 flex flex-col cursor-pointer
        ${isOver ? 'bg-blue-50' : isWeekend ? 'bg-gray-50/50' : 'bg-white'}
        ${isToday ? 'ring-2 ring-inset ring-blue-400' : ''}
        transition-colors`}
    >
      {/* Day header */}
      <div className={`px-2 py-2 border-b text-center sticky top-0 z-10
        ${isToday ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'}`}>
        <p className="text-xs font-semibold">{label}</p>
        <p className={`text-lg font-bold ${isToday ? 'text-white' : 'text-gray-900'}`}>
          {date.format('D')}
        </p>
        <p className={`text-[10px] ${isToday ? 'text-blue-100' : 'text-gray-400'}`}>
          {date.format('MMM')}
        </p>
      </div>
 
      {/* Uncovered warning */}
      {uncovered > 0 && (
        <div className="mx-1.5 mt-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-lg flex items-center gap-1.5">
          <AlertTriangle size={11} className="text-red-500 shrink-0" />
          <span className="text-[10px] text-red-600 font-medium">{uncovered} uncovered</span>
        </div>
      )}
 
      {/* Shifts */}
      <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
        {entries.length === 0 && (
          <p className="text-center text-gray-300 text-[10px] pt-4">—</p>
        )}
        {entries.map((entry: any) => (
          <ShiftCard
            key={entry.id}
            entry={entry}
            onDelete={onDelete}
            readOnly={readOnly}
            compact
          />
        ))}
      </div>
 
      {/* Staff count */}
      <div className="px-2 py-1 border-t text-center">
        <span className="text-[10px] text-gray-400">{entries.length} staff</span>
      </div>
    </div>
  );
}