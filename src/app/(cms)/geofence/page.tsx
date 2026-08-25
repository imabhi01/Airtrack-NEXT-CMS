'use client';
import { useEffect, useState } from 'react';
import { geofenceApi } from '@/lib/cms-api';
import PageHeader from '@/components/shared/PageHeader';
import Modal from '@/components/shared/Modal';
import toast from 'react-hot-toast';
import { MapPin, Wifi, CheckCircle, XCircle, FlaskConical, Plus, Trash2 } from 'lucide-react';
 
export default function GeofencePage() {
  const [terminals,      setTerminals]      = useState<any[]>([]);
  const [selectedZone,   setSelectedZone]   = useState<any>(null);
  const [zoneConfig,     setZoneConfig]     = useState<any>(null);
  const [configModal,    setConfigModal]    = useState(false);
  const [testModal,      setTestModal]      = useState(false);
  const [loading,        setLoading]        = useState(true);
 
  useEffect(() => {
    geofenceApi.terminals().then(r => {
      setTerminals(r.data.terminals ?? []);
    }).finally(() => setLoading(false));
  }, []);
 
  const openZoneConfig = async (zone: any) => {
    setSelectedZone(zone);
    const res = await geofenceApi.getConfig(zone.id);
    setZoneConfig(res.data.config);
    setConfigModal(true);
  };
 
  return (
    <div>
      <PageHeader
        title="Geofence Setup"
        subtitle="Configure GPS polygons, Wi-Fi fingerprints and BLE beacons per zone"
        actions={
          <button
            onClick={() => setTestModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700"
          >
            <FlaskConical size={15} /> Test Location
          </button>
        }
      />
 
      <div className="p-6 space-y-4">
        {loading && <p className="text-center text-gray-400 py-10">Loading terminals...</p>}
 
        {terminals.map(terminal => (
          <div key={terminal.id} className="bg-white rounded-xl border overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-[#1A2B4A]">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <MapPin size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">{terminal.name}</p>
                <p className="text-xs text-white/50">
                  {terminal.zones?.length ?? 0} zones · {terminal.bssid_count} BSSID fingerprints
                </p>
              </div>
              <div className="flex items-center gap-2">
                {terminal.geojson_polygon ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle size={12} /> Polygon set
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-400">
                    <XCircle size={12} /> No polygon
                  </span>
                )}
              </div>
            </div>
 
            {/* Zones grid */}
            <div className="p-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
              {(terminal.zones ?? []).map((zone: any) => (
                <div
                  key={zone.id}
                  className="border rounded-xl p-3 hover:border-blue-300 cursor-pointer transition-colors"
                  onClick={() => openZoneConfig(zone)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{zone.name}</p>
                      <p className="text-xs text-gray-400">{zone.code}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                      ${zone.is_airside ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {zone.is_airside ? 'Airside' : 'Landside'}
                    </span>
                  </div>
 
                  <div className="flex gap-3 text-[11px]">
                    <span className={`flex items-center gap-1 ${zone.has_config ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle size={10} />
                      Config
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Wifi size={10} />
                      {zone.bssid_count} BSSID
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
 
      {configModal && selectedZone && (
        <ZoneConfigModal
          zone={selectedZone}
          config={zoneConfig}
          onClose={() => { setConfigModal(false); setSelectedZone(null); }}
          onSave={() => {
            geofenceApi.terminals().then(r => setTerminals(r.data.terminals ?? []));
            setConfigModal(false);
          }}
        />
      )}
 
      {testModal && (
        <TestLocationModal onClose={() => setTestModal(false)} />
      )}
    </div>
  );
}
 
function ZoneConfigModal({ zone, config, onClose, onSave }: any) {
  const [form, setForm] = useState({
    geojson_polygon:             config?.geojson_polygon ?? null,
    gps_accuracy_threshold_m:    config?.gps_accuracy_threshold_m ?? 30,
    min_bssid_matches:           config?.min_bssid_matches ?? 2,
    enforce_strict_zone:         config?.enforce_strict_zone ?? false,
    allow_adjacent_zone_clockin: config?.allow_adjacent_zone_clockin ?? true,
    notes:                       config?.notes ?? '',
  });
  const [bssids,   setBssids]   = useState<any[]>(config?.bssid_fingerprints ?? []);
  const [newBssid, setNewBssid] = useState('');
  const [saving,   setSaving]   = useState(false);
 
  const handleSave = async () => {
    setSaving(true);
    try {
      await geofenceApi.saveConfig(zone.id, {
        ...form,
        bssid_fingerprints: bssids,
        geojson_polygon: form.geojson_polygon ?? {
          type: 'Polygon',
          coordinates: [[]], // placeholder if none set
        },
      });
      toast.success('Geofence config saved');
      onSave();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };
 
  const addBssid = () => {
    if (!newBssid.trim()) return;
    setBssids(b => [...b, { bssid: newBssid.trim().toLowerCase(), ssid: '', signal: -65 }]);
    setNewBssid('');
  };
 
  const removeBssid = (bssid: string) => {
    setBssids(b => b.filter(x => x.bssid !== bssid));
  };
 
  return (
    <Modal open title={`Geofence Config — ${zone.name}`} onClose={onClose} size="lg">
      <div className="space-y-5">
 
        {/* GPS accuracy */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              GPS Accuracy Threshold (m)
            </label>
            <input type="number" value={form.gps_accuracy_threshold_m}
              onChange={e => setForm(f => ({...f, gps_accuracy_threshold_m: +e.target.value}))}
              min={5} max={200}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">GPS polygon only used if accuracy ≤ this value</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Min BSSID Matches
            </label>
            <input type="number" value={form.min_bssid_matches}
              onChange={e => setForm(f => ({...f, min_bssid_matches: +e.target.value}))}
              min={1} max={10}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">Minimum Wi-Fi access points that must match</p>
          </div>
        </div>
 
        {/* Toggles */}
        <div className="space-y-3">
          {[
            { key: 'enforce_strict_zone', label: 'Enforce strict zone', desc: 'Staff must be in exactly this zone to clock in' },
            { key: 'allow_adjacent_zone_clockin', label: 'Allow adjacent zone clock-in', desc: 'Staff in a neighbouring zone can still clock in' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center gap-3">
              <button
                onClick={() => setForm(f => ({...f, [key]: !(f as any)[key]}))}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0
                  ${(form as any)[key] ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all
                  ${(form as any)[key] ? 'left-5' : 'left-0.5'}`} />
              </button>
              <div>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
 
        {/* BSSID fingerprints */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            Wi-Fi BSSID Fingerprints ({bssids.length})
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Add the MAC addresses of Wi-Fi access points in this zone.
            Walk the zone with a Wi-Fi scanner app to collect these.
          </p>
 
          <div className="flex gap-2 mb-3">
            <input
              value={newBssid}
              onChange={e => setNewBssid(e.target.value)}
              placeholder="aa:bb:cc:dd:ee:ff"
              className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              onClick={addBssid}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
            >
              <Plus size={15} />
            </button>
          </div>
 
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {bssids.map((b: any) => (
              <div key={b.bssid} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
                <Wifi size={13} className="text-gray-400 shrink-0" />
                <span className="text-xs font-mono text-gray-700 flex-1">{b.bssid}</span>
                <button
                  onClick={() => removeBssid(b.bssid)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {bssids.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">No BSSID fingerprints yet</p>
            )}
          </div>
        </div>
 
        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Notes</label>
          <textarea value={form.notes}
            onChange={e => setForm(f => ({...f, notes: e.target.value}))}
            rows={2}
            placeholder="e.g. Last surveyed Jan 2026, 4 Cisco APs installed..."
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
 
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
 
function TestLocationModal({ onClose }: any) {
  const [form, setForm] = useState({ lat: '', lng: '', accuracy_m: '15' });
  const [result, setResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
 
  // Heathrow presets
  const presets = [
    { label: 'T2 Check-in', lat: '51.47134', lng: '-0.45270' },
    { label: 'T3 Check-in', lat: '51.47249', lng: '-0.45643' },
    { label: 'T4 Check-in', lat: '51.45895', lng: '-0.44897' },
    { label: 'T2 Airside',  lat: '51.47089', lng: '-0.45489' },
    { label: 'Bus Station', lat: '51.47180', lng: '-0.45110' },
    { label: 'Outside LHR', lat: '51.46523', lng: '-0.42361' },
  ];
 
  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await geofenceApi.testLocation({
        lat:        parseFloat(form.lat),
        lng:        parseFloat(form.lng),
        accuracy_m: parseInt(form.accuracy_m),
      });
      setResult(res.data);
    } catch (err: any) {
      toast.error('Test failed: ' + (err?.response?.data?.message ?? 'Unknown'));
    } finally {
      setTesting(false);
    }
  };
 
  return (
    <Modal open title="Test Location" onClose={onClose} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Test what the geofence engine would return for a given set of coordinates.
        </p>
 
        {/* Presets */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Quick Presets</p>
          <div className="flex flex-wrap gap-2 text-gray-400">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => setForm(f => ({...f, lat: p.lat, lng: p.lng}))}
                className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-xs font-medium transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
 
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Latitude</label>
            <input value={form.lat} onChange={e => setForm(f => ({...f, lat: e.target.value}))}
              placeholder="51.47134"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Longitude</label>
            <input value={form.lng} onChange={e => setForm(f => ({...f, lng: e.target.value}))}
              placeholder="-0.45270"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Accuracy (m)</label>
            <input value={form.accuracy_m} onChange={e => setForm(f => ({...f, accuracy_m: e.target.value}))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
 
        <button onClick={handleTest} disabled={testing || !form.lat || !form.lng}
          className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-60">
          {testing ? 'Testing...' : 'Run Test'}
        </button>
 
        {result && (
          <div className={`p-4 rounded-xl border-2 ${result.result?.allowed ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <p className={`font-bold text-sm mb-3 ${result.result?.allowed ? 'text-green-700' : 'text-red-700'}`}>
              {result.verdict}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Inside airport', result.result?.inside_airport ? 'Yes' : 'No'],
                ['Allowed',        result.result?.allowed ? 'Yes' : 'No'],
                ['Terminal',       result.result?.terminal_code ?? '—'],
                ['Zone',           result.result?.zone_code ?? '—'],
                ['Method',         result.result?.location_method ?? '—'],
                ['Reason',         result.result?.reason ?? 'n/a'],
              ].map(([k, v]) => (
                <div key={k}>
                  <span className="text-gray-500">{k}: </span>
                  <span className="font-semibold text-gray-800">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
 