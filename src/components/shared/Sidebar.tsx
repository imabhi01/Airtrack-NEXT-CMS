'use client';
import Link from 'next/link';
import { logout } from '@/lib/auth';
import {
  LayoutDashboard, Calendar, Users, Plane, MapPin,
  Shield, BarChart3, Settings, LogOut, ChevronRight,
} from 'lucide-react';
 
const NAV = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/roster',     label: 'Roster',       icon: Calendar },
  { href: '/staff',      label: 'Staff',        icon: Users },
  { href: '/airlines',   label: 'Airlines',     icon: Plane },
  { href: '/operations', label: 'Operations',   icon: Shield },
  { href: '/geofence',   label: 'Geofence',     icon: MapPin },
  { href: '/reports',    label: 'Reports',      icon: BarChart3 },
  { href: '/settings',   label: 'Settings',     icon: Settings },
];
 
export default function Sidebar({ currentPath }: { currentPath: string }) {
  return (
    <aside className="w-64 bg-[#1A2B4A] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">AT</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">AirTrack</p>
            <p className="text-white/50 text-xs">Admin CMS</p>
          </div>
        </div>
      </div>
 
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = currentPath.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                ${active
                  ? 'bg-blue-500 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="opacity-60" />}
            </Link>
          );
        })}
      </nav>
 
      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            text-white/60 hover:text-white hover:bg-white/10 w-full transition-all"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}