'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Building2, ShoppingBag, Bike, Users, AlertCircle, Phone } from 'lucide-react';
import { apiPost, setToken } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';

// apiClient auto-unwraps the { success, data, meta } envelope
type LoginResp = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  userId: string;
  actorContext: { role: string; userId: string; phone: string };
};

const STATS = [
  { icon: ShoppingBag, label: 'Orders today',     value: '1,284' },
  { icon: Bike,        label: 'Active riders',    value: '87' },
  { icon: Users,       label: 'Registered users', value: '3,240' },
];

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!phone || !password) { setError('Phone number and password are required.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await apiPost<LoginResp>(ep.login, { phone, password }, { 'X-App-Client': 'admin' });
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
    <div className="min-h-screen flex" style={{ background: '#F0EFFB' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between p-10 flex-shrink-0"
        style={{ width: 420, background: '#5B4FE9' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl"
            style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.18)' }}>
            <Building2 size={22} color="#fff" />
          </div>
          <div>
            <div className="font-extrabold" style={{ fontSize: 18, color: '#fff' }}>WerTe</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Admin panel</div>
          </div>
        </div>

        <div>
          <div className="font-extrabold mb-3" style={{ fontSize: 28, color: '#fff', lineHeight: 1.25 }}>
            Manage your<br />delivery platform<br />from one place.
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
            Real-time orders, merchant approvals,<br />
            rider management, and full analytics<br />
            — all in a single dashboard.
          </div>
        </div>

        <div className="space-y-3">
          {STATS.map(s => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)' }}>
                <s.icon size={15} color="#fff" />
              </div>
              <div>
                <div className="font-extrabold" style={{ fontSize: 16, color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
          © 2026 WerTe · Yangon, Myanmar
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full" style={{ maxWidth: 380 }}>
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex items-center justify-center rounded-lg"
              style={{ width: 34, height: 34, background: '#5B4FE9' }}>
              <Building2 size={18} color="#fff" />
            </div>
            <span className="font-extrabold" style={{ fontSize: 16, color: '#1A1730' }}>WerTe Admin</span>
          </div>

          <div className="mb-7">
            <div className="font-extrabold mb-1" style={{ fontSize: 22, color: '#1A1730' }}>Welcome back</div>
            <div style={{ fontSize: 13, color: '#8A88A8' }}>Sign in to your admin account</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone */}
            <div>
              <label className="block mb-1.5 font-semibold" style={{ fontSize: 11, color: '#4A4770' }}>
                Phone number
              </label>
              <div className="relative">
                <Phone size={13} style={{ color: '#8A88A8', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel"
                  placeholder="+959000000001"
                  autoComplete="tel"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setError(''); }}
                  className="w-full rounded-xl py-2.5 outline-none transition-all"
                  style={{
                    paddingLeft: 32,
                    paddingRight: 14,
                    fontSize: 13,
                    background: '#fff',
                    border: `1.5px solid ${hasError ? '#D84040' : '#E8E6F8'}`,
                    color: '#1A1730',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block mb-1.5 font-semibold" style={{ fontSize: 11, color: '#4A4770' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="w-full rounded-xl px-3.5 py-2.5 outline-none transition-all"
                  style={{
                    paddingRight: 40,
                    fontSize: 13,
                    background: '#fff',
                    border: `1.5px solid ${hasError ? '#D84040' : '#E8E6F8'}`,
                    color: '#1A1730',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  tabIndex={-1}
                >
                  {showPw
                    ? <EyeOff size={15} style={{ color: '#8A88A8' }} />
                    : <Eye    size={15} style={{ color: '#8A88A8' }} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {hasError && (
              <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
                style={{ background: '#FFF0F0', border: '1px solid #FFD0D0' }}>
                <AlertCircle size={13} style={{ color: '#D84040', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#D84040' }}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-2.5 font-bold flex items-center justify-center gap-2"
              style={{
                fontSize: 13,
                background: '#5B4FE9',
                color: '#fff',
                opacity: loading ? 0.7 : 1,
                marginTop: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading && (
                <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#ffffff44" strokeWidth="3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 rounded-xl px-4 py-3" style={{ background: '#EEF0FF', border: '1px solid #C8C4F8' }}>
            <div className="font-semibold mb-0.5" style={{ fontSize: 11, color: '#5B4FE9' }}>Admin access only</div>
            <div style={{ fontSize: 10, color: '#8A88A8', lineHeight: 1.6 }}>
              This portal is restricted to authorized WerTe administrators.
              Contact your super admin if you need access.
            </div>
          </div>

          <div className="mt-6 text-center" style={{ fontSize: 10, color: '#8A88A8' }}>
            © 2026 WerTe · Yangon, Myanmar
          </div>
        </div>
      </div>
    </div>
  );
}
