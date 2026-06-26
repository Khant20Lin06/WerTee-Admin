'use client';

import { useEffect, useState } from 'react';
import { Settings, Users, Key, Save, Plus, Trash2, Eye, EyeOff, CreditCard, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import { apiGet, apiPut } from '@/lib/api/client';

type Tab = 'platform' | 'payments' | 'admins' | 'apikeys';

type AdminUser = { id: string; name: string; email: string; role: string; lastActive: string };
type ApiKey = { id: string; name: string; key: string; createdAt: string; lastUsed: string };

type PaymentMethodRecord = {
  id: string;
  method: string;
  displayName: string;
  description: string | null;
  isEnabled: boolean;
  sortOrder: number;
  bankDetails: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    instructions?: string;
  } | null;
};

const ADMINS: AdminUser[] = [
  { id: '1', name: 'Super Admin',   email: 'admin@werte.mm',    role: 'SUPER_ADMIN',   lastActive: '2 min ago' },
  { id: '2', name: 'Ops Manager',   email: 'ops@werte.mm',      role: 'OPS_ADMIN',     lastActive: '1h ago' },
  { id: '3', name: 'Finance Admin', email: 'finance@werte.mm',  role: 'FINANCE_ADMIN', lastActive: '3h ago' },
];

const APIKEYS: ApiKey[] = [
  { id: '1', name: 'Mobile App Key',    key: 'wrt_live_sk_xYZ...', createdAt: '2024-01-10', lastUsed: '5 min ago' },
  { id: '2', name: 'Dashboard Webhook', key: 'wrt_live_wh_aBc...', createdAt: '2024-03-22', lastUsed: '1d ago' },
];

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  SUPER_ADMIN:   { bg: 'var(--brand-muted)',  color: 'var(--brand)' },
  OPS_ADMIN:     { bg: 'var(--warning-bg)',   color: 'var(--warning)' },
  FINANCE_ADMIN: { bg: 'var(--success-bg)',   color: 'var(--success)' },
};

const METHOD_ICON: Record<string, string> = {
  CASH_ON_DELIVERY: '💵',
  BANK_TRANSFER:    '🏦',
  DIGITAL_WALLET:   '📱',
  CARD:             '💳',
  MANUAL:           '✏️',
};

