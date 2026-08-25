'use client';
// FILE: src/app/(cms)/staff/create/page.tsx
// Create new staff member — uses the same users table, assigns 'staff' role

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/shared/PageHeader';
import toast from 'react-hot-toast';
import { UserPlus, ChevronLeft, Eye, EyeOff, Check } from 'lucide-react';
import Link from 'next/link';

// ── Constants ─────────────────────────────────────────────────────────────────

const JOB_ROLES = [
  { value: 'security_agent',          label: 'Security Agent'          },
  { value: 'passenger_service_agent', label: 'Passenger Service Agent' },
  { value: 'customer_service_agent',  label: 'Customer Service Agent'  },
  { value: 'check_in_agent',          label: 'Check-in Agent'          },
  { value: 'baggage_handler',         label: 'Baggage Handler'         },
  { value: 'team_leader',             label: 'Team Leader'             },
  { value: 'manager',                 label: 'Manager'                 },
  { value: 'director',                label: 'Director'                },
];

const SYSTEM_ROLES = [
  { value: 'staff',       label: 'Staff — view own rota, clock in/out only'           },
  { value: 'team_leader', label: 'Team Leader — manage small team, mark attendance'   },
  { value: 'manager',     label: 'Manager — approve leave, assign cover, view reports'},
  { value: 'admin',       label: 'Admin — full CMS access except system settings'     },
];

const CONTRACT_TYPES = [
  { value: 'full_time',  label: 'Full Time'  },
  { value: 'part_time',  label: 'Part Time'  },
  { value: 'agency',     label: 'Agency'     },
  { value: 'contractor', label: 'Contractor' },
];

const SHIFT_PREFS = ['morning', 'late', 'night', 'any'];
const DAY_NAMES   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ── Form sections ─────────────────────────────────────────────────────────────

type Section = 'personal' | 'job' | 'access' | 'availability' | 'account';

