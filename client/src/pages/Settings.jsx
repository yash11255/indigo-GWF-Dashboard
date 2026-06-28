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

const DRAFT_C   = '#0F62FE';
const APPLIED_C = '#198038';

function NumInput({ value, onChange }) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={e => onChange(Number(e.target.value) || 0)}
      className="w-24 px-2 py-1.5 text-sm text-right tabular-nums outline-none"
      style={{ border: `1px solid ${IBM.gray30}`, color: IBM.gray100, background: '#fff' }}
    />
  );
}

function SectionBox({ title, icon, children }) {
  return (
    <div className="bg-white" style={{ border: `1px solid ${IBM.gray20}` }}>
      <div className="px-6 py-4 flex items-center gap-3"
        style={{ borderBottom: `1px solid ${IBM.gray20}`, background: IBM.gray10 }}>
        <span className="text-lg">{icon}</span>
        <p className="text-sm font-bold" style={{ color: IBM.gray100 }}>{title}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function ColHeader({ label, color }) {
  return (
    <th className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{ color }}>
      {label}
    </th>
  );
}

// ─── Deep path setter (e.g. "dgca.medical.yes.draft") ─────────────────────────
function setPath(obj, path, value) {
  const next = JSON.parse(JSON.stringify(obj));
  const keys = path.split('.');
  let cur = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur = isNaN(k) ? cur[k] : cur[+k];
  }
  cur[keys[keys.length - 1]] = value;
  return next;
}

