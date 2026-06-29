import { useState, useCallback, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import api from '../utils/api';

// ── Design tokens ─────────────────────────────────────────────────────────────
const IBM = {
  blue60:'#0F62FE', blue50:'#4589FF', blue40:'#78A9FF',
  green50:'#198038', green40:'#24A148', teal50:'#007D79',
  purple50:'#8A3FFC', red50:'#DA1E28', orange40:'#FF832B',
  gray100:'#161616', gray90:'#262626', gray80:'#393939',
  gray70:'#525252', gray60:'#6F6F6F', gray50:'#8D8D8D',
  gray30:'#C6C6C6', gray20:'#E0E0E0', gray10:'#F4F4F4',
};
const DRAFT_C    = IBM.blue60;
const COMPLETE_C = IBM.green50;
const REGION_COLORS = [IBM.blue60, IBM.teal50, IBM.purple50, IBM.green50, IBM.orange40, IBM.red50, IBM.gray60];

// ── Shared hooks ──────────────────────────────────────────────────────────────
function useData(url) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const urlRef = useRef(url);
  urlRef.current = url;

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try { const { data: d } = await api.get(urlRef.current); setData(d); }
    catch { setData(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_, url]);
  return { data, loading, refresh: fetch_ };
}

const Skel = ({ h = 'h-48' }) => <div className={`${h} animate-pulse`} style={{ background: IBM.gray10 }} />;

// ── View toggle ───────────────────────────────────────────────────────────────
const MODES = [
  { id: 'all',     label: 'All',     color: IBM.gray70  },
  { id: 'draft',   label: 'Draft',   color: DRAFT_C     },
  { id: 'applied', label: 'Applied', color: COMPLETE_C  },
];

