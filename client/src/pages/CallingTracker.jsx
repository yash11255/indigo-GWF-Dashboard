import { useState, useEffect, useCallback, useRef } from 'react';
import PageHeader from '../components/layout/Header';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

function useData(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetch_ = useCallback(async () => {
    setLoading(true);
    try { const { data: d } = await api.get(url); setData(d); }
    catch { setData(null); }
    finally { setLoading(false); }
  }, [url]);
  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading };
}

// ─── Metric tile ──────────────────────────────────────────────────────────────
function Metric({ label, value, sub, accent = '#0176D3', icon }) {
  return (
    <div className="bg-white rounded-lg p-4 flex flex-col"
      style={{ border: '1px solid #DDDBDA', borderTop: `3px solid ${accent}`, boxShadow: '0 2px 2px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3E3E3C' }}>{label}</span>
        {icon && <span style={{ color: accent }}>{icon}</span>}
      </div>
      <p className="text-3xl font-bold" style={{ color: '#181818' }}>{value ?? '—'}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#706E6B' }}>{sub}</p>}
    </div>
  );
}

// ─── Inline progress bar ──────────────────────────────────────────────────────
function Bar({ pct, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#F3F2F2' }}>
        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
      <span className="text-xs font-medium w-10 text-right" style={{ color: '#3E3E3C' }}>{pct}%</span>
    </div>
  );
}

