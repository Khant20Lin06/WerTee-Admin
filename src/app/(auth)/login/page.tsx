'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, EyeOff, Building2,
  AlertCircle, Phone, ArrowRight, Shield,
  CheckCircle2, Clock, TrendingUp,
} from 'lucide-react';
import { apiPost, setToken } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';

type LoginResp = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  userId: string;
  actorContext: { role: string; userId: string; phone: string };
};

const FEED = [
  { dot: '#4ADE80', label: 'Order #ORD-9075',   meta: 'Delivered · 2m ago'    },
  { dot: '#60A5FA', label: 'Rider assigned',     meta: 'Ko Mg Mg · 5m ago'    },
  { dot: '#FACC15', label: 'New merchant',        meta: 'Pending review · 8m'  },
  { dot: '#4ADE80', label: 'Order #ORD-9074',   meta: 'Completed · 11m ago'   },
  { dot: '#F87171', label: 'Order cancelled',    meta: 'Refund initiated · 14m'},
];

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [phoneFocus, setPhoneFocus]   = useState(false);
  const [passFocus, setPassFocus]     = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const phoneTrimmed = phone.trim();
    const pwTrimmed    = password.trim();
    if (!phoneTrimmed || !pwTrimmed) { setError('Phone number and password are required.'); return; }
    if (phoneTrimmed.length < 6 || phoneTrimmed.length > 20) { setError('Enter a valid phone number.'); return; }
    if (pwTrimmed.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await apiPost<LoginResp>(ep.login, { phone: phoneTrimmed, password: pwTrimmed }, { 'X-App-Client': 'admin' });
      if (res.actorContext.role !== 'ADMIN') {
        setError('Access denied. This portal is for admin accounts only.');
        return;
      }
      setToken(res.accessToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const hasError = Boolean(error);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>

      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between p-10 flex-shrink-0 relative overflow-hidden"
        style={{ width: 440, background: 'linear-gradient(145deg, #4F3FD4 0%, #6B5FE9 50%, #8B72F8 100%)' }}
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', top: -80, right: -80, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: 120, left: -60, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', bottom: -30, right: 40, pointerEvents: 'none' }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div className="flex items-center justify-center rounded-2xl"
            style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <Building2 size={22} color="#fff" />
          </div>
          <div>
            <div className="font-extrabold tracking-tight" style={{ fontSize: 18, color: '#fff' }}>WerTe</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>Admin Panel</div>
          </div>
        </div>

        {/* Headline */}
        <div className="relative">
          <div className="font-extrabold mb-4 tracking-tight" style={{ fontSize: 30, color: '#fff', lineHeight: 1.2 }}>
            Manage your<br />
            delivery platform<br />
            <span style={{ color: 'rgba(255,255,255,0.65)' }}>from one place.</span>
          </div>

          {/* Live activity feed */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(14px)' }}>
            <div className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2">
                <div className="rounded-full"
                  style={{ width: 6, height: 6, background: '#4ADE80', boxShadow: '0 0 6px #4ADE80', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
                  LIVE ACTIVITY
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={9} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>just now</span>
              </div>
            </div>

            {FEED.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div className="rounded-full flex-shrink-0"
                  style={{ width: 7, height: 7, background: f.dot, boxShadow: `0 0 5px ${f.dot}88` }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', flex: 1 }}>{f.label}</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>{f.meta}</span>
              </div>
            ))}

            <div className="flex items-center justify-between px-4 py-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={10} color="#4ADE80" />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>All systems operational</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp size={9} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>+12% today</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }} className="relative">
          © 2026 WerTe · Yangon, Myanmar
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">

        {/* Subtle grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, var(--brand)12 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        <div className="w-full relative" style={{ maxWidth: 400 }}>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex items-center justify-center rounded-xl"
              style={{ width: 36, height: 36, background: 'var(--brand)' }}>
              <Building2 size={18} color="#fff" />
            </div>
            <span className="font-extrabold tracking-tight" style={{ fontSize: 16, color: 'var(--text-primary)' }}>WerTe Admin</span>
          </div>

          {/* Card */}
          <div className="rounded-3xl p-8" style={{
            background: 'var(--bg-card)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--brand-border)',
          }}>
            {/* Header */}
            <div className="mb-7">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4"
                style={{ background: 'var(--brand-muted)', border: '1px solid var(--brand-border)' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--brand)' }} />
                <span style={{ fontSize: 10, color: 'var(--brand)', fontWeight: 700, letterSpacing: '0.06em' }}>
                  SECURE LOGIN
                </span>
              </div>
              <div className="font-extrabold tracking-tight mb-1" style={{ fontSize: 24, color: 'var(--text-primary)' }}>
                Welcome back
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sign in to your admin account</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Phone */}
              <div>
                <label className="block mb-1.5 font-semibold" style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                  PHONE NUMBER
                </label>
                <div className="relative">
                  <Phone size={13} style={{
                    color: phoneFocus ? 'var(--brand)' : 'var(--text-faint)',
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)', transition: 'color 0.2s',
                  }} />
                  <input
                    type="tel"
                    placeholder="+959000000001"
                    autoComplete="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setError(''); }}
                    onFocus={() => setPhoneFocus(true)}
                    onBlur={() => setPhoneFocus(false)}
                    style={{
                      width: '100%',
                      paddingLeft: 36, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
                      fontSize: 13,
                      background: phoneFocus ? 'var(--bg-card)' : 'var(--bg-subtle)',
                      border: `1.5px solid ${hasError ? 'var(--danger)' : phoneFocus ? 'var(--brand)' : 'var(--border)'}`,
                      borderRadius: 12,
                      color: 'var(--text-primary)',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxShadow: phoneFocus ? '0 0 0 3px rgba(91,79,233,0.1)' : 'none',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold" style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                    PASSWORD
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    onFocus={() => setPassFocus(true)}
                    onBlur={() => setPassFocus(false)}
                    style={{
                      width: '100%',
                      paddingLeft: 14, paddingRight: 44, paddingTop: 11, paddingBottom: 11,
                      fontSize: 13,
                      background: passFocus ? 'var(--bg-card)' : 'var(--bg-subtle)',
                      border: `1.5px solid ${hasError ? 'var(--danger)' : passFocus ? 'var(--brand)' : 'var(--border)'}`,
                      borderRadius: 12,
                      color: 'var(--text-primary)',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxShadow: passFocus ? '0 0 0 3px rgba(91,79,233,0.1)' : 'none',
                    }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                    {showPw
                      ? <EyeOff size={15} style={{ color: 'var(--text-muted)' }} />
                      : <Eye    size={15} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {hasError && (
                <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3"
                  style={{ background: 'var(--danger-bg)', border: '1px solid #FED7D7', animation: 'fadeIn 0.2s ease' }}>
                  <AlertCircle size={13} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: 'var(--danger)', lineHeight: 1.5 }}>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} style={{
                width: '100%',
                paddingTop: 12, paddingBottom: 12, marginTop: 8,
                borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: loading ? '#8C82EE' : 'linear-gradient(135deg, var(--brand) 0%, #7B6EF8 100%)',
                color: '#fff', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 14px rgba(91,79,233,0.4)',
                transition: 'all 0.2s',
                letterSpacing: '0.02em',
              }}>
                {loading ? (
                  <>
                    <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>Sign in <ArrowRight size={14} /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5" style={{ height: 1, background: 'var(--border)' }} />

            {/* Admin notice */}
            <div className="flex items-start gap-3 rounded-xl px-3.5 py-3"
              style={{ background: 'var(--brand-muted)', border: '1px solid var(--brand-border)' }}>
              <Shield size={13} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="font-semibold mb-0.5" style={{ fontSize: 11, color: 'var(--brand-hover)' }}>
                  Admin access only
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  This portal is restricted to authorized WerTe administrators.
                  Contact your super admin if you need access.
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 text-center" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            © 2026 WerTe · Yangon, Myanmar
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        input::placeholder { color: var(--text-faint); }
      `}</style>
    </div>
  );
}
