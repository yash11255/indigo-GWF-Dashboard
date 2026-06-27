import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BLUES = [
  '#003B8E','#0047AD','#0052CC','#005EEB','#006AFF',
  '#1A78FF','#3385FF','#4D93FF','#66A0FF','#80AEFF',
  '#003B8E','#0047AD','#0052CC','#005EEB','#006AFF',
  '#1A78FF','#3385FF','#4D93FF','#66A0FF','#80AEFF',
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-sm">
      <p className="font-semibold text-slate-800 mb-1">{payload[0].payload.state}</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-600" />
        <span className="text-slate-500">Applications:</span>
        <span className="font-bold text-blue-700">{payload[0].value.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
};

export default function StatesChart({ data }) {
  if (!data?.length) return (
    <div className="h-64 flex items-center justify-center text-slate-300 text-sm">No state data</div>
  );

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 10, left: -10, bottom: 70 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="state"
          tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }}
          angle={-45}
          textAnchor="end"
          interval={0}
          height={75}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#CBD5E1' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC', radius: 4 }} />
        <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={36}>
          {data.map((_, i) => (
            <Cell key={i} fill={BLUES[i % BLUES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