// ─── Call status donut (pure CSS/divs) ───────────────────────────────────────
const STATUS_COLORS = {
  'Called':        '#2E844A',
  'DNP':           '#F5C342',
  'Not Called':    '#0176D3',
  'Wrong Number':  '#C23934',
  'Switch off':    '#706E6B',
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CallingTracker() {
  const { data: summary } = useData('/data/calling-summary');
  const { data: agents }  = useData('/data/calling-agents');
  const { data: issues }  = useData('/data/calling-issues');
  const { data: statusDist } = useData('/data/calling-status-dist');

  // Table state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterCallStatus, setFilterCallStatus] = useState('all');
  const [filterQueryStatus, setFilterQueryStatus] = useState('all');
  const [tableLoading, setTableLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const filterRef = useRef({ filterAgent, filterCallStatus, filterQueryStatus });
  useEffect(() => { filterRef.current = { filterAgent, filterCallStatus, filterQueryStatus }; },
    [filterAgent, filterCallStatus, filterQueryStatus]);

  const fetchTable = useCallback(async () => {
    setTableLoading(true);
    const { filterAgent: fa, filterCallStatus: fcs, filterQueryStatus: fqs } = filterRef.current;
    try {
      const { data: d } = await api.get('/data/calling', {
        params: { page, limit: 50, search: debouncedSearch, agent: fa, callStatus: fcs, queryStatus: fqs }
      });
      setRows(d.data);
      setTotal(d.total);
      setPages(d.pages);
    } catch { setRows([]); }
    finally { setTableLoading(false); }
  }, [page, debouncedSearch, filterAgent, filterCallStatus, filterQueryStatus]);

  useEffect(() => { fetchTable(); }, [fetchTable]);

  const handleExport = async () => {
    try {
      const res = await fetch('/api/data/export?type=calling', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'calling_tracker.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const agentList = agents ? [...new Set(agents.map(a => a.agent))] : [];
  const totalIssues = issues ? issues.reduce((s, i) => s + i.count, 0) : 0;

  const callStatusBadge = {
    'Called':       { bg: '#EEF6EE', text: '#2E844A' },
    'DNP':          { bg: '#FEF4E0', text: '#A56600' },
    'Not Called':   { bg: '#EAF4FF', text: '#0176D3' },
    'Wrong Number': { bg: '#FDECEA', text: '#C23934' },
    'Switch off':   { bg: '#F3F2F2', text: '#706E6B' },
  };
  const queryStatusBadge = {
    'Resolved': { bg: '#EEF6EE', text: '#2E844A' },
    'Pending':  { bg: '#FEF4E0', text: '#A56600' },
    '':         { bg: '#F3F2F2', text: '#706E6B' },
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: '#F3F2F2' }}>
      <PageHeader
        title="Calling Tracker"
        subtitle="Draft applicant outreach — call status, issue resolution and agent performance"
        actions={
          <button onClick={handleExport} className="btn-neutral flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* ── KPIs ── */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            <Metric label="Total Assigned"   value={summary.total}
              sub="Draft applicants"         accent="#0176D3" />
            <Metric label="Called"           value={summary.called}
              sub={`${summary.reachedRate}% reach rate`}  accent="#2E844A" />
            <Metric label="Did Not Pick"     value={summary.dnp}
              sub="No answer"               accent="#F5C342" />
            <Metric label="Not Yet Called"   value={summary.notCalled}
              sub="Pending outreach"         accent="#706E6B" />
            <Metric label="Resolved"         value={summary.resolved}
              sub={`${summary.resolutionRate}% of called`} accent="#2E844A" />
            <Metric label="Pending Issues"   value={summary.pending}
              sub="Needs follow-up"         accent="#C23934" />
          </div>
        )}

        {/* ── Agent table + Issues side by side ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Agent performance */}
          <div className="xl:col-span-2 bg-white rounded-lg"
            style={{ border: '1px solid #DDDBDA', boxShadow: '0 2px 2px rgba(0,0,0,0.05)' }}>
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #DDDBDA' }}>
              <p className="font-semibold text-sm" style={{ color: '#181818' }}>Agent Performance</p>
              <p className="text-xs mt-0.5" style={{ color: '#706E6B' }}>Calls assigned, reached and resolved per team member</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #DDDBDA', background: '#FAFAF9' }}>
                    {['Agent', 'Assigned', 'Called', 'DNP', 'Not Called', 'Resolved', 'Reach Rate'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider"
                        style={{ color: '#706E6B' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(agents || []).map((a, i) => (
                    <tr key={a.agent} style={{ borderBottom: '1px solid #F3F2F2', background: i % 2 === 0 ? '#fff' : '#FAFAF9' }}>
                      <td className="px-4 py-2.5 font-medium" style={{ color: '#181818' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ background: '#0176D3' }}>
                            {a.agent.charAt(0).toUpperCase()}
                          </div>
                          {a.agent}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: '#181818' }}>{a.total}</td>
                      <td className="px-4 py-2.5" style={{ color: '#2E844A' }}>{a.called}</td>
                      <td className="px-4 py-2.5" style={{ color: '#A56600' }}>{a.dnp}</td>
                      <td className="px-4 py-2.5" style={{ color: '#706E6B' }}>{a.notCalled}</td>
                      <td className="px-4 py-2.5" style={{ color: '#2E844A' }}>{a.resolved}</td>
                      <td className="px-4 py-2.5 w-36">
                        <Bar pct={Number(a.reachRate)} color="#0176D3" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Issue categories + Call status */}
          <div className="flex flex-col gap-4">
            {/* Call status distribution */}
            <div className="bg-white rounded-lg p-4"
              style={{ border: '1px solid #DDDBDA', boxShadow: '0 2px 2px rgba(0,0,0,0.05)' }}>
              <p className="font-semibold text-sm mb-3" style={{ color: '#181818' }}>Call Status Breakdown</p>
              <div className="space-y-2.5">
                {(statusDist || []).map(s => {
                  const pct = summary?.total ? ((s.count / summary.total) * 100).toFixed(1) : 0;
                  const color = STATUS_COLORS[s.status] || '#9E9E9E';
                  return (
                    <div key={s.status}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium" style={{ color: '#3E3E3C' }}>{s.status}</span>
                        <span className="text-xs font-semibold" style={{ color: '#181818' }}>{s.count}</span>
                      </div>
                      <Bar pct={Number(pct)} color={color} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Issue categories */}
            <div className="bg-white rounded-lg p-4"
              style={{ border: '1px solid #DDDBDA', boxShadow: '0 2px 2px rgba(0,0,0,0.05)' }}>
              <p className="font-semibold text-sm mb-3" style={{ color: '#181818' }}>Issue Categories</p>
              <div className="space-y-2.5">
                {(issues || []).filter(i => i.category && i.category !== 'No Issue').map(i => {
                  const pct = totalIssues ? ((i.count / totalIssues) * 100).toFixed(0) : 0;
                  return (
                    <div key={i.category}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium" style={{ color: '#3E3E3C' }}>{i.category}</span>
                        <span className="text-xs font-semibold" style={{ color: '#181818' }}>{i.count}</span>
                      </div>
                      <Bar pct={Number(pct)} color="#7526E3" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Calling data table ── */}
        <div className="bg-white rounded-lg"
          style={{ border: '1px solid #DDDBDA', boxShadow: '0 2px 2px rgba(0,0,0,0.05)' }}>
          {/* Table toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #DDDBDA' }}>
            <div className="relative flex-1 min-w-48">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#706E6B' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name, email, ID, remark…"
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded border bg-white"
                style={{ borderColor: '#DDDBDA', outline: 'none', color: '#181818' }}
              />
            </div>
            <select value={filterAgent} onChange={e => { setFilterAgent(e.target.value); setPage(1); }}
              className="text-sm rounded border px-2.5 py-1.5" style={{ borderColor: '#DDDBDA', color: '#3E3E3C' }}>
              <option value="all">All Agents</option>
              {agentList.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filterCallStatus} onChange={e => { setFilterCallStatus(e.target.value); setPage(1); }}
              className="text-sm rounded border px-2.5 py-1.5" style={{ borderColor: '#DDDBDA', color: '#3E3E3C' }}>
              <option value="all">All Call Status</option>
              {['Called', 'DNP', 'Not Called', 'Wrong Number', 'Switch off'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterQueryStatus} onChange={e => { setFilterQueryStatus(e.target.value); setPage(1); }}
              className="text-sm rounded border px-2.5 py-1.5" style={{ borderColor: '#DDDBDA', color: '#3E3E3C' }}>
              <option value="all">All Query Status</option>
              <option value="Resolved">Resolved</option>
              <option value="Pending">Pending</option>
            </select>
            <span className="text-xs ml-auto" style={{ color: '#706E6B' }}>
              {total.toLocaleString('en-IN')} records
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #DDDBDA', background: '#FAFAF9' }}>
                  {['#', 'Application ID', 'Name', 'Phone', 'Agent', 'Call Status', 'Query Status', 'Issue', 'Remark'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider"
                      style={{ color: '#706E6B', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  Array(10).fill(0).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F2F2' }}>
                      {Array(9).fill(0).map((_, j) => (
                        <td key={j} className="px-4 py-2.5">
                          <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm" style={{ color: '#706E6B' }}>
                    No records match your filters
                  </td></tr>
                ) : rows.map((r, i) => {
                  const cs = callStatusBadge[r.callStatus] || { bg: '#F3F2F2', text: '#706E6B' };
                  const qs = queryStatusBadge[r.queryStatus] || queryStatusBadge[''];
                  const start = (page - 1) * 50;
                  return (
                    <tr key={r.applicationId} style={{ borderBottom: '1px solid #F3F2F2', background: i % 2 === 0 ? '#fff' : '#FAFAF9' }}>
                      <td className="px-4 py-2.5 text-xs" style={{ color: '#9E9E9E' }}>{start + i + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#0176D3' }}>{r.applicationId}</td>
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap" style={{ color: '#181818' }}>{r.name || '—'}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: '#3E3E3C' }}>{r.phone || '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-medium" style={{ color: '#3E3E3C' }}>{r.assignedMember || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="badge text-xs px-2 py-0.5 rounded"
                          style={{ background: cs.bg, color: cs.text }}>{r.callStatus}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {r.queryStatus
                          ? <span className="badge text-xs px-2 py-0.5 rounded" style={{ background: qs.bg, color: qs.text }}>{r.queryStatus}</span>
                          : <span style={{ color: '#C9C7C5' }}>—</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: r.issueCategory ? '#3E3E3C' : '#C9C7C5' }}>
                        {r.issueCategory || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs max-w-48 truncate" style={{ color: '#706E6B' }}
                        title={r.remark}>{r.remark || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #DDDBDA' }}>
              <span className="text-xs" style={{ color: '#706E6B' }}>
                Page {page} of {pages}
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn-neutral px-3 py-1 text-xs disabled:opacity-40">← Prev</button>
                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                  const pg = page <= 3 ? i + 1 : page + i - 2;
                  if (pg < 1 || pg > pages) return null;
                  return (
                    <button key={pg} onClick={() => setPage(pg)}
                      className="w-7 h-7 rounded text-xs font-medium transition-all"
                      style={{
                        background: pg === page ? '#0176D3' : '#fff',
                        color: pg === page ? '#fff' : '#3E3E3C',
                        border: `1px solid ${pg === page ? '#0176D3' : '#DDDBDA'}`,
                      }}>{pg}</button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                  className="btn-neutral px-3 py-1 text-xs disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
