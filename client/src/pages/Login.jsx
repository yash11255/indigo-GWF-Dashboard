import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
      navigate('/analytics');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row"
      style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>

      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className="hidden md:flex md:w-[52%] flex-col"
        style={{ background: '#111111', position: 'relative', overflow: 'hidden' }}>

        {/* Subtle blue glow top-right */}
        <div style={{
          position: 'absolute', top: -120, right: -80,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(15,98,254,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Subtle green glow bottom-left */}
        <div style={{
          position: 'absolute', bottom: -100, left: -60,
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(25,128,56,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Content */}
        <div className="flex flex-col h-full px-12 py-10 relative z-10">

          {/* Logo — top */}
          <div>
            <div style={{
              display: 'inline-flex', background: '#fff',
              padding: '8px 18px', borderRadius: 3,
            }}>
              <img src="/logo-png.png" alt="BharatCares"
                style={{ height: 44, width: 'auto', display: 'block' }} />
            </div>
          </div>

          {/* Main hero — centered vertically */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Blue accent */}
            <div style={{ width: 48, height: 3, background: '#0F62FE', marginBottom: 36 }} />

            <h1 style={{
              fontSize: 52, fontWeight: 800, color: '#fff',
              lineHeight: 1.05, letterSpacing: -1.5, marginBottom: 20,
            }}>
              Giving Wings<br />
              <span style={{ color: '#4589FF' }}>to Fly.</span>
            </h1>

            <p style={{
              fontSize: 15, lineHeight: 1.7, color: '#8D8D8D',
              maxWidth: 380, marginBottom: 48,
            }}>
              Scholarship Management Portal — tracking students from
              registration through to final selection, powered by
              BharatCares &amp; SMEC Trust.
            </p>

            {/* Decorative divider */}
            <div style={{
              height: 1, background: 'linear-gradient(to right, #393939, transparent)',
              width: '100%', maxWidth: 400,
            }} />
          </div>

          {/* Footer */}
          <p style={{ fontSize: 11, color: '#424242', letterSpacing: 0.3 }}>
            © 2026 BharatCares by SMEC Trust · All rights reserved
          </p>
        </div>
      </div>

      {/* ── Right panel (form) ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col" style={{ background: '#F4F4F4' }}>

        {/* Top strip with logo (mobile + desktop) */}
        <div className="flex items-center justify-between px-8 py-5"
          style={{ background: '#fff', borderBottom: '1px solid #E0E0E0' }}>
          <div style={{
            display: 'inline-flex', background: '#F4F4F4',
            padding: '5px 14px', borderRadius: 2,
          }}>
            <img src="/logo-png.png" alt="BharatCares"
              style={{ height: 36, width: 'auto', display: 'block' }} />
          </div>
          <span style={{ fontSize: 11, color: '#8D8D8D', letterSpacing: 0.5 }}>
            Scholarship Management
          </span>
        </div>

        {/* Form — vertically and horizontally centered */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div style={{ width: '100%', maxWidth: 400 }}>

            <div style={{ marginBottom: 32 }}>
              <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 2,
                textTransform: 'uppercase', color: '#0F62FE', marginBottom: 10,
              }}>
                Portal Access
              </p>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#161616', marginBottom: 6 }}>
                Sign in
              </h2>
              <p style={{ fontSize: 13, color: '#6F6F6F' }}>
                Enter your credentials to access the dashboard
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 16px', marginBottom: 24,
                background: '#FFF1F1', borderLeft: '4px solid #DA1E28',
              }}>
                <svg style={{ flexShrink: 0, marginTop: 1 }} width="16" height="16" fill="none" stroke="#DA1E28" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p style={{ fontSize: 13, color: '#DA1E28' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* Username */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  letterSpacing: 1.5, textTransform: 'uppercase',
                  color: '#525252', marginBottom: 8,
                }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required autoFocus autoComplete="username"
                  style={{
                    width: '100%', padding: '13px 16px', fontSize: 14,
                    background: '#fff', color: '#161616', outline: 'none',
                    border: '1px solid #E0E0E0', borderBottom: '2px solid #C6C6C6',
                    boxSizing: 'border-box', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#0F62FE';
                    e.target.style.borderBottomColor = '#0F62FE';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#E0E0E0';
                    e.target.style.borderBottomColor = '#C6C6C6';
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 32 }}>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  letterSpacing: 1.5, textTransform: 'uppercase',
                  color: '#525252', marginBottom: 8,
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required autoComplete="current-password"
                    style={{
                      width: '100%', padding: '13px 48px 13px 16px', fontSize: 14,
                      background: '#fff', color: '#161616', outline: 'none',
                      border: '1px solid #E0E0E0', borderBottom: '2px solid #C6C6C6',
                      boxSizing: 'border-box', transition: 'border-color 0.15s',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#0F62FE';
                      e.target.style.borderBottomColor = '#0F62FE';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#E0E0E0';
                      e.target.style.borderBottomColor = '#C6C6C6';
                    }}
                  />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPwd(v => !v)}
                    style={{
                      position: 'absolute', right: 14, top: '50%',
                      transform: 'translateY(-50%)', color: '#8D8D8D',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    }}>
                    {showPwd
                      ? <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                style={{
                  width: '100%', padding: '15px 24px',
                  fontSize: 14, fontWeight: 700, color: '#fff',
                  background: loading ? '#393939' : '#0F62FE',
                  border: 'none', cursor: loading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  opacity: (!username || !password) && !loading ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!loading && username && password) e.currentTarget.style.background = '#0043CE'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = loading ? '#393939' : '#0F62FE'; }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

          </div>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
