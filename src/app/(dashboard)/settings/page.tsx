'use client';

import { useState } from 'react';
import { Settings, Users, Key, Save, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

type Tab = 'platform' | 'admins' | 'apikeys';

type AdminUser = { id: string; name: string; email: string; role: string; lastActive: string };
type ApiKey = { id: string; name: string; key: string; createdAt: string; lastUsed: string };

const ADMINS: AdminUser[] = [
  { id: '1', name: 'Super Admin',   email: 'admin@werte.mm',    role: 'SUPER_ADMIN', lastActive: '2 min ago' },
  { id: '2', name: 'Ops Manager',   email: 'ops@werte.mm',      role: 'OPS_ADMIN',   lastActive: '1h ago' },
  { id: '3', name: 'Finance Admin', email: 'finance@werte.mm',  role: 'FINANCE_ADMIN', lastActive: '3h ago' },
];

const APIKEYS: ApiKey[] = [
  { id: '1', name: 'Mobile App Key',    key: 'wrt_live_sk_xYZ...', createdAt: '2024-01-10', lastUsed: '5 min ago' },
  { id: '2', name: 'Dashboard Webhook', key: 'wrt_live_wh_aBc...', createdAt: '2024-03-22', lastUsed: '1d ago' },
];

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  SUPER_ADMIN:   { bg: '#EEF0FF', color: '#5B4FE9' },
  OPS_ADMIN:     { bg: '#FFF8E8', color: '#D4820A' },
  FINANCE_ADMIN: { bg: '#E8FAF2', color: '#16A660' },
};

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('platform');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [config, setConfig] = useState({
    platformName: 'WerTe',
    commissionRate: '18',
    defaultDeliveryFee: '1500',
    orderTimeout: '30',
    maxRidersPerZone: '50',
    maintenanceMode: false,
  });

  function update(k: keyof typeof config, v: string | boolean) {
    setConfig(c => ({ ...c, [k]: v }));
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'platform', label: 'Platform', icon: Settings },
    { key: 'admins',   label: 'Admin users', icon: Users },
    { key: 'apikeys',  label: 'API keys', icon: Key },
  ];

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 rounded-card p-1" style={{ background: '#fff', border: '1px solid #E8E6F8', width: 'fit-content' }}>
        {tabs.map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold"
              style={{ fontSize: 11, background: active ? '#5B4FE9' : 'transparent', color: active ? '#fff' : '#4A4770' }}>
              <t.icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Platform settings */}
      {tab === 'platform' && (
        <div className="rounded-card p-5 space-y-4" style={{ background: '#fff', border: '1px solid #E8E6F8', maxWidth: 540 }}>
          <div className="font-bold" style={{ fontSize: 13, color: '#1A1730' }}>Platform configuration</div>
          {[
            { label: 'Platform name', key: 'platformName', type: 'text' },
            { label: 'Commission rate (%)', key: 'commissionRate', type: 'number' },
            { label: 'Default delivery fee (MMK)', key: 'defaultDeliveryFee', type: 'number' },
            { label: 'Order timeout (min)', key: 'orderTimeout', type: 'number' },
            { label: 'Max riders per zone', key: 'maxRidersPerZone', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label className="block mb-1 font-semibold" style={{ fontSize: 11, color: '#4A4770' }}>{f.label}</label>
              <input type={f.type}
                value={config[f.key as keyof typeof config] as string}
                onChange={e => update(f.key as keyof typeof config, e.target.value)}
                className="w-full rounded-lg px-3 py-2 outline-none"
                style={{ fontSize: 12, background: '#F6F5FF', border: '1px solid #E8E6F8', color: '#1A1730' }} />
            </div>
          ))}
          <div className="flex items-center justify-between py-2 rounded-lg px-3" style={{ background: '#FFF8E8', border: '1px solid #FFE8B0' }}>
            <div>
              <div className="font-semibold" style={{ fontSize: 11, color: '#D4820A' }}>Maintenance mode</div>
              <div style={{ fontSize: 10, color: '#8A88A8' }}>Disables customer-facing app access</div>
            </div>
            <button onClick={() => update('maintenanceMode', !config.maintenanceMode)}
              className="rounded-full transition-all"
              style={{ width: 36, height: 20, background: config.maintenanceMode ? '#D4820A' : '#E8E6F8', position: 'relative' }}>
              <div className="rounded-full bg-white absolute top-1" style={{ width: 12, height: 12, transition: 'left 0.15s', left: config.maintenanceMode ? 20 : 4 }} />
            </button>
          </div>
          <button className="flex items-center gap-1.5 rounded-lg px-4 py-2 font-semibold" style={{ fontSize: 11, background: '#5B4FE9', color: '#fff' }}>
            <Save size={12} /> Save changes
          </button>
        </div>
      )}

      {/* Admin users */}
      {tab === 'admins' && (
        <div className="rounded-card overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #E8E6F8' }}>
            <span className="font-bold" style={{ fontSize: 13, color: '#1A1730' }}>Admin users</span>
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold" style={{ fontSize: 11, background: '#5B4FE9', color: '#fff' }}>
              <Plus size={12} /> Invite admin
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F6F5FF' }}>
                {['Name', 'Email', 'Role', 'Last active', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: '#8A88A8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ADMINS.map((a, i) => {
                const rb = ROLE_BADGE[a.role] ?? { bg: '#F6F5FF', color: '#8A88A8' };
                return (
                  <tr key={a.id} style={{ borderTop: '1px solid #E8E6F8', background: i % 2 === 1 ? '#FAFAFA' : '#fff' }}>
                    <td className="px-4 py-2.5 font-semibold" style={{ fontSize: 11, color: '#1A1730' }}>{a.name}</td>
                    <td className="px-4 py-2.5" style={{ fontSize: 11, color: '#4A4770' }}>{a.email}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-pill px-2 py-0.5 font-semibold" style={{ fontSize: 9, background: rb.bg, color: rb.color }}>{a.role}</span>
                    </td>
                    <td className="px-4 py-2.5" style={{ fontSize: 10, color: '#8A88A8' }}>{a.lastActive}</td>
                    <td className="px-4 py-2.5">
                      {a.role !== 'SUPER_ADMIN' && (
                        <button><Trash2 size={12} style={{ color: '#D84040' }} /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* API keys */}
      {tab === 'apikeys' && (
        <div className="rounded-card overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E6F8' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #E8E6F8' }}>
            <span className="font-bold" style={{ fontSize: 13, color: '#1A1730' }}>API keys</span>
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold" style={{ fontSize: 11, background: '#5B4FE9', color: '#fff' }}>
              <Plus size={12} /> Generate key
            </button>
          </div>
          {APIKEYS.map((k, i) => (
            <div key={k.id} className="flex items-center gap-4 px-4 py-3" style={{ borderTop: i > 0 ? '1px solid #E8E6F8' : 'none' }}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold mb-0.5" style={{ fontSize: 12, color: '#1A1730' }}>{k.name}</div>
                <div className="flex items-center gap-2">
                  <code className="font-mono" style={{ fontSize: 10, color: '#4A4770' }}>
                    {showKey[k.id] ? k.key : k.key.replace(/./g, '*').slice(0, 20) + '...'}
                  </code>
                  <button onClick={() => setShowKey(s => ({ ...s, [k.id]: !s[k.id] }))}>
                    {showKey[k.id] ? <EyeOff size={11} style={{ color: '#8A88A8' }} /> : <Eye size={11} style={{ color: '#8A88A8' }} />}
                  </button>
                </div>
                <div style={{ fontSize: 10, color: '#8A88A8' }}>Created {k.createdAt} · Last used {k.lastUsed}</div>
              </div>
              <button><Trash2 size={12} style={{ color: '#D84040' }} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
