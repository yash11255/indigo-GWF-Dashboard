import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// BharatCares logo — uses /bharatcares-logo.png if available, else SVG fallback
function BharatCaresLogo({ size = 48 }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (!imgFailed) {
    return (
      <img
        src="/bharatcares-logo.png"
        alt="BharatCares"
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
        onError={() => setImgFailed(true)}
      />
    );
  }
  // SVG fallback matching BharatCares 4-square mark
  const s = size;
  const q = Math.round(s * 0.42);
  const g = Math.round(s * 0.16);
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      <rect x="0"  y="0"  width="44" height="44" rx="3" fill="#00AEEF"/>
      <rect x="56" y="0"  width="44" height="44" rx="3" fill="#F7941D"/>
      <rect x="0"  y="56" width="44" height="44" rx="3" fill="#39B54A"/>
      <rect x="56" y="56" width="44" height="44" rx="3" fill="#0072BC"/>
    </svg>
  );
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row"
      style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>

      {/* ── Left panel (brand) ─────────────────────────────────── */}
      <div className="hidden md:flex md:w-2/5 lg:w-1/2 flex-col justify-between p-10 lg:p-14"
        style={{ background: '#161616' }}>

        {/* Brand */}
        <div className="flex items-center gap-4">
          <BharatCaresLogo size={40} />
          <div>
            <p className="font-bold text-white text-base leading-none">BharatCares</p>
            <p className="text-[11px] font-medium tracking-widest uppercase mt-0.5"
              style={{ color: '#6F6F6F' }}>by SMEC Trust · IndiGo</p>
          </div>
        </div>

        {/* Main copy */}
        <div>
          <div className="mb-6">
            <div className="w-12 h-1 mb-8" style={{ background: '#0F62FE' }} />
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              Giving Wings<br />to Fly
            </h1>
            <p className="text-base leading-relaxed" style={{ color: '#8D8D8D' }}>
              Scholarship Management Dashboard for the IndiGo &amp; BharatCares
              pilot scholarship programme — tracking applicants from registration
              to selection.
            </p>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4 pt-8"
            style={{ borderTop: '1px solid #393939' }}>
            {[
              { n: '1,820', l: 'Registered' },
              { n: '1,796', l: 'Drafts' },
              { n: '728',   l: 'Applied' },
            ].map(s => (
              <div key={s.l}>
                <p className="text-2xl font-bold text-white">{s.n}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6F6F6F' }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: '#525252' }}>
          © 2026 BharatCares · IndiGo Reach · All rights reserved
        </p>
      </div>

      {/* ── Right panel (form) ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 md:px-12 lg:px-20"
        style={{ background: '#F4F4F4' }}>

        {/* Mobile brand header */}
        <div className="flex items-center gap-3 mb-10 md:hidden">
          <BharatCaresLogo size={36} />
          <div>
            <p className="font-bold text-sm leading-none" style={{ color: '#161616' }}>BharatCares</p>
            <p className="text-[10px] font-medium tracking-widest uppercase mt-0.5"
              style={{ color: '#8D8D8D' }}>IndiGo · Giving Wings to Fly</p>
          </div>
        </div>

        <div className="w-full max-w-sm">

          <div className="mb-8">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2"
              style={{ color: '#0F62FE' }}>Portal Access</p>
            <h2 className="text-2xl font-bold" style={{ color: '#161616' }}>Sign in</h2>
            <p className="text-sm mt-1" style={{ color: '#6F6F6F' }}>
              Use your assigned credentials to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 p-4"
              style={{ background: '#FFF1F1', borderLeft: '4px solid #DA1E28' }}>
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="#DA1E28" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm" style={{ color: '#DA1E28' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-0">

            {/* Username */}
            <div className="mb-6">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: '#525252' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. admin"
                required
                autoFocus
                autoComplete="username"
                className="w-full px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: '#fff',
                  border: '1px solid #E0E0E0',
                  borderBottom: '2px solid #8D8D8D',
                  color: '#161616',
                }}
                onFocus={e => { e.target.style.borderBottomColor = '#0F62FE'; e.target.style.borderColor = '#0F62FE'; }}
                onBlur={e  => { e.target.style.borderBottomColor = '#8D8D8D'; e.target.style.borderColor = '#E0E0E0'; e.target.style.borderBottomColor = '#8D8D8D'; }}
              />
            </div>

            {/* Password */}
            <div className="mb-8">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: '#525252' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 text-sm outline-none transition-all"
                  style={{
                    background: '#fff',
                    border: '1px solid #E0E0E0',
                    borderBottom: '2px solid #8D8D8D',
                    color: '#161616',
                  }}
                  onFocus={e => { e.target.style.borderBottomColor = '#0F62FE'; e.target.style.borderColor = '#0F62FE'; }}
                  onBlur={e  => { e.target.style.borderBottomColor = '#8D8D8D'; e.target.style.borderColor = '#E0E0E0'; e.target.style.borderBottomColor = '#8D8D8D'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: '#8D8D8D' }}
                  tabIndex={-1}
                >
                  {showPwd
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: loading ? '#393939' : '#0F62FE' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Credentials hint */}
          <div className="mt-8 p-4" style={{ background: '#E0E0E0' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#525252' }}>
              Default credentials
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#6F6F6F' }}>Admin</span>
                <span className="font-mono text-xs" style={{ color: '#161616' }}>admin / indigo@2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#6F6F6F' }}>Client</span>
                <span className="font-mono text-xs" style={{ color: '#161616' }}>client / client@2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