function ViewToggle({ mode, onChange }) {
  return (
    <div className="flex items-center gap-1 p-0.5 flex-shrink-0"
      style={{ background: IBM.gray10, border: `1px solid ${IBM.gray20}` }}>
      {MODES.map(m => (
        <button key={m.id} onClick={() => onChange(m.id)}
          className="px-3 py-1 text-xs font-semibold transition-all"
          style={{
            background: mode === m.id ? m.color : 'transparent',
            color:      mode === m.id ? '#fff'  : IBM.gray60,
          }}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ── Pie chart ─────────────────────────────────────────────────────────────────
const RADIAN = Math.PI / 180;
function PieSliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return (
    <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)}
      fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

function DescriptivePie({ data, colors, title, height = 240, mode }) {
  const modeLabel = mode === 'draft' ? 'Draft' : mode === 'applied' ? 'Applied' : 'Draft + Applied';
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const pieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
    return (
      <div className="px-3 py-2 text-xs" style={{ background:'#262626', border:`1px solid ${IBM.gray80}`, color:'#fff' }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5" style={{ background: d.payload.fill }} />
          <span className="font-semibold">{d.name}</span>
        </div>
        <div className="flex justify-between gap-4"><span style={{color:IBM.gray30}}>Count:</span><span className="font-bold">{Number(d.value).toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between gap-4"><span style={{color:IBM.gray30}}>Share:</span><span className="font-bold">{pct}%</span></div>
      </div>
    );
  };
  return (
    <div>
      {title && <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: IBM.gray70 }}>{title}</p>}
      <p className="text-xs mb-3" style={{ color: IBM.gray50 }}>Showing: <b style={{ color: mode === 'draft' ? DRAFT_C : mode === 'applied' ? COMPLETE_C : IBM.gray70 }}>{modeLabel}</b> applicants</p>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
            outerRadius={height / 2 - 20} strokeWidth={2} stroke="#fff"
            labelLine={false} label={PieSliceLabel}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip content={pieTooltip} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-2">
        {data.map((d, i) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
          return (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 flex-shrink-0" style={{ background: colors[i % colors.length] }} />
              <span className="text-xs flex-1 min-w-0 truncate" style={{ color: IBM.gray100 }}>{d.name}</span>
              <span className="text-xs font-bold tabular-nums">{Number(d.value).toLocaleString('en-IN')}</span>
              <span className="text-xs tabular-nums w-10 text-right" style={{ color: IBM.gray60 }}>{pct}%</span>
              <div className="w-16 h-1" style={{ background: IBM.gray20 }}>
                <div className="h-1" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
              </div>
            </div>
          );
        })}
        <div className="flex justify-between pt-2" style={{ borderTop: `1px solid ${IBM.gray20}` }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: IBM.gray60 }}>Total</span>
          <span className="text-sm font-bold">{total.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function IBMTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs" style={{ background: IBM.gray90, border: `1px solid ${IBM.gray80}`, color:'#fff' }}>
      <p className="font-semibold mb-1" style={{ color: IBM.gray30 }}>{label}</p>
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

// ── Cross table (Draft | Applied | All) ───────────────────────────────────────
function CrossTable({ data, labelKey = 'label', mode = 'all' }) {
  if (!data?.length) return <p className="text-xs py-6 text-center" style={{ color: IBM.gray60 }}>No data</p>;
  const showDraft   = mode === 'all' || mode === 'draft';
  const showApplied = mode === 'all' || mode === 'applied';

  return (
    <div className="overflow-x-auto">
      <table className="ibm-table w-full">
        <thead>
          <tr style={{ background: IBM.gray20 }}>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: IBM.gray60 }}>Category</th>
            {showDraft   && <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: DRAFT_C }}>Draft</th>}
            {showApplied && <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: COMPLETE_C }}>Applied</th>}
            <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: IBM.gray60 }}>Total Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${IBM.gray20}`, background: i%2===0?'#fff':IBM.gray10 }}>
              <td className="px-4 py-2.5 text-sm font-medium" style={{ color: IBM.gray100 }}>{row[labelKey]}</td>
              {showDraft   && <td className="px-4 py-2.5 text-sm text-right font-medium" style={{ color: DRAFT_C }}>{(row.Draft||0).toLocaleString('en-IN')}</td>}
              {showApplied && <td className="px-4 py-2.5 text-sm text-right font-medium" style={{ color: COMPLETE_C }}>{(row.Complete||0).toLocaleString('en-IN')}</td>}
              <td className="px-4 py-2.5 text-sm text-right font-bold" style={{ color: IBM.gray100 }}>{(row.Total||0).toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: `2px solid ${IBM.gray30}`, background: IBM.gray10 }}>
            <td className="px-4 py-2.5 text-xs font-bold uppercase" style={{ color: IBM.gray70 }}>Total Count</td>
            {showDraft   && <td className="px-4 py-2.5 text-sm text-right font-bold" style={{ color: DRAFT_C }}>{data.reduce((s,r)=>s+(r.Draft||0),0).toLocaleString('en-IN')}</td>}
            {showApplied && <td className="px-4 py-2.5 text-sm text-right font-bold" style={{ color: COMPLETE_C }}>{data.reduce((s,r)=>s+(r.Complete||0),0).toLocaleString('en-IN')}</td>}
            <td className="px-4 py-2.5 text-sm text-right font-bold" style={{ color: IBM.gray100 }}>{data.reduce((s,r)=>s+(r.Total||0),0).toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>
      {/* Math check: always show Draft + Applied = Total Count */}
      {showDraft && showApplied && (
        <div className="mt-2 px-3 py-1.5 flex items-center gap-2 text-xs flex-wrap"
          style={{ background: '#DEFBE6', border: `1px solid ${IBM.green50}30` }}>
          <svg className="w-3 h-3 flex-shrink-0" style={{color:IBM.green50}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
          <span style={{color:IBM.green50}} className="font-semibold">
            Draft {data.reduce((s,r)=>s+(r.Draft||0),0).toLocaleString('en-IN')}
            &nbsp;+&nbsp;
            Applied {data.reduce((s,r)=>s+(r.Complete||0),0).toLocaleString('en-IN')}
            &nbsp;=&nbsp;
            Total Count {data.reduce((s,r)=>s+(r.Total||0),0).toLocaleString('en-IN')}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Grouped bar chart: Draft vs Applied side-by-side ─────────────────────────
function BifurcationChart({ data, labelKey = 'label', height = 260 }) {
  const formatted = (data || []).map(d => ({
    name: d[labelKey],
    Draft:   d.Draft   || 0,
    Applied: d.Complete|| 0,
    Total:   d.Total   || 0,
  }));
  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: IBM.gray60 }}>
        <span className="flex items-center gap-1.5 font-semibold"><span className="w-3 h-3 inline-block" style={{background:DRAFT_C}}/> Draft</span>
        <span className="flex items-center gap-1.5 font-semibold"><span className="w-3 h-3 inline-block" style={{background:COMPLETE_C}}/> Applied</span>
        <span className="ml-auto text-xs" style={{color:IBM.gray50}}>Grouped by category</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={formatted} barSize={14} barGap={3} margin={{left:0,right:8,top:4}}>
          <CartesianGrid strokeDasharray="3 0" stroke={IBM.gray20} vertical={false}/>
          <XAxis dataKey="name" tick={{fontSize:10,fill:IBM.gray60}} tickLine={false} axisLine={false}/>
          <YAxis tick={{fontSize:10,fill:IBM.gray60}} tickLine={false} axisLine={false}/>
          <Tooltip content={<IBMTooltip/>}/>
          <Bar dataKey="Draft"   name="Draft"   fill={DRAFT_C}    radius={0}/>
          <Bar dataKey="Applied" name="Applied" fill={COMPLETE_C} radius={0}/>
        </BarChart>
      </ResponsiveContainer>
      {/* Math verification strip */}
      <div className="mt-3 flex items-center gap-3 px-3 py-2 text-xs flex-wrap"
        style={{ background: IBM.gray10, border: `1px solid ${IBM.gray20}` }}>
        <span style={{color:IBM.gray60}}>Section totals:</span>
        <span className="font-bold" style={{color:DRAFT_C}}>
          Draft: {formatted.reduce((s,r)=>s+r.Draft,0).toLocaleString('en-IN')}
        </span>
        <span style={{color:IBM.gray50}}>+</span>
        <span className="font-bold" style={{color:COMPLETE_C}}>
          Applied: {formatted.reduce((s,r)=>s+r.Applied,0).toLocaleString('en-IN')}
        </span>
        <span style={{color:IBM.gray50}}>=</span>
        <span className="font-bold" style={{color:IBM.gray100}}>
          Total Count: {formatted.reduce((s,r)=>s+r.Total,0).toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
}

// helper: pick the right value from a { Draft, Complete, Total } row
function pickVal(row, mode, keys = { draft:'Draft', applied:'Complete', all:'Total' }) {
  return row[keys[mode]] || 0;
}

// ─── 1. Date-wise ─────────────────────────────────────────────────────────────
function DateWise({ mode }) {
  const { data, loading } = useData('/data/date-wise');
  const [view, setView] = useState('bar');
  if (loading) return <Skel h="h-72" />;
  const formatted = (data || []).map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' }),
  }));
  const showDraft   = mode === 'all' || mode === 'draft';
  const showApplied = mode === 'all' || mode === 'applied';
  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {['bar','area'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-all"
            style={{ background: view===v?IBM.blue60:IBM.gray10, color:view===v?'#fff':IBM.gray70, border:`1px solid ${view===v?IBM.blue60:IBM.gray30}` }}>
            {v} chart
          </button>
        ))}
        <div className="flex items-center gap-4 ml-auto text-xs" style={{ color: IBM.gray60 }}>
          {showDraft   && <span className="flex items-center gap-1"><span className="w-3 h-2 inline-block" style={{background:DRAFT_C}}/>Draft</span>}
          {showApplied && <span className="flex items-center gap-1"><span className="w-3 h-2 inline-block" style={{background:COMPLETE_C}}/>Applied</span>}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        {view === 'bar'
          ? <BarChart data={formatted} barSize={9} barGap={1}>
              <CartesianGrid strokeDasharray="3 0" stroke={IBM.gray20} vertical={false}/>
              <XAxis dataKey="label" tick={{fontSize:10,fill:IBM.gray60}} tickLine={false} axisLine={false} interval={2}/>
              <YAxis tick={{fontSize:10,fill:IBM.gray60}} tickLine={false} axisLine={false}/>
              <Tooltip content={<IBMTooltip/>}/>
              {showDraft   && <Bar dataKey="draft"    name="Draft"   fill={DRAFT_C}    radius={0}/>}
              {showApplied && <Bar dataKey="complete" name="Applied" fill={COMPLETE_C} radius={0}/>}
            </BarChart>
          : <AreaChart data={formatted}>
              <defs>
                <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={DRAFT_C} stopOpacity={0.2}/><stop offset="95%" stopColor={DRAFT_C} stopOpacity={0}/></linearGradient>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COMPLETE_C} stopOpacity={0.2}/><stop offset="95%" stopColor={COMPLETE_C} stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 0" stroke={IBM.gray20} vertical={false}/>
              <XAxis dataKey="label" tick={{fontSize:10,fill:IBM.gray60}} tickLine={false} axisLine={false} interval={2}/>
              <YAxis tick={{fontSize:10,fill:IBM.gray60}} tickLine={false} axisLine={false}/>
              <Tooltip content={<IBMTooltip/>}/>
              {showDraft   && <Area type="monotone" dataKey="draft"    name="Draft"   stroke={DRAFT_C}    strokeWidth={2} fill="url(#dg)"/>}
              {showApplied && <Area type="monotone" dataKey="complete" name="Applied" stroke={COMPLETE_C} strokeWidth={2} fill="url(#cg)"/>}
            </AreaChart>
        }
      </ResponsiveContainer>
    </div>
  );
}

// ─── 2. Region-wise ───────────────────────────────────────────────────────────
function RegionWise({ mode }) {
  const { data, loading } = useData('/data/region-wise');
  if (loading) return <Skel h="h-72" />;

  const showDraft   = mode === 'all' || mode === 'draft';
  const showApplied = mode === 'all' || mode === 'applied';
  const rows        = data || [];
  const maxTotal    = Math.max(...rows.map(r => r.total), 1);
  const grandDraft  = rows.reduce((s,r) => s + r.draft, 0);
  const grandApplied = rows.reduce((s,r) => s + r.complete, 0);
  const grandTotal  = rows.reduce((s,r) => s + r.total, 0);
  const pieData     = rows.map(r => ({
    name: r.region,
    value: mode==='draft' ? r.draft : mode==='applied' ? r.complete : r.total,
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

      {/* ── Left: visual region cards ── */}
      <div className="xl:col-span-3 space-y-3">

        {/* Summary strip */}
        <div style={{ display:'grid', gridTemplateColumns: showDraft && showApplied ? '1fr 1fr 1fr' : showDraft ? '1fr 1fr' : '1fr 1fr', gap: 10, marginBottom: 4 }}>
          {showDraft && (
            <div style={{ background:'#EFF4FF', border:'1px solid #C0D0FF', padding:'12px 16px', borderLeft:'3px solid '+DRAFT_C }}>
              <p style={{ fontSize:10, color:DRAFT_C, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2, marginBottom:4 }}>Draft</p>
              <p style={{ fontSize:22, fontWeight:800, color:DRAFT_C, lineHeight:1 }}>{grandDraft.toLocaleString('en-IN')}</p>
            </div>
          )}
          {showApplied && (
            <div style={{ background:'#DEFBE6', border:'1px solid #A7F0BA', padding:'12px 16px', borderLeft:'3px solid '+COMPLETE_C }}>
              <p style={{ fontSize:10, color:COMPLETE_C, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2, marginBottom:4 }}>Applied</p>
              <p style={{ fontSize:22, fontWeight:800, color:COMPLETE_C, lineHeight:1 }}>{grandApplied.toLocaleString('en-IN')}</p>
            </div>
          )}
          <div style={{ background:IBM.gray10, border:`1px solid ${IBM.gray20}`, padding:'12px 16px', borderLeft:'3px solid '+IBM.gray50 }}>
            <p style={{ fontSize:10, color:IBM.gray70, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2, marginBottom:4 }}>Total</p>
            <p style={{ fontSize:22, fontWeight:800, color:IBM.gray100, lineHeight:1 }}>{grandTotal.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Region rows */}
        {rows.map((r, i) => {
          const color      = REGION_COLORS[i % REGION_COLORS.length];
          const draftW     = maxTotal > 0 ? (r.draft    / maxTotal) * 100 : 0;
          const appliedW   = maxTotal > 0 ? (r.complete / maxTotal) * 100 : 0;
          const totalW     = maxTotal > 0 ? (r.total    / maxTotal) * 100 : 0;
          const sharePct   = grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : '0.0';
          return (
            <div key={r.region} style={{ background:'#fff', border:`1px solid ${IBM.gray20}`, padding:'14px 16px' }}>
              {/* Top row */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:24, background:color, borderRadius:1, flexShrink:0 }}/>
                  <span style={{ fontSize:13, fontWeight:700, color:IBM.gray100 }}>{r.region}</span>
                </div>
                <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                  <span style={{ fontSize:20, fontWeight:800, color:IBM.gray100 }}>{r.total.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize:10, color:IBM.gray50 }}>{sharePct}%</span>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height:8, background:IBM.gray10, overflow:'hidden', position:'relative', borderRadius:1 }}>
                {showDraft && showApplied ? (
                  <>
                    <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${draftW}%`, background:DRAFT_C, opacity:0.7 }}/>
                    <div style={{ position:'absolute', left:`${draftW}%`, top:0, height:'100%', width:`${appliedW}%`, background:COMPLETE_C }}/>
                  </>
                ) : (
                  <div style={{ height:'100%', width:`${totalW}%`, background:color }}/>
                )}
              </div>
              {/* Bottom counters */}
              <div style={{ display:'flex', gap:16, marginTop:8, flexWrap:'wrap' }}>
                {showDraft && (
                  <span style={{ fontSize:12, fontWeight:600 }}>
                    <span style={{ color:IBM.gray50 }}>Draft </span>
                    <span style={{ color:DRAFT_C }}>{r.draft.toLocaleString('en-IN')}</span>
                  </span>
                )}
                {showApplied && (
                  <span style={{ fontSize:12, fontWeight:600 }}>
                    <span style={{ color:IBM.gray50 }}>Applied </span>
                    <span style={{ color:COMPLETE_C }}>{r.complete.toLocaleString('en-IN')}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Right: chart ── */}
      <div className="xl:col-span-2">
        {mode === 'all'
          ? <BifurcationChart data={rows.map(r=>({label:r.region,Draft:r.draft,Complete:r.complete,Total:r.total}))} labelKey="label" height={380}/>
          : <DescriptivePie data={pieData} colors={REGION_COLORS} title="Region-wise Share" height={320} mode={mode}/>
        }
      </div>
    </div>
  );
}

