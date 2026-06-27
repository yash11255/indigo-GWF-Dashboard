export default function FunnelDisplay({ data }) {
  if (!data?.length) return (
    <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No data available</div>
  );

  const colors = ['#003B8E', '#0066CC', '#0099E6'];
  const widths = ['100%', '82%', '60%'];

  return (
    <div className="flex flex-col items-center gap-0 py-2">
      {data.map((item, i) => {
        const convPct = i > 0 && data[i - 1].count > 0
          ? ((item.count / data[i - 1].count) * 100).toFixed(1)
          : null;
        const overallPct = data[0].count > 0
          ? ((item.count / data[0].count) * 100).toFixed(1)
          : null;
        const w = widths[i] || '45%';
        const color = colors[i] || colors[colors.length - 1];
        const isFirst = i === 0;
        const isLast = i === data.length - 1;

        return (
          <div key={item.stage} className="w-full flex flex-col items-center">
            {/* Connector with conversion rate */}
            {convPct !== null && (
              <div className="flex items-center gap-3 py-2 w-full justify-center">
                <div className="flex-1 border-t border-dashed border-slate-200" />
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 flex-shrink-0">
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {convPct}% conversion
                </div>
                <div className="flex-1 border-t border-dashed border-slate-200" />
              </div>
            )}

            {/* Funnel bar */}
            <div style={{ width: w, transition: 'width 0.6s ease' }}>
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{
                  background: item.count === 0
                    ? 'repeating-linear-gradient(45deg,#F8FAFC,#F8FAFC 6px,#F1F5F9 6px,#F1F5F9 12px)'
                    : `linear-gradient(135deg, ${color}ee, ${color})`,
                  borderRadius: isFirst ? '12px 12px 0 0' : isLast ? '0 0 12px 12px' : '0',
                  borderTop: !isFirst ? `1px solid rgba(255,255,255,0.15)` : 'none',
                  minHeight: '52px',
                }}
              >
                <div>
                  <p className={`font-semibold text-sm ${item.count === 0 ? 'text-slate-400' : 'text-white'}`}>
                    {item.stage}
                  </p>
                  {!isFirst && overallPct && item.count > 0 && (
                    <p className="text-white/70 text-xs mt-0.5">{overallPct}% of total</p>
                  )}
                  {item.count === 0 && (
                    <p className="text-slate-300 text-xs mt-0.5">Awaiting data</p>
                  )}
                </div>
                <p className={`text-xl font-bold ${item.count === 0 ? 'text-slate-300' : 'text-white'}`}>
                  {item.count.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