const DEFAULT_METHODS: PaymentMethodRecord[] = [
  { id: '', method: 'CASH_ON_DELIVERY', displayName: 'Cash on Delivery', description: 'Pay with cash when your order arrives', isEnabled: true,  sortOrder: 1, bankDetails: null },
  { id: '', method: 'BANK_TRANSFER',    displayName: 'Bank Transfer',    description: 'Transfer to our bank account and upload receipt', isEnabled: false, sortOrder: 2, bankDetails: { bankName: '', accountName: '', accountNumber: '', instructions: '' } },
  { id: '', method: 'DIGITAL_WALLET',   displayName: 'KBZ Pay / Wave Pay', description: 'Pay via mobile wallet', isEnabled: false, sortOrder: 3, bankDetails: null },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('platform');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  // Platform config
  const [config, setConfig] = useState({
    platformName: 'WerTe',
    commissionRate: '18',
    defaultDeliveryFee: '1500',
    orderTimeout: '30',
    maxRidersPerZone: '50',
    maintenanceMode: false,
  });

  // Payment methods
  const [methods, setMethods] = useState<PaymentMethodRecord[]>(DEFAULT_METHODS);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [savingMethod, setSavingMethod] = useState<string | null>(null);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tab === 'payments') fetchMethods();
  }, [tab]);

  async function fetchMethods() {
    setLoadingMethods(true);
    try {
      const data = await apiGet<PaymentMethodRecord[]>('/payment-methods/admin');
      if (data && data.length > 0) setMethods(data);
    } catch (_) {
      // keep defaults if API not ready
    } finally {
      setLoadingMethods(false);
    }
  }

  async function saveMethod(m: PaymentMethodRecord) {
    setSavingMethod(m.method);
    try {
      await apiPut('/payment-methods/admin', {
        method: m.method,
        displayName: m.displayName,
        description: m.description,
        isEnabled: m.isEnabled,
        sortOrder: m.sortOrder,
        bankDetails: m.bankDetails,
      });
      setSaveSuccess(m.method);
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (_) {
    } finally {
      setSavingMethod(null);
    }
  }

  function updateMethod(method: string, patch: Partial<PaymentMethodRecord>) {
    setMethods(prev => prev.map(m => m.method === method ? { ...m, ...patch } : m));
  }

  function updateBankDetails(method: string, key: string, value: string) {
    setMethods(prev => prev.map(m =>
      m.method === method
        ? { ...m, bankDetails: { ...(m.bankDetails ?? {}), [key]: value } }
        : m,
    ));
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'platform', label: 'Platform',        icon: Settings    },
    { key: 'payments', label: 'Payment Methods', icon: CreditCard  },
    { key: 'admins',   label: 'Admin users',     icon: Users       },
    { key: 'apikeys',  label: 'API keys',        icon: Key         },
  ];

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-card p-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', width: 'fit-content' }}>
        {tabs.map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold"
              style={{ fontSize: 11, background: active ? 'var(--brand)' : 'transparent', color: active ? '#fff' : 'var(--text-secondary)' }}>
              <t.icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Platform ── */}
      {tab === 'platform' && (
        <div className="rounded-card p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxWidth: 540 }}>
          <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>Platform configuration</div>
          {[
            { label: 'Platform name',              key: 'platformName',       type: 'text'   },
            { label: 'Commission rate (%)',         key: 'commissionRate',     type: 'number' },
            { label: 'Default delivery fee (MMK)', key: 'defaultDeliveryFee', type: 'number' },
            { label: 'Order timeout (min)',         key: 'orderTimeout',       type: 'number' },
            { label: 'Max riders per zone',        key: 'maxRidersPerZone',   type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label className="block mb-1 font-semibold" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{f.label}</label>
              <input type={f.type}
                value={config[f.key as keyof typeof config] as string}
                onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 outline-none"
                style={{ fontSize: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          ))}
          <div className="flex items-center justify-between py-2 rounded-lg px-3" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)' }}>
            <div>
              <div className="font-semibold" style={{ fontSize: 11, color: 'var(--warning)' }}>Maintenance mode</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Disables customer-facing app access</div>
            </div>
            <button onClick={() => setConfig(c => ({ ...c, maintenanceMode: !c.maintenanceMode }))}
              style={{ width: 36, height: 20, background: config.maintenanceMode ? 'var(--warning)' : 'var(--border)', borderRadius: 999, position: 'relative', transition: 'background 0.15s' }}>
              <div style={{ width: 12, height: 12, background: '#fff', borderRadius: 999, position: 'absolute', top: 4, left: config.maintenanceMode ? 20 : 4, transition: 'left 0.15s' }} />
            </button>
          </div>
          <button className="flex items-center gap-1.5 rounded-lg px-4 py-2 font-semibold" style={{ fontSize: 11, background: 'var(--brand)', color: '#fff' }}>
            <Save size={12} /> Save changes
          </button>
        </div>
      )}

      {/* ── Payment Methods ── */}
      {tab === 'payments' && (
        <div className="space-y-3" style={{ maxWidth: 600 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Enable or disable payment methods shown to customers at checkout. Changes take effect immediately.
          </div>

          {loadingMethods ? (
            <div className="rounded-card p-6 flex justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTop: '2px solid var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            methods.map(m => {
              const isExpanded = expandedMethod === m.method;
              const isBankTransfer = m.method === 'BANK_TRANSFER';
              const isSaving = savingMethod === m.method;
              const saved = saveSuccess === m.method;

              return (
                <div key={m.method} className="rounded-card overflow-hidden"
                  style={{ background: 'var(--bg-card)', border: `1.5px solid ${m.isEnabled ? 'var(--brand)' : 'var(--border)'}`, transition: 'border-color 0.15s' }}>

                  {/* Header row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex items-center justify-center rounded-lg text-lg"
                      style={{ width: 40, height: 40, background: m.isEnabled ? 'var(--brand-muted)' : 'var(--bg-subtle)', flexShrink: 0 }}>
                      {METHOD_ICON[m.method] ?? '💳'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{m.displayName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.description}</div>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => updateMethod(m.method, { isEnabled: !m.isEnabled })}
                      style={{ flexShrink: 0 }}>
                      {m.isEnabled
                        ? <ToggleRight size={28} style={{ color: 'var(--brand)' }} />
                        : <ToggleLeft size={28} style={{ color: 'var(--border-strong)' }} />}
                    </button>

                    {/* Expand (for bank transfer) */}
                    {isBankTransfer && (
                      <button onClick={() => setExpandedMethod(isExpanded ? null : m.method)}
                        style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                  </div>

                  {/* Bank details section */}
                  {isBankTransfer && isExpanded && (
                    <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Bank account details (shown to customer after order)</div>
                      {[
                        { key: 'bankName',      label: 'Bank name',       placeholder: 'e.g. KBZ Bank' },
                        { key: 'accountName',   label: 'Account name',    placeholder: 'e.g. WerTe Co., Ltd' },
                        { key: 'accountNumber', label: 'Account number',  placeholder: 'e.g. 0967 0100 0000 0000' },
                        { key: 'instructions',  label: 'Instructions',    placeholder: 'e.g. Transfer and send screenshot to our Viber' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block mb-1" style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{f.label}</label>
                          <input
                            type="text"
                            value={(m.bankDetails as Record<string, string> | null)?.[f.key] ?? ''}
                            onChange={e => updateBankDetails(m.method, f.key, e.target.value)}
                            placeholder={f.placeholder}
                            className="w-full rounded-lg px-3 py-2 outline-none"
                            style={{ fontSize: 11, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Save button */}
                  <div className="flex items-center justify-between px-4 py-2"
                    style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                    <span style={{ fontSize: 10, color: m.isEnabled ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {m.isEnabled ? '● Enabled' : '○ Disabled'}
                    </span>
                    <button
                      onClick={() => saveMethod(m)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold"
                      style={{ fontSize: 11, background: saved ? 'var(--success)' : 'var(--brand)', color: '#fff', opacity: isSaving ? 0.7 : 1, transition: 'background 0.2s' }}>
                      {isSaving
                        ? <div style={{ width: 10, height: 10, border: '1.5px solid #fff', borderTop: '1.5px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        : <Save size={11} />}
                      {saved ? 'Saved!' : isSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Admin users ── */}
      {tab === 'admins' && (
        <div className="rounded-card overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>Admin users</span>
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold" style={{ fontSize: 11, background: 'var(--brand)', color: '#fff' }}>
              <Plus size={12} /> Invite admin
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                {['Name', 'Email', 'Role', 'Last active', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ADMINS.map((a, i) => {
                const rb = ROLE_BADGE[a.role] ?? { bg: 'var(--bg-subtle)', color: 'var(--text-muted)' };
                return (
                  <tr key={a.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 1 ? 'var(--bg-subtle)' : 'var(--bg-card)' }}>
                    <td className="px-4 py-2.5 font-semibold" style={{ fontSize: 11, color: 'var(--text-primary)' }}>{a.name}</td>
                    <td className="px-4 py-2.5" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{a.email}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full px-2 py-0.5 font-semibold" style={{ fontSize: 9, background: rb.bg, color: rb.color }}>{a.role}</span>
                    </td>
                    <td className="px-4 py-2.5" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.lastActive}</td>
                    <td className="px-4 py-2.5">
                      {a.role !== 'SUPER_ADMIN' && (
                        <button><Trash2 size={12} style={{ color: 'var(--danger)' }} /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── API keys ── */}
      {tab === 'apikeys' && (
        <div className="rounded-card overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>API keys</span>
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold" style={{ fontSize: 11, background: 'var(--brand)', color: '#fff' }}>
              <Plus size={12} /> Generate key
            </button>
          </div>
          {APIKEYS.map((k, i) => (
            <div key={k.id} className="flex items-center gap-4 px-4 py-3" style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold mb-0.5" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{k.name}</div>
                <div className="flex items-center gap-2">
                  <code style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {showKey[k.id] ? k.key : '••••••••••••••••••••'}
                  </code>
                  <button onClick={() => setShowKey(s => ({ ...s, [k.id]: !s[k.id] }))}>
                    {showKey[k.id] ? <EyeOff size={11} style={{ color: 'var(--text-muted)' }} /> : <Eye size={11} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Created {k.createdAt} · Last used {k.lastUsed}</div>
              </div>
              <button><Trash2 size={12} style={{ color: 'var(--danger)' }} /></button>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
