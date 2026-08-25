'use client';
// FILE: src/components/layout/Sidebar.tsx
// Full AirTrack sidebar matching the complete navigation spec

import Link from 'next/link';
import { logout } from '@/lib/auth';
import { useState } from 'react';
import {
  LayoutDashboard, Plane, Users, Calendar, Clock,
  Globe, Umbrella, AlertTriangle, BarChart3, Bell,
  Settings, LogOut, ChevronDown, ChevronRight,
  Shield, Menu, Radio, MapPin, Zap, Activity,
  FileText, BookOpen, UserCheck, Award, Layers,
  Navigation, AlertOctagon, TrendingUp, Building2,
  ClipboardList, ToggleLeft, Link2, ScrollText,
  PlaneTakeoff, Wrench, Monitor, Map, Target,
  UserX, Clock4, History, CheckSquare,
} from 'lucide-react';

interface NavChild { label: string; href: string; icon?: React.ElementType }
interface NavGroup {
  section?: string;
  label:    string;
  href?:    string;
  icon:     React.ElementType;
  badge?:   number | string;
  children?: NavChild[];
}

const NAV: NavGroup[] = [
  // ── MAIN ──────────────────────────────────────────────────────────────────
  {
    label: 'Dashboard',
    icon:  LayoutDashboard,
    children: [
      { label: 'Live Operations',   href: '/dashboard',           icon: Activity    },
      { label: 'Staff Overview',    href: '/dashboard/staff',     icon: Users       },
      { label: 'Current Staffing',  href: '/dashboard/staffing',  icon: UserCheck   },
      { label: 'Alerts',            href: '/dashboard/alerts',    icon: AlertTriangle, },
    ],
  },

  // ── OPERATIONS ─────────────────────────────────────────────────────────────
  {
    section: 'Operations',
    label: 'Operations',
    icon:  Plane,
    children: [
      { label: 'Flights',            href: '/operations/flights',    icon: PlaneTakeoff },
      { label: 'Airlines',           href: '/airlines',              icon: Plane        },
      { label: 'Ground Handling',    href: '/operations/handling',   icon: Wrench       },
      { label: 'Operational View',   href: '/operations/view',       icon: Monitor      },
      { label: 'Live Terminal Map',  href: '/operations/map',        icon: Map          },
    ],
  },

  // ── WORKFORCE ──────────────────────────────────────────────────────────────
  {
    label: 'Workforce',
    icon:  Users,
    children: [
      { label: 'Staff Directory',     href: '/staff',              icon: Users      },
      { label: 'Add Staff',           href: '/staff/create',       icon: UserCheck  },
      { label: 'Teams',               href: '/staff/teams',        icon: Layers     },
      { label: 'Skills & Certs',      href: '/staff/skills',       icon: Award      },
      { label: 'Roles & Permissions', href: '/staff/roles',        icon: Shield     },
      { label: 'Availability',        href: '/staff/availability', icon: Calendar   },
    ],
  },

  // ── ROSTER ─────────────────────────────────────────────────────────────────
  {
    label: 'Roster Management',
    icon:  Calendar,
    children: [
      { label: 'Auto Roster Engine', href: '/roster',               icon: Zap        },
      { label: 'Weekly Planner',     href: '/roster/weekly',        icon: Calendar   },
      { label: 'Monthly Planner',    href: '/roster/monthly',       icon: BookOpen   },
      { label: 'Yearly Allocation',  href: '/roster/yearly',        icon: TrendingUp },
      { label: 'Shift Templates',    href: '/shifts/templates',     icon: ClipboardList },
      { label: 'Task Allocation',    href: '/tasks',         icon: CheckSquare},
      { label: 'Staff Shortage',     href: '/roster/shortage',      icon: UserX      },
    ],
  },

  // ── ATTENDANCE ─────────────────────────────────────────────────────────────
  {
    label: 'Attendance',
    icon:  Clock,
    children: [
      { label: 'Live Clock-In',      href: '/attendance/live',     icon: Radio       },
      { label: 'Live Staff Location',href: '/attendance/location', icon: Navigation  },
      { label: 'Timesheets',         href: '/attendance/timesheets',icon: FileText   },
      { label: 'Late Arrivals',      href: '/attendance/late',     icon: Clock4      },
      { label: 'Early Departure',    href: '/attendance/early',    icon: LogOut      },
      { label: 'Attendance History', href: '/attendance/history',  icon: History     },
      { label: 'Attendance Anomaly', href: '/attendance/anomalies', icon: AlertTriangle     },
    ],
  },

  // ── GEO OPERATIONS ─────────────────────────────────────────────────────────
  {
    label: 'Geo Operations',
    icon:  Globe,
    children: [
      { label: 'Terminal Map',        href: '/geofence/map',        icon: Map        },
      { label: 'Zone Management',     href: '/geofence/zones',      icon: Target     },
      { label: 'Geofence Rules',      href: '/geofence/rules',      icon: Shield     },
      { label: 'Location Violations', href: '/geofence/violations', icon: AlertOctagon },
    ],
  },

  // ── LEAVE ──────────────────────────────────────────────────────────────────
  {
    label: 'Leave Management',
    icon:  Umbrella,
    children: [
      { label: 'Applications',  href: '/leave',           icon: FileText   },
      { label: 'Approvals',     href: '/leave/pending',   icon: CheckSquare},
      { label: 'Leave Calendar',href: '/leave/calendar',  icon: Calendar   },
      { label: 'Leave Balance', href: '/leave/balance',   icon: ToggleLeft },
      { label: 'Leave Reports', href: '/leave/reports',   icon: BarChart3  },
    ],
  },

  // ── COMPLIANCE ─────────────────────────────────────────────────────────────
  {
    label:   'Compliance',
    icon:    AlertTriangle,
    badge:   3,
    children: [
      { label: 'Anomalies',       href: '/anomalies',         icon: AlertTriangle  },
      { label: 'Exceptions',      href: '/anomalies/open',    icon: AlertOctagon   },
      { label: 'Audit Trail',     href: '/settings/audit',    icon: ScrollText     },
      { label: 'Incident Reports',href: '/compliance/incidents',icon: FileText     },
    ],
  },

  // ── REPORTS ────────────────────────────────────────────────────────────────
  {
    label: 'Reports & Analytics',
    icon:  BarChart3,
    children: [
      { label: 'Attendance Reports', href: '/reports/attendance', icon: BarChart3  },
      { label: 'Labour Utilisation', href: '/reports/labour',     icon: TrendingUp },
      { label: 'Overtime',           href: '/reports/overtime',   icon: Clock      },
      { label: 'Staffing Analysis',  href: '/reports/staffing',   icon: Users      },
      { label: 'Monthly Reports',    href: '/reports/monthly',    icon: BookOpen   },
    ],
  },

  // ── NOTIFICATIONS ──────────────────────────────────────────────────────────
  {
    label: 'Notifications',
    href:  '/notifications',
    icon:  Bell,
    badge: 5,
  },

  // ── SETTINGS ───────────────────────────────────────────────────────────────
  {
    label: 'System Settings',
    icon:  Settings,
    children: [
      { label: 'Company Settings', href: '/settings',               icon: Building2  },
      { label: 'Terminals',        href: '/settings/terminals',     icon: Building2  },
      { label: 'Zones',            href: '/settings/zones',         icon: Target     },
      { label: 'Tasks',            href: '/settings/tasks',         icon: ClipboardList },
      { label: 'Shift Rules',      href: '/settings',               icon: Shield     },
      { label: 'Leave Types',      href: '/settings/leave-types',   icon: Umbrella   },
      { label: 'Integrations',     href: '/settings/integrations',  icon: Link2      },
      { label: 'Audit Logs',       href: '/settings/audit',         icon: ScrollText },
    ],
  },
];

