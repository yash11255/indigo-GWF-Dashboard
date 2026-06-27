import { useState, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import api from '../utils/api';

const IBM = {
  blue60: '#0F62FE', blue40: '#78A9FF', blue10: '#EDF5FF',
  green50: '#198038', green10: '#DEFBE6',
  teal50: '#007D79', teal10: '#D9FBFB',
  purple50: '#8A3FFC', purple10: '#F6F2FF',
  red50: '#DA1E28', red10: '#FFF1F1',
  orange40: '#FF832B', orange10: '#FFF2E8',
  gray100: '#161616', gray90: '#262626', gray80: '#393939',
  gray70: '#525252', gray60: '#6F6F6F', gray50: '#8D8D8D',
  gray30: '#C6C6C6', gray20: '#E0E0E0', gray10: '#F4F4F4',
};

const GROUP_COLORS = {
  Identity:   IBM.blue60,
  Location:   IBM.teal50,
  Background: IBM.orange40,
  Academics:  IBM.purple50,
  Documents:  IBM.green50,
  Medical:    IBM.red50,
  DGCA:       '#9E1FBB',
};

const IMPORTANCE_META = {
  1: { label: 'Critical',  bg: IBM.red10,    color: IBM.red50    },
  2: { label: 'Important', bg: IBM.orange10, color: IBM.orange40 },
  3: { label: 'Useful',    bg: IBM.blue10,   color: IBM.blue60   },
};

const DIST_COLORS = [IBM.red50, IBM.orange40, IBM.blue60, IBM.green50];

function useData(url) {
  const [data, setData]       = useState(null);
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

const Skel = ({ h = 'h-32' }) => (
  <div className={`${h} animate-pulse`} style={{ background: IBM.gray10 }} />
);

function StatChip({ label, value, sub, color }) {
  return (
    <div className="bg-white p-5" style={{ border: '1px solid #DDDBDA', borderTop: `3px solid ${color}` }}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: IBM.gray60 }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: IBM.gray100 }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: IBM.gray60 }}>{sub}</p>}
    </div>
  );
}

function IBMTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs"
      style={{ background: IBM.gray90, border: `1px solid ${IBM.gray80}`, color: '#fff' }}>
      <p className="font-semibold mb-1" style={{ color: IBM.gray30 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2" style={{ background: p.fill || p.color }} />
          <span style={{ color: IBM.gray30 }}>{p.name || p.dataKey}:</span>
          <span className="font-semibold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Group fill rate cards ────────────────────────────────────────────────────
// groups: [{group, fields, totalMissing}]
function GroupCards({ groups, total }) {
  if (!groups?.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
      {groups.map(g => {
        const maxPossible = g.fields * total;
        const fillPct     = maxPossible > 0 ? Math.round(((maxPossible - g.totalMissing) / maxPossible) * 100) : 0;
        const color       = GROUP_COLORS[g.group] || IBM.gray60;
        return (
          <div key={g.group} className="bg-white p-3"
            style={{ border: '1px solid #DDDBDA', borderTop: `3px solid ${color}` }}>
            <p className="text-xs font-bold mb-1" style={{ color: IBM.gray100 }}>{g.group}</p>
            <p className="text-2xl font-bold" style={{ color }}>{fillPct}%</p>
            <p className="text-[10px] mt-0.5" style={{ color: IBM.gray60 }}>fill rate</p>
            <div className="h-1 mt-2" style={{ background: IBM.gray20 }}>
              <div className="h-1 transition-all duration-700" style={{ width: `${fillPct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Field-level breakdown table ──────────────────────────────────────────────
// fields: [{key, label, group, importance, filled, missing, filledPct, missingPct}]
function FieldTable({ fields, total }) {
  const [sortBy, setSortBy]         = useState('missing');
  const [groupFilter, setGroupFilter] = useState('All');

  if (!fields?.length) return <Skel h="h-48" />;

  const allGroups = Array.from(new Set(fields.map(f => f.group)));

  const sorted = [...fields]
    .filter(f => groupFilter === 'All' || f.group === groupFilter)
    .sort((a, b) => sortBy === 'missing'
      ? b.missing - a.missing
      : sortBy === 'fill'
      ? b.filledPct - a.filledPct
      : a.label.localeCompare(b.label));

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-semibold" style={{ color: IBM.gray70 }}>Group:</label>
          {['All', ...allGroups].map(g => (
            <button key={g} onClick={() => setGroupFilter(g)}
              className="px-2.5 py-1 text-xs font-semibold transition-all"
              style={{
                background: groupFilter === g ? (GROUP_COLORS[g] || IBM.blue60) : IBM.gray10,
                color: groupFilter === g ? '#fff' : IBM.gray70,
                border: `1px solid ${groupFilter === g ? (GROUP_COLORS[g] || IBM.blue60) : IBM.gray30}`,
              }}>
              {g}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs font-semibold" style={{ color: IBM.gray70 }}>Sort:</label>
          {[['missing','Most Missing'],['fill','Best Filled'],['name','A–Z']].map(([v,lbl]) => (
            <button key={v} onClick={() => setSortBy(v)}
              className="px-2.5 py-1 text-xs font-semibold transition-all"
              style={{
                background: sortBy === v ? IBM.blue60 : IBM.gray10,
                color: sortBy === v ? '#fff' : IBM.gray70,
                border: `1px solid ${sortBy === v ? IBM.blue60 : IBM.gray30}`,
              }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: IBM.gray20, borderBottom: `1px solid ${IBM.gray30}` }}>
              {['Parameter', 'Group', 'Priority', 'Filled', 'Missing', 'Fill Rate'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: IBM.gray60 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => {
              const imp     = IMPORTANCE_META[f.importance] || IMPORTANCE_META[3];
              const color   = GROUP_COLORS[f.group] || IBM.gray60;
              const fillPct = f.filledPct ?? 0;
              return (
                <tr key={f.key} style={{
                  borderBottom: `1px solid ${IBM.gray20}`,
                  background: i % 2 === 0 ? '#fff' : IBM.gray10,
                }}>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: IBM.gray100 }}>{f.label}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5"
                      style={{ background: `${color}18`, color, border: `1px solid ${color}44` }}>
                      {f.group}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-bold px-2 py-0.5"
                      style={{ background: imp.bg, color: imp.color }}>
                      {imp.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: IBM.green50 }}>
                    {(f.filled ?? (total - f.missing)).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold" style={{ color: f.missing > 0 ? IBM.red50 : IBM.green50 }}>
                      {f.missing.toLocaleString('en-IN')}
                    </span>
                    {f.missing > 0 && (
                      <span className="text-xs ml-1.5" style={{ color: IBM.gray60 }}>
                        ({f.missingPct ?? (100 - fillPct)}% blank)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ minWidth: 160 }}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2" style={{ background: IBM.gray20 }}>
                        <div className="h-2 transition-all duration-700"
                          style={{
                            width: `${fillPct}%`,
                            background: fillPct >= 80 ? IBM.green50 : fillPct >= 50 ? IBM.orange40 : IBM.red50,
                          }} />
                      </div>
                      <span className="text-xs font-bold tabular-nums w-9 text-right"
                        style={{ color: fillPct >= 80 ? IBM.green50 : fillPct >= 50 ? IBM.orange40 : IBM.red50 }}>
                        {fillPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Completeness distribution chart ─────────────────────────────────────────
// dist: [{range, count}]
function CompletenessChart({ dist }) {
  if (!dist) return <Skel />;
  const chartData = dist.map((b, i) => ({
    label: b.range || b.label,
    count: b.count,
    fill:  DIST_COLORS[i % DIST_COLORS.length],
  }));
  const total = dist.reduce((s, d) => s + d.count, 0);
  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barSize={48}>
          <CartesianGrid strokeDasharray="3 0" stroke={IBM.gray20} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: IBM.gray60 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: IBM.gray60 }} tickLine={false} axisLine={false} />
          <Tooltip content={<IBMTooltip />} />
          <Bar dataKey="count" name="Drafts" radius={0}>
            {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {dist.map((b, i) => {
          const pct = total > 0 ? ((b.count / total) * 100).toFixed(1) : 0;
          return (
            <div key={b.range || b.label} className="p-3 text-center"
              style={{ background: IBM.gray10, border: `1px solid ${IBM.gray20}` }}>
              <div className="w-3 h-3 mx-auto mb-1.5" style={{ background: DIST_COLORS[i] }} />
              <p className="text-xs font-semibold mb-0.5" style={{ color: IBM.gray70 }}>{b.range || b.label}</p>
              <p className="text-xl font-bold" style={{ color: DIST_COLORS[i] }}>{b.count.toLocaleString('en-IN')}</p>
              <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>{pct}% of drafts</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Critical missing bar chart ───────────────────────────────────────────────
// Shows fields with importance=1 that have missing data, sorted by missing count
function CriticalMissing({ fields, total }) {
  if (!fields) return <Skel />;
  const critical = fields
    .filter(f => f.importance === 1 && f.missing > 0)
    .sort((a, b) => b.missing - a.missing);

  if (!critical.length) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm font-semibold" style={{ color: IBM.green50 }}>All critical fields are fully filled!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {critical.map(f => {
        const missRate  = f.missingPct ?? (total > 0 ? (f.missing / total * 100) : 0);
        const color     = missRate > 50 ? IBM.red50 : missRate > 20 ? IBM.orange40 : IBM.blue60;
        const groupColor = GROUP_COLORS[f.group] || IBM.gray60;
        return (
          <div key={f.key} className="flex items-center gap-3">
            <div className="w-28 flex-shrink-0">
              <p className="text-xs font-semibold truncate" style={{ color: IBM.gray100 }}>{f.label}</p>
              <span className="text-[10px] font-medium px-1.5 py-0.5"
                style={{ background: `${groupColor}18`, color: groupColor }}>
                {f.group}
              </span>
            </div>
            <div className="flex-1 h-3" style={{ background: IBM.gray20 }}>
              <div className="h-3 transition-all duration-700"
                style={{ width: `${missRate}%`, background: color, minWidth: missRate > 0 ? 2 : 0 }} />
            </div>
            <div className="w-24 text-right flex-shrink-0">
              <span className="text-sm font-bold" style={{ color }}>
                {f.missing.toLocaleString('en-IN')}
              </span>
              <span className="text-xs ml-1" style={{ color: IBM.gray60 }}>({Math.round(missRate)}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Draft() {
  const { data, loading } = useData('/data/draft-analysis');

  const total                 = data?.total;
  const fields                = data?.fields;
  const dist                  = data?.completenessDistribution;
  const groups                = data?.groups;
  const avgCompleteness       = data?.avgCompleteness; // integer 0-100

  const criticalCount  = fields?.filter(f => f.importance === 1).length ?? 0;
  const fullyFilled    = fields?.filter(f => f.missing === 0).length ?? 0;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: IBM.gray10 }}>
      <div className="p-5 space-y-5 max-w-screen-2xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: IBM.gray100 }}>Draft Application Analysis</h1>
            <p className="text-sm mt-0.5" style={{ color: IBM.gray60 }}>
              Data completeness and missing field breakdown across{' '}
              {loading ? '…' : total?.toLocaleString('en-IN')} draft applications
            </p>
          </div>
          {!loading && avgCompleteness !== undefined && (
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: IBM.gray60 }}>Avg Completeness</p>
              <p className="text-4xl font-bold"
                style={{ color: avgCompleteness >= 70 ? IBM.green50 : avgCompleteness >= 40 ? IBM.orange40 : IBM.red50 }}>
                {avgCompleteness}%
              </p>
            </div>
          )}
        </div>

        {/* ── KPI strip ── */}
        {loading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_,i) => <Skel key={i} h="h-24" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatChip
              label="Total Drafts"
              value={total?.toLocaleString('en-IN')}
              color={IBM.blue60}
            />
            <StatChip
              label="Avg Completeness"
              value={`${avgCompleteness ?? 0}%`}
              sub="Across 21 key parameters"
              color={IBM.teal50}
            />
            <StatChip
              label="Critical Fields Tracked"
              value={criticalCount}
              sub="Highest-priority parameters"
              color={IBM.red50}
            />
            <StatChip
              label="Fully Filled Fields"
              value={fullyFilled}
              sub="Zero missing values"
              color={IBM.green50}
            />
          </div>
        )}

        {/* ── Group fill rate ── */}
        <div className="bg-white p-5" style={{ border: `1px solid ${IBM.gray20}` }}>
          <div className="mb-4">
            <p className="text-sm font-bold" style={{ color: IBM.gray100 }}>Fill Rate by Category</p>
            <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>Average data completeness across parameter groups</p>
          </div>
          {loading ? <Skel /> : <GroupCards groups={groups} total={total} />}
        </div>

        {/* ── Two-column row ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          <div className="bg-white p-5" style={{ border: `1px solid ${IBM.gray20}` }}>
            <div className="mb-4">
              <p className="text-sm font-bold" style={{ color: IBM.gray100 }}>Critical Missing Fields</p>
              <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>
                Priority 1 parameters with missing data — sorted by volume
              </p>
            </div>
            {loading ? <Skel /> : <CriticalMissing fields={fields} total={total} />}
          </div>

          <div className="bg-white p-5" style={{ border: `1px solid ${IBM.gray20}` }}>
            <div className="mb-4">
              <p className="text-sm font-bold" style={{ color: IBM.gray100 }}>Completeness Distribution</p>
              <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>
                How complete are draft applications across all 21 parameters?
              </p>
            </div>
            {loading ? <Skel /> : <CompletenessChart dist={dist} />}
          </div>

        </div>

        {/* ── Full field breakdown ── */}
        <div className="bg-white p-5" style={{ border: `1px solid ${IBM.gray20}` }}>
          <div className="mb-4">
            <p className="text-sm font-bold" style={{ color: IBM.gray100 }}>All Parameters — Detail View</p>
            <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>
              Filter by group or sort to explore data quality across every tracked field
            </p>
          </div>
          {loading ? <Skel h="h-64" /> : <FieldTable fields={fields} total={total} />}
        </div>

      </div>
    </div>
  );
}
