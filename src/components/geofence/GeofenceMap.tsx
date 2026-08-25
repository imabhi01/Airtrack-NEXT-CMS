'use client';
// FILE: src/components/geofence/GeofenceMap.tsx
// Interactive map showing all terminals and zones with polygon editing

import { useEffect, useRef, useState } from 'react';
import { GeoTerminal, GeoJSONPolygon, HEATHROW_CENTER, HEATHROW_ZOOM } from '@/lib/geofence-api';

interface Props {
  terminals:        GeoTerminal[];
  selectedZoneId?:  string | null;
  testPin?:         { lat: number; lng: number } | null;
  testResult?:      { allowed: boolean; terminal_code: string | null; zone_code: string | null } | null;
  onZoneClick?:     (zoneId: string) => void;
  onPolygonDrawn?:  (polygon: GeoJSONPolygon) => void;
  drawMode?:        boolean;
}

const TERMINAL_COLORS: Record<string, string> = {
  T2: '#534AB7',
  T3: '#0F6E56',
  T4: '#BA7517',
};

export default function GeofenceMap({
  terminals,
  selectedZoneId,
  testPin,
  testResult,
  onZoneClick,
  onPolygonDrawn,
  drawMode = false,
}: Props) {
  const mapRef      = useRef<any>(null);
  const leafletRef  = useRef<any>(null);
  const layersRef   = useRef<any[]>([]);
  const drawLayerRef= useRef<any>(null);
  const drawnPoints = useRef<[number, number][]>([]);
  const [mapReady, setMapReady] = useState(false);

  // ── Initialize map (client-side only) ─────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mapRef.current) return; // already initialized

    const init = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      leafletRef.current = L;

      const container = document.getElementById('geofence-map');
      if (!container) return;

      const map = L.map(container, {
        center:          HEATHROW_CENTER,
        zoom:            HEATHROW_ZOOM,
        zoomControl:     true,
        attributionControl: true,
      });

      // Tile layer — OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom:     19,
      }).addTo(map);

      // Airport boundary rectangle
      L.rectangle(
        [[51.454, -0.493], [51.481, -0.431]],
        {
          color:     '#3B8BD4',
          weight:     2,
          fillColor: '#3B8BD4',
          fillOpacity: 0.04,
          dashArray: '8 4',
        }
      ).addTo(map).bindTooltip('Heathrow Airport Boundary', { permanent: false });

      // Bus station exclusion zone
      L.circle([51.4718, -0.4511], {
        radius:      150,
        color:       '#E24B4A',
        weight:       2,
        fillColor:   '#E24B4A',
        fillOpacity:  0.15,
        dashArray:   '6 3',
      }).addTo(map).bindTooltip('⛔ Bus Station — Exclusion Zone', { permanent: false });

      mapRef.current = map;
      setMapReady(true);
    };

    init();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ── Draw terminal polygons ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const L   = leafletRef.current;
    const map = mapRef.current;

    // Remove old layers
    layersRef.current.forEach(l => l.remove());
    layersRef.current = [];

    terminals.forEach(terminal => {
      const color = TERMINAL_COLORS[terminal.code] ?? '#3B8BD4';

      // Terminal polygon
      if (terminal.geojson_polygon?.coordinates?.[0]) {
        const coords = terminal.geojson_polygon.coordinates[0].map(
          ([lng, lat]: number[]) => [lat, lng] as [number, number]
        );

        const poly = L.polygon(coords, {
          color,
          weight:       2.5,
          fillColor:    color,
          fillOpacity:  0.12,
        })
          .addTo(map)
          .bindTooltip(
            `<strong>${terminal.name}</strong><br/>${terminal.code}`,
            { permanent: false }
          );

        layersRef.current.push(poly);

        // Terminal label
        const center = coords.reduce(
          ([accLat, accLng], [lat, lng]) => [accLat + lat, accLng + lng],
          [0, 0]
        ).map(v => v / coords.length) as [number, number];

        const label = L.marker(center, {
          icon: L.divIcon({
            className: '',
            html: `<div style="
              background:${color}; color:white; font-size:11px; font-weight:700;
              padding:3px 8px; border-radius:6px; white-space:nowrap;
              box-shadow:0 2px 6px rgba(0,0,0,0.3);">
              ${terminal.code}
            </div>`,
            iconAnchor: [20, 10],
          }),
        }).addTo(map);

        layersRef.current.push(label);
      }
    });
  }, [mapReady, terminals]);

  // ── Draw test pin ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const L   = leafletRef.current;
    const map = mapRef.current;

    // Remove old test pin
    layersRef.current
      .filter(l => l._testPin)
      .forEach(l => { l.remove(); });
    layersRef.current = layersRef.current.filter(l => !l._testPin);

    if (!testPin) return;

    const color   = testResult?.allowed ? '#1D9E75' : '#E24B4A';
    const label   = testResult?.allowed
      ? `✓ Allowed${testResult.terminal_code ? ` — ${testResult.terminal_code}` : ''}`
      : '✗ Blocked';

    const marker = L.marker([testPin.lat, testPin.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="
          background:${color}; color:white; font-size:11px; font-weight:700;
          padding:5px 10px; border-radius:20px; white-space:nowrap;
          box-shadow:0 3px 10px rgba(0,0,0,0.4); border:2px solid white;">
          📍 ${label}
        </div>`,
        iconAnchor: [60, 20],
      }),
    }).addTo(map);

    (marker as any)._testPin = true;
    layersRef.current.push(marker);

    // Accuracy circle
    const circle = L.circle([testPin.lat, testPin.lng], {
      radius:      20,
      color,
      weight:       2,
      fillColor:    color,
      fillOpacity:  0.15,
    }).addTo(map);

    (circle as any)._testPin = true;
    layersRef.current.push(circle);

    // Pan to test pin
    map.setView([testPin.lat, testPin.lng], 16, { animate: true });
  }, [testPin, testResult, mapReady]);

  // ── Draw mode — click to draw polygon ─────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const L   = leafletRef.current;
    const map = mapRef.current;

    if (drawMode) {
      drawnPoints.current = [];
      map.getContainer().style.cursor = 'crosshair';

      const handleClick = (e: any) => {
        const { lat, lng } = e.latlng;
        drawnPoints.current.push([lat, lng]);

        // Draw point marker
        const m = L.circleMarker([lat, lng], {
          radius:    5,
          color:     '#3B8BD4',
          fillColor: '#3B8BD4',
          fillOpacity: 1,
        }).addTo(map);

        if (drawLayerRef.current) drawLayerRef.current.push(m);
        else drawLayerRef.current = [m];

        // Draw line connecting points
        if (drawnPoints.current.length > 1) {
          const line = L.polyline(drawnPoints.current, {
            color:  '#3B8BD4',
            weight:  2,
            dashArray: '4 4',
          }).addTo(map);
          drawLayerRef.current.push(line);
        }
      };

      const handleDblClick = () => {
        if (drawnPoints.current.length < 3) return;

        // Close polygon
        const points = [...drawnPoints.current, drawnPoints.current[0]];
        const poly = L.polygon(drawnPoints.current, {
          color:       '#3B8BD4',
          weight:       2,
          fillOpacity:  0.2,
        }).addTo(map);

        // Clear draw markers
        drawLayerRef.current?.forEach((l: any) => l.remove());
        drawLayerRef.current = [poly];

        // Convert to GeoJSON [lng, lat]
        const geojson: GeoJSONPolygon = {
          type: 'Polygon',
          coordinates: [points.map(([lat, lng]) => [lng, lat])],
        };

        onPolygonDrawn?.(geojson);
        drawnPoints.current = [];
        map.off('click', handleClick);
        map.off('dblclick', handleDblClick);
        map.getContainer().style.cursor = '';
      };

      map.on('click', handleClick);
      map.on('dblclick', handleDblClick);

      return () => {
        map.off('click', handleClick);
        map.off('dblclick', handleDblClick);
        map.getContainer().style.cursor = '';
      };
    } else {
      map.getContainer().style.cursor = '';
      drawLayerRef.current?.forEach((l: any) => l.remove());
      drawLayerRef.current = null;
      drawnPoints.current  = [];
    }
  }, [drawMode, mapReady, onPolygonDrawn]);

  return (
    <div className="relative w-full h-full">
      <div id="geofence-map" className="w-full h-full rounded-xl" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl
        shadow-lg border border-slate-200 p-3 text-xs space-y-1.5 z-[1000]">
        <p className="font-bold text-slate-700 mb-2">Map Legend</p>
        {[
          { color: '#3B8BD4', label: 'Airport Boundary', dashed: true },
          { color: '#E24B4A', label: 'Exclusion Zone (Bus Station)' },
          { color: '#534AB7', label: 'Terminal 2' },
          { color: '#0F6E56', label: 'Terminal 3' },
          { color: '#BA7517', label: 'Terminal 4' },
          { color: '#1D9E75', label: 'Test — Allowed' },
          { color: '#E24B4A', label: 'Test — Blocked' },
        ].map(({ color, label, dashed }) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-5 h-3 rounded shrink-0"
              style={{
                backgroundColor: color + '30',
                border: `2px ${dashed ? 'dashed' : 'solid'} ${color}`,
              }}
            />
            <span className="text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Draw mode hint */}
      {drawMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white
          px-4 py-2 rounded-xl text-sm font-semibold shadow-lg z-[1000]">
          Click to add polygon points · Double-click to finish
        </div>
      )}
    </div>
  );
}