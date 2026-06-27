import { useState, useCallback, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import {
  ComposableMap, Geographies, Geography, ZoomableGroup,
} from 'react-simple-maps';
import api from '../utils/api';

// ─── IBM Carbon palette ───────────────────────────────────────────────────────
const IBM = {
  blue60: '#0F62FE', blue50: '#4589FF', blue40: '#78A9FF', blue30: '#A6C8FF', blue10: '#EDF5FF',
  green50: '#198038', green40: '#24A148', green10: '#DEFBE6',
  teal50: '#007D79', teal40: '#009D9A',
  purple50: '#8A3FFC', purple40: '#A56EFF',
  red50: '#DA1E28', red40: '#FA4D56',
  orange40: '#FF832B', orange30: '#FFB784',
  yellow30: '#F1C21B',
  gray100: '#161616', gray90: '#262626', gray80: '#393939',
  gray70: '#525252', gray60: '#6F6F6F', gray50: '#8D8D8D',
  gray30: '#C6C6C6', gray20: '#E0E0E0', gray10: '#F4F4F4',
};

const REGION_COLORS = {
  'Northern India':  IBM.blue60,
  'Southern India':  IBM.green50,
  'Western India':   IBM.orange40,
  'Eastern India':   IBM.teal50,
  'Central India':   IBM.purple50,
  'Northeast India': IBM.red50,
  'Other':           IBM.gray50,
};

// Map uppercase state names (from Excel) → GeoJSON NAME_1 (title case)
const STATE_GEO_MAP = {
  'ANDAMAN AND NICOBAR': 'Andaman and Nicobar',
  'ANDHRA PRADESH':      'Andhra Pradesh',
  'ARUNACHAL PRADESH':   'Arunachal Pradesh',
  'ASSAM':               'Assam',
  'BIHAR':               'Bihar',
  'CHANDIGARH':          'Chandigarh',
  'CHHATTISGARH':        'Chhattisgarh',
  'DADRA AND NAGAR HAVELI': 'Dadra and Nagar Haveli',
  'DAMAN AND DIU':       'Daman and Diu',
  'DELHI':               'Delhi',
  'GOA':                 'Goa',
  'GUJARAT':             'Gujarat',
  'HARYANA':             'Haryana',
  'HIMACHAL PRADESH':    'Himachal Pradesh',
  'JAMMU AND KASHMIR':   'Jammu and Kashmir',
  'JHARKHAND':           'Jharkhand',
  'KARNATAKA':           'Karnataka',
  'KERALA':              'Kerala',
  'LAKSHADWEEP':         'Lakshadweep',
  'MADHYA PRADESH':      'Madhya Pradesh',
  'MAHARASHTRA':         'Maharashtra',
  'MANIPUR':             'Manipur',
  'MEGHALAYA':           'Meghalaya',
  'MIZORAM':             'Mizoram',
  'NAGALAND':            'Nagaland',
  'ODISHA':              'Orissa',
  'PUDUCHERRY':          'Puducherry',
  'PUNJAB':              'Punjab',
  'RAJASTHAN':           'Rajasthan',
  'SIKKIM':              'Sikkim',
  'TAMIL NADU':          'Tamil Nadu',
  'TELANGANA':           'Andhra Pradesh', // merged with AP in older GeoJSON
  'TRIPURA':             'Tripura',
  'UTTAR PRADESH':       'Uttar Pradesh',
  'UTTARAKHAND':         'Uttaranchal',
  'WEST BENGAL':         'West Bengal',
};

// ─── Data hook ────────────────────────────────────────────────────────────────
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

// ─── Skeleton ────────────────────────────────────────────────────────────────
const Skel = ({ h = 'h-48' }) => (
  <div className={`${h} animate-pulse`} style={{ background: IBM.gray10 }} />
);

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Card({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-white ${className}`}
      style={{ border: `1px solid ${IBM.gray20}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {title && (
        <div className="px-5 py-3.5 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${IBM.gray20}`, background: IBM.gray10 }}>
          <div>
            <p className="text-sm font-bold" style={{ color: IBM.gray100 }}>{title}</p>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>{subtitle}</p>}
          </div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, color, icon }) {
  return (
    <div className="bg-white p-5 flex items-start gap-4"
      style={{ border: `1px solid ${IBM.gray20}`, borderTop: `3px solid ${color}` }}>
      {icon && (
        <div className="w-9 h-9 flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18` }}>
          <svg className="w-5 h-5" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {icon}
          </svg>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: IBM.gray60 }}>{label}</p>
        <p className="text-3xl font-bold mt-0.5" style={{ color: IBM.gray100 }}>{value ?? '—'}</p>
        {sub && <p className="text-xs mt-1" style={{ color: IBM.gray60 }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── IBM tooltip ──────────────────────────────────────────────────────────────
function IBMTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs"
      style={{ background: IBM.gray90, border: `1px solid ${IBM.gray80}`, color: '#fff', fontFamily: "'IBM Plex Sans'" }}>
      <p className="font-semibold mb-1.5" style={{ color: IBM.gray30 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 flex-shrink-0" style={{ background: p.color || p.fill }} />
          <span style={{ color: IBM.gray30 }}>{p.name}:</span>
          <span className="font-semibold text-white">{Number(p.value).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Descriptive pie with legend ─────────────────────────────────────────────
const RADIAN = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700} fontFamily="'IBM Plex Sans',sans-serif">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function DescPie({ data, colors, height = 200, totalLabel = 'Total' }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const tt = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
    return (
      <div className="px-3 py-2 text-xs"
        style={{ background: IBM.gray90, border: `1px solid ${IBM.gray80}`, color: '#fff' }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5" style={{ background: d.payload.fill }} />
          <span className="font-semibold">{d.name}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: IBM.gray30 }}>Count:</span>
          <span className="font-bold">{Number(d.value).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: IBM.gray30 }}>Share:</span>
          <span className="font-bold">{pct}%</span>
        </div>
      </div>
    );
  };
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name"
            cx="50%" cy="50%" outerRadius={height / 2 - 14}
            strokeWidth={2} stroke="#fff" labelLine={false} label={PieLabel}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip content={tt} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-2">
        {data.map((d, i) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
          return (
            <div key={d.name} className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 flex-shrink-0" style={{ background: colors[i % colors.length] }} />
              <span className="text-xs font-medium flex-1 truncate" style={{ color: IBM.gray100 }}>{d.name}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: IBM.gray100 }}>
                {Number(d.value).toLocaleString('en-IN')}
              </span>
              <span className="text-xs tabular-nums w-9 text-right" style={{ color: IBM.gray60 }}>{pct}%</span>
            </div>
          );
        })}
        <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${IBM.gray20}` }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: IBM.gray60 }}>{totalLabel}</span>
          <span className="text-sm font-bold" style={{ color: IBM.gray100 }}>{total.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}

// ─── 1. Date-wise section ─────────────────────────────────────────────────────
function DateSection() {
  const { data, loading } = useData('/data/date-wise');
  const [view, setView] = useState('area');
  if (loading) return <Skel h="h-64" />;
  const fmt = (data || []).map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {['area','bar'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className="px-3 py-1 text-xs font-semibold uppercase transition-all"
            style={{
              background: view === v ? IBM.blue60 : IBM.gray10,
              color: view === v ? '#fff' : IBM.gray70,
              border: `1px solid ${view === v ? IBM.blue60 : IBM.gray30}`,
            }}>
            {v}
          </button>
        ))}
        <div className="flex items-center gap-5 ml-auto text-xs" style={{ color: IBM.gray60 }}>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-2 inline-block" style={{ background: IBM.blue60 }} />Draft
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-2 inline-block" style={{ background: IBM.green50 }} />Complete
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        {view === 'area'
          ? <AreaChart data={fmt} margin={{ left: 0, right: 8 }}>
              <defs>
                <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={IBM.blue60} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={IBM.blue60} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={IBM.green50} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={IBM.green50} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 0" stroke={IBM.gray20} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: IBM.gray60 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: IBM.gray60 }} tickLine={false} axisLine={false} />
              <Tooltip content={<IBMTooltip />} />
              <Area type="monotone" dataKey="draft"    name="Draft"    stroke={IBM.blue60} strokeWidth={2} fill="url(#gd)" />
              <Area type="monotone" dataKey="complete" name="Complete" stroke={IBM.green50} strokeWidth={2} fill="url(#gc)" />
            </AreaChart>
          : <BarChart data={fmt} barSize={6} barGap={1} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 0" stroke={IBM.gray20} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: IBM.gray60 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: IBM.gray60 }} tickLine={false} axisLine={false} />
              <Tooltip content={<IBMTooltip />} />
              <Bar dataKey="draft"    name="Draft"    fill={IBM.blue60}  radius={0} />
              <Bar dataKey="complete" name="Complete" fill={IBM.green50} radius={0} />
            </BarChart>
        }
      </ResponsiveContainer>
    </div>
  );
}

// ─── 2. Region-wise section ───────────────────────────────────────────────────
function RegionSection() {
  const { data, loading } = useData('/data/region-wise');
  if (loading) return <Skel />;
  const pieData  = (data || []).map(r => ({ name: r.region, value: r.total }));
  const colors   = (data || []).map(r => REGION_COLORS[r.region] || IBM.gray50);
  const maxTotal = Math.max(...(data || []).map(r => r.total), 1);
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Pie */}
      <DescPie data={pieData} colors={colors} height={220} totalLabel="All Applications" />
      {/* Horizontal bars */}
      <div className="space-y-3">
        {(data || []).map(r => {
          const pct = Math.round((r.total / maxTotal) * 100);
          const color = REGION_COLORS[r.region] || IBM.gray50;
          return (
            <div key={r.region}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 flex-shrink-0" style={{ background: color }} />
                  <span className="text-sm font-medium" style={{ color: IBM.gray100 }}>{r.region}</span>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: IBM.gray60 }}>
                  <span style={{ color: IBM.blue60 }}>{r.draft.toLocaleString('en-IN')} D</span>
                  <span>·</span>
                  <span style={{ color: IBM.green50 }}>{r.complete.toLocaleString('en-IN')} C</span>
                  <span className="font-bold ml-1" style={{ color: IBM.gray100 }}>= {r.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="h-2.5 flex" style={{ background: IBM.gray20 }}>
                <div className="h-2.5 transition-all duration-700"
                  style={{ width: `${(r.draft / maxTotal) * 100}%`, background: IBM.blue60 }} />
                <div className="h-2.5 transition-all duration-700"
                  style={{ width: `${(r.complete / maxTotal) * 100}%`, background: IBM.green50 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 3. India State Map ───────────────────────────────────────────────────────
function IndiaMap() {
  const { data, loading } = useData('/data/state-breakdown');
  const [tooltip, setTooltip] = useState(null);

  if (loading) return <Skel h="h-96" />;

  // Build lookup: GeoJSON name → total count
  const stateLookup = {};
  let maxVal = 0;
  (data || []).forEach(s => {
    const geoName = STATE_GEO_MAP[s.state] || s.state;
    stateLookup[geoName] = (stateLookup[geoName] || 0) + s.total;
    if (stateLookup[geoName] > maxVal) maxVal = stateLookup[geoName];
  });

  // Color scale: 0 → light blue, maxVal → dark blue
  function getColor(count) {
    if (!count) return IBM.gray10;
    const t = Math.min(count / maxVal, 1);
    // Interpolate from blue10 (#EDF5FF) → blue60 (#0F62FE)
    const r = Math.round(0xED + (0x0F - 0xED) * t);
    const g = Math.round(0xF5 + (0x62 - 0xF5) * t);
    const b = Math.round(0xFF + (0xFE - 0xFF) * t);
    return `rgb(${r},${g},${b})`;
  }

  const top5 = (data || []).slice(0, 5);

  return (
    <div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Map */}
        <div className="xl:col-span-2 relative" style={{ background: '#f8faff', border: `1px solid ${IBM.gray20}`, minHeight: 360 }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ center: [82.5, 22], scale: 1100 }}
            style={{ width: '100%', height: 380 }}
          >
            <ZoomableGroup>
              <Geographies geography="/india-states.json">
                {({ geographies }) =>
                  geographies.map(geo => {
                    const name  = geo.properties.NAME_1;
                    const count = stateLookup[name] || 0;
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={getColor(count)}
                        stroke="#fff"
                        strokeWidth={0.7}
                        style={{
                          default: { outline: 'none' },
                          hover:   { outline: 'none', fill: IBM.blue40, cursor: 'pointer' },
                          pressed: { outline: 'none' },
                        }}
                        onMouseEnter={() => setTooltip({ name, count })}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          {/* Tooltip */}
          {tooltip && (
            <div className="absolute top-3 left-3 px-3 py-2 text-xs pointer-events-none z-10"
              style={{ background: IBM.gray90, color: '#fff', border: `1px solid ${IBM.gray80}` }}>
              <p className="font-semibold">{tooltip.name}</p>
              <p style={{ color: IBM.blue40 }}>{tooltip.count.toLocaleString('en-IN')} applications</p>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-[10px]" style={{ color: IBM.gray60 }}>0</span>
            <div style={{
              width: 80, height: 10,
              background: `linear-gradient(to right, ${IBM.blue10}, ${IBM.blue60})`,
              border: `1px solid ${IBM.gray30}`,
            }} />
            <span className="text-[10px]" style={{ color: IBM.gray60 }}>{maxVal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Top states list */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: IBM.gray70 }}>Top States</p>
          {(data || []).slice(0, 12).map((s, i) => {
            const pct = maxVal > 0 ? (s.total / maxVal) * 100 : 0;
            return (
              <div key={s.state}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium truncate" style={{ color: IBM.gray100, maxWidth: 140 }}>
                    {i + 1}. {s.state.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: IBM.blue60 }}>
                    {s.total.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="h-1.5" style={{ background: IBM.gray20 }}>
                  <div className="h-1.5 transition-all duration-700"
                    style={{ width: `${pct}%`, background: IBM.blue60 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 4. DGCA Section ─────────────────────────────────────────────────────────
function DGCASection() {
  const { data: med, loading: ml } = useData('/data/dgca-medical');
  const { data: comp, loading: cl } = useData('/data/dgca-computer');
  const COLORS = [IBM.green50, IBM.red50, IBM.gray50];
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <Card title="DGCA Medical Class 2" subtitle="Class 2 assessment — Complete submissions">
        {ml ? <Skel /> : (
          <DescPie
            data={(med?.status || []).map(s => ({ name: s.label, value: s.count }))}
            colors={COLORS}
            height={200}
            totalLabel="Complete Submissions"
          />
        )}
      </Card>
      <Card title="DGCA Computer Number" subtitle="Computer number availability — Complete submissions">
        {cl ? <Skel /> : (
          <DescPie
            data={['Yes','No','No Data'].map(k => ({ name: k, value: comp?.summary?.[k] || 0 }))}
            colors={COLORS}
            height={200}
            totalLabel="Complete Submissions"
          />
        )}
      </Card>
    </div>
  );
}

// ─── 5. Employment Section ────────────────────────────────────────────────────
function EmploymentSection() {
  const { data, loading } = useData('/data/employment-status');
  if (loading) return <Skel />;
  const EMP_COLORS = [IBM.blue60, IBM.orange40, IBM.teal50, IBM.purple50, IBM.gray50];
  const pieData = (data || []).map(d => ({ name: d.label, value: d.Total }));
  return (
    <DescPie data={pieData} colors={EMP_COLORS} height={220} totalLabel="All Applications" />
  );
}

// ─── 6. Education Section ─────────────────────────────────────────────────────
function EducationSection() {
  const { data, loading } = useData('/data/education-status');
  if (loading) return <Skel />;
  const EDU_COLORS = [IBM.green50, IBM.blue60, IBM.purple50, IBM.orange40, IBM.gray50];
  const pieData = (data || []).map(d => ({ name: d.label, value: d.Total }));
  return (
    <DescPie data={pieData} colors={EDU_COLORS} height={220} totalLabel="All Applications" />
  );
}

// ─── 7. Gender + Category ─────────────────────────────────────────────────────
function GenderSection() {
  const { data, loading } = useData('/data/gender-breakdown');
  if (loading) return <Skel h="h-44" />;
  const COLORS = [IBM.purple50, IBM.blue60, IBM.gray50];
  const pieData = (data || []).map(d => ({ name: d.label, value: d.Total }));
  return (
    <DescPie data={pieData} colors={COLORS} height={200} totalLabel="All Applications" />
  );
}

function CategorySection() {
  const { data, loading } = useData('/data/category-breakdown');
  if (loading) return <Skel h="h-44" />;
  const COLORS = [IBM.blue60, IBM.orange40, IBM.teal50, IBM.purple50, IBM.red50, IBM.gray50];
  const pieData = (data || []).map(d => ({ name: d.label, value: d.Total }));
  return (
    <DescPie data={pieData} colors={COLORS} height={200} totalLabel="All Applications" />
  );
}

// ─── PDF generator ────────────────────────────────────────────────────────────
async function generatePDF(scrollEl, contentEl, stats) {
  // Temporarily expand the scroll container so html2canvas captures everything
  const prev = { overflow: scrollEl.style.overflow, height: scrollEl.style.height };
  scrollEl.style.overflow = 'visible';
  scrollEl.style.height   = 'auto';

  try {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF }   = await import('jspdf');

    const canvas = await html2canvas(contentEl, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#F4F4F4',
    });

    scrollEl.style.overflow = prev.overflow;
    scrollEl.style.height   = prev.height;

    const PAGE_W   = 210;   // A4 mm
    const PAGE_H   = 297;
    const HEADER_H = 14;
    const SLOT_H   = PAGE_H - HEADER_H; // content area per page

    const imgData  = canvas.toDataURL('image/jpeg', 0.92);
    const imgW     = PAGE_W;
    const imgH     = (canvas.height * imgW) / canvas.width;
    const pages    = Math.ceil(imgH / SLOT_H);

    const pdf = new jsPDF('p', 'mm', 'a4');

    const addHeader = (n) => {
      // dark bar
      pdf.setFillColor(22, 22, 22);
      pdf.rect(0, 0, PAGE_W, HEADER_H, 'F');
      // blue accent stripe
      pdf.setFillColor(15, 98, 254);
      pdf.rect(0, HEADER_H - 2, PAGE_W, 2, 'F');
      // title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('IndiGo — Giving Wings to Fly  |  Scholarship Analytics Report', 5, 8);
      // meta
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(180, 180, 180);
      const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      pdf.text(`${dateStr}   ·   Page ${n} of ${pages}`, PAGE_W - 5, 8, { align: 'right' });
      // stats strip on first page header
      if (n === 1 && stats) {
        pdf.setTextColor(120, 169, 255);
        pdf.setFontSize(7);
        const summary = `Registered: ${stats.totalRegistered?.toLocaleString('en-IN')}   Draft: ${stats.totalDrafts?.toLocaleString('en-IN')}   Applied: ${stats.totalApplied?.toLocaleString('en-IN')}   States: ${stats.uniqueStates}`;
        pdf.text(summary, PAGE_W / 2, 8, { align: 'center' });
      }
    };

    for (let p = 0; p < pages; p++) {
      if (p > 0) pdf.addPage();
      addHeader(p + 1);
      // Shift the image up by p * SLOT_H to show the next slice
      pdf.addImage(imgData, 'JPEG', 0, HEADER_H - p * SLOT_H, imgW, imgH);
    }

    const dateTag = new Date().toISOString().split('T')[0];
    pdf.save(`IndiGo-Scholarship-Report-${dateTag}.pdf`);
  } catch (err) {
    scrollEl.style.overflow = prev.overflow;
    scrollEl.style.height   = prev.height;
    throw err;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Overview({ onReload }) {
  const { data: stats, loading: sl } = useData('/data/stats');
  const [generating, setGenerating]  = useState(false);
  const [genMsg, setGenMsg]          = useState('');
  const scrollRef  = useRef(null);
  const contentRef = useRef(null);

  const handleDownload = async () => {
    if (generating) return;
    setGenerating(true);
    setGenMsg('Capturing page…');
    try {
      await generatePDF(scrollRef.current, contentRef.current, stats);
      setGenMsg('Downloaded!');
    } catch {
      setGenMsg('Failed — try again');
    }
    setGenerating(false);
    setTimeout(() => setGenMsg(''), 3000);
  };

  const kpiIcons = {
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    edit:  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    map:   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ background: IBM.gray10 }}>
      <div ref={contentRef} className="p-5 space-y-5 max-w-screen-2xl mx-auto">

        {/* ── Page toolbar ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: IBM.gray100 }}>Analytics Overview</h1>
            <p className="text-xs mt-0.5" style={{ color: IBM.gray60 }}>
              IndiGo — Giving Wings to Fly · Scholarship Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            {genMsg && (
              <span className="text-xs font-medium px-2.5 py-1.5"
                style={{
                  background: genMsg === 'Downloaded!' ? '#DEFBE6' : genMsg.includes('Failed') ? '#FFF1F1' : IBM.blue10,
                  color: genMsg === 'Downloaded!' ? IBM.green50 : genMsg.includes('Failed') ? IBM.red50 : IBM.blue60,
                  border: `1px solid ${genMsg === 'Downloaded!' ? IBM.green50 : genMsg.includes('Failed') ? IBM.red50 : IBM.blue60}44`,
                }}>
                {genMsg}
              </span>
            )}
            <button
              onClick={handleDownload}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60"
              style={{
                background: generating ? IBM.gray80 : IBM.blue60,
                color: '#fff',
                border: 'none',
                cursor: generating ? 'wait' : 'pointer',
              }}
            >
              {generating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Download Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        {sl ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <Skel key={i} h="h-24" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KPI label="Total Registered"    value={stats.totalRegistered?.toLocaleString('en-IN')}  sub="Students with portal accounts"       color={IBM.blue60}   icon={kpiIcons.users} />
            <KPI label="Draft Applications"  value={stats.totalDrafts?.toLocaleString('en-IN')}      sub={`${stats.conversionRate}% of registered`}  color={IBM.blue40} icon={kpiIcons.edit}  />
            <KPI label="Final Applied"       value={stats.totalApplied?.toLocaleString('en-IN')}     sub={`${stats.draftToApplied}% converted from draft`} color={IBM.green50}  icon={kpiIcons.check} />
            <KPI label="States Covered"      value={stats.uniqueStates}                              sub={`${stats.passportReady?.toLocaleString('en-IN')} passport-ready`}  color={IBM.purple50} icon={kpiIcons.map}   />
          </div>
        )}

        {/* ── Date-wise ── */}
        <Card
          title="Application Volume Over Time"
          subtitle="Daily Draft and Complete submissions — switch between area and bar view"
        >
          <DateSection />
        </Card>

        {/* ── Region + State map row ── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <Card title="Region-wise Breakdown"
            subtitle="North · South · West · East · Central · Northeast"
            className="xl:col-span-2">
            <RegionSection />
          </Card>
          <Card title="State-wise Applications — India Map"
            subtitle="Hover a state to see application count. Darker blue = more applications."
            className="xl:col-span-3">
            <IndiaMap />
          </Card>
        </div>

        {/* ── DGCA row ── */}
        <DGCASection />

        {/* ── Employment + Education ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card title="Employment Status" subtitle="Student / Employed / Unemployed — All applicants">
            <EmploymentSection />
          </Card>
          <Card title="Education Qualification" subtitle="Completed vs Pursuing — All applicants">
            <EducationSection />
          </Card>
        </div>

        {/* ── Gender + Category ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card title="Gender Distribution" subtitle="From draft applications">
            <GenderSection />
          </Card>
          <Card title="Category Breakdown" subtitle="General / OBC / SC / ST — Draft applications">
            <CategorySection />
          </Card>
        </div>

      </div>
    </div>
  );
}
