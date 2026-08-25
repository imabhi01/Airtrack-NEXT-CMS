'use client';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Trash2 } from 'lucide-react';
 
const DUTY_COLORS: Record<string, string> = {
  morning:       'border-l-yellow-400 bg-yellow-50',
  late:          'border-l-blue-400 bg-blue-50',
  night:         'border-l-indigo-400 bg-indigo-50',
  split_morning: 'border-l-orange-400 bg-orange-50',
  split_evening: 'border-l-purple-400 bg-purple-50',
  standard:      'border-l-gray-400 bg-gray-50',
};
 
export function ShiftCard({
  entry,
  onDelete,
  readOnly,
  compact = false,
}: {
  entry: any;
  onDelete: (id: string) => void;
  readOnly: boolean;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    disabled: readOnly,
  });
 
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity:   isDragging ? 0.3 : 1,
  };
 
  const colorClass = DUTY_COLORS[entry.shift_type] ?? DUTY_COLORS.standard;
  const airline    = entry.operation_position?.airline_contract?.airline;
  const opType     = entry.operation_position?.operation_type;
 
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`border-l-4 rounded-lg p-1.5 cursor-grab active:cursor-grabbing group
        select-none transition-shadow hover:shadow-sm ${colorClass}
        ${entry.status === 'cancelled' ? 'opacity-40 line-through' : ''}`}
    >
      {/* Staff name */}
      <p className="text-[11px] font-bold text-gray-900 truncate leading-tight">
        {entry.user?.name ?? 'Unknown'}
      </p>
 
      {/* Time */}
      <p className="text-[10px] text-gray-600 mt-0.5">
        {entry.scheduled_start?.slice(0,5)} – {entry.scheduled_end?.slice(0,5)}
      </p>
 
      {/* Airline + operation */}
      {!compact && airline && (
        <div className="flex items-center gap-1 mt-1">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: airline.color ?? '#888' }}
          />
          <p className="text-[9px] text-gray-500 truncate">
            {airline.iata_code} · {opType?.name}
          </p>
        </div>
      )}
 
      {/* Duty badge */}
      <div className="flex items-center justify-between mt-1">
        <span className={`text-[9px] font-semibold uppercase tracking-wide
          ${entry.duty_mode === 'airside' ? 'text-amber-600' : 'text-green-600'}`}>
          {entry.duty_mode}
        </span>
        {!readOnly && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}