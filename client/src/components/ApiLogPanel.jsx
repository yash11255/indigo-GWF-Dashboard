import { useState, useEffect } from 'react';

// Module-level log store so interceptors can push into it
export const apiLogs = [];
export const logListeners = new Set();

export function pushLog(entry) {
  apiLogs.unshift(entry);
  if (apiLogs.length > 50) apiLogs.length = 50;
  logListeners.forEach(fn => fn([...apiLogs]));
}

export default function ApiLogPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState([...apiLogs]);

  useEffect(() => {
    logListeners.add(setLogs);
    return () => logListeners.delete(setLogs);
  }, []);

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: '#161616', color: '#fff', border: '1px solid #393939',
          padding: '6px 12px', cursor: 'pointer', borderRadius: 2,
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: logs.some(l => l.status >= 400 || l.status === 'ERR') ? '#fa4d56' : '#42be65', display: 'inline-block' }} />
        API Logs ({logs.length})
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: 40, right: 0,
          width: 480, maxHeight: 400, overflowY: 'auto',
          background: '#161616', border: '1px solid #393939',
          borderRadius: 2, padding: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#8d8d8d' }}>
            <span>API Log</span>
            <button onClick={() => { apiLogs.length = 0; setLogs([]); }} style={{ background: 'none', border: 'none', color: '#8d8d8d', cursor: 'pointer', fontSize: 11 }}>Clear</button>
          </div>
          {logs.length === 0 && <div style={{ color: '#525252', padding: 8 }}>No requests yet</div>}
          {logs.map((log, i) => (
            <div key={i} style={{ borderBottom: '1px solid #262626', padding: '4px 0', marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  color: log.status >= 400 || log.status === 'ERR' ? '#fa4d56' : log.status >= 300 ? '#f1c21b' : '#42be65',
                  minWidth: 36,
                }}>
                  {log.status}
                </span>
                <span style={{ color: '#a8a8ff', minWidth: 40 }}>{log.method}</span>
                <span style={{ color: '#c6c6c6', wordBreak: 'break-all' }}>{log.url}</span>
                <span style={{ color: '#525252', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{log.ms}ms</span>
              </div>
              {log.error && (
                <div style={{ color: '#fa4d56', paddingLeft: 80, marginTop: 2, wordBreak: 'break-all' }}>{log.error}</div>
              )}
              {log.data && (
                <div style={{ color: '#8d8d8d', paddingLeft: 80, marginTop: 2, wordBreak: 'break-all', maxHeight: 60, overflow: 'hidden' }}>
                  {JSON.stringify(log.data).slice(0, 200)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
