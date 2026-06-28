import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { getDateRange, setDateRange, onDateRangeChange } from '../../utils/dateRange';

const ADMIN_NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/registered', label: 'Registered' },
  { to: '/drafts', label: 'Draft Applications' },
  { to: '/applied', label: 'Applied' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/draft-analysis', label: 'Draft Analysis' },
  { to: '/calling', label: 'Calling Tracker' },
  { to: '/settings', label: 'Settings' },
];

const CLIENT_NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/analytics', label: 'Analytics' },
  { to: '/draft-analysis', label: 'Draft Analysis' },
  { to: '/settings', label: 'Settings' },
];

// BharatCares brand logo — uses image if available
function BrandLogo({ compact = false }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div className="flex items-center gap-2 select-none flex-shrink-0">
      {!imgFailed
        ? <img src="/bharatcares-logo.png" alt="BharatCares" height={28} className="h-7 w-auto object-contain"
            onError={() => setImgFailed(true)} />
        : (
          <svg width="30" height="30" viewBox="0 0 100 100" fill="none">
            <rect x="0"  y="0"  width="44" height="44" rx="3" fill="#00AEEF"/>
            <rect x="56" y="0"  width="44" height="44" rx="3" fill="#F7941D"/>
            <rect x="0"  y="56" width="44" height="44" rx="3" fill="#39B54A"/>
            <rect x="56" y="56" width="44" height="44" rx="3" fill="#0072BC"/>
          </svg>
        )
      }
      {!compact && (
        <div className="leading-tight hidden sm:block">
          <div className="font-bold text-sm leading-none text-white">IndiGo — Giving Wings to Fly</div>
          <div className="text-[9px] font-medium tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Scholarship Management System
          </div>
        </div>
      )}
    </div>
  );
}

