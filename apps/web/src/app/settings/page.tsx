'use client';

import { useState, useEffect } from 'react';
// Clerk useAuth is loaded dynamically when available
let useAuthHook: any = null;
try { useAuthHook = require('@clerk/nextjs').useAuth; } catch {}
function useAuthSafe() {
  if (useAuthHook) {
    try { return useAuthHook(); } catch { return { isSignedIn: true, isLoaded: true }; }
  }
  return { isSignedIn: true, isLoaded: true };
}
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Anchor, ArrowLeft, Shield, ShieldCheck, ShieldAlert, ShieldX,
  Save, Check, Info, Zap, Settings,
} from 'lucide-react';

interface LayerSetting { tier: 'AUTO_EXECUTE' | 'NOTIFY_AND_ACT' | 'APPROVAL_REQUIRED'; enabled: boolean; }
interface AutonomySettings { RESEARCH: LayerSetting; MARKETING: LayerSetting; OPERATIONS: LayerSetting; FINANCE: LayerSetting; }

const DEFAULT_SETTINGS: AutonomySettings = {
  RESEARCH: { tier: 'AUTO_EXECUTE', enabled: true },
  MARKETING: { tier: 'NOTIFY_AND_ACT', enabled: true },
  OPERATIONS: { tier: 'NOTIFY_AND_ACT', enabled: true },
  FINANCE: { tier: 'APPROVAL_REQUIRED', enabled: true },
};

const LAYER_INFO: Record<string, { label: string; icon: string; description: string }> = {
  RESEARCH: { label: 'Research', icon: '🔍', description: 'Competitor analysis, market trends, pricing benchmarks' },
  MARKETING: { label: 'Marketing', icon: '📢', description: 'Campaign management, content, SEO, ad spend' },
  OPERATIONS: { label: 'Operations', icon: '⚙️', description: 'Workflows, vendor management, fulfillment, support' },
  FINANCE: { label: 'Finance', icon: '💰', description: 'Bookkeeping, cash flow, tax compliance, budgets' },
};

const TIER_CONFIG = {
  AUTO_EXECUTE: { label: 'Auto-Execute', desc: 'Runs freely, no approval needed', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', active: 'bg-emerald-500' },
  NOTIFY_AND_ACT: { label: 'Notify & Act', desc: 'Acts, logs for your review', icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', active: 'bg-amber-500' },
  APPROVAL_REQUIRED: { label: 'Approval Required', desc: 'Waits for your go-ahead', icon: ShieldX, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', active: 'bg-red-500' },
};

export default function SettingsPage() {
  const { isSignedIn, isLoaded } = useAuthSafe();
  const router = useRouter();
  const [settings, setSettings] = useState<AutonomySettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (isSignedIn) loadSettings(); }, [isSignedIn]);

  const loadSettings = async () => {
    try { setLoading(true); const data = await api.getAutonomySettings(); if (data) setSettings(data); } catch {} finally { setLoading(false); }
  };

  const saveSettings = async () => {
    try { setSaving(true); await api.updateAutonomySettings(settings as any); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch {} finally { setSaving(false); }
  };

  const updateTier = (layer: string, tier: LayerSetting['tier']) => setSettings((p) => ({ ...p, [layer]: { ...p[layer as keyof AutonomySettings], tier } }));
  const toggleLayer = (layer: string) => setSettings((p) => ({ ...p, [layer]: { ...p[layer as keyof AutonomySettings], enabled: !p[layer as keyof AutonomySettings].enabled } }));

  if (!isLoaded || loading) return <div className="min-h-screen flex items-center justify-center bg-surface-0"><div className="w-8 h-8 border-2 border-helm-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!isSignedIn) { router.push('/sign-in'); return null; }

  return (
    <div className="min-h-screen bg-surface-0 p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="p-2 rounded-xl hover:bg-surface-200 text-surface-600 hover:text-white transition-all duration-150">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
              <p className="text-sm text-surface-600">Configure agent autonomy levels</p>
            </div>
          </div>
          <button onClick={saveSettings} disabled={saving} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${saved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'btn-primary'} disabled:opacity-50`}>
            {saved ? <><Check className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}</>}
          </button>
        </div>

        {/* Info */}
        <div className="glass-card rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-helm-500/10 mt-0.5"><Info className="w-4 h-4 text-helm-400" /></div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">How Autonomy Works</h3>
              <p className="text-sm text-surface-600 leading-relaxed">
                Each layer operates at its own trust level. Adjust anytime as trust builds. Agents automatically escalate to <span className="text-white font-medium">Approval Required</span> when confidence is low, anomalies are detected, or actions are irreversible.
              </p>
            </div>
          </div>
        </div>

        {/* Layers */}
        <div className="space-y-3">
          {Object.entries(LAYER_INFO).map(([layer, info]) => {
            const setting = settings[layer as keyof AutonomySettings];
            return (
              <div key={layer} className={`glass-card rounded-2xl p-5 transition-all duration-200 ${setting.enabled ? '' : 'opacity-50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{info.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{info.label}</h3>
                      <p className="text-xs text-surface-600">{info.description}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleLayer(layer)} className={`relative w-11 h-6 rounded-full transition-all duration-200 ${setting.enabled ? 'bg-helm-500' : 'bg-surface-400'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm ${setting.enabled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                {setting.enabled && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {(Object.entries(TIER_CONFIG) as [string, typeof TIER_CONFIG['AUTO_EXECUTE']][]).map(([tierKey, config]) => {
                      const isActive = setting.tier === tierKey;
                      const Icon = config.icon;
                      return (
                        <button key={tierKey} onClick={() => updateTier(layer, tierKey as LayerSetting['tier'])} className={`p-3 rounded-xl border text-left transition-all duration-200 ${isActive ? `${config.bg} ring-1 ring-current/20` : 'border-surface-300/30 bg-surface-100/30 hover:bg-surface-200/50'}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon className={`w-3.5 h-3.5 ${isActive ? config.color : 'text-surface-600'}`} />
                            <span className={`text-xs font-semibold ${isActive ? config.color : 'text-surface-700'}`}>{config.label}</span>
                          </div>
                          <p className="text-[10px] text-surface-600 leading-relaxed">{config.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Escalation */}
        <div className="mt-6 glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Automatic Escalation Rules
          </h3>
          <div className="space-y-2">
            {[
              'Agent confidence drops below 60%',
              'Anomaly detected in data patterns',
              'SLA breach risk detected',
              'Action flagged as irreversible',
              'Involves financial transfers or filings',
            ].map((rule, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-surface-700">
                <div className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                {rule}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
