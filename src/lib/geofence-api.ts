// FILE: src/lib/geofence-api.ts
// All geofence API calls to Laravel backend

import api from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeoTerminal {
  id:               string;
  name:             string;
  code:             string;
  geojson_polygon:  GeoJSONPolygon | null;
  bssid_count:      number;
  zones:            GeoZone[];
}

export interface GeoZone {
  id:              string;
  name:            string;
  code:            string;
  zone_type:       string;
  is_airside:      boolean;
  has_config:      boolean;
  bssid_count:     number;
  beacon_uuid?:    string | null;
  geojson_polygon? :GeoJSONPolygon | null;
}

export interface GeoJSONPolygon {
  type:        'Polygon';
  coordinates: number[][][]; // [[[lng,lat],[lng,lat],...]]
}

export interface GeofenceConfig {
  id?:                          string;
  zone_id:                      string;
  name:                         string;
  geojson_polygon:              GeoJSONPolygon;
  bssid_fingerprints:           BssidEntry[];
  ble_beacons:                  BleBeacon[];
  gps_accuracy_threshold_m:     number;
  min_bssid_matches:            number;
  enforce_strict_zone:          boolean;
  allow_adjacent_zone_clockin:  boolean;
  adjacent_zone_ids:            string[];
  notes:                        string;
  last_survey_at?:              string | null;
}

export interface BssidEntry {
  bssid:   string;
  ssid:    string;
  signal:  number;
  added?:  string;
}

export interface BleBeacon {
  uuid:        string;
  major?:      number;
  minor?:      number;
  description: string;
}

export interface TestLocationPayload {
  lat:         number;
  lng:         number;
  accuracy_m:  number;
  bssids?:     string[];
  beacon_uuid?:string;
}

export interface TestLocationResult {
  test_input: { lat: number; lng: number; accuracy_m: number };
  result: {
    allowed:          boolean;
    inside_airport:   boolean;
    reason:           string | null;
    terminal_id:      string | null;
    terminal_code:    string | null;
    zone_id:          string | null;
    zone_code:        string | null;
    zone_name:        string | null;
    location_method:  string | null;
  };
  verdict: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const geofenceApi = {
  // Terminals
  getTerminals: ():
    Promise<{ data: { terminals: GeoTerminal[] } }> =>
    api.get('/cms/geofence/terminals'),

  updateTerminal: (id: string, data: {
    name?:               string;
    geojson_polygon?:    GeoJSONPolygon;
    bssid_fingerprints?: string[];
  }) => api.put(`/cms/geofence/terminals/${id}`, data),

  // Zones
  getZones: (terminalId: string):
    Promise<{ data: { zones: GeoZone[] } }> =>
    api.get(`/cms/geofence/terminals/${terminalId}/zones`),

  updateZone: (id: string, data: {
    name?:               string;
    geojson_polygon?:    GeoJSONPolygon;
    bssid_fingerprints?: string[];
    beacon_uuid?:        string | null;
    is_airside?:         boolean;
  }) => api.put(`/cms/geofence/zones/${id}`, data),

  // Geofence config per zone
  getConfig: (zoneId: string):
    Promise<{ data: { zone: GeoZone; config: GeofenceConfig | null } }> =>
    api.get(`/cms/geofence/zones/${zoneId}/config`),

  saveConfig: (zoneId: string, config: Omit<GeofenceConfig, 'id' | 'zone_id' | 'name' | 'last_survey_at'>) =>
    api.post(`/cms/geofence/zones/${zoneId}/config`, config),

  // BSSID management
  addBssid: (zoneId: string, data: { bssid: string; ssid?: string; signal?: number }) =>
    api.post(`/cms/geofence/zones/${zoneId}/bssid`, data),

  removeBssid: (zoneId: string, bssid: string) =>
    api.delete(`/cms/geofence/zones/${zoneId}/bssid`, { data: { bssid } }),

  // Test location
  testLocation: (payload: TestLocationPayload):
    Promise<{ data: TestLocationResult }> =>
    api.post('/cms/geofence/test', payload),
};

// ── Heathrow reference coordinates ────────────────────────────────────────────
// Use these for testing from home

export const HEATHROW_PRESETS = [
  { label: '✈ T2 Check-in (Landside)',  lat: 51.47134, lng: -0.45270, accuracy_m: 8,  expected: 'ALLOWED — T2' },
  { label: '✈ T3 Check-in (Landside)',  lat: 51.47249, lng: -0.45643, accuracy_m: 8,  expected: 'ALLOWED — T3' },
  { label: '✈ T4 Check-in (Landside)',  lat: 51.45895, lng: -0.44897, accuracy_m: 8,  expected: 'ALLOWED — T4' },
  { label: '✈ T2 Airside Gates',        lat: 51.47089, lng: -0.45489, accuracy_m: 10, expected: 'ALLOWED — T2 Airside' },
  { label: '✈ T3 Airside Gates',        lat: 51.47198, lng: -0.45712, accuracy_m: 10, expected: 'ALLOWED — T3 Airside' },
  { label: '✈ T4 Satellite Pier',       lat: 51.45780, lng: -0.44920, accuracy_m: 12, expected: 'ALLOWED — T4 Airside' },
  { label: '🚌 Bus Station (Blocked)',   lat: 51.47180, lng: -0.45110, accuracy_m: 8,  expected: 'BLOCKED — Exclusion Zone' },
  { label: '🏠 Hatton Cross (Outside)', lat: 51.46523, lng: -0.42361, accuracy_m: 8,  expected: 'BLOCKED — Outside Airport' },
  { label: '🏠 Bath Road (Outside)',     lat: 51.47500, lng: -0.43500, accuracy_m: 15, expected: 'BLOCKED — Outside Airport' },
  { label: '🏠 Stanwell (Home Test)',    lat: 51.45800, lng: -0.47000, accuracy_m: 20, expected: 'BLOCKED — Outside Airport' },
];

// Heathrow airport centre for map
export const HEATHROW_CENTER: [number, number] = [51.4700, -0.4543];
export const HEATHROW_ZOOM = 14;

// Terminal polygon coordinates (GeoJSON format [lng, lat])
export const TERMINAL_POLYGONS: Record<string, GeoJSONPolygon> = {
  T2: {
    type: 'Polygon',
    coordinates: [[
      [-0.4560, 51.4700],
      [-0.4490, 51.4700],
      [-0.4490, 51.4730],
      [-0.4560, 51.4730],
      [-0.4560, 51.4700],
    ]],
  },
  T3: {
    type: 'Polygon',
    coordinates: [[
      [-0.4600, 51.4710],
      [-0.4560, 51.4710],
      [-0.4560, 51.4740],
      [-0.4600, 51.4740],
      [-0.4600, 51.4710],
    ]],
  },
  T4: {
    type: 'Polygon',
    coordinates: [[
      [-0.4530, 51.4570],
      [-0.4450, 51.4570],
      [-0.4450, 51.4610],
      [-0.4530, 51.4610],
      [-0.4530, 51.4570],
    ]],
  },
};