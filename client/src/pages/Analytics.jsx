import { useState, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import api from '../utils/api';

const RADIAN = Math.PI / 180;

function PieSliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      fontSize={12} fontWeight={700} fontFamily="'IBM Plex Sans', sans-serif">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

function DescriptivePie({ data, colors, title, totalLabel = 'Grand Total', height = 240 }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const pieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
    return (
      <div className="px-3 py-2 text-xs" style={{
        background: '#262626', border: '1px solid #393939', color: '#fff',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 flex-shrink-0" style={{ background: d.payload.fill }} />
          <span className="font-semibold">{d.name}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: '#C6C6C6' }}>Count:</span>
          <span className="font-bold">{Number(d.value).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: '#C6C6C6' }}>Share:</span>
          <span className="font-bold">{pct}%</span>
        </div>
      </div>
    );
  };
  return (
    <div>
      {title && (
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#525252' }}>{title}</p>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data} dataKey="value" nameKey="name"
            cx="50%" cy="50%" outerRadius={height / 2 - 20}
            strokeWidth={2} stroke="#fff"
            labelLine={false} label={PieSliceLabel}
          >
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip content={pieTooltip} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 space-y-2.5">
        {data.map((d, i) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
          return (
            <div key={d.name} className="flex items-center gap-3">
              <div className="w-3 h-3 flex-shrink-0" style={{ background: colors[i % colors.length] }} />
              <span className="text-xs font-medium flex-1 min-w-0 truncate" style={{ color: '#161616' }}>{d.name}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: '#161616' }}>{Number(d.value).toLocaleString('en-IN')}</span>
              <span className="text-xs tabular-nums w-11 text-right" style={{ color: '#6F6F6F' }}>{pct}%</span>
              <div className="w-20 h-1.5 flex-shrink-0" style={{ background: '#E0E0E0' }}>
                <div className="h-1.5 transition-all duration-700" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between pt-2.5" style={{ borderTop: '1px solid #E0E0E0' }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#525252' }}>{totalLabel}</span>
          <span className="text-sm font-bold" style={{ color: '#161616' }}>{total.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}

const IBM = {
  blue60: '#0F62FE', blue50: '#4589FF', blue40: '#78A9FF',
  green50: '#198038', green40: '#24A148', teal50: '#007D79',
  purple50: '#8A3FFC', red50: '#DA1E28', orange40: '#FF832B',
  gray100: '#161616', gray90: '#262626', gray80: '#393939',
  gray70: '#525252', gray60: '#6F6F6F', gray50: '#8D8D8D',
  gray30: '#C6C6C6', gray20: '#E0E0E0', gray10: '#F4F4F4',
};

const DRAFT_C    = IBM.blue60;
const COMPLETE_C = IBM.green50;
const REGION_COLORS = [IBM.blue60, IBM.teal50, IBM.purple50, IBM.green50, IBM.orange40, IBM.red50, IBM.gray60];
const INCOME_COLORS = [IBM.blue60, IBM.teal50, IBM.green50, IBM.purple50, IBM.orange40];

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

const Skel = ({ h = 'h-48' }) => (
  <div className={`${h} animate-pulse`} style={{ background: IBM.gray10 }} />
);

function IBMTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs" style={{
      background: IBM.gray90, border: `1px solid ${IBM.gray80}`, color: '#fff',
    }}>
      <p className="font-semibold mb-1.5" style={{ color: IBM.gray30 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2" style={{ background: p.color }} />
          <span style={{ color: IBM.gray30 }}>{p.name}:</span>
          <span className="font-semibold text-white">{Number(p.value).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
}

function CrossTable({ data, labelKey = 'label' }) {
  if (!data?.length) return <p className="text-xs py-6 text-center" style={{ color: IBM.gray60 }}>No data</p>;
  const totDraft    = data.reduce((s, r) => s + (r.Draft || 0), 0);
  const totComplete = data.reduce((s, r) => s + (r.Complete || 0), 0);
  const totTotal    = data.reduce((s, r) => s + (r.Total || 0), 0);
  return (
    <div className="overflow-x-auto">
      <table className="ibm-table">
        <thead>
          <tr>
            {['Category','Draft','Complete','Grand Total','Share'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: IBM.gray60, background: IBM.gray20 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const pct = totTotal > 0 ? ((row.Total / totTotal) * 100).toFixed(1) : 0;
            return (
              <tr key={i} style={{ borderBottom: `1px solid ${IBM.gray20}`, background: i % 2 === 0 ? '#fff' : IBM.gray10 }}>
                <td className="px-4 py-2.5 text-sm font-medium" style={{ color: IBM.gray100 }}>{row[labelKey]}</td>
                <td className="px-4 py-2.5 text-sm text-right font-medium" style={{ color: DRAFT_C }}>{(row.Draft || 0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-sm text-right font-medium" style={{ color: COMPLETE_C }}>{(row.Complete || 0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-sm text-right font-bold" style={{ color: IBM.gray100 }}>{(row.Total || 0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5" style={{ background: IBM.gray20 }}>
                      <div className="h-1.5" style={{ width: `${pct}%`, background: IBM.blue60 }} />
                    </div>
                    <span className="text-xs" style={{ color: IBM.gray60 }}>{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: `2px solid ${IBM.gray30}`, background: IBM.gray10 }}>
            <td className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: IBM.gray70 }}>Grand Total</td>
            <td className="px-4 py-2.5 text-sm text-right font-bold" style={{ color: DRAFT_C }}>{totDraft.toLocaleString('en-IN')}</td>
            <td className="px-4 py-2.5 text-sm text-right font-bold" style={{ color: COMPLETE_C }}>{totComplete.toLocaleString('en-IN')}</td>
            <td className="px-4 py-2.5 text-sm text-right font-bold" style={{ color: IBM.gray100 }}>{totTotal.toLocaleString('en-IN')}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── 1. Date-wise ─────────────────────────────────────────────────────────────
function DateWise() {
  const { data, loading } = useData('/data/date-wise');
  const [view, setView] = useState('bar');
  if (loading) return <Skel h="h-72" />;
  const formatted = (data || []).map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {['bar', 'area'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-all"
            style={{ background: view === v ? IBM.blue60 : IBM.gray10, color: view === v ? '#fff' : IBM.gray70, border: `1px solid ${view === v ? IBM.blue60 : IBM.gray30}` }}>
            {v} chart
          </button>
        ))}
        <div className="flex items-center gap-4 ml-auto text-xs" style={{ color: IBM.gray60 }}>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 inline-block" style={{ background: DRAFT_C }} />Draft</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 inline-block" style={{ background: COMPLETE_C }} />Complete</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        {view === 'bar'
          ? <BarChart data={formatted} barSize={9} barGap={1}>
              <CartesianGrid strokeDasharray="3 0" stroke={IBM.gray20} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: IBM.gray60 }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: IBM.gray60 }} tickLine={false} axisLine={false} />
              <Tooltip content={<IBMTooltip />} />
              <Bar dataKey="draft"    name="Draft"    fill={DRAFT_C}    radius={0} />
              <Bar dataKey="complete" name="Complete" fill={COMPLETE_C} radius={0} />
            </BarChart>
          : <AreaChart data={formatted}>
              <defs>
                <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={DRAFT_C} stopOpacity={0.2}/><stop offset="95%" stopColor={DRAFT_C} stopOpacity={0}/></linearGradient>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COMPLETE_C} stopOpacity={0.2}/><stop offset="95%" stopColor={COMPLETE_C} stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 0" stroke={IBM.gray20} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: IBM.gray60 }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: IBM.gray60 }} tickLine={false} axisLine={false} />
              <Tooltip content={<IBMTooltip />} />
              <Area type="monotone" dataKey="draft"    name="Draft"    stroke={DRAFT_C}    strokeWidth={2} fill="url(#dg)" />
              <Area type="monotone" dataKey="complete" name="Complete" stroke={COMPLETE_C} strokeWidth={2} fill="url(#cg)" />
            </AreaChart>
        }
      </ResponsiveContainer>
    </div>
  );
}

// ─── 2. Region-wise ───────────────────────────────────────────────────────────
function RegionWise() {
  const { data, loading } = useData('/data/region-wise');
  if (loading) return <Skel />;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="overflow-x-auto">
        <table className="ibm-table">
          <thead>
            <tr>
              {['Region','Draft','Complete','Grand Total'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: IBM.gray60, background: IBM.gray20, borderBottom: `1px solid ${IBM.gray30}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data || []).map((r, i) => (
              <tr key={r.region} style={{ borderBottom: `1px solid ${IBM.gray20}`, background: i%2===0?'#fff':IBM.gray10 }}>
                <td className="px-3 py-2.5 text-sm font-medium" style={{ color: IBM.gray100 }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 flex-shrink-0" style={{ background: REGION_COLORS[i % REGION_COLORS.length] }} />
                    {r.region}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-sm text-right font-medium" style={{ color: DRAFT_C }}>{r.draft.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2.5 text-sm text-right font-medium" style={{ color: COMPLETE_C }}>{r.complete.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2.5 text-sm text-right font-bold" style={{ color: IBM.gray100 }}>{r.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${IBM.gray30}`, background: IBM.gray10 }}>
              <td className="px-3 py-2.5 text-xs font-bold uppercase" style={{ color: IBM.gray70 }}>Grand Total</td>
              {['draft','complete','total'].map(k => (
                <td key={k} className="px-3 py-2.5 text-sm text-right font-bold"
                  style={{ color: k === 'total' ? IBM.gray100 : k === 'draft' ? DRAFT_C : COMPLETE_C }}>
                  {(data||[]).reduce((s,r)=>s+r[k],0).toLocaleString('en-IN')}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <DescriptivePie
        data={(data||[]).map(r => ({ name: r.region, value: r.total }))}
        colors={REGION_COLORS}
        title="Region-wise Share — All Applications"
        height={260}
      />
    </div>
  );
}

// ─── 3. State-wise ────────────────────────────────────────────────────────────
function StateWise() {
  const { data, loading } = useData('/data/state-breakdown');
  if (loading) return <Skel h="h-96" />;
  const top15 = (data || []).slice(0, 15);
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="overflow-x-auto">
        <table className="ibm-table">
          <thead>
            <tr>
              {['#','State','Draft','Complete','Grand Total'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: IBM.gray60, background: IBM.gray20, borderBottom: `1px solid ${IBM.gray30}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top15.map((row, i) => (
              <tr key={row.state} style={{ borderBottom: `1px solid ${IBM.gray20}`, background: i%2===0?'#fff':IBM.gray10 }}>
                <td className="px-3 py-2.5 text-xs" style={{ color: IBM.gray50 }}>{i+1}</td>
                <td className="px-3 py-2.5 text-sm font-medium" style={{ color: IBM.gray100 }}>{row.state}</td>
                <td className="px-3 py-2.5 text-sm text-right font-medium" style={{ color: DRAFT_C }}>{row.draft.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2.5 text-sm text-right font-medium" style={{ color: COMPLETE_C }}>{row.complete.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2.5 text-sm text-right font-bold" style={{ color: IBM.gray100 }}>{row.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={top15} layout="vertical" barSize={10} barGap={1} margin={{ left: 8, right: 20 }}>
          <CartesianGrid strokeDasharray="3 0" stroke={IBM.gray20} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: IBM.gray60 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="state" tick={{ fontSize: 9, fill: IBM.gray70 }} width={120} tickLine={false} axisLine={false} />
          <Tooltip content={<IBMTooltip />} />
          <Bar dataKey="draft"    name="Draft"    fill={DRAFT_C}    stackId="a" radius={0} />
          <Bar dataKey="complete" name="Complete" fill={COMPLETE_C} stackId="a" radius={0} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 4. District-wise ─────────────────────────────────────────────────────────
function DistrictWise() {
  const { data: stateData } = useData('/data/state-breakdown');
  const [sel, setSel] = useState('');
  const { data, loading } = useData(sel ? `/data/district-wise?state=${encodeURIComponent(sel)}` : '/data/district-wise');
  const states = (stateData || []).slice(0,20).map(s => s.state);
  const grandTotal = (data || []).reduce((s,d)=>s+d.total,0);
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs font-semibold" style={{ color: IBM.gray70 }}>Filter by State:</label>
        <select value={sel} onChange={e => setSel(e.target.value)}
          className="text-sm px-3 py-1.5"
          style={{ border: `1px solid ${IBM.gray30}`, color: IBM.gray100, background:'#fff', borderRadius:0 }}>
          <option value="">All States — Top 30 Districts</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <Skel h="h-64" /> : (
        <div className="overflow-x-auto">
          <table className="ibm-table">
            <thead>
              <tr>
                {['#','State','District','Draft','Complete','Grand Total','Share'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: IBM.gray60, background: IBM.gray20, borderBottom:`1px solid ${IBM.gray30}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data||[]).map((d,i)=>{
                const pct = grandTotal>0?((d.total/grandTotal)*100).toFixed(1):0;
                return (
                  <tr key={`${d.state}${d.district}`} style={{ borderBottom:`1px solid ${IBM.gray20}`, background:i%2===0?'#fff':IBM.gray10 }}>
                    <td className="px-3 py-2.5 text-xs" style={{color:IBM.gray50}}>{i+1}</td>
                    <td className="px-3 py-2.5 text-xs" style={{color:IBM.gray60}}>{d.state}</td>
                    <td className="px-3 py-2.5 text-sm font-medium" style={{color:IBM.gray100}}>{d.district}</td>
                    <td className="px-3 py-2.5 text-sm text-right font-medium" style={{color:DRAFT_C}}>{d.draft}</td>
                    <td className="px-3 py-2.5 text-sm text-right font-medium" style={{color:COMPLETE_C}}>{d.complete}</td>
                    <td className="px-3 py-2.5 text-sm text-right font-bold" style={{color:IBM.gray100}}>{d.total}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5" style={{background:IBM.gray20}}>
                          <div className="h-1.5" style={{width:`${pct}%`,background:IBM.blue60}}/>
                        </div>
                        <span className="text-xs" style={{color:IBM.gray60}}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{borderTop:`2px solid ${IBM.gray30}`,background:IBM.gray10}}>
                <td colSpan={3} className="px-3 py-2.5 text-xs font-bold uppercase" style={{color:IBM.gray70}}>Grand Total</td>
                <td className="px-3 py-2.5 text-sm text-right font-bold" style={{color:DRAFT_C}}>{(data||[]).reduce((s,d)=>s+d.draft,0)}</td>
                <td className="px-3 py-2.5 text-sm text-right font-bold" style={{color:COMPLETE_C}}>{(data||[]).reduce((s,d)=>s+d.complete,0)}</td>
                <td className="px-3 py-2.5 text-sm text-right font-bold" style={{color:IBM.gray100}}>{grandTotal}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── 5. DGCA Medical ─────────────────────────────────────────────────────────
function DGCAMedical() {
  const { data, loading } = useData('/data/dgca-medical');
  if (loading) return <Skel />;
  const total = data?.totalComplete || 0;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <DescriptivePie
        data={(data?.status||[]).map(s => ({ name: s.label, value: s.count }))}
        colors={[IBM.green50, IBM.red50, IBM.gray50]}
        title={`DGCA Medical Class 2 Status — Complete Submissions (${total.toLocaleString('en-IN')} total)`}
        height={260}
      />
      <DescriptivePie
        data={(data?.income||[]).map(inc => ({ name: inc.label, value: inc.count }))}
        colors={INCOME_COLORS}
        title="Family Annual Income Bracket — Complete Submissions"
        height={260}
      />
    </div>
  );
}

// ─── 6. DGCA Computer ────────────────────────────────────────────────────────
function DGCAComputer() {
  const { data, loading } = useData('/data/dgca-computer');
  if (loading) return <Skel h="h-40" />;
  const { summary } = data || {};
  const pieData = ['Yes', 'No', 'No Data'].map(k => ({ name: k, value: summary?.[k] || 0 }));
  return (
    <div className="max-w-lg mx-auto">
      <DescriptivePie
        data={pieData}
        colors={[IBM.green50, IBM.red50, IBM.gray50]}
        title="DGCA Computer Number — Complete Submissions"
        totalLabel="Total Complete Submissions"
        height={280}
      />
    </div>
  );
}

// ─── 7. Employment ───────────────────────────────────────────────────────────
const EMP_COLORS = [IBM.blue60, IBM.orange40, IBM.teal50, IBM.purple50, IBM.gray50];

function EmploymentStatus() {
  const { data, loading } = useData('/data/employment-status');
  if (loading) return <Skel h="h-60" />;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <DescriptivePie
        data={(data || []).map(d => ({ name: d.label, value: d.Total }))}
        colors={EMP_COLORS}
        title="Employment Status — All Applicants (Grand Total)"
        height={280}
      />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: IBM.gray70 }}>
          Draft vs Complete Breakdown
        </p>
        <CrossTable data={data} labelKey="label" />
      </div>
    </div>
  );
}

// ─── 8. Education ────────────────────────────────────────────────────────────
const EDU_COLORS = [IBM.green50, IBM.blue60, IBM.purple50, IBM.orange40];

function EducationStatus() {
  const { data, loading } = useData('/data/education-status');
  if (loading) return <Skel h="h-60" />;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <DescriptivePie
        data={(data || []).map(d => ({ name: d.label, value: d.Total }))}
        colors={EDU_COLORS}
        title="Education Qualification Status — Complete Submissions"
        totalLabel="Total Complete Submissions"
        height={280}
      />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: IBM.gray70 }}>
          Draft vs Complete Breakdown
        </p>
        <CrossTable data={data} labelKey="label" />
      </div>
    </div>
  );
}

// ─── 9. Issue Resolution ─────────────────────────────────────────────────────
function IssueResolution() {
  const { data, loading } = useData('/data/issue-resolution');
  if (loading) return <Skel />;
  const { overall, byCategory } = data || {};
  const overallPie = [
    { name: 'Resolved',    value: overall?.Resolved   || 0 },
    { name: 'Pending',     value: overall?.Pending    || 0 },
    { name: 'Not Tracked', value: overall?.NotTracked || 0 },
  ];
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <DescriptivePie
        data={overallPie}
        colors={[IBM.green50, IBM.orange40, IBM.gray50]}
        title="Overall Issue Resolution Status — Calling Tracker"
        totalLabel="Total Tracked Applicants"
        height={280}
      />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: IBM.gray70 }}>
          Resolution by Issue Category
        </p>
        <table className="ibm-table">
          <thead>
            <tr>
              {['Category', 'Resolved', 'Pending', 'Total'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: IBM.gray60, background: IBM.gray20, borderBottom: `1px solid ${IBM.gray30}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(byCategory || []).map((row, i) => (
              <tr key={row.category} style={{ borderBottom: `1px solid ${IBM.gray20}`, background: i%2===0?'#fff':IBM.gray10 }}>
                <td className="px-3 py-2 text-sm font-medium" style={{ color: IBM.gray100 }}>{row.category}</td>
                <td className="px-3 py-2 text-sm text-right font-medium" style={{ color: IBM.green50 }}>{row.Resolved}</td>
                <td className="px-3 py-2 text-sm text-right font-medium" style={{ color: IBM.orange40 }}>{row.Pending}</td>
                <td className="px-3 py-2 text-sm text-right font-bold" style={{ color: IBM.gray100 }}>{row.Total}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${IBM.gray30}`, background: IBM.gray10 }}>
              <td className="px-3 py-2 text-xs font-bold uppercase" style={{ color: IBM.gray70 }}>Total</td>
              <td className="px-3 py-2 text-sm text-right font-bold" style={{ color: IBM.green50 }}>{overall?.Resolved || 0}</td>
              <td className="px-3 py-2 text-sm text-right font-bold" style={{ color: IBM.orange40 }}>{overall?.Pending || 0}</td>
              <td className="px-3 py-2 text-sm text-right font-bold" style={{ color: IBM.gray100 }}>{(overall?.Resolved||0) + (overall?.Pending||0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'date',       label: 'Date-wise' },
  { id: 'region',     label: 'Region-wise' },
  { id: 'state',      label: 'State-wise' },
  { id: 'district',   label: 'District-wise' },
  { id: 'dgca-med',   label: 'DGCA Medical' },
  { id: 'dgca-comp',  label: 'DGCA Computer No.' },
  { id: 'employment', label: 'Employment' },
  { id: 'education',  label: 'Education' },
  { id: 'issues',     label: 'Issue Resolution' },
];

export default function Analytics() {
  const [active, setActive] = useState('date');

  const content = {
    date:        { title: 'Date-wise Application Volume',     subtitle: 'Daily Draft vs Complete submissions over time' },
    region:      { title: 'Region-wise Applications',         subtitle: 'Draft + Complete by region' },
    state:       { title: 'State-wise Applications',          subtitle: 'Top 25 states by total application count' },
    district:    { title: 'District-wise Applications',       subtitle: 'Top 30 districts — filter by state' },
    'dgca-med':  { title: 'DGCA Medical Class 2',             subtitle: 'Class 2 medical assessment status — Complete Submissions' },
    'dgca-comp': { title: 'DGCA Computer Number',             subtitle: 'Computer number availability — Complete Submissions' },
    employment:  { title: 'Employment Status',                subtitle: 'Student / Employed / Unemployed split by application type' },
    education:   { title: 'Education Qualification Status',   subtitle: 'Completed vs Pursuing — Complete Submissions' },
    issues:      { title: 'Issue Resolution Status',          subtitle: 'Calling tracker — resolution by issue category' },
  };

  const components = {
    date:        <DateWise />,
    region:      <RegionWise />,
    state:       <StateWise />,
    district:    <DistrictWise />,
    'dgca-med':  <DGCAMedical />,
    'dgca-comp': <DGCAComputer />,
    employment:  <EmploymentStatus />,
    education:   <EducationStatus />,
    issues:      <IssueResolution />,
  };

  const cur = content[active];

  return (
    <div className="flex-1 flex min-h-0" style={{ background: IBM.gray10 }}>

      {/* ── Left section nav ── */}
      <div className="flex-shrink-0 w-44" style={{ background: '#fff', borderRight: `1px solid ${IBM.gray20}` }}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${IBM.gray20}`, background: IBM.gray10 }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: IBM.gray70 }}>Sections</p>
        </div>
        <nav className="py-1">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className="w-full text-left px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-2"
              style={{
                background: active === s.id ? IBM.blue60 : 'transparent',
                color: active === s.id ? '#fff' : IBM.gray70,
                borderLeft: active === s.id ? '3px solid #78A9FF' : '3px solid transparent',
              }}>
              <span className="w-1.5 h-1.5 flex-shrink-0"
                style={{ background: active === s.id ? '#fff' : IBM.gray30 }} />
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center px-5 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${IBM.gray20}`, background: '#fff' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: IBM.gray100 }}>{cur.title}</h2>
            <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>{cur.subtitle}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-white" style={{ border: `1px solid ${IBM.gray20}` }}>
            <div className="p-5">{components[active]}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
