'use client';
import { useState } from 'react';
import { rosterApi } from '@/lib/cms-api';
import Modal from '@/components/shared/Modal';
import toast from 'react-hot-toast';
import { Zap, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
 
export default function AutoGenerateModal({
  weekId, onClose, onComplete,
}: {
  weekId: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [result,  setResult]  = useState<any>(null);
 
  const handleGenerate = async () => {
    setRunning(true);
    try {
      const res = await rosterApi.autoGenerate(weekId);
      setResult(res.data);
      toast.success(`Generated ${res.data.shifts_generated} shifts`);
    } catch (err: any) {
      toast.error('Auto-generation failed: ' + (err?.response?.data?.message ?? 'Unknown error'));
    } finally {
      setRunning(false);
    }
  };
 
  return (
    <Modal open title="Auto-Generate Roster" onClose={onClose} size="lg">
      {!result ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={28} className="text-purple-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Automatic Roster Generation</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
            The roster engine will automatically assign staff to all operation positions
            based on their availability, preferences, and shift balance rules.
          </p>
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left text-sm">
            <p className="font-semibold text-amber-800 mb-1">⚠ This will clear existing shifts</p>
            <p className="text-amber-700">Any manually added shifts will be removed before generation starts.</p>
          </div>
          <div className="flex gap-3 mt-6 justify-center">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={running}
              className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold
                hover:bg-purple-700 disabled:opacity-60 flex items-center gap-2"
            >
              {running ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <><Zap size={16} /> Generate Now</>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-600">{result.shifts_generated}</p>
              <p className="text-xs text-gray-500 mt-1">Shifts Generated</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">{result.positions_covered}</p>
              <p className="text-xs text-gray-500 mt-1">Positions Covered</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <p className="text-2xl font-bold text-red-600">{result.positions_uncovered}</p>
              <p className="text-xs text-gray-500 mt-1">Uncovered</p>
            </div>
          </div>
 
          {/* Violations */}
          {result.violations?.length > 0 && (
            <div>
              <p className="text-sm font-bold text-red-700 flex items-center gap-1.5 mb-2">
                <XCircle size={14} /> {result.violations.length} Rule Violations
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {result.violations.map((v: any, i: number) => (
                  <div key={i} className="text-xs p-2 bg-red-50 border border-red-100 rounded-lg">
                    <span className="font-semibold">{v.staff_name}:</span> {v.description}
                  </div>
                ))}
              </div>
            </div>
          )}
 
          {/* Warnings */}
          {result.warnings?.length > 0 && (
            <div>
              <p className="text-sm font-bold text-amber-700 flex items-center gap-1.5 mb-2">
                <AlertTriangle size={14} /> {result.warnings.length} Warnings
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {result.warnings.map((w: any, i: number) => (
                  <div key={i} className="text-xs p-2 bg-amber-50 border border-amber-100 rounded-lg">
                    {w.type === 'UNDERSTAFFED'
                      ? `${w.position} on ${w.date}: needs ${w.required}, got ${w.assigned} (gap: ${w.gap})`
                      : `${w.staff_name ?? ''}: ${w.description}`
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
 
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onComplete}
              className="px-5 py-2.5 rounded-xl bg-[#1A2B4A] text-white text-sm font-semibold hover:bg-[#2D4A7A]"
            >
              View Roster
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
 