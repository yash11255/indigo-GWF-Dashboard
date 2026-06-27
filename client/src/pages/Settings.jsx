import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const IBM = {
  blue60: '#0F62FE', blue10: '#EDF5FF',
  green50: '#198038', green10: '#DEFBE6',
  red50: '#DA1E28', red10: '#FFF1F1',
  orange40: '#FF832B', orange10: '#FFF2E8',
  gray100: '#161616', gray90: '#262626', gray80: '#393939',
  gray70: '#525252', gray60: '#6F6F6F', gray50: '#8D8D8D',
  gray30: '#C6C6C6', gray20: '#E0E0E0', gray10: '#F4F4F4',
};

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white" style={{ border: `1px solid ${IBM.gray20}` }}>
      <div className="px-6 py-4" style={{ borderBottom: `1px solid ${IBM.gray20}`, background: IBM.gray10 }}>
        <p className="text-sm font-bold" style={{ color: IBM.gray100 }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Badge({ label, color, bg }) {
  return (
    <span className="text-xs font-bold px-2 py-0.5 uppercase tracking-wider"
      style={{ background: bg, color }}>
      {label}
    </span>
  );
}

function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={`flex items-start gap-4 cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="relative mt-0.5 flex-shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className="w-11 h-6 rounded-full transition-all duration-200"
          style={{ background: checked ? IBM.blue60 : IBM.gray30 }}>
          <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
            style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: IBM.gray100 }}>{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>{description}</p>}
      </div>
    </label>
  );
}

// ─── Excel format specification ───────────────────────────────────────────────
const SHEETS = [
  {
    name: 'Draft Applicants',
    color: '#FF832B',
    desc: 'Applicants who saved a draft (not yet submitted). Each row = one applicant.',
    required: true,
    columns: [
      { col: 'ApplicationId', req: true,  note: 'Unique ID e.g. SB-2026-0001' },
      { col: 'Application Type', req: true,  note: '"Draft"' },
      { col: 'FirstName', req: true,  note: '' },
      { col: 'LastName', req: false, note: '' },
      { col: 'Email', req: true,  note: 'Lowercase email' },
      { col: 'PhoneNumber', req: false, note: '10-digit mobile' },
      { col: 'DateOfBirth', req: false, note: 'DD/MM/YYYY or Excel date serial' },
      { col: 'Gender', req: false, note: 'Male / Female / Other' },
      { col: 'Category', req: false, note: 'General / OBC / SC / ST' },
      { col: 'FamilyAnnualIncome', req: false, note: 'e.g. Less than 1 Lakh' },
      { col: 'Current_State', req: false, note: 'State name in UPPERCASE' },
      { col: 'Current_District', req: false, note: '' },
      { col: 'Permanent_Region', req: false, note: 'e.g. Southern India' },
      { col: 'Employment_status', req: false, note: 'Student / Unemployed / Employed' },
      { col: 'What_is_your_education_status', req: false, note: 'e.g. 12th Completed' },
      { col: 'Did_you_study_Physics_Mathematics_and_English', req: false, note: 'Yes / No' },
      { col: 'Do_you_have_a_valid_Indian_passport', req: false, note: 'Yes / No' },
      { col: 'Do_you_have_a_laptop', req: false, note: 'Yes / No' },
      { col: 'Height_in_cm', req: false, note: 'Numeric' },
      { col: 'Weight_in_kg', req: false, note: 'Numeric' },
      { col: 'Do_you_wear_spectacles', req: false, note: 'Yes / No' },
      { col: 'Any_known_chronic_medical_condition', req: false, note: 'Yes / No' },
      { col: 'Have_you_undergone_DGCA_medical_assessment', req: false, note: 'Yes / No' },
      { col: 'Do_you_have_DGCA_computer_number', req: false, note: 'Yes / No' },
      { col: 'DraftDate', req: false, note: 'Date applicant saved draft' },
    ],
  },
  {
    name: 'Applied applicants',
    color: '#198038',
    desc: 'Final submitted applications. Same column structure as Draft Applicants sheet.',
    required: true,
    columns: [
      { col: 'ApplicationId', req: true,  note: 'Same ID format as draft sheet' },
      { col: 'Application Type', req: true,  note: '"Complete"' },
      { col: 'AppliedDate', req: false, note: 'Date of final submission' },
      { col: 'Status', req: false, note: 'Pending / Approved / Rejected' },
      { col: '…all other columns', req: false, note: 'Same as Draft Applicants sheet' },
    ],
  },
  {
    name: 'Registered Applicants',
    color: '#0F62FE',
    desc: 'Students who created a portal account (may not have started an application).',
    required: true,
    columns: [
      { col: 'ID', req: true,  note: 'Numeric row ID' },
      { col: 'Unique ID', req: false, note: '' },
      { col: 'First Name', req: false, note: 'Space in column name' },
      { col: 'Last Name', req: false, note: 'Space in column name' },
      { col: 'Email', req: true,  note: '' },
      { col: 'Phone Number', req: false, note: 'Space in column name' },
      { col: 'Registration Date', req: false, note: 'Space in column name; date or serial' },
    ],
  },
  {
    name: 'Draft Applicants calling ',
    color: '#6929C4',
    desc: 'Calling tracker sheet. Note: sheet name has a trailing space. Column A must be blank (no header) — ApplicationId values go in column A.',
    required: false,
    columns: [
      { col: '(blank col A)', req: true,  note: 'ApplicationId — e.g. SB-2026-0001' },
      { col: 'Application Type', req: false, note: '' },
      { col: 'FirstName', req: false, note: '' },
      { col: 'LastName', req: false, note: '' },
      { col: 'Email', req: false, note: '' },
      { col: 'PhoneNumber', req: false, note: '' },
      { col: 'Gender', req: false, note: '' },
      { col: 'Current_State', req: false, note: '' },
      { col: 'Assigned to', req: false, note: 'Team member name' },
      { col: 'Calling Status', req: false, note: 'Not Called / Called / Follow-Up' },
      { col: 'Call Status', req: false, note: 'Secondary status field' },
      { col: 'Remarks', req: false, note: 'Free-text notes' },
    ],
  },
];

function ExcelFormatSpec() {
  const [open, setOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState(0);

  return (
    <div style={{ border: `1px solid ${IBM.gray20}` }}>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-all"
        style={{ background: open ? IBM.blue10 : IBM.gray10 }}
      >
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke={IBM.blue60} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: IBM.blue60 }}>
            Excel File Format Specification
          </span>
          <span className="text-xs px-2 py-0.5 font-medium"
            style={{ background: IBM.blue60, color: '#fff' }}>
            4 sheets required
          </span>
        </div>
        <svg
          className="w-4 h-4 transition-transform duration-200 flex-shrink-0"
          style={{ color: IBM.gray60, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div>
          {/* Sheet tabs */}
          <div className="flex overflow-x-auto" style={{ borderBottom: `1px solid ${IBM.gray20}`, background: '#fff' }}>
            {SHEETS.map((s, i) => (
              <button
                key={s.name}
                onClick={() => setActiveSheet(i)}
                className="flex-shrink-0 px-4 py-2.5 text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  borderBottom: activeSheet === i ? `2px solid ${s.color}` : '2px solid transparent',
                  color: activeSheet === i ? s.color : IBM.gray60,
                  background: activeSheet === i ? `${s.color}0d` : 'transparent',
                }}
              >
                {s.name}
                {!s.required && (
                  <span className="ml-1.5 text-[10px] font-normal opacity-60">optional</span>
                )}
              </button>
            ))}
          </div>

          {/* Active sheet detail */}
          {(() => {
            const s = SHEETS[activeSheet];
            return (
              <div className="p-4" style={{ background: '#fff' }}>
                {/* Sheet description */}
                <div className="flex items-start gap-3 mb-4 p-3"
                  style={{ background: `${s.color}0d`, border: `1px solid ${s.color}33` }}>
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke={s.color} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-bold mb-0.5" style={{ color: s.color }}>
                      Sheet name: <span className="font-mono">"{s.name}"</span>
                      {s.name === 'Draft Applicants calling ' && (
                        <span className="ml-1 opacity-70">(trailing space)</span>
                      )}
                    </p>
                    <p className="text-xs" style={{ color: IBM.gray70 }}>{s.desc}</p>
                  </div>
                </div>

                {/* Columns table */}
                <div style={{ border: `1px solid ${IBM.gray20}` }}>
                  <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: IBM.gray10, borderBottom: `1px solid ${IBM.gray20}` }}>
                        <th className="text-left px-3 py-2 font-semibold w-8" style={{ color: IBM.gray60 }}>#</th>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: IBM.gray60 }}>Column Header (exact)</th>
                        <th className="text-left px-3 py-2 font-semibold w-20" style={{ color: IBM.gray60 }}>Required</th>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: IBM.gray60 }}>Expected values / notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.columns.map((c, idx) => (
                        <tr key={c.col}
                          style={{
                            borderBottom: `1px solid ${IBM.gray20}`,
                            background: idx % 2 === 0 ? '#fff' : IBM.gray10,
                          }}>
                          <td className="px-3 py-2 tabular-nums" style={{ color: IBM.gray50 }}>{idx + 1}</td>
                          <td className="px-3 py-2">
                            <span className="font-mono font-semibold" style={{ color: IBM.gray100 }}>{c.col}</span>
                          </td>
                          <td className="px-3 py-2">
                            {c.req
                              ? <span className="font-bold" style={{ color: IBM.red50 }}>Required</span>
                              : <span style={{ color: IBM.gray50 }}>Optional</span>
                            }
                          </td>
                          <td className="px-3 py-2" style={{ color: IBM.gray70 }}>{c.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Special notes */}
                {s.name === 'Draft Applicants calling ' && (
                  <div className="mt-3 p-3 text-xs"
                    style={{ background: '#FFF2E8', border: `1px solid ${IBM.orange40}44`, color: '#7D3A00' }}>
                    <strong>Important:</strong> Column A in this sheet has no header. The ApplicationId values (e.g. <code className="font-mono bg-white px-1">SB-2026-0001</code>) must be placed directly in column A with no header cell above them. All other data columns start from column B.
                  </div>
                )}
                {(s.name === 'Draft Applicants' || s.name === 'Applied applicants') && (
                  <div className="mt-3 p-3 text-xs"
                    style={{ background: IBM.blue10, border: `1px solid ${IBM.blue60}33`, color: '#00367D' }}>
                    <strong>Date columns</strong> (DateOfBirth, DraftDate, AppliedDate) accept either a date string like <code className="font-mono bg-white px-1">15/08/2005</code> or an Excel date serial number (e.g. <code className="font-mono bg-white px-1">46219</code>). Both formats are auto-detected.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Footer summary */}
          <div className="px-4 py-3 flex flex-wrap gap-4"
            style={{ borderTop: `1px solid ${IBM.gray20}`, background: IBM.gray10 }}>
            {SHEETS.map(s => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 flex-shrink-0" style={{ background: s.color }} />
                <span className="text-xs font-mono" style={{ color: IBM.gray70 }}>"{s.name}"</span>
                {!s.required && <span className="text-[10px]" style={{ color: IBM.gray50 }}>(optional)</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';

  const [mode, setMode]       = useState({ mockMode: false, apiMode: false, apiUrl: '' });
  const [apiUrlInput, setApiUrlInput] = useState('');
  const [saving, setSaving]   = useState('');
  const [msg, setMsg]         = useState({ text: '', type: '' });
  const [uploadState, setUploadState] = useState({ loading: false, name: '', error: '' });
  const fileRef = useRef(null);

  // Load current mode on mount
  useEffect(() => {
    api.get('/data/settings/mode').then(r => {
      setMode(r.data);
      setApiUrlInput(r.data.apiUrl || '');
    }).catch(() => {});
  }, []);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  // ── Toggle mock / live mode ────────────────────────────────────────────────
  const handleMockToggle = async (enabled) => {
    setSaving('mock');
    try {
      const { data } = await api.post('/data/settings/mode', { mockMode: enabled, apiMode: false });
      setMode(data);
      showMsg(enabled ? 'Switched to Mock Mode — demo data is now active.' : 'Switched to Live Mode — real data restored.', 'success');
    } catch {
      showMsg('Could not switch mode.', 'error');
    }
    setSaving('');
  };

  // ── Set API source ─────────────────────────────────────────────────────────
  const handleApiSave = async () => {
    if (!apiUrlInput.trim()) return;
    setSaving('api');
    try {
      await api.post('/data/settings/api-source', { url: apiUrlInput.trim() });
      setMode(m => ({ ...m, apiMode: true, apiUrl: apiUrlInput.trim(), mockMode: false }));
      showMsg('API source set — data will be fetched from the provided URL.', 'success');
    } catch (e) {
      showMsg(e.response?.data?.error || 'Could not connect to the API.', 'error');
    }
    setSaving('');
  };

  const handleApiClear = async () => {
    setSaving('api');
    try {
      await api.post('/data/settings/mode', { apiMode: false, apiUrl: '', mockMode: false });
      setMode(m => ({ ...m, apiMode: false, apiUrl: '' }));
      setApiUrlInput('');
      showMsg('API source cleared — using local Excel file.', 'success');
    } catch {
      showMsg('Failed to clear API source.', 'error');
    }
    setSaving('');
  };

  // ── Excel file upload ──────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadState({ loading: true, name: file.name, error: '' });
    const form = new FormData();
    form.append('file', file);
    try {
      await api.post('/data/settings/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMode(m => ({ ...m, mockMode: false, apiMode: false }));
      setUploadState({ loading: false, name: file.name, error: '' });
      showMsg(`"${file.name}" uploaded and loaded successfully.`, 'success');
    } catch (err) {
      setUploadState({ loading: false, name: '', error: err.response?.data?.error || 'Upload failed' });
      showMsg(err.response?.data?.error || 'Upload failed.', 'error');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const currentModeBadge = mode.mockMode
    ? <Badge label="Mock Mode" color={IBM.orange40} bg={IBM.orange10} />
    : mode.apiMode
    ? <Badge label="API Mode" color={IBM.blue60} bg={IBM.blue10} />
    : <Badge label="Live Mode" color={IBM.green50} bg={IBM.green10} />;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: IBM.gray10 }}>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: IBM.gray100 }}>Settings</h1>
            <p className="text-sm mt-0.5" style={{ color: IBM.gray60 }}>
              Configure data source and display mode
            </p>
          </div>
          <div className="flex items-center gap-3">
            {currentModeBadge}
            {msg.text && (
              <span className="text-xs font-medium px-3 py-1.5 max-w-xs"
                style={{
                  background: msg.type === 'error' ? IBM.red10 : IBM.green10,
                  color: msg.type === 'error' ? IBM.red50 : IBM.green50,
                  border: `1px solid ${msg.type === 'error' ? IBM.red50 : IBM.green50}44`,
                }}>
                {msg.text}
              </span>
            )}
          </div>
        </div>

        {/* ── Data Mode ── */}
        <Section
          title="Data Mode"
          subtitle="Switch between live applicant data and anonymised demo data"
        >
          <div className="space-y-6">
            {/* Live / Mock toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Live mode card */}
              <div
                className="p-4 cursor-pointer transition-all"
                style={{
                  border: `2px solid ${!mode.mockMode && !mode.apiMode ? IBM.green50 : IBM.gray20}`,
                  background: !mode.mockMode && !mode.apiMode ? IBM.green10 : '#fff',
                }}
                onClick={() => !mode.mockMode || handleMockToggle(false)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center"
                    style={{ background: IBM.green10 }}>
                    <svg className="w-4 h-4" fill="none" stroke={IBM.green50} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: IBM.gray100 }}>Live Mode</p>
                    <p className="text-xs" style={{ color: IBM.gray60 }}>Real applicant data from Excel/API</p>
                  </div>
                  {!mode.mockMode && !mode.apiMode && (
                    <div className="ml-auto w-4 h-4 flex items-center justify-center flex-shrink-0"
                      style={{ background: IBM.green50 }}>
                      <svg className="w-2.5 h-2.5" fill="white" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <ul className="space-y-1">
                  {['All real applicant records','Live statistics and charts','Reflects latest uploaded data'].map(f => (
                    <li key={f} className="text-xs flex items-center gap-2" style={{ color: IBM.gray70 }}>
                      <span style={{ color: IBM.green50 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mock mode card */}
              <div
                className="p-4 cursor-pointer transition-all"
                style={{
                  border: `2px solid ${mode.mockMode ? IBM.orange40 : IBM.gray20}`,
                  background: mode.mockMode ? IBM.orange10 : '#fff',
                }}
                onClick={() => handleMockToggle(!mode.mockMode)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center"
                    style={{ background: IBM.orange10 }}>
                    <svg className="w-4 h-4" fill="none" stroke={IBM.orange40} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: IBM.gray100 }}>Mock Mode</p>
                    <p className="text-xs" style={{ color: IBM.gray60 }}>Demo data for presentation</p>
                  </div>
                  {mode.mockMode && (
                    <div className="ml-auto w-4 h-4 flex items-center justify-center flex-shrink-0"
                      style={{ background: IBM.orange40 }}>
                      <svg className="w-2.5 h-2.5" fill="white" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <ul className="space-y-1">
                  {['1,200 anonymised demo applicants','Realistic geographic distribution','Safe to share in presentations'].map(f => (
                    <li key={f} className="text-xs flex items-center gap-2" style={{ color: IBM.gray70 }}>
                      <span style={{ color: IBM.orange40 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                {saving === 'mock' && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: IBM.orange40, borderTopColor: 'transparent' }} />
                    <span className="text-xs" style={{ color: IBM.orange40 }}>Switching…</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Data Source ── */}
        <Section
          title="Data Source"
          subtitle="Choose how the dashboard loads applicant data"
        >
          <div className="space-y-6">

            {/* Excel upload */}
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: IBM.gray100 }}>
                Upload Excel File
              </p>
              <p className="text-xs mb-3" style={{ color: IBM.gray60 }}>
                Upload an .xlsx file with the exact sheet names and column structure described below. Data is loaded immediately after upload.
              </p>
              <div className="flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadState.loading}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: IBM.blue60, color: '#fff' }}
                >
                  {uploadState.loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Choose .xlsx file
                    </>
                  )}
                </button>
                {uploadState.name && !uploadState.loading && (
                  <span className="text-xs px-2 py-1"
                    style={{ background: IBM.green10, color: IBM.green50 }}>
                    ✓ {uploadState.name}
                  </span>
                )}
                {uploadState.error && (
                  <span className="text-xs px-2 py-1"
                    style={{ background: IBM.red10, color: IBM.red50 }}>
                    ✗ {uploadState.error}
                  </span>
                )}
              </div>
              <p className="text-xs mt-2" style={{ color: IBM.gray50 }}>
                Max file size: 50 MB · Accepted: .xlsx, .xls
              </p>
            </div>

            {/* Excel format spec */}
            <ExcelFormatSpec />

            <div style={{ borderTop: `1px solid ${IBM.gray20}` }} />

            {/* API source */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold" style={{ color: IBM.gray100 }}>
                  Connect via API
                </p>
                {mode.apiMode && (
                  <Badge label="Active" color={IBM.blue60} bg={IBM.blue10} />
                )}
              </div>
              <p className="text-xs mb-3" style={{ color: IBM.gray60 }}>
                Point the dashboard to a REST API base URL that serves applicant data in the same format. The server will poll this endpoint.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={apiUrlInput}
                  onChange={e => setApiUrlInput(e.target.value)}
                  placeholder="https://your-api.example.com/data"
                  className="flex-1 px-3 py-2 text-sm outline-none"
                  style={{ border: `1px solid ${mode.apiMode ? IBM.blue60 : IBM.gray30}`, color: IBM.gray100 }}
                  onKeyDown={e => e.key === 'Enter' && handleApiSave()}
                />
                <button
                  onClick={handleApiSave}
                  disabled={!apiUrlInput.trim() || saving === 'api'}
                  className="px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: IBM.blue60, color: '#fff' }}
                >
                  {saving === 'api' ? 'Testing…' : 'Connect'}
                </button>
                {mode.apiMode && (
                  <button
                    onClick={handleApiClear}
                    className="px-4 py-2 text-sm font-semibold transition-all"
                    style={{ background: IBM.red10, color: IBM.red50, border: `1px solid ${IBM.red50}44` }}
                  >
                    Disconnect
                  </button>
                )}
              </div>
              {mode.apiMode && mode.apiUrl && (
                <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: IBM.blue60 }}>
                  <span style={{ color: IBM.green50 }}>●</span>
                  Connected to: <span className="font-mono">{mode.apiUrl}</span>
                </p>
              )}
            </div>
          </div>
        </Section>

        {/* ── Account Info ── */}
        <Section title="Account" subtitle="Your session details">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
              style={{ background: IBM.blue60 }}>
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: IBM.gray100 }}>{user?.name}</p>
              <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>@{user?.username}</p>
              <div className="mt-1">
                <Badge
                  label={user?.role === 'admin' ? 'Administrator' : 'Client View'}
                  color={user?.role === 'admin' ? IBM.blue60 : IBM.orange40}
                  bg={user?.role === 'admin' ? IBM.blue10 : IBM.orange10}
                />
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="mt-4 p-3" style={{ background: IBM.blue10, border: `1px solid ${IBM.blue60}33` }}>
              <p className="text-xs font-semibold" style={{ color: IBM.blue60 }}>Admin credentials reminder</p>
              <p className="text-xs mt-1" style={{ color: IBM.gray70 }}>
                Client login: <span className="font-mono font-bold">client</span> / <span className="font-mono font-bold">client@2026</span>
              </p>
            </div>
          )}
        </Section>

      </div>
    </div>
  );
}