export default function TopNavBar({ onReload }) {
  const { user, logout } = useAuth();
  const isAdmin  = user?.role === 'admin';
  const NAV      = isAdmin ? ADMIN_NAV : CLIENT_NAV;
  const location = useLocation();

  const [reloading, setReloading]   = useState(false);
  const [reloadMsg, setReloadMsg]   = useState('');
  const [showUser, setShowUser]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dateRange, setLocalRange]  = useState(getDateRange());
  const menuRef = useRef(null);

  // Sync global date range changes to local state
  useEffect(() => onDateRangeChange(setLocalRange), []);

  const handleDateChange = (field, value) => {
    const next = { ...dateRange, [field]: value };
    setLocalRange(next);
    setDateRange(next.from, next.to);
    if (onReload) onReload();
  };

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUser(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleReload = async () => {
    setReloading(true);
    setReloadMsg('');
    try {
      await api.post('/data/reload');
      setReloadMsg('Synced');
      if (onReload) onReload();
    } catch {
      setReloadMsg('Failed');
    } finally {
      setReloading(false);
      setTimeout(() => setReloadMsg(''), 3000);
    }
  };

  return (
    <div className="flex-shrink-0 relative z-40"
      style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>

      {/* ── Primary bar ─────────────────────────────────────────── */}
      <div className="flex items-center px-4 sm:px-5 h-12" style={{ background: '#161616' }}>
        <BrandLogo />

        <div className="flex-1" />

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-3">
          {reloadMsg && (
            <span className="text-xs font-medium px-2 py-1"
              style={{ background: 'rgba(255,255,255,0.08)', color: reloadMsg === 'Synced' ? '#42BE65' : '#FA4D56' }}>
              {reloadMsg === 'Synced' ? '✓ Synced' : '✗ Failed'}
            </span>
          )}
          {isAdmin && (
            <button
              onClick={handleReload}
              disabled={reloading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#C6C6C6', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <svg className={`w-3 h-3 ${reloading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {reloading ? 'Refreshing…' : 'Refresh'}
            </button>
          )}

          {/* User dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUser(v => !v)}
              className="flex items-center gap-2 px-2.5 py-1.5 transition-all"
              style={{ background: showUser ? 'rgba(255,255,255,0.12)' : 'transparent' }}
            >
              <div className="w-6 h-6 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                style={{ background: '#0F62FE' }}>
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium" style={{ color: '#C6C6C6' }}>{user?.name}</span>
              <svg className="w-3 h-3" style={{ color: '#6F6F6F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUser && (
              <div className="absolute right-0 top-full w-44 z-50"
                style={{ background: '#262626', border: '1px solid #393939', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #393939' }}>
                  <p className="text-xs font-semibold text-white">{user?.name}</p>
                  <p className="text-xs capitalize" style={{ color: '#8D8D8D' }}>{user?.role}</p>
                </div>
                <button
                  onClick={() => { setShowUser(false); logout(); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-2"
                  style={{ color: '#FA4D56' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(250,77,86,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: '#0F62FE' }}>
            {(user?.name || 'A').charAt(0).toUpperCase()}
          </div>
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="p-2 flex items-center justify-center"
            style={{ color: '#C6C6C6' }}
          >
            {mobileOpen
              ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            }
          </button>
        </div>
      </div>

      {/* ── Desktop sub-navigation ──────────────────────────────── */}
      <div
        className="hidden md:flex items-end px-5"
        style={{ background: '#262626', borderBottom: '1px solid #393939' }}
      >
        <div className="flex overflow-x-auto">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `subnav-tab ${isActive ? 'active' : ''}`}
              style={({ isActive }) => isActive
                ? { color: '#78A9FF', borderBottomColor: '#78A9FF', background: 'rgba(120,169,255,0.08)' }
                : { color: '#C6C6C6', borderBottomColor: 'transparent' }}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 py-1.5 flex-shrink-0">
          {/* Date range picker */}
          <div className="flex items-center gap-1.5 px-2 py-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #393939' }}>
            <svg className="w-3 h-3 flex-shrink-0" style={{ color: '#8D8D8D' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="date"
              value={dateRange.from}
              onChange={e => handleDateChange('from', e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#C6C6C6', fontSize: 11, width: 98 }}
            />
            <span style={{ color: '#525252', fontSize: 11 }}>–</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => handleDateChange('to', e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#C6C6C6', fontSize: 11, width: 98 }}
            />
          </div>
          <div className="w-px h-4" style={{ background: '#393939' }} />
          <LiveBadge />
        </div>
      </div>

      {/* ── Mobile slide-down menu ──────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden" style={{ background: '#262626', borderBottom: '1px solid #393939' }}>
          {/* Nav links */}
          <div className="py-1">
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="block px-5 py-3 text-sm font-medium transition-all"
                style={({ isActive }) => ({
                  color: isActive ? '#78A9FF' : '#C6C6C6',
                  background: isActive ? 'rgba(120,169,255,0.08)' : 'transparent',
                  borderLeft: isActive ? '3px solid #78A9FF' : '3px solid transparent',
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Mobile bottom actions */}
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid #393939' }}>
            <div className="flex items-center gap-2">
              <LiveBadge />
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => { handleReload(); setMobileOpen(false); }}
                  disabled={reloading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#C6C6C6', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <svg className={`w-3 h-3 ${reloading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="px-2.5 py-1.5 text-xs font-medium"
                style={{ color: '#FA4D56', border: '1px solid rgba(250,77,86,0.3)' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveBadge() {
  const [mode, setMode] = useState(null);
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    api.get('/data/settings/mode').then(r => setMode(r.data)).catch(() => {});
  }, [user]);

  if (!mode) return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#42BE65' }} />
      <span className="text-xs" style={{ color: '#6F6F6F' }}>Live</span>
    </div>
  );
  if (mode.mockMode) return (
    <div className="flex items-center gap-1.5 px-2 py-0.5" style={{ background: 'rgba(255,131,43,0.15)' }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF832B' }} />
      <span className="text-xs font-semibold" style={{ color: '#FF832B' }}>Mock</span>
    </div>
  );
  if (mode.apiMode) return (
    <div className="flex items-center gap-1.5 px-2 py-0.5" style={{ background: 'rgba(15,98,254,0.15)' }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#78A9FF' }} />
      <span className="text-xs font-semibold" style={{ color: '#78A9FF' }}>API</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#42BE65' }} />
      <span className="text-xs" style={{ color: '#6F6F6F' }}>Live</span>
    </div>
  );
}