export default function Sidebar({
  currentPath,
  open,
  onToggle,
}: {
  currentPath: string;
  open:        boolean;
  onToggle:    () => void;
}) {
  // Auto-expand current section
  const getInitialExpanded = () => {
    const expanded: string[] = [];
    NAV.forEach(item => {
      if (item.children?.some(c => currentPath.startsWith(c.href))) {
        expanded.push(item.label);
      }
    });
    return expanded.length > 0 ? expanded : ['Dashboard'];
  };

  const [expanded, setExpanded] = useState<string[]>(getInitialExpanded);

  const toggle = (label: string) => {
    setExpanded(e =>
      e.includes(label) ? e.filter(x => x !== label) : [...e, label]
    );
  };

  const isActive = (href: string) =>
    currentPath === href || currentPath.startsWith(href + '/');

  const isGroupActive = (item: NavGroup) =>
    item.href
      ? isActive(item.href)
      : item.children?.some(c => isActive(c.href)) ?? false;

  return (
    <aside
      className={`${open ? 'w-64' : 'w-16'} bg-slate-900 flex flex-col h-full
        shrink-0 transition-all duration-200 overflow-hidden border-r border-slate-800`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800 shrink-0 min-h-[60px]">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Shield size={16} className="text-white" />
        </div>
        {open && (
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight">AIRTRACK</p>
            <p className="text-slate-500 text-[9px] leading-tight tracking-wide uppercase">
              Heathrow Operations
            </p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="text-slate-600 hover:text-slate-300 transition-colors shrink-0 ml-auto"
        >
          <Menu size={15} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin">
        {NAV.map((item, idx) => {
          const Icon         = item.icon;
          const groupActive  = isGroupActive(item);
          const isExp        = expanded.includes(item.label);

          // Section divider
          const prevItem = idx > 0 ? NAV[idx - 1] : null;
          const showDivider = idx > 0 && item.section && item.section !== (prevItem as any)?.section;

          return (
            <div key={item.label}>
              {showDivider && open && (
                <div className="mx-2 my-2 border-t border-slate-800" />
              )}

              {/* Single item (no children) */}
              {!item.children ? (
                <Link
                  href={item.href!}
                  title={!open ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold
                    transition-all relative group
                    ${isActive(item.href!)
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                  <Icon size={16} className="shrink-0" />
                  {open && <span className="flex-1 truncate">{item.label}</span>}
                  {open && item.badge && (
                    <span className="bg-red-500 text-white text-[9px] font-bold
                      px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                      {item.badge}
                    </span>
                  )}
                  {!open && item.badge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500
                      rounded-full text-[8px] text-white font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {/* Tooltip when collapsed */}
                  {!open && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-slate-200
                      text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100
                      transition-opacity pointer-events-none z-50 shadow-lg">
                      {item.label}
                    </div>
                  )}
                </Link>
              ) : (
                /* Group item */
                <div>
                  <button
                    onClick={() => { toggle(item.label); if (!open) onToggle(); }}
                    title={!open ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold
                      w-full transition-all relative group
                      ${groupActive
                        ? 'text-white bg-slate-800'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    {open && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {item.badge && (
                          <span className="bg-red-500 text-white text-[9px] font-bold
                            px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none mr-1">
                            {item.badge}
                          </span>
                        )}
                        {isExp
                          ? <ChevronDown size={12} className="shrink-0 text-slate-500" />
                          : <ChevronRight size={12} className="shrink-0 text-slate-600" />
                        }
                      </>
                    )}
                    {!open && item.badge && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500
                        rounded-full text-[8px] text-white font-bold flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                    {!open && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-slate-200
                        text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100
                        transition-opacity pointer-events-none z-50 shadow-lg">
                        {item.label}
                      </div>
                    )}
                  </button>

                  {/* Children */}
                  {open && isExp && (
                    <div className="mt-0.5 ml-4 pl-3 border-l border-slate-700/60 space-y-0.5">
                      {item.children.map(child => {
                        const CIcon  = child.icon;
                        const active = isActive(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg
                              text-[11px] font-medium transition-colors
                              ${active
                                ? 'text-blue-400 bg-blue-600/10'
                                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60'
                              }`}
                          >
                            {CIcon && (
                              <CIcon
                                size={12}
                                className={active ? 'text-blue-400' : 'text-slate-600'}
                              />
                            )}
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-slate-800 shrink-0">
        <button
          onClick={logout}
          title={!open ? 'Sign Out' : undefined}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold
            text-slate-500 hover:text-red-400 hover:bg-slate-800 w-full transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          {open && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}