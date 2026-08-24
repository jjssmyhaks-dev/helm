'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Anchor,
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Save,
  Check,
  Info,
  Bot,
  Zap,
  Settings,
} from 'lucide-react';

interface LayerSetting {
  tier: 'AUTO_EXECUTE' | 'NOTIFY_AND_ACT' | 'APPROVAL_REQUIRED';
  enabled: boolean;
}

interface AutonomySettings {
  RESEARCH: LayerSetting;
  MARKETING: LayerSetting;
  OPERATIONS: LayerSetting;
  FINANCE: LayerSetting;
}

const DEFAULT_SETTINGS: AutonomySettings = {
  RESEARCH: { tier: 'AUTO_EXECUTE', enabled: true },
  MARKETING: { tier: 'NOTIFY_AND_ACT', enabled: true },
  OPERATIONS: { tier: 'NOTIFY_AND_ACT', enabled: true },
  FINANCE: { tier: 'APPROVAL_REQUIRED', enabled: true },
};

const LAYER_INFO: Record<string, { label: string; icon: string; description: string; examples: string[] }> = {
  RESEARCH: {
    label: 'Research',
    icon: '🔍',
    description: 'Competitor analysis, market trends, pricing benchmarks, audience research',
    examples: ['Auto-execute: research reports, competitor scans, market analysis'],
  },
  MARKETING: {
    label: 'Marketing',
    icon: '📢',
    description: 'Campaign management, content creation, SEO, social media, ad spend',
    examples: ['Notify: scheduling social posts, sending internal messages'],
  },
  OPERATIONS: {
    label: 'Operations',
    icon: '⚙️',
    description: 'Workflow automation, vendor management, fulfillment, customer support',
    examples: ['Notify: order tracking updates, support ticket triage'],
  },
  FINANCE: {
    label: 'Finance',
    icon: '💰',
    description: 'Bookkeeping, cash flow, tax compliance, budget management',
    examples: ['Approval required: payments, vendor commitments, financial transfers'],
  },
};

const TIER_CONFIG = {
  AUTO_EXECUTE: {
    label: 'Auto-Execute',
    description: 'Agent runs actions automatically. No approval needed.',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
    activeColor: 'bg-emerald-500',
  },
  NOTIFY_AND_ACT: {
    label: 'Notify & Act',
    description: 'Agent runs but logs the action for your review. You can undo within a grace window.',
    icon: ShieldAlert,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    activeColor: 'bg-amber-500',
  },
  APPROVAL_REQUIRED: {
    label: 'Approval Required',
    description: 'Agent waits for your explicit approval before doing anything.',
    icon: ShieldX,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
    activeColor: 'bg-red-500',
  },
};

export default function SettingsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<AutonomySettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSignedIn) {
      loadSettings();
    }
  }, [isSignedIn]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getAutonomySettings();
      if (data) setSettings(data);
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await api.updateAutonomySettings(settings as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateLayerTier = (layer: string, tier: LayerSetting['tier']) => {
    setSettings((prev) => ({
      ...prev,
      [layer]: { ...prev[layer as keyof AutonomySettings], tier },
    }));
  };

  const toggleLayer = (layer: string) => {
    setSettings((prev) => ({
      ...prev,
      [layer]: { ...prev[layer as keyof AutonomySettings], enabled: !prev[layer as keyof AutonomySettings].enabled },
    }));
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-8 h-8 border-2 border-helm-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    router.push('/sign-in');
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-helm-600 flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-sm text-dark-500">Configure agent autonomy levels</p>
              </div>
            </div>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-helm-600 text-white hover:bg-helm-700'
            } disabled:opacity-50`}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </>
            )}
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-helm-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">How Autonomy Works</h3>
              <p className="text-sm text-dark-400">
                Each layer of your AI team can operate at a different trust level.
                <strong className="text-dark-300"> Auto-Execute</strong> means agents act freely.
                <strong className="text-dark-300"> Notify & Act</strong> means agents act but log for your review.
                <strong className="text-dark-300"> Approval Required</strong> means agents wait for your go-ahead.
                You can adjust these anytime as trust builds.
              </p>
            </div>
          </div>
        </div>

        {/* Layer Settings */}
        <div className="space-y-4">
          {Object.entries(LAYER_INFO).map(([layer, info]) => {
            const setting = settings[layer as keyof AutonomySettings];
            return (
              <div
                key={layer}
                className={`bg-dark-900 border rounded-2xl p-6 transition-all ${
                  setting.enabled ? 'border-dark-700' : 'border-dark-800 opacity-60'
                }`}
              >
                {/* Layer Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{info.label}</h3>
                      <p className="text-sm text-dark-400">{info.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleLayer(layer)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      setting.enabled ? 'bg-helm-600' : 'bg-dark-700'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        setting.enabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Tier Selection */}
                {setting.enabled && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {(Object.entries(TIER_CONFIG) as [string, typeof TIER_CONFIG['AUTO_EXECUTE']][]).map(
                      ([tierKey, config]) => {
                        const isActive = setting.tier === tierKey;
                        const Icon = config.icon;
                        return (
                          <button
                            key={tierKey}
                            onClick={() => updateLayerTier(layer, tierKey as LayerSetting['tier'])}
                            className={`p-4 rounded-xl border text-left transition-all ${
                              isActive
                                ? `${config.bgColor} ring-2 ring-offset-2 ring-offset-dark-900 ring-current`
                                : 'border-dark-700 bg-dark-800 hover:border-dark-500'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className={`w-4 h-4 ${isActive ? config.color : 'text-dark-500'}`} />
                              <span className={`text-sm font-medium ${isActive ? config.color : 'text-dark-300'}`}>
                                {config.label}
                              </span>
                            </div>
                            <p className="text-xs text-dark-500">{config.description}</p>
                          </button>
                        );
                      }
                    )}
                  </div>
                )}

                {/* Examples */}
                {setting.enabled && (
                  <div className="mt-3 text-xs text-dark-500">
                    {info.examples.map((ex, i) => (
                      <span key={i}>• {ex}{i < info.examples.length - 1 ? ' • ' : ''}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Escalation Rules */}
        <div className="mt-8 bg-dark-900 border border-dark-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Automatic Escalation Rules
          </h3>
          <p className="text-sm text-dark-400 mb-4">
            Regardless of your settings, agents will automatically escalate to <strong className="text-white">Approval Required</strong> when:
          </p>
          <div className="space-y-2">
            {[
              'Agent confidence drops below 60%',
              'Anomaly detected in data or patterns',
              'SLA breach risk is detected',
              'Action is flagged as irreversible',
              'Action involves financial transfers or government filings',
            ].map((rule, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-dark-300">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                {rule}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
