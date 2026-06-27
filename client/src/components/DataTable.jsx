import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

const PAGE_SIZES = [25, 50, 100];

function Badge({ value }) {
  if (!value || value === 'Not Specified' || value === '-') {
    return <span className="text-slate-300 text-xs">—</span>;
  }
  const lower = value.toLowerCase();
  let cls = 'badge bg-slate-100 text-slate-600';
  if (lower === 'yes') cls = 'badge bg-emerald-100 text-emerald-700';
  if (lower === 'no') cls = 'badge bg-red-50 text-red-500';
  if (lower === 'female') cls = 'badge bg-purple-100 text-purple-700';
  if (lower === 'male') cls = 'badge bg-blue-100 text-blue-700';
  if (lower === 'student') cls = 'badge bg-sky-100 text-sky-700';
  if (lower === 'employed') cls = 'badge bg-emerald-100 text-emerald-700';
  if (lower === 'general') cls = 'badge bg-slate-100 text-slate-700';
  if (['sc', 'st', 'obc'].includes(lower)) cls = 'badge bg-amber-100 text-amber-700';
  if (lower === 'pending') cls = 'badge bg-amber-100 text-amber-700';
  if (lower === 'under review') cls = 'badge bg-blue-100 text-blue-700';
  if (lower === 'approved') cls = 'badge bg-emerald-100 text-emerald-700';
  if (lower === 'rejected') cls = 'badge bg-red-100 text-red-600';
  return <span className={cls}>{value}</span>;
}

const DRAFT_COLS = [
  { key: 'applicationId', label: 'App ID', width: 'w-36' },
  { key: 'name', label: 'Name', width: 'w-40' },
  { key: 'email', label: 'Email', width: 'w-48' },
  { key: 'phone', label: 'Phone', width: 'w-32' },
  { key: 'gender', label: 'Gender', width: 'w-24', badge: true },
  { key: 'currentState', label: 'State', width: 'w-36' },
  { key: 'currentDistrict', label: 'District', width: 'w-36' },
  { key: 'category', label: 'Category', width: 'w-24', badge: true },
  { key: 'employmentStatus', label: 'Employment', width: 'w-28', badge: true },
  { key: 'hasPassport', label: 'Passport', width: 'w-24', badge: true },
  { key: 'hasLaptop', label: 'Laptop', width: 'w-20', badge: true },
  { key: 'draftDate', label: 'Draft Date', width: 'w-28' },
];

const APPLIED_COLS = [
  { key: 'applicationId', label: 'App ID', width: 'w-36' },
  { key: 'name', label: 'Name', width: 'w-40' },
  { key: 'email', label: 'Email', width: 'w-48' },
  { key: 'phone', label: 'Phone', width: 'w-32' },
  { key: 'status', label: 'Status', width: 'w-28', badge: true },
  { key: 'gender', label: 'Gender', width: 'w-24', badge: true },
  { key: 'currentState', label: 'State', width: 'w-36' },
  { key: 'currentDistrict', label: 'District', width: 'w-36' },
  { key: 'category', label: 'Category', width: 'w-24', badge: true },
  { key: 'hasPassport', label: 'Passport', width: 'w-24', badge: true },
  { key: 'appliedDate', label: 'Applied On', width: 'w-28' },
];

const REG_COLS = [
  { key: 'uniqueId', label: 'SBU ID', width: 'w-28' },
  { key: 'name', label: 'Name', width: 'w-44' },
  { key: 'email', label: 'Email', width: 'w-52' },
  { key: 'phone', label: 'Phone', width: 'w-36' },
  { key: 'registrationDate', label: 'Registered', width: 'w-28' },
  { key: 'googleLogin', label: 'Google', width: 'w-20', badge: true },
  { key: 'lastLoginDate', label: 'Last Login', width: 'w-28' },
];

export default function DataTable({ type = 'drafts' }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [localFilters, setLocalFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({ states: [], genders: [], categories: [], employment: [] });

  const cols = type === 'registered' ? REG_COLS : type === 'applied' ? APPLIED_COLS : DRAFT_COLS;
  const endpoint = type === 'registered' ? '/data/registered' : type === 'applied' ? '/data/applied' : '/data/drafts';

  // Stable refs so they never trigger useCallback recreation
  const localFiltersRef = useRef(localFilters);
  localFiltersRef.current = localFilters;

  useEffect(() => {
    api.get('/data/filters').then(r => setFilterOptions(r.data)).catch(() => {});
  }, []);

  // Debounce search: wait 350ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 on search or filter change
  useEffect(() => { setPage(1); }, [debouncedSearch, localFilters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: debouncedSearch,
        ...localFiltersRef.current,
      };
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
  // localFilters (not ref) in deps so fetchData rebuilds when filters actually change
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Please try again.');
    }
  };

  const FilterSelect = ({ field, options, label }) => (
    <select
      value={localFilters[field] || 'all'}
      onChange={e => setLocalFilters(prev => ({ ...prev, [field]: e.target.value }))}
      className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
    >
      <option value="all">{label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={type === 'registered' ? 'Search by name, email, SBU ID...' : 'Search by name, email, application ID...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {type === 'drafts' && (
          <>
            <FilterSelect field="state" options={filterOptions.states} label="All States" />
            <FilterSelect field="gender" options={filterOptions.genders} label="All Genders" />
            <FilterSelect field="category" options={filterOptions.categories} label="All Categories" />
            <FilterSelect field="employment" options={filterOptions.employment} label="All Employment" />
          </>
        )}

        {type === 'applied' && (
          <>
            <FilterSelect field="state" options={filterOptions.states} label="All States" />
            <FilterSelect field="gender" options={filterOptions.genders} label="All Genders" />
          </>
        )}

        <select
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
        </select>

        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Results bar */}
      <div className="mb-3">
        <p className="text-slate-500 text-sm">
          {total > 0
            ? <>Showing <span className="font-semibold text-slate-700">{start}–{end}</span> of <span className="font-semibold text-slate-700">{total.toLocaleString('en-IN')}</span> records</>
            : 'No records'
          }
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs w-10">#</th>
              {cols.map(c => (
                <th key={c.key} className={`text-left px-4 py-3 text-slate-500 font-medium text-xs ${c.width}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={cols.length + 1} className="text-center py-16 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} className="text-center py-16 text-slate-400">
                  <svg className="w-10 h-10 mx-auto mb-2 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">No records found</p>
                </td>
              </tr>
            ) : data.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-300 text-xs">{start + i}</td>
                {cols.map(c => (
                  <td key={c.key} className={`px-4 py-3 text-slate-700 ${c.width} max-w-0`}>
                    {c.badge ? (
                      <Badge value={row[c.key]} />
                    ) : (
                      <span className="truncate block" title={row[c.key]}>
                        {row[c.key] || <span className="text-slate-300">—</span>}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-slate-400 text-xs">Page {page} of {pages}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2 py-1.5 rounded text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">Prev</button>

            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, pages - 4));
              return start + i;
            }).filter(p => p >= 1 && p <= pages).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${p === page ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {p}
              </button>
            ))}

            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-3 py-1.5 rounded text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">Next</button>
            <button onClick={() => setPage(pages)} disabled={page === pages}
              className="px-2 py-1.5 rounded text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
          </div>
        </div>
      )}
    </div>
  );
}
