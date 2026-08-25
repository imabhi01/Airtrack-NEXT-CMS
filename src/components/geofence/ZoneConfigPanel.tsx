'use client';
// FILE: src/components/geofence/ZoneConfigPanel.tsx
// Full CRUD for a zone's geofence config — polygon, BSSIDs, BLE beacons

import { useState, useEffect } from 'react';
import {
  geofenceApi, GeofenceConfig, BssidEntry, BleBeacon,
  GeoJSONPolygon, GeoZone, TERMINAL_POLYGONS,
} from '@/lib/geofence-api';
import toast from 'react-hot-toast';
import {
  Wifi, Radio, MapPin, Save, Trash2, Plus,
  RefreshCw, CheckCircle, XCircle, Info,
  ChevronDown, ChevronUp, Pencil,
} from 'lucide-react';

interface Props {
  zone:           GeoZone;
  terminalCode?:  string;
  onSaved?:       () => void;
  onDrawPolygon?: () => void;
  drawnPolygon?:  GeoJSONPolygon | null;
}

export default function ZoneConfigPanel({
  zone,
  terminalCode,
  onSaved,
  onDrawPolygon,
  drawnPolygon,
}: Props) {
  const [config,   setConfig]   = useState<GeofenceConfig | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [section,  setSection]  = useState<'polygon' | 'wifi' | 'ble' | 'settings'>('polygon');

  // Form state
  const [polygon,         setPolygon]         = useState<GeoJSONPolygon | null>(null);
  const [bssids,          setBssids]           = useState<BssidEntry[]>([]);
  const [beacons,         setBeacons]          = useState<BleBeacon[]>([]);
  const [gpsThreshold,    setGpsThreshold]     = useState(30);
  const [minBssidMatches, setMinBssidMatches]  = useState(2);
  const [strictZone,      setStrictZone]       = useState(false);
  const [allowAdjacent,   setAllowAdjacent]    = useState(true);
  const [notes,           setNotes]            = useState('');

  // New BSSID form
  const [newBssid, setNewBssid] = useState('');
  const [newSsid,  setNewSsid]  = useState('');
  const [newSignal,setNewSignal]= useState(-65);

  // New BLE form
  const [newBeaconUuid,  setNewBeaconUuid]  = useState('');
  const [newBeaconDesc,  setNewBeaconDesc]  = useState('');

  useEffect(() => {
    loadConfig();
  }, [zone.id]);

  // Accept drawn polygon from parent
  useEffect(() => {
    if (drawnPolygon) {
      setPolygon(drawnPolygon);
      setSection('polygon');
      toast.success('Polygon drawn — click Save to apply');
    }
  }, [drawnPolygon]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await geofenceApi.getConfig(zone.id);
      const c   = res.data.config;
      if (c) {
        setConfig(c);
        setPolygon(c.geojson_polygon);
        setBssids(c.bssid_fingerprints ?? []);
        setBeacons(c.ble_beacons ?? []);
        setGpsThreshold(c.gps_accuracy_threshold_m ?? 30);
        setMinBssidMatches(c.min_bssid_matches ?? 2);
        setStrictZone(c.enforce_strict_zone ?? false);
        setAllowAdjacent(c.allow_adjacent_zone_clockin ?? true);
        setNotes(c.notes ?? '');
      } else {
        // No config yet — use terminal polygon as default
        const defaultPolygon = terminalCode ? TERMINAL_POLYGONS[terminalCode] : null;
        setPolygon(defaultPolygon);
      }
    } catch (err) {
      toast.error('Could not load zone config');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!polygon) {
      toast.error('A polygon is required. Draw one on the map or use the default.');
      return;
    }
    setSaving(true);
    try {
      await geofenceApi.saveConfig(zone.id, {
        geojson_polygon:             polygon,
        bssid_fingerprints:          bssids,
        ble_beacons:                 beacons,
        gps_accuracy_threshold_m:    gpsThreshold,
        min_bssid_matches:           minBssidMatches,
        enforce_strict_zone:         strictZone,
        allow_adjacent_zone_clockin: allowAdjacent,
        adjacent_zone_ids:           [],
        notes,
      });
      toast.success(`✓ ${zone.name} geofence saved`);
      onSaved?.();
      loadConfig();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const useDefaultPolygon = () => {
    if (!terminalCode || !TERMINAL_POLYGONS[terminalCode]) {
      toast.error('No default polygon for this terminal');
      return;
    }
    setPolygon(TERMINAL_POLYGONS[terminalCode]);
    toast.success('Default terminal polygon applied');
  };

  const addBssid = () => {
    if (!newBssid.trim()) { toast.error('BSSID is required'); return; }
    const mac = newBssid.trim().toLowerCase();
    if (!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(mac)) {
      toast.error('Invalid MAC format. Use: aa:bb:cc:dd:ee:ff');
      return;
    }
    if (bssids.some(b => b.bssid === mac)) {
      toast.error('This BSSID is already added');
      return;
    }
    setBssids(b => [...b, {
      bssid:  mac,
      ssid:   newSsid.trim(),
      signal: newSignal,
      added:  new Date().toISOString(),
    }]);
    setNewBssid('');
    setNewSsid('');
    setNewSignal(-65);
    toast.success('BSSID added');
  };

  const removeBssid = (bssid: string) => {
    setBssids(b => b.filter(x => x.bssid !== bssid));
  };

  const addBeacon = () => {
    if (!newBeaconUuid.trim()) { toast.error('UUID is required'); return; }
    setBeacons(b => [...b, {
      uuid:        newBeaconUuid.trim(),
      description: newBeaconDesc.trim(),
    }]);
    setNewBeaconUuid('');
    setNewBeaconDesc('');
    toast.success('BLE beacon added');
  };

  const removeBeacon = (uuid: string) => {
    setBeacons(b => b.filter(x => x.uuid !== uuid));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: 'polygon',  label: 'Polygon',   icon: MapPin   },
    { key: 'wifi',     label: `Wi-Fi (${bssids.length})`,  icon: Wifi    },
    { key: 'ble',      label: `BLE (${beacons.length})`,   icon: Radio   },
    { key: 'settings', label: 'Settings',  icon: CheckCircle },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      {/* Zone header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-900 text-sm">{zone.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500 font-mono">{zone.code}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                ${zone.is_airside
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'}`}>
                {zone.is_airside ? '✈ Airside' : '🏢 Landside'}
              </span>
              {config && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full
                  bg-blue-100 text-blue-700">
                  ✓ Configured
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white
              rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-60
              transition-colors"
          >
            {saving
              ? <RefreshCw size={12} className="animate-spin" />
              : <Save size={12} />
            }
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold
              border-b-2 transition-colors flex-1 justify-center
              ${section === key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── POLYGON TAB ───────────────────────────────────────────────────── */}
        {section === 'polygon' && (
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <button
                onClick={onDrawPolygon}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5
                  bg-blue-600 text-white rounded-lg text-xs font-bold
                  hover:bg-blue-700 transition-colors"
              >
                <Pencil size={13} /> Draw on Map
              </button>
              <button
                onClick={useDefaultPolygon}
                disabled={!terminalCode}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5
                  border-2 border-slate-300 text-slate-600 rounded-lg text-xs font-bold
                  hover:border-blue-400 hover:text-blue-600 transition-colors
                  disabled:opacity-40"
              >
                <MapPin size={13} /> Use Terminal Default
              </button>
            </div>

            {polygon ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <p className="text-xs font-bold text-green-700">Polygon configured</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">
                    GeoJSON Coordinates ({polygon.coordinates[0].length} points)
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {polygon.coordinates[0].map(([lng, lat], i) => (
                      <div key={i} className="flex gap-4 text-[10px] font-mono text-slate-600">
                        <span className="text-slate-400 w-4">{i + 1}</span>
                        <span>lat: <strong>{lat.toFixed(6)}</strong></span>
                        <span>lng: <strong>{lng.toFixed(6)}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manual JSON edit */}
                <details className="mt-3">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                    Edit raw GeoJSON
                  </summary>
                  <textarea
                    className="mt-2 w-full h-32 text-[10px] font-mono border border-slate-200
                      rounded-lg p-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={JSON.stringify(polygon, null, 2)}
                    onChange={e => {
                      try {
                        setPolygon(JSON.parse(e.target.value));
                      } catch {}
                    }}
                  />
                </details>

                <button
                  onClick={() => setPolygon(null)}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Clear polygon
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <MapPin size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">No polygon set</p>
                <p className="text-xs mt-1">Draw on the map or use the terminal default</p>
              </div>
            )}
          </div>
        )}

        {/* ── WI-FI TAB ─────────────────────────────────────────────────────── */}
        {section === 'wifi' && (
          <div className="p-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex gap-2">
                <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p className="font-bold mb-0.5">How Wi-Fi fingerprinting works</p>
                  <p>Walk the zone with a Wi-Fi scanner app (e.g. "WiFi Analyzer" on Android).
                    Add the MAC addresses (BSSIDs) of access points visible from inside the zone.
                    The system matches at least <strong>{minBssidMatches} BSSIDs</strong> before allowing clock-in.</p>
                </div>
              </div>
            </div>

            {/* Add BSSID form */}
            <div className="border border-slate-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-slate-700">Add Wi-Fi Access Point</p>
              <input
                value={newBssid}
                onChange={e => setNewBssid(e.target.value)}
                placeholder="MAC address: aa:bb:cc:dd:ee:ff"
                className="w-full border border-slate-200 rounded-lg px-3 py-2
                  text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <input
                  value={newSsid}
                  onChange={e => setNewSsid(e.target.value)}
                  placeholder="Network name (SSID) — optional"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2
                    text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={newSignal}
                  onChange={e => setNewSignal(+e.target.value)}
                  placeholder="Signal dBm"
                  className="w-24 border border-slate-200 rounded-lg px-3 py-2
                    text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={addBssid}
                className="w-full flex items-center justify-center gap-1.5 py-2
                  bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
              >
                <Plus size={13} /> Add BSSID
              </button>
            </div>

            {/* BSSID list */}
            <div className="space-y-2">
              {bssids.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-4">
                  No BSSIDs added yet
                </p>
              ) : bssids.map((b, i) => (
                <div key={b.bssid} className="flex items-center gap-2 p-2.5
                  bg-slate-50 border border-slate-200 rounded-xl">
                  <Wifi size={13} className="text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-800 font-bold">{b.bssid}</p>
                    <p className="text-[10px] text-slate-400">
                      {b.ssid ? `${b.ssid} · ` : ''}{b.signal} dBm
                    </p>
                  </div>
                  <button
                    onClick={() => removeBssid(b.bssid)}
                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BLE TAB ───────────────────────────────────────────────────────── */}
        {section === 'ble' && (
          <div className="p-4 space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <div className="flex gap-2">
                <Info size={13} className="text-purple-500 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-700">
                  <p className="font-bold mb-0.5">BLE Beacon setup</p>
                  <p>Place BLE beacons at zone entry points. Staff phones detect
                    the beacon UUID automatically. Most precise method — works even
                    when GPS is poor indoors.</p>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-slate-700">Add BLE Beacon</p>
              <input
                value={newBeaconUuid}
                onChange={e => setNewBeaconUuid(e.target.value)}
                placeholder="UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full border border-slate-200 rounded-lg px-3 py-2
                  text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                value={newBeaconDesc}
                onChange={e => setNewBeaconDesc(e.target.value)}
                placeholder="Description e.g. Gate A1 Entry Beacon"
                className="w-full border border-slate-200 rounded-lg px-3 py-2
                  text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={addBeacon}
                className="w-full flex items-center justify-center gap-1.5 py-2
                  bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700"
              >
                <Plus size={13} /> Add Beacon
              </button>
            </div>

            <div className="space-y-2">
              {beacons.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-4">No beacons added yet</p>
              ) : beacons.map(b => (
                <div key={b.uuid} className="flex items-center gap-2 p-2.5
                  bg-slate-50 border border-slate-200 rounded-xl">
                  <Radio size={13} className="text-purple-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono text-slate-800 break-all">{b.uuid}</p>
                    {b.description && (
                      <p className="text-[10px] text-slate-400">{b.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeBeacon(b.uuid)}
                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ──────────────────────────────────────────────────── */}
        {section === 'settings' && (
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  GPS Accuracy Threshold (metres)
                </label>
                <input
                  type="number"
                  value={gpsThreshold}
                  onChange={e => setGpsThreshold(+e.target.value)}
                  min={5} max={200}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                    text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  GPS polygon matching only runs if phone accuracy ≤ this value
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Minimum BSSID Matches
                </label>
                <input
                  type="number"
                  value={minBssidMatches}
                  onChange={e => setMinBssidMatches(+e.target.value)}
                  min={1} max={10}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                    text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Minimum Wi-Fi access points that must match to confirm zone
                </p>
              </div>

              {[
                {
                  key:   'strictZone',
                  value: strictZone,
                  set:   setStrictZone,
                  label: 'Enforce Strict Zone',
                  desc:  'Staff must be physically inside this zone to clock in — no adjacent zones allowed',
                },
                {
                  key:   'allowAdjacent',
                  value: allowAdjacent,
                  set:   setAllowAdjacent,
                  label: 'Allow Adjacent Zone Clock-in',
                  desc:  'Staff detected in a neighbouring zone can still clock in here',
                },
              ].map(({ key, value, set, label, desc }) => (
                <div
                  key={key}
                  className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl
                    cursor-pointer hover:border-blue-300 transition-colors"
                  onClick={() => set((v: boolean) => !v)}
                >
                  <button
                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 mt-0.5
                      ${value ? 'bg-blue-500' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full
                      shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Last surveyed Jan 2026, 4 Cisco APs installed..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                    text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}