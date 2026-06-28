import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TopNavBar from '../components/layout/TopNavBar';
import PageHeader from '../components/layout/Header';
import Analytics from './Analytics';
import Settings from './Settings';
import DataTable from '../components/DataTable';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

// ─── Generic table page ───────────────────────────────────────────────────────
function TablePage({ type, title, subtitle }) {
  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: '#F3F2F2' }}>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="bg-white rounded-lg"
          style={{ border: '1px solid #DDDBDA', boxShadow: '0 2px 2px rgba(0,0,0,0.05)' }}>
          <DataTable type={type} />
        </div>
      </div>
    </div>
  );
}

// ─── Applied page ─────────────────────────────────────────────────────────────
function AppliedPage() {
  const [statusData, setStatusData] = useState(null);

  useState(() => {
    api.get('/data/applied-status')
      .then(r => setStatusData(r.data))
      .catch(() => {});
  }, []);

  const statusStyle = {
    Pending:        { dot: '#F5C342', text: '#A56600' },
    'Under Review': { dot: '#0176D3', text: '#0176D3' },
    Approved:       { dot: '#2E844A', text: '#2E844A' },
    Rejected:       { dot: '#C23934', text: '#C23934' },
  };

  const total = statusData?.reduce((s, d) => s + d.count, 0) || 0;

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: '#F3F2F2' }}>
      <PageHeader
        title="Applied Applications"
        subtitle="Students who have submitted their final scholarship application"
      />
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {statusData?.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statusData.map(s => {
              const st = statusStyle[s.status] || { dot: '#9E9E9E', text: '#3E3E3C' };
              const pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : 0;
              return (
                <div key={s.status} className="bg-white rounded-lg p-4"
                  style={{ border: '1px solid #DDDBDA', borderTop: `3px solid ${st.dot}` }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: st.dot }} />
                    <span className="text-xs font-semibold" style={{ color: st.text }}>{s.status}</span>
                  </div>
                  <p className="text-3xl font-bold" style={{ color: '#181818' }}>
                    {s.count.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#706E6B' }}>{pct}% of total</p>
                </div>
              );
            })}
          </div>
        )}
        <div className="bg-white rounded-lg"
          style={{ border: '1px solid #DDDBDA', boxShadow: '0 2px 2px rgba(0,0,0,0.05)' }}>
          <DataTable type="applied" />
        </div>
      </div>
    </div>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col">
      <TopNavBar onReload={() => setRefreshKey(k => k + 1)} />
      <div className="flex-1 flex flex-col min-h-0">
        <Routes>
          <Route index element={<Navigate to="/analytics" replace />} />
          <Route path="analytics" element={<Analytics key={refreshKey} />} />
          <Route path="drafts" element={isAdmin
            ? <TablePage type="drafts" title="Draft Applications"
                subtitle="Students who started their scholarship application" />
            : <Navigate to="/analytics" replace />
          } />
          <Route path="applied" element={isAdmin ? <AppliedPage /> : <Navigate to="/analytics" replace />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/analytics" replace />} />
        </Routes>
      </div>
    </div>
  );
}