// ─── Demo Mode editor ─────────────────────────────────────────────────────────
function DemoEditor({ overrides, onChange }) {
  const set = (path, value) => onChange(setPath(overrides, path, value));

  const s   = overrides.stats;
  const reg = overrides.regions;
  const emp = overrides.employment;
  const edu = overrides.education;
  const med = overrides.dgca.medical;
  const com = overrides.dgca.computer;

  return (
    <div className="space-y-6">

      {/* KPI Stats */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: IBM.gray70 }}>
          KPI Cards
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: IBM.gray10, borderBottom: `1px solid ${IBM.gray20}` }}>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: IBM.gray60 }}>Metric</th>
                <th className="px-3 py-2 text-right font-semibold" style={{ color: IBM.gray60 }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Total Registered', 'stats.totalRegistered'],
                ['In Draft',         'stats.totalDrafts'],
                ['Applied',          'stats.totalApplied'],
                ['States Covered',   'stats.uniqueStates'],
                ['Passport Ready',   'stats.passportReady'],
                ['Laptop Ready',     'stats.laptopReady'],
              ].map(([label, path], i) => {
                const val = path.split('.').reduce((o, k) => o[k], overrides);
                return (
                  <tr key={path} style={{ borderBottom: `1px solid ${IBM.gray20}`, background: i%2===0?'#fff':IBM.gray10 }}>
                    <td className="px-3 py-2 font-medium" style={{ color: IBM.gray100 }}>{label}</td>
                    <td className="px-3 py-2 text-right">
                      <NumInput value={val} onChange={v => set(path, v)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Region-wise */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: IBM.gray70 }}>Region-wise</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: IBM.gray10, borderBottom: `1px solid ${IBM.gray20}` }}>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: IBM.gray60 }}>Region</th>
                <ColHeader label="Draft"   color={DRAFT_C}   />
                <ColHeader label="Applied" color={APPLIED_C} />
                <th className="px-3 py-2 text-right font-semibold" style={{ color: IBM.gray60 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {reg.map((r, i) => (
                <tr key={r.region} style={{ borderBottom: `1px solid ${IBM.gray20}`, background: i%2===0?'#fff':IBM.gray10 }}>
                  <td className="px-3 py-2 font-medium" style={{ color: IBM.gray100 }}>{r.region}</td>
                  <td className="px-3 py-2 text-right">
                    <NumInput value={r.draft}    onChange={v => set(`regions.${i}.draft`,    v)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <NumInput value={r.complete} onChange={v => set(`regions.${i}.complete`, v)} />
                  </td>
                  <td className="px-3 py-2 text-right font-bold" style={{ color: IBM.gray100 }}>
                    {(r.draft + r.complete).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employment */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: IBM.gray70 }}>Employment Status</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: IBM.gray10, borderBottom: `1px solid ${IBM.gray20}` }}>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: IBM.gray60 }}>Status</th>
                <ColHeader label="Draft"   color={DRAFT_C}   />
                <ColHeader label="Applied" color={APPLIED_C} />
                <th className="px-3 py-2 text-right font-semibold" style={{ color: IBM.gray60 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {emp.map((r, i) => (
                <tr key={r.label} style={{ borderBottom: `1px solid ${IBM.gray20}`, background: i%2===0?'#fff':IBM.gray10 }}>
                  <td className="px-3 py-2 font-medium" style={{ color: IBM.gray100 }}>{r.label}</td>
                  <td className="px-3 py-2 text-right">
                    <NumInput value={r.Draft}    onChange={v => set(`employment.${i}.Draft`,    v)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <NumInput value={r.Complete} onChange={v => set(`employment.${i}.Complete`, v)} />
                  </td>
                  <td className="px-3 py-2 text-right font-bold" style={{ color: IBM.gray100 }}>
                    {(r.Draft + r.Complete).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Education */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: IBM.gray70 }}>Education Status</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: IBM.gray10, borderBottom: `1px solid ${IBM.gray20}` }}>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: IBM.gray60 }}>Level</th>
                <ColHeader label="Draft"   color={DRAFT_C}   />
                <ColHeader label="Applied" color={APPLIED_C} />
                <th className="px-3 py-2 text-right font-semibold" style={{ color: IBM.gray60 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {edu.map((r, i) => (
                <tr key={r.label} style={{ borderBottom: `1px solid ${IBM.gray20}`, background: i%2===0?'#fff':IBM.gray10 }}>
                  <td className="px-3 py-2 font-medium" style={{ color: IBM.gray100 }}>{r.label}</td>
                  <td className="px-3 py-2 text-right">
                    <NumInput value={r.Draft}    onChange={v => set(`education.${i}.Draft`,    v)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <NumInput value={r.Complete} onChange={v => set(`education.${i}.Complete`, v)} />
                  </td>
                  <td className="px-3 py-2 text-right font-bold" style={{ color: IBM.gray100 }}>
                    {(r.Draft + r.Complete).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DGCA */}
      {[
        { title: 'DGCA Medical Class 2', key: 'medical',  obj: med },
        { title: 'DGCA Computer Number', key: 'computer', obj: com },
      ].map(({ title, key, obj }) => (
        <div key={key}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: IBM.gray70 }}>{title}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: IBM.gray10, borderBottom: `1px solid ${IBM.gray20}` }}>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: IBM.gray60 }}>Status</th>
                  <ColHeader label="Draft"   color={DRAFT_C}   />
                  <ColHeader label="Applied" color={APPLIED_C} />
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: IBM.gray60 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {[['Yes','yes'],['No','no'],['No Data','noData']].map(([label, sub], i) => (
                  <tr key={sub} style={{ borderBottom: `1px solid ${IBM.gray20}`, background: i%2===0?'#fff':IBM.gray10 }}>
                    <td className="px-3 py-2 font-medium" style={{ color: IBM.gray100 }}>{label}</td>
                    <td className="px-3 py-2 text-right">
                      <NumInput value={obj[sub].draft}   onChange={v => set(`dgca.${key}.${sub}.draft`,   v)} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <NumInput value={obj[sub].applied} onChange={v => set(`dgca.${key}.${sub}.applied`, v)} />
                    </td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: IBM.gray100 }}>
                      {(obj[sub].draft + obj[sub].applied).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';

  const [mockMode,    setMockModeState] = useState(false);
  const [overrides,   setOverrides]     = useState(null);
  const [uploadState, setUploadState]   = useState({ loading: false, name: '', error: '' });
  const [saveState,   setSaveState]     = useState('');
  const [msg,         setMsg]           = useState({ text: '', type: '' });
  const fileRef = useRef(null);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    api.get('/data/settings/mode').then(r => setMockModeState(r.data.mockMode || false)).catch(() => {});
    api.get('/data/settings/mock-overrides').then(r => setOverrides(r.data)).catch(() => {});
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadState({ loading: true, name: file.name, error: '' });
    const form = new FormData();
    form.append('file', file);
    try {
      await api.post('/data/settings/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMockModeState(false);
      setUploadState({ loading: false, name: file.name, error: '' });
      showMsg(`"${file.name}" uploaded — dashboard now shows live data.`, 'success');
    } catch (err) {
      setUploadState({ loading: false, name: '', error: err.response?.data?.error || 'Upload failed' });
      showMsg(err.response?.data?.error || 'Upload failed.', 'error');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleToggle = async (enabled) => {
    setMockModeState(enabled);
    try {
      await api.post('/data/settings/mode', { mockMode: enabled, apiMode: false });
      showMsg(
        enabled ? 'Demo Mode on — charts now show demo values.' : 'Demo Mode off — live data restored.',
        'success',
      );
    } catch {
      showMsg('Failed to switch mode.', 'error');
    }
  };

  const handleSave = async () => {
    setSaveState('saving');
    try {
      await api.post('/data/settings/mock-overrides', overrides);
      setMockModeState(true);
      setSaveState('saved');
      showMsg('Demo values saved and Demo Mode activated.', 'success');
    } catch {
      setSaveState('error');
      showMsg('Failed to save demo values.', 'error');
    }
    setTimeout(() => setSaveState(''), 3000);
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: IBM.gray10 }}>
        <p className="text-sm" style={{ color: IBM.gray60 }}>Settings are only available to administrators.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: IBM.gray10, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: IBM.gray100 }}>Settings</h1>
            <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>Data upload · Demo mode</p>
          </div>
          {msg.text && (
            <span className="text-xs font-medium px-3 py-1.5 flex-shrink-0"
              style={{
                background: msg.type === 'error' ? IBM.red10   : IBM.green10,
                color:      msg.type === 'error' ? IBM.red50   : IBM.green50,
                border: `1px solid ${msg.type === 'error' ? IBM.red50 : IBM.green50}44`,
              }}>
              {msg.text}
            </span>
          )}
        </div>

        {/* ── Section 1: Upload ── */}
        <SectionBox title="Upload Data File" icon="📂">
          <p className="text-sm mb-5" style={{ color: IBM.gray70 }}>
            Upload your Excel (.xlsx) file to reload the dashboard with fresh applicant data.
            The file must contain sheets named <strong>Draft Applicants</strong>, <strong>Applied applicants</strong>, and <strong>Registered Applicants</strong>.
          </p>

          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />

          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadState.loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
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
              <span className="text-xs px-2.5 py-1.5 flex items-center gap-1.5"
                style={{ background: IBM.green10, color: IBM.green50 }}>
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {uploadState.name}
              </span>
            )}
            {uploadState.error && (
              <span className="text-xs px-2.5 py-1.5" style={{ background: IBM.red10, color: IBM.red50 }}>
                {uploadState.error}
              </span>
            )}
          </div>

          <p className="text-xs mt-3" style={{ color: IBM.gray50 }}>Max 50 MB · .xlsx or .xls only</p>
        </SectionBox>

        {/* ── Section 2: Demo Mode ── */}
        <SectionBox title="Demo Mode" icon="🎬">
          <p className="text-sm mb-5" style={{ color: IBM.gray70 }}>
            Set custom numbers for every chart. Useful for presentations where you want to control what values appear.
            When Demo Mode is on, real data is paused and your custom values are shown instead.
          </p>

          {/* Toggle */}
          <label className="flex items-center gap-4 cursor-pointer mb-6 p-4"
            style={{ border: `2px solid ${mockMode ? IBM.orange40 : IBM.gray20}`, background: mockMode ? IBM.orange10 : '#fff' }}>
            <div className="relative flex-shrink-0">
              <input type="checkbox" className="sr-only" checked={mockMode} onChange={e => handleToggle(e.target.checked)} />
              <div className="w-12 h-6 rounded-full transition-all"
                style={{ background: mockMode ? IBM.orange40 : IBM.gray30 }}>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ transform: mockMode ? 'translateX(24px)' : 'translateX(0)' }} />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: IBM.gray100 }}>
                {mockMode ? 'Demo Mode is ON' : 'Demo Mode is OFF'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>
                {mockMode
                  ? 'All charts are showing your custom values below.'
                  : 'Charts show real uploaded data. Toggle on to use custom values.'}
              </p>
            </div>
            {mockMode && (
              <span className="ml-auto text-xs font-bold px-2 py-0.5 flex-shrink-0"
                style={{ background: IBM.orange40, color: '#fff' }}>DEMO</span>
            )}
          </label>

          {/* Editor */}
          {overrides ? (
            <>
              <DemoEditor overrides={overrides} onChange={setOverrides} />

              <div className="mt-6 flex items-center gap-4 flex-wrap">
                <button
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: IBM.orange40, color: '#fff' }}
                >
                  {saveState === 'saving' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save &amp; Apply Demo Values
                    </>
                  )}
                </button>
                {saveState === 'saved' && (
                  <span className="text-xs px-2.5 py-1.5" style={{ background: IBM.green10, color: IBM.green50 }}>
                    ✓ Saved — Demo Mode is now active
                  </span>
                )}
                {saveState === 'error' && (
                  <span className="text-xs px-2.5 py-1.5" style={{ background: IBM.red10, color: IBM.red50 }}>
                    Save failed
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="h-32 animate-pulse" style={{ background: IBM.gray10 }} />
          )}
        </SectionBox>

      </div>
    </div>
  );
}
