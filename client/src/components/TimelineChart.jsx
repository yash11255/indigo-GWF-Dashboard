import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  let dateLabel = label;
  try {
    dateLabel = new Date(label).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {}
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-sm">
      <p className="text-slate-500 text-xs mb-1">{dateLabel}</p>
      <p className="text-blue-700 font-bold text-lg">{payload[0].value.toLocaleString('en-IN')}</p>
      <p className="text-slate-400 text-xs">applications</p>
    </div>
  );
};

const TYPES = [
  { key: 'registered', label: 'Registered' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'applied', label: 'Applied' },
];

export default function TimelineChart({ data, onTypeChange }) {
  const [active, setActive] = useState('registered');

  const handleChange = (key) => {
    setActive(key);
    if (onTypeChange) onTypeChange(key);
  };

  const hasData = data?.length > 1;

  return (
    <div>
      {/* Tab selector */}
      <div className="flex gap-1 mb-4 bg-slate-50 p-1 rounded-lg border border-slate-100 w-fit">
        {TYPES.map(t => (
          <button key={t.key} onClick={() => handleChange(t.key)}
            className="px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150"
            style={active === t.key
              ? { background: '#003B8E', color: '#fff', boxShadow: '0 2px 6px rgba(0,59,142,0.3)' }
              : { color: '#64748B' }
            }>
            {t.label}
          </button>
        ))}
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#003B8E" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#003B8E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }}
              tickFormatter={v => { try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); } catch { return v; } }}
              axisLine={false} tickLine={false}
            />
            <YAxis tick={{ fontSize: 10, fill: '#CBD5E1' }} axisLine={false} tickLine={false} width={32} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="count" stroke="#003B8E" strokeWidth={2.5}
              fill="url(#areaGrad)"
              dot={data.length < 30 ? { fill: '#003B8E', r: 3, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: '#fff', stroke: '#003B8E', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-48 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm font-medium">Single date in data</p>
          <p className="text-slate-300 text-xs mt-0.5">Trend will appear as data spans multiple dates</p>
        </div>
      )}
    </div>
  );
}
