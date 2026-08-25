'use client';
import { useState, useRef, useEffect } from 'react';
import { Bell, Moon, Sun, Search, ChevronDown, User, KeyRound, Smartphone, Globe, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';
 
export default function TopNav({ onMenuToggle }: { onMenuToggle: () => void }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [dark,        setDark]        = useState(false);
  const [search,      setSearch]      = useState('');
  const [notifOpen,   setNotifOpen]   = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);
 
  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
 
  const notifications = [
    { id: 1, title: 'John Smith clocked in',     time: '2 min ago',   type: 'clock',  read: false },
    { id: 2, title: 'Leave request from Maria',   time: '15 min ago',  type: 'leave',  read: false },
    { id: 3, title: 'Anomaly: EMP-0003 late',     time: '1 hour ago',  type: 'alert',  read: false },
    { id: 4, title: 'BA Flight BA123 assigned',   time: '2 hours ago', type: 'flight', read: true  },
    { id: 5, title: 'Roster published for W28',   time: '3 hours ago', type: 'roster', read: true  },
  ];
 
  const unreadCount = notifications.filter(n => !n.read).length;
 
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0 z-30">
 
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search staff, shifts, flights..."
          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm
            text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500
            focus:bg-white transition-all"
        />
      </div>
 
      <div className="flex items-center gap-1 ml-auto">
 
        {/* Dark mode toggle */}
        <button
          onClick={() => setDark(d => !d)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500
            hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
 
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500
              hover:bg-slate-100 hover:text-slate-800 transition-colors relative"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full
                text-[9px] text-white font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
 
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl
              border border-slate-200 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="font-bold text-slate-900 text-sm">Notifications</p>
                <span className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">
                  Mark all read
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors
                      ${!n.read ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0
                      ${!n.read ? 'bg-blue-500' : 'bg-slate-200'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 font-medium truncate">{n.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-slate-100 text-center">
                <span className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">
                  View all notifications
                </span>
              </div>
            </div>
          )}
        </div>
 
        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 mx-1" />
 
        {/* Profile dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(o => !o)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-100
              transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full
              flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">MR</span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-tight">Maria R</p>
              <p className="text-[10px] text-slate-400 leading-tight">Super Admin</p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>
 
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl
              border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-900">Maria Rajbhandari</p>
                <p className="text-xs text-slate-400">admin@airtrack.com</p>
              </div>
 
              <div className="py-1.5">
                {[
                  { icon: User,       label: 'My Profile',      href: '/profile'          },
                  { icon: KeyRound,   label: 'Change Password',  href: '/profile/password' },
                  { icon: Smartphone, label: 'My Devices',       href: '/profile/devices'  },
                  { icon: Globe,      label: 'Language',         href: '/settings/language'},
                ].map(({ icon: Icon, label, href }) => (
                  <button
                    key={label}
                    className="flex items-center gap-3 px-4 py-2 w-full text-sm text-slate-600
                      hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Icon size={15} className="text-slate-400" />
                    {label}
                  </button>
                ))}
              </div>
 
              <div className="border-t border-slate-100 py-1.5">
                <button
                  onClick={logout}
                  className="flex items-center gap-3 px-4 py-2 w-full text-sm text-red-500
                    hover:bg-red-50 transition-colors font-medium"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}