const SECTIONS: { key: Section; label: string; desc: string }[] = [
  { key: 'personal',     label: '1. Personal Details',  desc: 'Name, contact info'          },
  { key: 'job',          label: '2. Job Details',       desc: 'Role, contract, terminal'     },
  { key: 'access',       label: '3. Access & Passes',   desc: 'Blue ID, airside, cargo'      },
  { key: 'availability', label: '4. Availability',      desc: 'Shift preferences, hours'     },
  { key: 'account',      label: '5. System Account',    desc: 'Email, password, system role' },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CreateStaffPage() {
  const router = useRouter();

  const [section,    setSection]    = useState<Section>('personal');
  const [terminals,  setTerminals]  = useState<any[]>([]);
  const [saving,     setSaving]     = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [completed,  setCompleted]  = useState<Section[]>([]);

  // Form state — all fields
  const [form, setForm] = useState({
    // Personal
    name:                     '',
    phone:                    '',
    date_of_birth:            '',
    address:                  '',
    emergency_contact_name:   '',
    emergency_contact_phone:  '',

    // Job
    employee_id:              '',
    job_role:                 'passenger_service_agent',
    contract_type:            'full_time',
    terminal_id:              '',
    joined_date:              new Date().toISOString().split('T')[0],
    notes:                    '',

    // Access
    has_airside_access:       false,
    has_cargo_pass:           false,
    blue_id_number:           '',
    blue_id_expiry:           '',

    // Availability
    preferred_shift_types:    ['any'] as string[],
    max_hours_per_week:       40,
    min_hours_per_week:       0,
    accepts_split_shifts:     false,
    unavailable_days:         [] as number[],

    // Account
    email:                    '',
    password:                 '',
    system_role:              'staff',
    pin:                      '',
    default_duty_mode:        'landside',
  });

  const set = (key: string, val: any) =>
    setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    api.get('/cms/geofence/terminals')
      .then(r => setTerminals(r.data.terminals ?? []))
      .catch(() => {});
  }, []);

  // Auto-generate employee ID
  const generateEmpId = () => {
    const num = Math.floor(Math.random() * 9000) + 1000;
    set('employee_id', `EMP-${num}`);
  };

  // Auto-generate PIN
  const generatePin = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    set('pin', pin);
  };

  const toggleShiftPref = (pref: string) => {
    if (pref === 'any') {
      set('preferred_shift_types', ['any']);
      return;
    }
    const current = form.preferred_shift_types.filter(p => p !== 'any');
    if (current.includes(pref)) {
      const next = current.filter(p => p !== pref);
      set('preferred_shift_types', next.length === 0 ? ['any'] : next);
    } else {
      set('preferred_shift_types', [...current, pref]);
    }
  };

  const toggleUnavailDay = (day: number) => {
    set('unavailable_days',
      form.unavailable_days.includes(day)
        ? form.unavailable_days.filter(d => d !== day)
        : [...form.unavailable_days, day]
    );
  };

  // Validate current section before advancing
  const validateSection = (s: Section): string | null => {
    if (s === 'personal') {
      if (!form.name.trim()) return 'Full name is required';
    }
    if (s === 'job') {
      if (!form.employee_id.trim()) return 'Employee ID is required';
      if (!form.job_role)           return 'Job role is required';
      if (!form.contract_type)      return 'Contract type is required';
    }
    if (s === 'account') {
      if (!form.email.trim())    return 'Email is required';
      if (!form.password.trim()) return 'Password is required';
      if (form.password.length < 8) return 'Password must be at least 8 characters';
      if (!form.pin || form.pin.length !== 6) return 'PIN must be 6 digits';
    }
    return null;
  };

  const nextSection = () => {
    const error = validateSection(section);
    if (error) { toast.error(error); return; }

    if (!completed.includes(section)) setCompleted(c => [...c, section]);

    const idx  = SECTIONS.findIndex(s => s.key === section);
    const next = SECTIONS[idx + 1];
    if (next) setSection(next.key);
  };

  const prevSection = () => {
    const idx  = SECTIONS.findIndex(s => s.key === section);
    const prev = SECTIONS[idx - 1];
    if (prev) setSection(prev.key);
  };

  const handleSubmit = async () => {
    const error = validateSection('account');
    if (error) { toast.error(error); return; }

    setSaving(true);
    try {
      await api.post('/admin/staff', {
        // Personal
        name:                     form.name,
        phone:                    form.phone        || null,
        date_of_birth:            form.date_of_birth|| null,
        address:                  form.address      || null,
        emergency_contact_name:   form.emergency_contact_name  || null,
        emergency_contact_phone:  form.emergency_contact_phone || null,

        // Job
        employee_id:              form.employee_id,
        job_role:                 form.job_role,
        contract_type:            form.contract_type,
        terminal_id:              form.terminal_id  || null,
        joined_date:              form.joined_date  || null,
        notes:                    form.notes        || null,

        // Access
        default_duty_mode:       form.default_duty_mode,
        has_airside_access:       form.has_airside_access,
        has_cargo_pass:           form.has_cargo_pass,
        blue_id_number:           form.blue_id_number || null,
        blue_id_expiry:           form.blue_id_expiry || null,

        // Account
        email:                    form.email,
        password:                 form.password,
        pin:                      form.pin,
        role:                     form.system_role,

        // Availability (saved separately)
        availability: {
          preferred_shift_types: form.preferred_shift_types,
          max_hours_per_week:    form.max_hours_per_week,
          min_hours_per_week:    form.min_hours_per_week,
          accepts_split_shifts:  form.accepts_split_shifts,
          unavailable_days:      form.unavailable_days,
        },
      });

      toast.success(`${form.name} added to the system`);
      router.push('/staff');
    } catch (err: any) {
      const msg = err?.response?.data?.message
        ?? err?.response?.data?.errors
        ?? 'Failed to create staff member';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const currentIdx  = SECTIONS.findIndex(s => s.key === section);
  const isLastSection = currentIdx === SECTIONS.length - 1;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Add New Staff"
        subtitle="Create a new staff account — they will receive login credentials"
        actions={
          <Link href="/staff"
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200
              rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <ChevronLeft size={15} /> Back to Staff
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">

          {/* Progress steps */}
          <div className="flex items-center gap-0 mb-8">
            {SECTIONS.map((s, i) => {
              const done   = completed.includes(s.key);
              const active = section === s.key;
              return (
                <div key={s.key} className="flex items-center flex-1 last:flex-none">
                  <button
                    onClick={() => {
                      if (done || active) setSection(s.key);
                    }}
                    className={`flex flex-col items-center gap-1 min-w-[80px]
                      transition-all
                      ${done || active ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center
                      text-sm font-black transition-all
                      ${done
                        ? 'bg-green-500 text-white'
                        : active
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                      {done ? <Check size={16} /> : i + 1}
                    </div>
                    <div className="text-center">
                      <p className={`text-[10px] font-bold leading-tight
                        ${active ? 'text-blue-700' : done ? 'text-green-700' : 'text-slate-400'}`}>
                        {s.label.split('. ')[1]}
                      </p>
                      <p className="text-[9px] text-slate-400 hidden sm:block">
                        {s.desc}
                      </p>
                    </div>
                  </button>
                  {i < SECTIONS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mt-[-16px]
                      ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50">
              <h2 className="font-bold text-slate-900">
                {SECTIONS[currentIdx].label}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {SECTIONS[currentIdx].desc}
              </p>
            </div>

            <div className="p-6 space-y-5">

              {/* ── PERSONAL ───────────────────────────────────────────────── */}
              {section === 'personal' && (
                <>
                  <Row>
                    <F label="Full Name *">
                      <input value={form.name}
                        onChange={e => set('name', e.target.value)}
                        placeholder="e.g. Mohammed Ahmed"
                        className={IC} />
                    </F>
                    <F label="Phone Number">
                      <input value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                        placeholder="+44 7700 000000"
                        className={IC} />
                    </F>
                  </Row>
                  <Row>
                    <F label="Date of Birth">
                      <input type="date" value={form.date_of_birth}
                        onChange={e => set('date_of_birth', e.target.value)}
                        className={IC} />
                    </F>
                    <F label="Home Address">
                      <input value={form.address}
                        onChange={e => set('address', e.target.value)}
                        placeholder="Street, City, Postcode"
                        className={IC} />
                    </F>
                  </Row>
                  <Row>
                    <F label="Emergency Contact Name">
                      <input value={form.emergency_contact_name}
                        onChange={e => set('emergency_contact_name', e.target.value)}
                        placeholder="Next of kin name"
                        className={IC} />
                    </F>
                    <F label="Emergency Contact Phone">
                      <input value={form.emergency_contact_phone}
                        onChange={e => set('emergency_contact_phone', e.target.value)}
                        placeholder="+44 7700 000000"
                        className={IC} />
                    </F>
                  </Row>
                </>
              )}

              {/* ── JOB ────────────────────────────────────────────────────── */}
              {section === 'job' && (
                <>
                  <Row>
                    <F label="Employee ID *">
                      <div className="flex gap-2">
                        <input value={form.employee_id}
                          onChange={e => set('employee_id', e.target.value)}
                          placeholder="EMP-0001"
                          className={IC + ' flex-1'} />
                        <button onClick={generateEmpId}
                          className="px-3 py-2.5 bg-slate-100 text-slate-600 rounded-xl
                            text-xs font-bold hover:bg-slate-200 transition-colors shrink-0">
                          Generate
                        </button>
                      </div>
                    </F>
                    <F label="Joined Date">
                      <input type="date" value={form.joined_date}
                        onChange={e => set('joined_date', e.target.value)}
                        className={IC} />
                    </F>
                  </Row>
                  <Row>
                    <F label="Job Role *">
                      <select value={form.job_role}
                        onChange={e => set('job_role', e.target.value)}
                        className={IC}>
                        {JOB_ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </F>
                    <F label="Contract Type *">
                      <select value={form.contract_type}
                        onChange={e => set('contract_type', e.target.value)}
                        className={IC}>
                        {CONTRACT_TYPES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </F>
                  </Row>
                  <Row>
                    <F label="Default Duty Mode *">
                      <select value={form.default_duty_mode} onChange={e=>set('default_duty_mode',e.target.value)} className={IC}>
                        <option value="landside">Landside</option>
                        <option value="airside">Airside</option>
                      </select>
                    </F>
                  </Row>
                  <F label="Base Terminal">
                    <select value={form.terminal_id}
                      onChange={e => set('terminal_id', e.target.value)}
                      className={IC}>
                      <option value="">No specific terminal</option>
                      {terminals.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </F>
                  <F label="Internal Notes">
                    <textarea value={form.notes}
                      onChange={e => set('notes', e.target.value)}
                      rows={2} placeholder="Any notes visible to managers only..."
                      className={IC + ' resize-none'} />
                  </F>
                </>
              )}

              {/* ── ACCESS ─────────────────────────────────────────────────── */}
              {section === 'access' && (
                <>
                  {/* Toggles */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        key: 'has_airside_access',
                        label: '✈ Airside Access',
                        desc: 'Has a valid Blue ID badge for airside operations',
                        color: 'amber',
                      },
                      {
                        key: 'has_cargo_pass',
                        label: '📦 Cargo Pass',
                        desc: 'Has cargo security clearance for restricted areas',
                        color: 'purple',
                      },
                    ].map(({ key, label, desc, color }) => (
                      <div key={key}
                        onClick={() => set(key, !(form as any)[key])}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2
                          cursor-pointer transition-all
                          ${(form as any)[key]
                            ? color === 'amber'
                              ? 'border-amber-400 bg-amber-50'
                              : 'border-purple-400 bg-purple-50'
                            : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <button
                          className={`w-11 h-6 rounded-full relative shrink-0 mt-0.5
                            transition-colors
                            ${(form as any)[key]
                              ? color === 'amber' ? 'bg-amber-500' : 'bg-purple-500'
                              : 'bg-slate-300'}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 bg-white
                            rounded-full shadow transition-all
                            ${(form as any)[key] ? 'left-5' : 'left-0.5'}`} />
                        </button>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Blue ID fields — only if airside access */}
                  {form.has_airside_access && (
                    <Row>
                      <F label="Blue ID Number">
                        <input value={form.blue_id_number}
                          onChange={e => set('blue_id_number', e.target.value)}
                          placeholder="BID-00000"
                          className={IC} />
                      </F>
                      <F label="Blue ID Expiry Date">
                        <input type="date" value={form.blue_id_expiry}
                          onChange={e => set('blue_id_expiry', e.target.value)}
                          className={IC} />
                      </F>
                    </Row>
                  )}

                  {!form.has_airside_access && !form.has_cargo_pass && (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      Toggle the passes above if this staff member has clearance
                    </div>
                  )}
                </>
              )}

              {/* ── AVAILABILITY ───────────────────────────────────────────── */}
              {section === 'availability' && (
                <>
                  <F label="Preferred Shift Types">
                    <div className="flex gap-2 flex-wrap">
                      {SHIFT_PREFS.map(pref => {
                        const active = form.preferred_shift_types.includes(pref);
                        return (
                          <button key={pref}
                            onClick={() => toggleShiftPref(pref)}
                            className={`px-4 py-2 rounded-xl border-2 text-sm font-bold
                              capitalize transition-all
                              ${active
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                            {pref === 'any' ? '✓ Any Shift' : pref}
                          </button>
                        );
                      })}
                    </div>
                  </F>

                  <Row>
                    <F label="Max Hours / Week">
                      <input type="number" value={form.max_hours_per_week}
                        onChange={e => set('max_hours_per_week', +e.target.value)}
                        min={1} max={60} className={IC} />
                    </F>
                    <F label="Min Hours / Week">
                      <input type="number" value={form.min_hours_per_week}
                        onChange={e => set('min_hours_per_week', +e.target.value)}
                        min={0} max={60} className={IC} />
                    </F>
                  </Row>

                  <F label="Unavailable Days (recurring)">
                    <div className="flex gap-2">
                      {DAY_NAMES.map((day, i) => {
                        const dayNum = i + 1;
                        const blocked = form.unavailable_days.includes(dayNum);
                        return (
                          <button key={day}
                            onClick={() => toggleUnavailDay(dayNum)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black
                              border-2 transition-all
                              ${blocked
                                ? 'bg-red-500 text-white border-red-500'
                                : 'border-slate-200 text-slate-500 hover:border-red-300'}`}>
                            {day.slice(0,2)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      Red = cannot work that day (e.g. university, childcare)
                    </p>
                  </F>

                  <div
                    onClick={() => set('accepts_split_shifts', !form.accepts_split_shifts)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2
                      cursor-pointer transition-all
                      ${form.accepts_split_shifts
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <button
                      className={`w-11 h-6 rounded-full relative shrink-0 transition-colors
                        ${form.accepts_split_shifts ? 'bg-blue-500' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full
                        shadow transition-all
                        ${form.accepts_split_shifts ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Accepts Split Shifts
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Comes in morning, goes home, returns in the evening
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* ── ACCOUNT ────────────────────────────────────────────────── */}
              {section === 'account' && (
                <>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs
                    text-blue-700">
                    <p className="font-bold mb-1">Same users table — role determines access</p>
                    <p>
                      This creates a single account. The <strong>System Role</strong> below
                      controls what they can see in the CMS vs the mobile app only.
                      Staff with the "staff" role only see the mobile app.
                    </p>
                  </div>

                  <Row>
                    <F label="Email Address *">
                      <input type="email" value={form.email}
                        onChange={e => set('email', e.target.value)}
                        placeholder="mohammed.ahmed@pyrex-uk.com"
                        className={IC} />
                    </F>
                    <F label="Password *">
                      <div className="relative">
                        <input
                          type={showPass ? 'text' : 'password'}
                          value={form.password}
                          onChange={e => set('password', e.target.value)}
                          placeholder="Min 8 characters"
                          className={IC + ' pr-10'} />
                        <button
                          type="button"
                          onClick={() => setShowPass(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2
                            text-slate-400 hover:text-slate-600"
                        >
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </F>
                  </Row>

                  <Row>
                    <F label="6-Digit PIN (for mobile clock-in) *">
                      <div className="flex gap-2">
                        <input
                          value={form.pin}
                          onChange={e => set('pin', e.target.value.replace(/\D/g,'').slice(0,6))}
                          placeholder="123456"
                          maxLength={6}
                          className={IC + ' font-mono tracking-widest flex-1'}
                        />
                        <button onClick={generatePin}
                          className="px-3 py-2.5 bg-slate-100 text-slate-600 rounded-xl
                            text-xs font-bold hover:bg-slate-200 transition-colors shrink-0">
                          Generate
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Staff use this PIN to clock in on the mobile app
                      </p>
                    </F>

                    <F label="System Role">
                      <select value={form.system_role}
                        onChange={e => set('system_role', e.target.value)}
                        className={IC}>
                        {SYSTEM_ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </F>
                  </Row>

                  {/* Summary */}
                  <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-wide">
                      Summary — {form.name || 'New Staff Member'}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        ['Name',          form.name           || '—'],
                        ['Employee ID',   form.employee_id    || '—'],
                        ['Role',          JOB_ROLES.find(r => r.value === form.job_role)?.label ?? '—'],
                        ['Contract',      form.contract_type?.replace('_',' ') ?? '—'],
                        ['Terminal',      terminals.find(t => t.id === form.terminal_id)?.code ?? 'None'],
                        ['Airside',       form.has_airside_access ? 'Yes' : 'No'],
                        ['System Role',   form.system_role    || '—'],
                        ['Shift Prefs',   form.preferred_shift_types.join(', ')],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <span className="text-slate-400">{label}: </span>
                          <span className="font-semibold text-slate-700">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="px-6 py-4 border-t bg-slate-50 flex gap-3">
              {currentIdx > 0 && (
                <button onClick={prevSection}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm
                    font-semibold text-slate-600 hover:bg-white transition-colors">
                  ← Back
                </button>
              )}
              {!isLastSection ? (
                <button onClick={nextSection}
                  className="flex-1 px-5 py-2.5 bg-blue-600 text-white rounded-xl
                    text-sm font-bold hover:bg-blue-700 transition-colors">
                  Continue →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 px-5 py-2.5 bg-green-600 text-white rounded-xl
                    text-sm font-bold hover:bg-green-700 disabled:opacity-60
                    transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/50 border-t-white
                        rounded-full animate-spin" />
                      Creating staff member...
                    </>
                  ) : (
                    <><UserPlus size={16} /> Create Staff Member</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const IC = `w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
  focus:outline-none focus:ring-2 focus:ring-blue-500`;

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1">
      <label className="block text-xs font-bold text-slate-500 uppercase
        tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-4">{children}</div>;
}