// ─── 3. State-wise ────────────────────────────────────────────────────────────
function StateWise({ mode }) {
  const { data, loading } = useData('/data/state-breakdown');
  if (loading) return <Skel h="h-96"/>;
  const top15 = (data||[]).slice(0,20);
  const showDraft   = mode==='all'||mode==='draft';
  const showApplied = mode==='all'||mode==='applied';
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="overflow-x-auto">
        <table className="ibm-table w-full">
          <thead><tr style={{background:IBM.gray20}}>
            <th className="px-3 py-2 text-xs font-semibold uppercase" style={{color:IBM.gray60}}>#</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{color:IBM.gray60}}>State</th>
            {showDraft   && <th className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{color:DRAFT_C}}>Draft</th>}
            {showApplied && <th className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{color:COMPLETE_C}}>Applied</th>}
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{color:IBM.gray60}}>Total</th>
          </tr></thead>
          <tbody>
            {top15.map((r,i)=>(
              <tr key={r.state} style={{borderBottom:`1px solid ${IBM.gray20}`,background:i%2===0?'#fff':IBM.gray10}}>
                <td className="px-3 py-2 text-xs" style={{color:IBM.gray50}}>{i+1}</td>
                <td className="px-3 py-2 text-sm font-medium" style={{color:IBM.gray100}}>{r.state}</td>
                {showDraft   && <td className="px-3 py-2 text-sm text-right font-medium" style={{color:DRAFT_C}}>{r.draft.toLocaleString('en-IN')}</td>}
                {showApplied && <td className="px-3 py-2 text-sm text-right font-medium" style={{color:COMPLETE_C}}>{r.complete.toLocaleString('en-IN')}</td>}
                <td className="px-3 py-2 text-sm text-right font-bold" style={{color:IBM.gray100}}>{r.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={top15} layout="vertical" barSize={mode==='all'?6:10} barGap={1} margin={{left:8,right:20}}>
          <CartesianGrid strokeDasharray="3 0" stroke={IBM.gray20} horizontal={false}/>
          <XAxis type="number" tick={{fontSize:10,fill:IBM.gray60}} tickLine={false} axisLine={false}/>
          <YAxis type="category" dataKey="state" tick={{fontSize:9,fill:IBM.gray70}} width={120} tickLine={false} axisLine={false}/>
          <Tooltip content={<IBMTooltip/>}/>
          {showDraft   && <Bar dataKey="draft"    name="Draft"   fill={DRAFT_C}    stackId={mode==='all'?undefined:'a'} radius={0}/>}
          {showApplied && <Bar dataKey="complete" name="Applied" fill={COMPLETE_C} stackId={mode==='all'?undefined:'a'} radius={0}/>}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 4. District-wise ─────────────────────────────────────────────────────────
function DistrictWise({ mode }) {
  const { data: stateData } = useData('/data/state-breakdown');
  const [sel, setSel] = useState('');
  const { data, loading } = useData(sel ? `/data/district-wise?state=${encodeURIComponent(sel)}` : '/data/district-wise');
  const states = (stateData||[]).slice(0,20).map(s=>s.state);
  const grandTotal = (data||[]).reduce((s,d)=>s+d.total,0);
  const showDraft   = mode==='all'||mode==='draft';
  const showApplied = mode==='all'||mode==='applied';
  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <label className="text-xs font-semibold" style={{color:IBM.gray70}}>Filter by State:</label>
        <select value={sel} onChange={e=>setSel(e.target.value)} className="text-sm px-3 py-1.5"
          style={{border:`1px solid ${IBM.gray30}`,color:IBM.gray100,background:'#fff',borderRadius:0}}>
          <option value="">All States — All Districts</option>
          {states.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <Skel h="h-64"/> : (
        <div className="overflow-x-auto">
          <table className="ibm-table w-full">
            <thead><tr style={{background:IBM.gray20}}>
              {['#','State','District'].map(h=><th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase" style={{color:IBM.gray60}}>{h}</th>)}
              {showDraft   && <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase" style={{color:DRAFT_C}}>Draft</th>}
              {showApplied && <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase" style={{color:COMPLETE_C}}>Applied</th>}
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase" style={{color:IBM.gray60}}>Total</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase" style={{color:IBM.gray60}}>Share</th>
            </tr></thead>
            <tbody>
              {(data||[]).map((d,i)=>{
                const pct=grandTotal>0?((d.total/grandTotal)*100).toFixed(1):0;
                return (
                  <tr key={`${d.state}${d.district}`} style={{borderBottom:`1px solid ${IBM.gray20}`,background:i%2===0?'#fff':IBM.gray10}}>
                    <td className="px-3 py-2.5 text-xs" style={{color:IBM.gray50}}>{i+1}</td>
                    <td className="px-3 py-2.5 text-xs" style={{color:IBM.gray60}}>{d.state}</td>
                    <td className="px-3 py-2.5 text-sm font-medium" style={{color:IBM.gray100}}>{d.district}</td>
                    {showDraft   && <td className="px-3 py-2.5 text-sm text-right font-medium" style={{color:DRAFT_C}}>{d.draft}</td>}
                    {showApplied && <td className="px-3 py-2.5 text-sm text-right font-medium" style={{color:COMPLETE_C}}>{d.complete}</td>}
                    <td className="px-3 py-2.5 text-sm text-right font-bold" style={{color:IBM.gray100}}>{d.total}</td>
                    <td className="px-3 py-2.5"><div className="flex items-center gap-2"><div className="w-16 h-1" style={{background:IBM.gray20}}><div className="h-1" style={{width:`${pct}%`,background:IBM.blue60}}/></div><span className="text-xs" style={{color:IBM.gray60}}>{pct}%</span></div></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr style={{borderTop:`2px solid ${IBM.gray30}`,background:IBM.gray10}}>
              <td colSpan={3} className="px-3 py-2.5 text-xs font-bold uppercase" style={{color:IBM.gray70}}>Total Count</td>
              {showDraft   && <td className="px-3 py-2.5 text-sm text-right font-bold" style={{color:DRAFT_C}}>{(data||[]).reduce((s,d)=>s+d.draft,0)}</td>}
              {showApplied && <td className="px-3 py-2.5 text-sm text-right font-bold" style={{color:COMPLETE_C}}>{(data||[]).reduce((s,d)=>s+d.complete,0)}</td>}
              <td className="px-3 py-2.5 text-sm text-right font-bold" style={{color:IBM.gray100}}>{grandTotal}</td>
              <td/>
            </tr></tfoot>
          </table>
          {showDraft && showApplied && (
            <div className="mt-2 px-3 py-1.5 flex items-center gap-2 text-xs"
              style={{ background: '#DEFBE6', border: `1px solid ${IBM.green50}30` }}>
              <svg className="w-3 h-3 flex-shrink-0" style={{color:IBM.green50}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              <span style={{color:IBM.green50}} className="font-semibold">
                Draft {(data||[]).reduce((s,d)=>s+d.draft,0).toLocaleString('en-IN')}
                &nbsp;+&nbsp;Applied {(data||[]).reduce((s,d)=>s+d.complete,0).toLocaleString('en-IN')}
                &nbsp;=&nbsp;Total Count {grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 5. DGCA Combined (Medical Class 2 + Computer Number) ────────────────────
const DGCA_COLORS = [IBM.green50, IBM.red50, IBM.gray50];

function DGCACombined({ mode }) {
  const { data, loading } = useData('/data/dgca-combined');
  if (loading) return <Skel h="h-64"/>;
  const key = mode === 'draft' ? 'draft' : mode === 'applied' ? 'applied' : 'all';
  const medData  = (data?.medical?.[key]  || []).map(d => ({ name: d.label, value: d.count }));
  const compData = (data?.computer?.[key] || []).map(d => ({ name: d.label, value: d.count }));
  const totals   = data?.totals || { draft: 0, applied: 0, all: 0 };
  const total    = totals[key] || 0;

  return (
    <div>
      {/* Summary strip */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {[
          { label: 'In Draft',     n: totals.draft,   c: DRAFT_C    },
          { label: 'Applied',      n: totals.applied,  c: COMPLETE_C },
          { label: 'Total Count',  n: totals.all,      c: IBM.gray70 },
        ].map(s => (
          <div key={s.label} className="flex-1 min-w-0 px-4 py-3" style={{ background: '#fff', border: `1px solid ${IBM.gray20}` }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: s.c }}>{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: IBM.gray100 }}>{s.n.toLocaleString('en-IN')}</p>
            <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>applicants</p>
          </div>
        ))}
      </div>

      {/* Two pie charts side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-4" style={{ background: IBM.gray10, border: `1px solid ${IBM.gray20}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: IBM.gray100 }}>DGCA Medical Class 2</p>
            <span className="text-xs px-2 py-0.5 font-semibold" style={{
              background: mode==='draft' ? 'rgba(15,98,254,0.1)' : mode==='applied' ? 'rgba(25,128,56,0.1)' : IBM.gray20,
              color: mode==='draft' ? DRAFT_C : mode==='applied' ? COMPLETE_C : IBM.gray70,
            }}>{mode==='draft'?'Draft Only':mode==='applied'?'Applied Only':'Draft + Applied'}</span>
          </div>
          <DescriptivePie data={medData} colors={DGCA_COLORS} height={220} mode={mode}/>
        </div>

        <div className="p-4" style={{ background: IBM.gray10, border: `1px solid ${IBM.gray20}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: IBM.gray100 }}>DGCA Computer Number</p>
            <span className="text-xs px-2 py-0.5 font-semibold" style={{
              background: mode==='draft' ? 'rgba(15,98,254,0.1)' : mode==='applied' ? 'rgba(25,128,56,0.1)' : IBM.gray20,
              color: mode==='draft' ? DRAFT_C : mode==='applied' ? COMPLETE_C : IBM.gray70,
            }}>{mode==='draft'?'Draft Only':mode==='applied'?'Applied Only':'Draft + Applied'}</span>
          </div>
          <DescriptivePie data={compData} colors={DGCA_COLORS} height={220} mode={mode}/>
        </div>
      </div>

      {/* Combined detail table */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: IBM.gray70 }}>Detail — Medical Class 2 vs Computer Number</p>
        <div className="overflow-x-auto">
          <table className="ibm-table w-full">
            <thead><tr style={{ background: IBM.gray20 }}>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase" style={{ color: IBM.gray60 }}>Status</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase" style={{ color: IBM.blue60 }}>Medical — Draft</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase" style={{ color: IBM.green50 }}>Medical — Applied</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase" style={{ color: IBM.blue60 }}>Computer — Draft</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase" style={{ color: IBM.green50 }}>Computer — Applied</th>
            </tr></thead>
            <tbody>
              {['Yes','No','No Data'].map((status, i) => {
                const mDraft   = (data?.medical?.draft   ||[]).find(d=>d.label===status)?.count || 0;
                const mApplied = (data?.medical?.applied ||[]).find(d=>d.label===status)?.count || 0;
                const cDraft   = (data?.computer?.draft  ||[]).find(d=>d.label===status)?.count || 0;
                const cApplied = (data?.computer?.applied||[]).find(d=>d.label===status)?.count || 0;
                return (
                  <tr key={status} style={{ borderBottom: `1px solid ${IBM.gray20}`, background: i%2===0?'#fff':IBM.gray10 }}>
                    <td className="px-4 py-2.5 text-sm font-semibold" style={{ color: status==='Yes'?IBM.green50:status==='No'?IBM.red50:IBM.gray60 }}>{status}</td>
                    <td className="px-4 py-2.5 text-sm text-right font-medium" style={{ color: DRAFT_C }}>{mDraft.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2.5 text-sm text-right font-medium" style={{ color: COMPLETE_C }}>{mApplied.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2.5 text-sm text-right font-medium" style={{ color: DRAFT_C }}>{cDraft.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2.5 text-sm text-right font-medium" style={{ color: COMPLETE_C }}>{cApplied.toLocaleString('en-IN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── 6. Employment ───────────────────────────────────────────────────────────
const EMP_COLORS = [IBM.blue60, IBM.orange40, IBM.teal50, IBM.purple50, IBM.gray50];
function EmploymentStatus({ mode }) {
  const { data, loading } = useData('/data/employment-status');
  if (loading) return <Skel h="h-60"/>;
  const pieData = (data||[]).map(d => ({ name: d.label, value: mode==='draft'?d.Draft:d.Complete }));
  return (
    <div className="space-y-6">
      {mode === 'all'
        ? <BifurcationChart data={data} labelKey="label" height={240}/>
        : <DescriptivePie data={pieData} colors={EMP_COLORS} title={`Employment — ${mode==='draft'?'Draft':'Applied'} students`} height={240} mode={mode}/>
      }
      <CrossTable data={data} labelKey="label" mode={mode}/>
    </div>
  );
}

// ─── 7. Education ────────────────────────────────────────────────────────────
const EDU_COLORS = [IBM.green50, IBM.blue60, IBM.purple50, IBM.orange40];
function EducationStatus({ mode }) {
  const { data, loading } = useData('/data/education-status');
  if (loading) return <Skel h="h-60"/>;
  const pieData = (data||[]).map(d => ({ name: d.label, value: mode==='draft'?d.Draft:d.Complete }));
  return (
    <div className="space-y-6">
      {mode === 'all'
        ? <BifurcationChart data={data} labelKey="label" height={240}/>
        : <DescriptivePie data={pieData} colors={EDU_COLORS} title={`Education — ${mode==='draft'?'Draft':'Applied'} students`} height={240} mode={mode}/>
      }
      <CrossTable data={data} labelKey="label" mode={mode}/>
    </div>
  );
}

// ─── India Map ───────────────────────────────────────────────────────────────
const STATE_GEO_MAP = {
  'ANDAMAN AND NICOBAR':'Andaman and Nicobar','ANDHRA PRADESH':'Andhra Pradesh',
  'ARUNACHAL PRADESH':'Arunachal Pradesh','ASSAM':'Assam','BIHAR':'Bihar',
  'CHANDIGARH':'Chandigarh','CHHATTISGARH':'Chhattisgarh',
  'DADRA AND NAGAR HAVELI':'Dadra and Nagar Haveli','DAMAN AND DIU':'Daman and Diu',
  'DELHI':'Delhi','GOA':'Goa','GUJARAT':'Gujarat','HARYANA':'Haryana',
  'HIMACHAL PRADESH':'Himachal Pradesh','JAMMU AND KASHMIR':'Jammu and Kashmir',
  'JHARKHAND':'Jharkhand','KARNATAKA':'Karnataka','KERALA':'Kerala',
  'LAKSHADWEEP':'Lakshadweep','MADHYA PRADESH':'Madhya Pradesh','MAHARASHTRA':'Maharashtra',
  'MANIPUR':'Manipur','MEGHALAYA':'Meghalaya','MIZORAM':'Mizoram',
  'NAGALAND':'Nagaland','ODISHA':'Orissa','PUDUCHERRY':'Puducherry',
  'PUNJAB':'Punjab','RAJASTHAN':'Rajasthan','SIKKIM':'Sikkim',
  'TAMIL NADU':'Tamil Nadu','TELANGANA':'Andhra Pradesh','TRIPURA':'Tripura',
  'UTTAR PRADESH':'Uttar Pradesh','UTTARAKHAND':'Uttaranchal','WEST BENGAL':'West Bengal',
};

function IndiaMap({ mode }) {
  const { data, loading } = useData('/data/state-breakdown');
  const [tooltip, setTooltip] = useState(null);
  if (loading) return <Skel h="h-[500px]"/>;

  const stateLookup = {};
  let maxVal = 0;
  (data || []).forEach(s => {
    const geoName = STATE_GEO_MAP[s.state] || s.state;
    const val = mode === 'draft' ? s.draft : mode === 'applied' ? s.complete : s.total;
    stateLookup[geoName] = (stateLookup[geoName] || 0) + val;
    if (stateLookup[geoName] > maxVal) maxVal = stateLookup[geoName];
  });

  const baseColor  = mode === 'applied' ? [0x19,0x80,0x38] : [0x0F,0x62,0xFE];
  const lightColor = mode === 'applied' ? [0xDE,0xFB,0xE6] : [0xED,0xF5,0xFF];

  function getColor(count) {
    if (!count) return IBM.gray10;
    const t = Math.min(count / maxVal, 1);
    const r = Math.round(lightColor[0] + (baseColor[0] - lightColor[0]) * t);
    const g = Math.round(lightColor[1] + (baseColor[1] - lightColor[1]) * t);
    const b = Math.round(lightColor[2] + (baseColor[2] - lightColor[2]) * t);
    return `rgb(${r},${g},${b})`;
  }

  const modeLabel = mode === 'draft' ? 'Draft' : mode === 'applied' ? 'Applied' : 'Total';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* Map */}
      <div className="xl:col-span-2 relative" style={{ background:'#f8faff', border:`1px solid ${IBM.gray20}`, minHeight:400 }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center:[82.5,22], scale:1100 }}
          style={{ width:'100%', height:460 }}
        >
          <ZoomableGroup>
            <Geographies geography="/india-states.json">
              {({ geographies }) => geographies.map(geo => {
                const name  = geo.properties.NAME_1;
                const count = stateLookup[name] || 0;
                return (
                  <Geography key={geo.rsmKey} geography={geo}
                    fill={getColor(count)} stroke="#fff" strokeWidth={0.7}
                    style={{
                      default: { outline:'none' },
                      hover:   { outline:'none', fill: mode==='applied'?IBM.green50:IBM.blue50, cursor:'pointer' },
                      pressed: { outline:'none' },
                    }}
                    onMouseEnter={() => setTooltip({ name, count })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {tooltip && (
          <div className="absolute top-3 left-3 px-3 py-2 text-xs pointer-events-none z-10"
            style={{ background:IBM.gray90, color:'#fff', border:`1px solid ${IBM.gray80}` }}>
            <p className="font-semibold">{tooltip.name}</p>
            <p style={{ color: mode==='applied'?'#42BE65':IBM.blue40 }}>
              {tooltip.count.toLocaleString('en-IN')} {modeLabel.toLowerCase()} students
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span className="text-[10px]" style={{ color:IBM.gray60 }}>0</span>
          <div style={{
            width:80, height:10,
            background:`linear-gradient(to right, rgb(${lightColor.join(',')}), rgb(${baseColor.join(',')}))`,
            border:`1px solid ${IBM.gray30}`,
          }}/>
          <span className="text-[10px]" style={{ color:IBM.gray60 }}>{maxVal.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Top states list */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:IBM.gray70 }}>
          Top States — {modeLabel}
        </p>
        <div className="space-y-2 overflow-y-auto" style={{ maxHeight:440 }}>
          {(data || [])
            .filter(s => s.state !== 'Unknown / Not Specified')
            .map(s => ({ ...s, _val: mode==='draft'?s.draft:mode==='applied'?s.complete:s.total }))
            .sort((a,b) => b._val - a._val)
            .slice(0, 20)
            .map((s, i) => {
              const pct = maxVal > 0 ? (s._val / maxVal) * 100 : 0;
              const barC = mode==='applied' ? IBM.green50 : IBM.blue60;
              return (
                <div key={s.state}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium truncate" style={{ color:IBM.gray100, maxWidth:140 }}>
                      {i+1}. {s.state.replace(/_/g,' ')}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs tabular-nums flex-shrink-0 ml-2">
                      {mode === 'all' && (
                        <>
                          <span style={{ color:DRAFT_C }}>{s.draft}</span>
                          <span style={{ color:IBM.gray30 }}>+</span>
                          <span style={{ color:COMPLETE_C }}>{s.complete}</span>
                          <span style={{ color:IBM.gray30 }}>=</span>
                        </>
                      )}
                      <span className="font-bold" style={{ color:IBM.gray100 }}>{s._val.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="h-1.5" style={{ background:IBM.gray20 }}>
                    <div className="h-1.5 transition-all duration-500" style={{ width:`${pct}%`, background:barC }}/>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ─── Programme Summary Bar ────────────────────────────────────────────────────
function DeltaBadge({ delta }) {
  if (delta === 0) return <span style={{ fontSize:10, color:'#6F6F6F', fontWeight:600 }}>—</span>;
  const up = delta > 0;
  return (
    <span style={{
      fontSize:10, fontWeight:700, display:'inline-flex', alignItems:'center', gap:2,
      color: up ? IBM.green50 : IBM.red50,
    }}>
      {up ? '▲' : '▼'} {Math.abs(delta).toLocaleString('en-IN')}
    </span>
  );
}

function ProgrammeSummary() {
  const { data, loading } = useData('/data/programme-totals');
  if (loading) return (
    <div style={{ height:70, background:'#fff', borderBottom:`1px solid ${IBM.gray20}`, display:'flex', alignItems:'center', padding:'0 20px' }}>
      <div style={{ height:36, width:'100%', background:IBM.gray10, animation:'pulse 1.5s infinite' }}/>
    </div>
  );
  if (!data) return null;

  const { current, previous, delta } = data;

  const metrics = [
    { label:'Registered',    cur: current.registered,  prev: previous.registered,  d: delta.registered,  color: IBM.blue60 },
    { label:'Draft (unique)', cur: current.drafts,       prev: previous.drafts,       d: delta.drafts,       color: IBM.blue50 },
    { label:'Applied',       cur: current.applied,     prev: previous.applied,     d: delta.applied,     color: IBM.green50 },
    { label:'Total Unique',  cur: current.totalUnique, prev: previous.totalUnique, d: delta.totalUnique, color: IBM.teal50 },
    { label:'States',        cur: current.uniqueStates,prev: previous.uniqueStates,d: delta.uniqueStates,color: IBM.purple50 },
  ];

  return (
    <div style={{
      background:'#fff', borderBottom:`1px solid ${IBM.gray20}`,
      padding:'10px 20px', flexShrink:0,
      display:'flex', alignItems:'center', gap:0, flexWrap:'wrap',
    }}>
      {/* File badge */}
      <div style={{ marginRight:20, flexShrink:0 }}>
        <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:IBM.gray50, marginBottom:2 }}>Data File</p>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:IBM.green50, flexShrink:0 }}/>
          <span style={{ fontSize:11, fontWeight:700, color:IBM.gray100 }}>{current.file}</span>
          <span style={{ fontSize:9, color:IBM.gray50 }}>vs {previous.file}</span>
        </div>
      </div>

      <div style={{ width:1, height:40, background:IBM.gray20, marginRight:20, flexShrink:0 }}/>

      {/* Metric columns */}
      <div style={{ display:'flex', gap:0, flex:1, flexWrap:'wrap' }}>
        {metrics.map((m, i) => (
          <div key={m.label} style={{
            flex:1, minWidth:110, padding:'4px 16px',
            borderRight: i < metrics.length-1 ? `1px solid ${IBM.gray20}` : 'none',
          }}>
            <p style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2, color:IBM.gray50, marginBottom:3 }}>{m.label}</p>
            <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
              <span style={{ fontSize:20, fontWeight:800, color:m.color, lineHeight:1 }}>
                {m.cur.toLocaleString('en-IN')}
              </span>
              <DeltaBadge delta={m.d}/>
            </div>
            <p style={{ fontSize:9, color:IBM.gray50, marginTop:2 }}>
              prev {m.prev.toLocaleString('en-IN')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id:'date',       label:'Date-wise',         icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id:'region',     label:'Region-wise',       icon:'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id:'map',        label:'India Map',         icon:'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { id:'state',      label:'State-wise',        icon:'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
  { id:'district',   label:'District-wise',     icon:'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id:'dgca',       label:'DGCA (Med + Comp)', icon:'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
  { id:'employment', label:'Employment',        icon:'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id:'education',  label:'Education',         icon:'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
];

const CONTENT = {
  date:       { title:'Date-wise Student Count',                 subtitle:'Daily Draft vs Applied student count' },
  region:     { title:'Region-wise Student Count',               subtitle:'Draft vs Applied count by region' },
  map:        { title:'India State Map',                         subtitle:'Hover a state to see student count — toggle Draft / Applied / All' },
  state:      { title:'State-wise Student Count',                subtitle:'All states — Draft vs Applied count' },
  district:   { title:'District-wise Student Count',             subtitle:'All districts — filter by state' },
  dgca:       { title:'DGCA Medical Class 2 + Computer Number',  subtitle:'DGCA eligibility — Draft vs Applied' },
  employment: { title:'Employment Status',                       subtitle:'Student / Employed / Unemployed — Draft vs Applied' },
  education:  { title:'Education Qualification Status',          subtitle:'Completed vs Pursuing — Draft vs Applied' },
};

export default function Analytics() {
  const [active, setActive] = useState('date');
  const [mode,   setMode]   = useState('all');

  const components = {
    date:       <DateWise         mode={mode} key={mode}/>,
    region:     <RegionWise       mode={mode} key={mode}/>,
    map:        <IndiaMap         mode={mode} key={mode}/>,
    state:      <StateWise        mode={mode} key={mode}/>,
    district:   <DistrictWise     mode={mode} key={mode}/>,
    dgca:       <DGCACombined     mode={mode} key={mode}/>,
    employment: <EmploymentStatus mode={mode} key={mode}/>,
    education:  <EducationStatus  mode={mode} key={mode}/>,
  };

  const cur = CONTENT[active];

  const curSection = SECTIONS.find(s => s.id === active);

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: IBM.gray10 }}>

      {/* ── Programme summary strip ── */}
      <ProgrammeSummary />

      <div className="flex flex-1 min-h-0">

      {/* ── Left section nav ── */}
      <div className="flex-shrink-0 w-52" style={{ background:'#fff', borderRight:`1px solid ${IBM.gray20}` }}>
        {/* Sidebar header */}
        <div style={{ padding:'14px 16px', borderBottom:`1px solid ${IBM.gray20}`, background:IBM.gray10 }}>
          <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:2, color:IBM.gray50 }}>Analytics</p>
          <p style={{ fontSize:11, fontWeight:600, color:IBM.gray70, marginTop:2 }}>Select a section</p>
        </div>
        <nav style={{ padding:'8px 0' }}>
          {SECTIONS.map(s => {
            const isActive = active === s.id;
            return (
              <button key={s.id} onClick={() => setActive(s.id)}
                style={{
                  width:'100%', textAlign:'left', padding:'10px 16px',
                  display:'flex', alignItems:'center', gap:10,
                  background: isActive ? '#EFF4FF' : 'transparent',
                  color:      isActive ? IBM.blue60 : IBM.gray70,
                  borderLeft: isActive ? `3px solid ${IBM.blue60}` : '3px solid transparent',
                  borderBottom: `1px solid ${IBM.gray10}`,
                  cursor:'pointer', transition:'all 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = IBM.gray10; e.currentTarget.style.color = IBM.gray100; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = IBM.gray70; }}}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8}
                  viewBox="0 0 24 24" style={{ flexShrink:0, opacity: isActive ? 1 : 0.6 }}>
                  {s.icon.split(' M').map((d,i) => (
                    <path key={i} strokeLinecap="round" strokeLinejoin="round" d={i===0?d:'M'+d}/>
                  ))}
                </svg>
                <span style={{ fontSize:12, fontWeight: isActive ? 700 : 500 }}>{s.label}</span>
                {isActive && (
                  <div style={{ marginLeft:'auto', width:5, height:5, background:IBM.blue60, borderRadius:'50%', flexShrink:0 }}/>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* Section header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 20px', height:56, flexShrink:0, flexWrap:'wrap', gap:12,
          borderBottom:`1px solid ${IBM.gray20}`, background:'#fff',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {curSection && (
              <div style={{
                width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
                background:'#EFF4FF', borderRadius:2,
              }}>
                <svg width="16" height="16" fill="none" stroke={IBM.blue60} strokeWidth={1.8} viewBox="0 0 24 24">
                  {curSection.icon.split(' M').map((d,i) => (
                    <path key={i} strokeLinecap="round" strokeLinejoin="round" d={i===0?d:'M'+d}/>
                  ))}
                </svg>
              </div>
            )}
            <div>
              <h2 style={{ fontSize:14, fontWeight:700, color:IBM.gray100, lineHeight:1.2 }}>{cur.title}</h2>
              <p style={{ fontSize:11, color:IBM.gray60, marginTop:2 }}>{cur.subtitle}</p>
            </div>
          </div>
          <ViewToggle mode={mode} onChange={setMode}/>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding:20 }}>
          <div style={{
            background:'#fff',
            border:`1px solid ${IBM.gray20}`,
            boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ padding:20 }}>{components[active]}</div>
          </div>
        </div>
      </div>

      </div>{/* end flex row */}
    </div>
  );
}
