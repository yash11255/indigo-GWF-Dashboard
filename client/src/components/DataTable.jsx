import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

const PAGE_SIZES = [50, 100, 200];

const IBM = {
  blue60: '#0F62FE', blue10: '#EDF5FF',
  green50: '#198038', green10: '#DEFBE6',
  red50: '#DA1E28', red10: '#FFF1F1',
  orange40: '#FF832B',
  gray100: '#161616', gray70: '#525252', gray60: '#6F6F6F',
  gray30: '#C6C6C6', gray20: '#E0E0E0', gray10: '#F4F4F4',
};

function Badge({ value }) {
  if (!value || value === 'Not Specified' || value === '-' || value === 'No Data') {
    return <span style={{ color: IBM.gray30, fontSize: 12 }}>—</span>;
  }
  const lower = value.toLowerCase();
  let bg = IBM.gray10, color = IBM.gray70;

  if (lower === 'yes')          { bg = IBM.green10;  color = IBM.green50; }
  if (lower === 'no')           { bg = IBM.red10;    color = IBM.red50;   }
  if (lower === 'student')      { bg = '#EDF5FF';    color = '#0043CE';   }
  if (lower === 'employed')     { bg = IBM.green10;  color = IBM.green50; }
  if (lower === 'unemployed')   { bg = '#FFF2E8';    color = '#8A3800';   }
  if (lower === 'female')       { bg = '#F6F2FF';    color = '#6929C4';   }
  if (lower === 'male')         { bg = IBM.blue10;   color = IBM.blue60;  }
  if (lower === 'pending')      { bg = '#FFF8E1';    color = '#A56600';   }
  if (lower === 'approved')     { bg = IBM.green10;  color = IBM.green50; }
  if (lower === 'rejected')     { bg = IBM.red10;    color = IBM.red50;   }
  if (lower === 'under review') { bg = IBM.blue10;   color = IBM.blue60;  }
  if (lower === 'completed')    { bg = IBM.green10;  color = IBM.green50; }
  if (lower === 'pursuing')     { bg = '#EDF5FF';    color = '#0043CE';   }
  if (['sc','st','obc'].includes(lower)) { bg = '#FFF8E1'; color = '#8A3800'; }

  return (
    <span className="text-xs font-semibold px-2 py-0.5" style={{ background: bg, color }}>
      {value}
    </span>
  );
}

// All available columns for draft / applied records
const ALL_COLS = [
  { key: 'applicationId',    label: 'App ID',         width: 130 },
  { key: 'name',             label: 'Name',            width: 160 },
  { key: 'email',            label: 'Email',           width: 200 },
  { key: 'phone',            label: 'Phone',           width: 120 },
  { key: 'dateOfBirth',      label: 'Date of Birth',   width: 110 },
  { key: 'gender',           label: 'Gender',          width: 90,  badge: true },
  { key: 'category',         label: 'Category',        width: 100, badge: true },
  { key: 'currentState',     label: 'State',           width: 140 },
  { key: 'currentDistrict',  label: 'District',        width: 140 },
  { key: 'permanentRegion',  label: 'Region',          width: 130 },
  { key: 'familyAnnualIncome', label: 'Family Income', width: 160 },
  { key: 'employmentStatus', label: 'Employment',      width: 110, badge: true },
  { key: 'educationStatus',  label: 'Education',       width: 180 },
  { key: 'studiedPME',       label: 'Phy/Math/Eng',   width: 110, badge: true },
  { key: 'physicsScore',     label: 'Physics %',       width: 90  },
  { key: 'mathScore',        label: 'Maths %',         width: 90  },
  { key: 'englishScore',     label: 'English %',       width: 90  },
  { key: 'hasPassport',      label: 'Passport',        width: 90,  badge: true },
  { key: 'hasLaptop',        label: 'Laptop',          width: 80,  badge: true },
  { key: 'height',           label: 'Height (cm)',     width: 100 },
  { key: 'weight',           label: 'Weight (kg)',     width: 100 },
  { key: 'wearSpectacles',   label: 'Spectacles',      width: 100, badge: true },
  { key: 'chronicCondition', label: 'Chronic Cond.',   width: 110, badge: true },
  { key: 'dgcaMedical',      label: 'DGCA Medical',    width: 110, badge: true },
  { key: 'dgcaComputer',     label: 'DGCA Computer',   width: 115, badge: true },
  { key: 'status',           label: 'Status',          width: 110, badge: true },
  { key: 'submittedDate',    label: 'Date',            width: 105 },
];

