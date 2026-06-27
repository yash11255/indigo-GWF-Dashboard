export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div
      className="flex items-center justify-between px-6 py-4 flex-shrink-0"
      style={{ borderBottom: '1px solid #DDDBDA', background: '#fff' }}
    >
      <div>
        <h1 className="font-bold text-base" style={{ color: '#181818' }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: '#706E6B' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
