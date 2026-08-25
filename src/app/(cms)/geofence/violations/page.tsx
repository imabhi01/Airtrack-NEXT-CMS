'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { geofenceApi } from '@/lib/geofence-api';

export default function ViolationsPage() {

    // const [violations,setViolations]=useState([]);

    // useEffect(()=>{

    //     geofenceApi.violations()
    //         .then(res=>{

    //             setViolations(res.data.violations ?? []);

    //         });

    // },[]);

    const [violations] = useState([
        {
            id: 1,
            staff: 'John Smith',
            terminal: 'T2',
            zone: 'Zone A',
            reason: 'Outside polygon',
            created_at: '2026-07-22 08:30'
        },
        {
            id: 2,
            staff: 'Maria Lee',
            terminal: 'T3',
            zone: 'Zone B',
            reason: 'GPS accuracy too low',
            created_at: '2026-07-22 09:15'
        }
    ]);

    return(

        <>

            <PageHeader
                title="Location Violations"
                subtitle="Staff outside assigned work zones"
            />

            <div className="p-6">

                <div className="bg-white rounded-xl border text-gray-400 py-2">

                    <table className="w-full">

                        <thead>

                        <tr>

                            <th>Employee</th>

                            <th>Assigned Zone</th>

                            <th>Detected Zone</th>

                            <th>Distance</th>

                            <th>Time</th>

                            <th>Status</th>

                        </tr>

                        </thead>

                        <tbody>

                        {violations.map((v:any)=>(

                            <tr key={v.id}>

                                <td>{v.staff.name}</td>

                                <td>{v.assigned_zone}</td>

                                <td>{v.detected_zone}</td>

                                <td>{v.distance} m</td>

                                <td>{v.created_at}</td>

                                <td>

                                    Open

                                </td>

                            </tr>

                        ))}

                        </tbody>

                    </table>

                </div>

            </div>

        </>

    );

}