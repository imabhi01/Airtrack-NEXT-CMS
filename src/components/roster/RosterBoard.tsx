'use client';
import { useState } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  DndContext, DragEndEvent, DragStartEvent,
  DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { ShiftCard } from './ShiftCard';
import { DayColumn } from './DayColumn';
 
dayjs.extend(isoWeek);
 
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 
export default function RosterBoard({
  week,
  entries,
  coverage,
  onDragDrop,
  onDelete,
  readOnly,
  onSelectDate,
}: {
  week: any;
  entries: Record<string, any[]>;
  coverage: Record<string, any[]>;
  onDragDrop: (payload: any) => void;
  onDelete: (id: string) => void;
  readOnly: boolean;
  onSelectDate: (date: string) => void;
}) {
  const [activeEntry, setActiveEntry] = useState<any>(null);
 
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
 
  const weekStart = week ? dayjs(week.week_start) : dayjs().isoWeekday(1);
 
  const days = DAYS.map((label, i) => {
    const date    = weekStart.add(i, 'day');
    const dateStr = date.format('YYYY-MM-DD');
    const dayEntries = entries[dateStr] ?? [];
    const dayCoverage= coverage[dateStr] ?? [];
    return { label, date, dateStr, dayEntries, dayCoverage };
  });
 
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Find the entry being dragged
    for (const day of days) {
      const entry = day.dayEntries.find((e: any) => e.id === active.id);
      if (entry) { setActiveEntry(entry); break; }
    }
  };
 
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveEntry(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
 
    // over.id is the target date string
    const newDate = String(over.id);
    if (!newDate.match(/^\d{4}-\d{2}-\d{2}$/)) return;
 
    const entry = activeEntry;
    if (!entry || entry.work_date === newDate) return;
 
    onDragDrop({ entry_id: String(active.id), new_work_date: newDate });
  };
 
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-7 h-full min-w-[900px]">
        {days.map(({ label, date, dateStr, dayEntries, dayCoverage }) => (
          <DayColumn
            key={dateStr}
            label={label}
            date={date}
            dateStr={dateStr}
            entries={dayEntries}
            coverage={dayCoverage}
            onDelete={onDelete}
            readOnly={readOnly}
            onClick={() => onSelectDate(dateStr)}
          />
        ))}
      </div>
 
      <DragOverlay>
        {activeEntry && (
          <div className="opacity-90 rotate-1 shadow-2xl">
            <ShiftCard entry={activeEntry} onDelete={() => {}} readOnly={false} compact />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}