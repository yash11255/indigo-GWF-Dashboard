export default function StatCard({ title, value, subtitle, icon, color = 'blue', bar }) {
  const scheme = {
    blue:   { accent: '#0F62FE', iconBg: '#EDF5FF', iconColor: '#0F62FE', border: '#0F62FE' },
    green:  { accent: '#198038', iconBg: '#DEFBE6', iconColor: '#198038', border: '#198038' },
    purple: { accent: '#8A3FFC', iconBg: '#F6F2FF', iconColor: '#8A3FFC', border: '#8A3FFC' },
    amber:  { accent: '#B28600', iconBg: '#FCF4D6', iconColor: '#B28600', border: '#B28600' },
    sky:    { accent: '#0072C3', iconBg: '#E5F6FF', iconColor: '#0072C3', border: '#0072C3' },
    teal:   { accent: '#007D79', iconBg: '#D9FBFB', iconColor: '#007D79', border: '#007D79' },
    red:    { accent: '#DA1E28', iconBg: '#FFF1F1', iconColor: '#DA1E28', border: '#DA1E28' },
  };
  const s = scheme[color] || scheme.blue;
  const fmt = typeof value === 'number' ? value.toLocaleString('en-IN') : value;

  return (
    <div className="bg-white flex flex-col"
      style={{ border: '1px solid #E0E0E0', borderLeft: `3px solid ${s.accent}` }}>
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#525252' }}>
          {title}
        </p>
        {icon && (
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0"
            style={{ background: s.iconBg }}>
            <span style={{ color: s.iconColor }} className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>
          </div>
        )}
      </div>
      <div className="px-4 pb-1">
        <p className="font-bold leading-none" style={{ fontSize: '2rem', color: '#161616' }}>{fmt}</p>
      </div>
      {subtitle && (
        <p className="px-4 pb-3 text-xs" style={{ color: '#6F6F6F' }}>{subtitle}</p>
      )}
      {bar !== undefined && (
        <div className="px-4 pb-3 mt-auto">
          <div className="h-1" style={{ background: '#E0E0E0' }}>
            <div className="h-1 transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, bar))}%`, background: s.accent }} />
          </div>
        </div>
      )}
    </div>
  );
}
