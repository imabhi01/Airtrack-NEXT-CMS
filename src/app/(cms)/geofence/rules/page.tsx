'use client';

import PageHeader from '@/components/shared/PageHeader';
import { Shield } from 'lucide-react';

export default function RulesPage() {
    return (
        <div className="p-6 space-y-6">

            <PageHeader
                title="Geofence Rules"
                subtitle="Rules controlling clock in and location validation"
            />

            <div className="bg-white rounded-xl border p-6">

                <div className="flex items-center gap-3 mb-6">
                    <Shield className="text-blue-600" />
                    <h2 className="font-bold text-lg text-gray-600">
                        Current Rules
                    </h2>
                </div>

                <div className="space-y-4">

                    <div className="border rounded-lg p-4 text-gray-400">
                        GPS accuracy ≤ 30 metres
                    </div>

                    <div className="border rounded-lg p-4 text-gray-400">
                        Minimum WiFi BSSID matches = 2
                    </div>

                    <div className="border rounded-lg p-4 text-gray-400">
                        Adjacent zone clock-in enabled
                    </div>

                    <div className="border rounded-lg p-4 text-gray-400">
                        Strict zone enforcement disabled
                    </div>

                </div>

            </div>

        </div>
    );
}