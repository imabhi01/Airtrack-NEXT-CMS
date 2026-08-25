'use client';

import { useEffect, useState } from 'react';
import GeofenceMap from '@/components/geofence/GeofenceMap';
import PageHeader from '@/components/shared/PageHeader';
import { geofenceApi, GeoTerminal } from '@/lib/geofence-api';

export default function GeofenceMapPage() {
    const [terminals, setTerminals] = useState<GeoTerminal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const { data } = await geofenceApi.getTerminals();
            setTerminals(data.terminals);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="p-6">
                Loading map...
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col">
            <PageHeader
                title="Airport Geofence Map"
                subtitle="Interactive airport terminal map"
            />

            <div className="flex-1 p-6">
                <div className="h-full rounded-xl overflow-hidden border">
                    <GeofenceMap terminals={terminals} />
                </div>
            </div>
        </div>
    );
}