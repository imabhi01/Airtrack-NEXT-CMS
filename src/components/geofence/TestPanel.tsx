'use client';
// FILE: src/components/geofence/TestPanel.tsx
// Test any coordinate against the Laravel geofence API

import { useState } from 'react';
import {
  geofenceApi, TestLocationResult,
  HEATHROW_PRESETS, TestLocationPayload,
} from '@/lib/geofence-api';
import toast from 'react-hot-toast';
import {
  FlaskConical, CheckCircle, XCircle, MapPin,
  ChevronDown, Loader, Home, Plane,
} from 'lucide-react';

interface Props {
  onTest?: (pin: { lat: number; lng: number }, result: TestLocationResult['result']) => void;
}

export default function TestPanel({ onTest }: Props) {
  const [lat,        setLat]        = useState('');
  const [lng,        setLng]        = useState('');
  const [accuracy,   setAccuracy]   = useState('15');
  const [bssidInput, setBssidInput] = useState('');
  const [result,     setResult]     = useState<TestLocationResult | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [history,    setHistory]    = useState<Array<{
    label:    string;
    lat:      number;
    lng:      number;
    allowed:  boolean;
    terminal: string | null;
    zone:     string | null;
    method:   string | null;
  }>>([]);

  const applyPreset = (preset: typeof HEATHROW_PRESETS[0]) => {
    setLat(String(preset.lat));
    setLng(String(preset.lng));
    setAccuracy(String(preset.accuracy_m));
    setResult(null);
  };

  const runTest = async (
    overrideLat?: number,
    overrideLng?: number,
    label?: string,
  ) => {
    const testLat = overrideLat ?? parseFloat(lat);
    const testLng = overrideLng ?? parseFloat(lng);
    const testAcc = parseInt(accuracy);

    if (isNaN(testLat) || isNaN(testLng)) {
      toast.error('Enter valid latitude and longitude');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const bssids = bssidInput
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const payload: TestLocationPayload = {
        lat:        testLat,
        lng:        testLng,
        accuracy_m: testAcc,
        bssids:     bssids.length > 0 ? bssids : undefined,
      };

      const res = await geofenceApi.testLocation(payload);
      setResult(res.data);
      onTest?.({ lat: testLat, lng: testLng }, res.data.result);

      // Add to history
      setHistory(h => [{
        label:    label ?? `${testLat.toFixed(4)}, ${testLng.toFixed(4)}`,
        lat:      testLat,
        lng:      testLng,
        allowed:  res.data.result.allowed,
        terminal: res.data.result.terminal_code,
        zone:     res.data.result.zone_code,
        method:   res.data.result.location_method,
      }, ...h].slice(0, 10));

    } catch (err: any) {
      toast.error('Test failed: ' + (err?.response?.data?.message ?? err?.message));
    } finally {
      setLoading(false);
    }
  };

  const runPreset = async (preset: typeof HEATHROW_PRESETS[0]) => {
    applyPreset(preset);
    await runTest(preset.lat, preset.lng, preset.label);
  };

  const verdictColor = result?.result.allowed
    ? 'border-green-300 bg-green-50'
    : 'border-red-300 bg-red-50';

  const verdictTextColor = result?.result.allowed
    ? 'text-green-700'
    : 'text-red-700';

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-purple-600" />
          <p className="font-bold text-slate-900 text-sm">Location Test Console</p>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Test any GPS coordinate against the live geofence API
        </p>
      </div>

      <div className="p-4 space-y-5">

        {/* ── Presets ─────────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
            Quick Test Presets
          </p>
          <div className="space-y-1.5">
            {HEATHROW_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => runPreset(preset)}
                disabled={loading}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                  border border-slate-200 hover:border-blue-300 hover:bg-blue-50
                  transition-all text-left group disabled:opacity-50"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                  ${preset.label.includes('Airside') ? 'bg-amber-100' :
                    preset.label.includes('Blocked') || preset.label.includes('Home') || preset.label.includes('Outside')
                      ? 'bg-red-100' : 'bg-green-100'}`}
                >
                  {preset.label.includes('Home') || preset.label.includes('Outside') || preset.label.includes('Stanwell')
                    ? <Home size={13} className="text-red-600" />
                    : preset.label.includes('Blocked')
                      ? <XCircle size={13} className="text-red-600" />
                      : <Plane size={13} className="text-green-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{preset.label}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {preset.lat}, {preset.lng}
                  </p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0
                  ${preset.expected.startsWith('ALLOWED')
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'}`}
                >
                  {preset.expected.split(' — ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Manual input ─────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
            Manual Coordinates
          </p>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Latitude
                </label>
                <input
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                  placeholder="51.47134"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2
                    text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Longitude
                </label>
                <input
                  value={lng}
                  onChange={e => setLng(e.target.value)}
                  placeholder="-0.45270"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2
                    text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                GPS Accuracy (metres)
              </label>
              <input
                value={accuracy}
                onChange={e => setAccuracy(e.target.value)}
                placeholder="15"
                className="w-full border border-slate-200 rounded-xl px-3 py-2
                  text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Wi-Fi BSSIDs (optional — one per line)
              </label>
              <textarea
                value={bssidInput}
                onChange={e => setBssidInput(e.target.value)}
                rows={3}
                placeholder={'aa:bb:cc:dd:ee:ff\naa:bb:cc:dd:ee:00'}
                className="w-full border border-slate-200 rounded-xl px-3 py-2
                  text-[10px] font-mono resize-none focus:outline-none
                  focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => runTest()}
              disabled={loading || !lat || !lng}
              className="w-full flex items-center justify-center gap-2 py-2.5
                bg-purple-600 text-white rounded-xl text-sm font-bold
                hover:bg-purple-700 disabled:opacity-60 transition-colors"
            >
              {loading
                ? <><Loader size={15} className="animate-spin" /> Testing...</>
                : <><FlaskConical size={15} /> Run Test</>
              }
            </button>
          </div>
        </div>

        {/* ── Result ───────────────────────────────────────────────────────── */}
        {result && (
          <div className={`border-2 rounded-2xl overflow-hidden ${verdictColor}`}>
            {/* Verdict banner */}
            <div className={`px-4 py-3 flex items-center gap-3 ${
              result.result.allowed ? 'bg-green-100' : 'bg-red-100'}`}
            >
              {result.result.allowed
                ? <CheckCircle size={20} className="text-green-600 shrink-0" />
                : <XCircle size={20} className="text-red-600 shrink-0" />
              }
              <div>
                <p className={`font-bold text-sm ${verdictTextColor}`}>
                  {result.result.allowed ? 'CLOCK-IN ALLOWED' : 'CLOCK-IN BLOCKED'}
                </p>
                <p className={`text-xs mt-0.5 ${verdictTextColor} opacity-80`}>
                  {result.verdict}
                </p>
              </div>
            </div>

            {/* Detail grid */}
            <div className="px-4 py-3 grid grid-cols-2 gap-3">
              {[
                { label: 'Inside Airport',  value: result.result.inside_airport ? '✓ Yes' : '✗ No' },
                { label: 'Detection Method', value: result.result.location_method ?? '—' },
                { label: 'Terminal',         value: result.result.terminal_code ?? '—' },
                { label: 'Zone',             value: result.result.zone_code ?? '—' },
                { label: 'Zone Name',        value: result.result.zone_name ?? '—' },
                { label: 'Blocked Reason',   value: result.result.reason ?? 'n/a' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Raw input */}
            <div className="px-4 py-2 border-t border-slate-200 bg-white/50">
              <p className="text-[10px] text-slate-400 font-mono">
                Input: {result.test_input.lat}, {result.test_input.lng}
                {' · '}accuracy {result.test_input.accuracy_m}m
              </p>
            </div>
          </div>
        )}

        {/* ── Test history ─────────────────────────────────────────────────── */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
              Test History ({history.length})
            </p>
            <div className="space-y-1.5">
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setLat(String(h.lat));
                    setLng(String(h.lng));
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                    border border-slate-100 hover:border-slate-300 transition-colors text-left"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0
                    ${h.allowed ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-slate-700 truncate">
                      {h.label}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {h.allowed
                        ? `✓ ${h.terminal ?? ''}${h.zone ? ` / ${h.zone}` : ''}`
                        : '✗ Blocked'
                      }
                      {h.method ? ` · ${h.method}` : ''}
                    </p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0
                    ${h.allowed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {h.allowed ? 'OK' : 'BLOCKED'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Home testing tip ─────────────────────────────────────────────── */}
        <div className="bg-slate-100 rounded-xl p-3 border border-slate-200">
          <div className="flex items-start gap-2">
            <Home size={14} className="text-slate-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600">
              <p className="font-bold mb-1">Testing from home (Stanwell)</p>
              <p>
                Use the <strong>"Stanwell (Home Test)"</strong> preset above.
                This coordinate is outside the airport boundary and should always
                return <strong>BLOCKED — Outside Airport</strong>.
                Your mobile app uses <code className="bg-slate-200 px-1 rounded">
                USE_FAKE_LOCATION = true</code> in HomeScreen to simulate
                Heathrow coordinates during development.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// FILE: src/app/(cms)/geofence/page.tsx  — Main Geofence Page
// Wires together: Map + Zone list + Config panel + Test panel
// ─────────────────────────────────────────────────────────────────────────────
'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  geofenceApi, GeoTerminal, GeoZone,
  GeoJSONPolygon, TestLocationResult,
} from '@/lib/geofence-api';
import ZoneConfigPanel from '@/components/geofence/ZoneConfigPanel';
import TestPanel from '@/components/geofence/TestPanel';
import PageHeader from '@/components/shared/PageHeader';
import toast from 'react-hot-toast';
import {
  MapPin, FlaskConical, Settings, ChevronRight,
  CheckCircle, XCircle, RefreshCw, Layers,
} from 'lucide-react';

// Leaflet must load client-side only
const GeofenceMap = dynamic(
  () => import('@/components/geofence/GeofenceMap'),
  { ssr: false, loading: () => <MapSkeleton /> }
);

type PanelMode = 'config' | 'test';

export default function GeofencePage() {
  const [terminals,     setTerminals]     = useState<GeoTerminal[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedZone,  setSelectedZone]  = useState<GeoZone | null>(null);
  const [selectedTerminal, setSelectedTerminal] = useState<GeoTerminal | null>(null);
  const [panelMode,     setPanelMode]     = useState<PanelMode>('test');
  const [drawMode,      setDrawMode]      = useState(false);
  const [drawnPolygon,  setDrawnPolygon]  = useState<GeoJSONPolygon | null>(null);
  const [testPin,       setTestPin]       = useState<{ lat: number; lng: number } | null>(null);
  const [testResult,    setTestResult]    = useState<TestLocationResult['result'] | null>(null);

  const loadTerminals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await geofenceApi.getTerminals();
      setTerminals(res.data.terminals ?? []);
    } catch {
      toast.error('Failed to load terminals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTerminals(); }, [loadTerminals]);

  const handleZoneSelect = (zone: GeoZone, terminal: GeoTerminal) => {
    setSelectedZone(zone);
    setSelectedTerminal(terminal);
    setPanelMode('config');
    setDrawMode(false);
    setDrawnPolygon(null);
  };

  const handlePolygonDrawn = (polygon: GeoJSONPolygon) => {
    setDrawnPolygon(polygon);
    setDrawMode(false);
  };

  const handleTestResult = (
    pin: { lat: number; lng: number },
    result: TestLocationResult['result']
  ) => {
    setTestPin(pin);
    setTestResult(result);
  };

  // Coverage stats
  const totalZones     = terminals.reduce((acc, t) => acc + (t.zones?.length ?? 0), 0);
  const configuredZones= terminals.reduce(
    (acc, t) => acc + (t.zones?.filter(z => z.has_config).length ?? 0), 0
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Geo Operations"
        subtitle="Manage terminal geofences, zones and coordinate testing"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadTerminals}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200
                rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              onClick={() => { setPanelMode('test'); setSelectedZone(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                transition-colors
                ${panelMode === 'test' && !selectedZone
                  ? 'bg-purple-600 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <FlaskConical size={13} /> Test Console
            </button>
          </div>
        }
      />

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-5 py-2.5 bg-white border-b text-sm shrink-0">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-slate-400" />
          <span className="text-slate-500">Terminals:</span>
          <span className="font-bold text-slate-900">{terminals.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-slate-400" />
          <span className="text-slate-500">Zones:</span>
          <span className="font-bold text-slate-900">{totalZones}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-green-500" />
          <span className="text-slate-500">Configured:</span>
          <span className="font-bold text-green-600">{configuredZones}</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle size={14} className="text-red-400" />
          <span className="text-slate-500">Unconfigured:</span>
          <span className="font-bold text-red-500">{totalZones - configuredZones}</span>
        </div>
        {drawMode && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 animate-pulse">
              ✏ Draw mode active — click map to add polygon points
            </span>
            <button
              onClick={() => setDrawMode(false)}
              className="text-xs text-slate-500 hover:text-red-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Main layout: terminal list | map | right panel */}
      <div className="flex-1 overflow-hidden flex">

        {/* ── Left: Terminal + Zone list ──────────────────────────────────── */}
        <div className="w-56 border-r border-slate-200 bg-white flex flex-col overflow-hidden shrink-0">
          <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Terminals & Zones
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent
                  rounded-full animate-spin" />
              </div>
            ) : terminals.map(terminal => (
              <TerminalSection
                key={terminal.id}
                terminal={terminal}
                selectedZoneId={selectedZone?.id}
                onZoneSelect={zone => handleZoneSelect(zone, terminal)}
              />
            ))}
          </div>
        </div>

        {/* ── Centre: Map ─────────────────────────────────────────────────── */}
        <div className="flex-1 relative overflow-hidden">
          <GeofenceMap
            terminals={terminals}
            selectedZoneId={selectedZone?.id}
            testPin={testPin}
            testResult={testResult}
            onZoneClick={zoneId => {
              for (const t of terminals) {
                const z = t.zones?.find(z => z.id === zoneId);
                if (z) { handleZoneSelect(z, t); break; }
              }
            }}
            onPolygonDrawn={handlePolygonDrawn}
            drawMode={drawMode}
          />
        </div>

        {/* ── Right: Config or Test panel ─────────────────────────────────── */}
        <div className="w-80 border-l border-slate-200 bg-white flex flex-col overflow-hidden shrink-0">

          {/* Panel tabs */}
          <div className="flex border-b border-slate-200 shrink-0">
            <button
              onClick={() => setPanelMode('test')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs
                font-bold border-b-2 transition-colors
                ${panelMode === 'test'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <FlaskConical size={13} /> Test Console
            </button>
            <button
              onClick={() => setPanelMode('config')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs
                font-bold border-b-2 transition-colors
                ${panelMode === 'config'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <Settings size={13} /> Zone Config
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            {panelMode === 'test' && (
              <TestPanel onTest={handleTestResult} />
            )}

            {panelMode === 'config' && !selectedZone && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center
                  justify-center mb-4">
                  <MapPin size={24} className="text-blue-500" />
                </div>
                <p className="font-bold text-slate-800">Select a Zone</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Click a zone in the left panel to configure its geofence polygon,
                  Wi-Fi fingerprints, and BLE beacons.
                </p>
                <button
                  onClick={() => setPanelMode('test')}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl
                    text-xs font-bold hover:bg-purple-700 transition-colors"
                >
                  Open Test Console
                </button>
              </div>
            )}

            {panelMode === 'config' && selectedZone && (
              <ZoneConfigPanel
                zone={selectedZone}
                terminalCode={selectedTerminal?.code}
                drawnPolygon={drawnPolygon}
                onDrawPolygon={() => {
                  setDrawMode(true);
                  toast('Click on the map to add polygon points. Double-click to finish.', {
                    icon: '✏️',
                    duration: 5000,
                  });
                }}
                onSaved={() => {
                  loadTerminals();
                  toast.success('Zone saved — geofence cache refreshed');
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Terminal section component ────────────────────────────────────────────────

function TerminalSection({
  terminal,
  selectedZoneId,
  onZoneSelect,
}: {
  terminal:       GeoTerminal;
  selectedZoneId: string | null | undefined;
  onZoneSelect:   (zone: GeoZone) => void;
}) {
  const [open, setOpen] = useState(true);
  const configured = terminal.zones?.filter(z => z.has_config).length ?? 0;
  const total      = terminal.zones?.length ?? 0;

  const TERMINAL_COLORS: Record<string, string> = {
    T2: 'bg-purple-600',
    T3: 'bg-emerald-600',
    T4: 'bg-amber-600',
  };

  return (
    <div className="border-b border-slate-100">
      {/* Terminal header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50
          transition-colors text-left"
      >
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0
          text-white text-[10px] font-bold
          ${TERMINAL_COLORS[terminal.code] ?? 'bg-slate-600'}`}>
          {terminal.code}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 truncate">{terminal.name}</p>
          <p className="text-[10px] text-slate-400">
            {configured}/{total} zones configured
          </p>
        </div>
        {open
          ? <ChevronRight size={12} className="text-slate-400 rotate-90 shrink-0" />
          : <ChevronRight size={12} className="text-slate-400 shrink-0" />
        }
      </button>

      {/* Zone list */}
      {open && (
        <div className="pb-1">
          {(terminal.zones ?? []).map(zone => {
            const active = zone.id === selectedZoneId;
            return (
              <button
                key={zone.id}
                onClick={() => onZoneSelect(zone)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left
                  transition-colors
                  ${active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                {/* Configured indicator */}
                <div className={`w-1.5 h-1.5 rounded-full shrink-0
                  ${zone.has_config ? 'bg-green-500' : 'bg-slate-300'}`} />

                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-semibold truncate
                    ${active ? 'text-blue-700' : 'text-slate-700'}`}>
                    {zone.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full
                      ${zone.is_airside
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'}`}>
                      {zone.is_airside ? 'Airside' : 'Landside'}
                    </span>
                    {zone.bssid_count > 0 && (
                      <span className="text-[9px] text-slate-400">
                        {zone.bssid_count} BSSID
                      </span>
                    )}
                  </div>
                </div>

                {active && (
                  <Settings size={11} className="text-blue-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function MapSkeleton() {
  return (
    <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-500
          rounded-full animate-spin" />
        <p className="text-xs font-medium">Loading map...</p>
      </div>
    </div>
  );
}