// Column keys shown by default for each type
const DRAFT_DEFAULT_KEYS = [
  'applicationId','name','email','phone','dateOfBirth','gender','category',
  'currentState','currentDistrict','permanentRegion','familyAnnualIncome',
  'employmentStatus','educationStatus','studiedPME',
  'hasPassport','hasLaptop','dgcaMedical','dgcaComputer','submittedDate',
];

const APPLIED_DEFAULT_KEYS = [
  'applicationId','name','email','phone','status','gender','category',
  'currentState','currentDistrict','permanentRegion','familyAnnualIncome',
  'employmentStatus','educationStatus',
  'hasPassport','hasLaptop','dgcaMedical','dgcaComputer','submittedDate',
];

const REG_COLS = [
  { key: 'uniqueId',         label: 'SBU ID',       width: 110 },
  { key: 'name',             label: 'Name',          width: 160 },
  { key: 'email',            label: 'Email',         width: 210 },
  { key: 'phone',            label: 'Phone',         width: 130 },
  { key: 'registrationDate', label: 'Registered On', width: 120 },
  { key: 'lastLoginDate',    label: 'Last Login',    width: 120 },
];

export default function DataTable({ type = 'drafts' }) {
  const isReg     = type === 'registered';
  const isApplied = type === 'applied';

  const defaultKeys = isApplied ? APPLIED_DEFAULT_KEYS : DRAFT_DEFAULT_KEYS;
  const [visibleKeys, setVisibleKeys] = useState(defaultKeys);
  const [showColPicker, setShowColPicker] = useState(false);

  const cols = isReg
    ? REG_COLS
    : ALL_COLS.filter(c => visibleKeys.includes(c.key));

  const endpoint = isReg ? '/data/registered' : isApplied ? '/data/applied' : '/data/drafts';

  const [data,          setData]          = useState([]);
  const [total,         setTotal]         = useState(0);
  const [pages,         setPages]         = useState(1);
  const [page,          setPage]          = useState(1);
  const [limit,         setLimit]         = useState(50);
  const [search,        setSearch]        = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading,       setLoading]       = useState(false);
  const [localFilters,  setLocalFilters]  = useState({});
  const [filterOptions, setFilterOptions] = useState({ states: [], genders: [], categories: [], employment: [] });
  const colPickerRef = useRef(null);

  useEffect(() => {
    api.get('/data/filters').then(r => setFilterOptions(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, localFilters]);

  // Close column picker on outside click
  useEffect(() => {
    const handler = e => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) {
        setShowColPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const localFiltersRef = useRef(localFilters);
  localFiltersRef.current = localFilters;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, search: debouncedSearch, ...localFiltersRef.current };
      const { data: res } = await api.get(endpoint, { params });
      setData(res.data || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, debouncedSearch, localFilters, endpoint]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/data/export?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Please try again.');
    }
  };

  const toggleCol = (key) => {
    setVisibleKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const Sel = ({ field, options, label }) => (
    <select
      value={localFilters[field] || 'all'}
      onChange={e => setLocalFilters(p => ({ ...p, [field]: e.target.value }))}
      className="text-xs border px-2 py-1.5 outline-none bg-white"
      style={{ border: `1px solid ${IBM.gray30}`, color: IBM.gray70 }}
    >
      <option value="all">{label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 p-4" style={{ borderBottom: `1px solid ${IBM.gray20}` }}>
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: IBM.gray60 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={isReg ? 'Search name, email, SBU ID…' : 'Search name, email, App ID…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm outline-none"
            style={{ border: `1px solid ${IBM.gray30}`, color: IBM.gray100 }}
          />
        </div>

        {/* Filters */}
        {(type === 'drafts' || type === 'applied') && (
          <Sel field="state" options={filterOptions.states} label="All States" />
        )}
        {type === 'drafts' && (
          <>
            <Sel field="employment" options={filterOptions.employment} label="All Employment" />
            <Sel field="category"   options={filterOptions.categories} label="All Categories" />
          </>
        )}

        {/* Page size */}
        <select
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          className="text-xs border px-2 py-1.5 outline-none bg-white"
          style={{ border: `1px solid ${IBM.gray30}`, color: IBM.gray70 }}
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
        </select>

        {/* Column picker (not for registered) */}
        {!isReg && (
          <div className="relative" ref={colPickerRef}>
            <button
              onClick={() => setShowColPicker(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
              style={{ border: `1px solid ${IBM.gray30}`, background: showColPicker ? IBM.blue10 : '#fff', color: showColPicker ? IBM.blue60 : IBM.gray70 }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Columns
            </button>
            {showColPicker && (
              <div className="absolute right-0 top-full mt-1 w-52 z-50 py-1 max-h-80 overflow-y-auto"
                style={{ background: '#fff', border: `1px solid ${IBM.gray20}`, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: IBM.gray60, borderBottom: `1px solid ${IBM.gray20}` }}>
                  Toggle columns
                </div>
                {ALL_COLS.map(c => (
                  <label key={c.key} className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={visibleKeys.includes(c.key)}
                      onChange={() => toggleCol(c.key)}
                      className="w-3.5 h-3.5"
                      style={{ accentColor: IBM.blue60 }}
                    />
                    <span className="text-xs" style={{ color: IBM.gray100 }}>{c.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Export */}
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
          style={{ background: IBM.blue60, color: '#fff' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* ── Count bar ── */}
      <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${IBM.gray20}`, background: IBM.gray10 }}>
        <p className="text-xs" style={{ color: IBM.gray60 }}>
          {total > 0
            ? <>Showing <span className="font-bold" style={{ color: IBM.gray100 }}>{start.toLocaleString('en-IN')}–{end.toLocaleString('en-IN')}</span> of <span className="font-bold" style={{ color: IBM.gray100 }}>{total.toLocaleString('en-IN')}</span> records</>
            : 'No records found'}
        </p>
        <p className="text-xs" style={{ color: IBM.gray50 }}>Scroll right to see all columns →</p>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="text-xs" style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
          <thead>
            <tr style={{ background: IBM.gray10, borderBottom: `2px solid ${IBM.gray20}` }}>
              <th className="text-left px-3 py-2.5 font-semibold uppercase tracking-wider sticky left-0 z-10"
                style={{ color: IBM.gray60, background: IBM.gray10, minWidth: 40 }}>#</th>
              {cols.map(c => (
                <th key={c.key}
                  className="text-left px-3 py-2.5 font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: IBM.gray60, minWidth: c.width }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={cols.length + 1} className="text-center py-16" style={{ color: IBM.gray50 }}>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: IBM.blue60, borderTopColor: 'transparent' }} />
                    <span className="text-xs">Loading…</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} className="text-center py-16" style={{ color: IBM.gray50 }}>
                  No records found
                </td>
              </tr>
            ) : data.map((row, i) => (
              <tr key={i}
                style={{ borderBottom: `1px solid ${IBM.gray20}`, background: i % 2 === 0 ? '#fff' : IBM.gray10 }}
                onMouseEnter={e => e.currentTarget.style.background = IBM.blue10}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : IBM.gray10}
              >
                <td className="px-3 py-2 tabular-nums sticky left-0" style={{ color: IBM.gray50, background: 'inherit' }}>
                  {start + i}
                </td>
                {cols.map(c => (
                  <td key={c.key} className="px-3 py-2 whitespace-nowrap" style={{ color: IBM.gray100 }}>
                    {c.badge ? (
                      <Badge value={row[c.key]} />
                    ) : (
                      <span className="block truncate" style={{ maxWidth: c.width, color: row[c.key] ? IBM.gray100 : IBM.gray30 }}
                        title={row[c.key]}>
                        {row[c.key] || '—'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${IBM.gray20}` }}>
          <p className="text-xs" style={{ color: IBM.gray60 }}>Page {page} of {pages}</p>
          <div className="flex items-center gap-1">
            <PagBtn onClick={() => setPage(1)}         disabled={page === 1}     label="«" />
            <PagBtn onClick={() => setPage(p => p-1)}  disabled={page === 1}     label="Prev" />
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const s = Math.max(1, Math.min(page - 2, pages - 4));
              return s + i;
            }).filter(p => p >= 1 && p <= pages).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className="w-7 h-7 text-xs font-medium transition-all"
                style={{
                  background: p === page ? IBM.blue60 : 'transparent',
                  color:      p === page ? '#fff'     : IBM.gray70,
                  border: `1px solid ${p === page ? IBM.blue60 : IBM.gray20}`,
                }}>
                {p}
              </button>
            ))}
            <PagBtn onClick={() => setPage(p => p+1)} disabled={page === pages} label="Next" />
            <PagBtn onClick={() => setPage(pages)}    disabled={page === pages} label="»" />
          </div>
        </div>
      )}
    </div>
  );
}

function PagBtn({ onClick, disabled, label }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-2.5 py-1 text-xs transition-all disabled:opacity-30"
      style={{ border: `1px solid ${IBM.gray20}`, color: IBM.gray70, background: '#fff' }}>
      {label}
    </button>
  );
}
