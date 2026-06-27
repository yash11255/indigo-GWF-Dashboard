import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#003B8E', '#0066CC', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const total = payload[0].payload.total;
  const pct = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-sm">
      <p className="font-semibold text-slate-800 mb-0.5">{payload[0].name}</p>
      <p className="text-blue-700 font-bold">{payload[0].value.toLocaleString('en-IN')}</p>
      <p className="text-slate-400 text-xs">{pct}% of total</p>
    </div>
  );
};

export default function CategoryChart({ data }) {
  if (!data?.length) return (
    <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No data</div>
  );

  const total = data.reduce((s, d) => s + d.count, 0);
  const enriched = data.map(d => ({ ...d, total, name: d.category }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={enriched} cx="50%" cy="50%" innerRadius={42} outerRadius={70}
            dataKey="count" nameKey="category" paddingAngle={3} strokeWidth={0}>
            {enriched.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
        {enriched.map((d, i) => (
          <div key={d.category} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-slate-500 text-xs">{d.category}</span>
            <span className="text-slate-700 text-xs font-semibold">{d.count.toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
