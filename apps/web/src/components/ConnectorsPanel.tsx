'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Link2, Unlink, Loader2, Check, AlertCircle } from 'lucide-react';

interface Props { token: string; }

export function ConnectorsPanel({ token }: Props) {
  const [connectors, setConnectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  const fetch = async () => { try { setConnectors(await api.listConnectors()); } catch {} setLoading(false); };

  useEffect(() => { api.setToken(token); fetch(); }, [token]);

  const toggle = async (name: string, connected: boolean) => {
    setConnecting(name);
    try { connected ? await api.disconnectConnector(name) : await api.connectConnector(name); await fetch(); } catch {} setConnecting(null);
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-4 h-4 text-surface-600 animate-spin" /></div>;

  if (connectors.length === 0) return (
    <div className="text-center py-6">
      <Link2 className="w-7 h-7 text-surface-400 mx-auto mb-2" />
      <p className="text-xs text-surface-600">No connectors available</p>
    </div>
  );

  return (
    <div className="space-y-1.5">
      {connectors.map((c) => (
        <div key={c.name} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-200/30 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.connected ? 'bg-emerald-400' : 'bg-surface-500'}`} />
            <div className="min-w-0">
              <span className="text-xs font-medium text-surface-800 block truncate">{c.displayName || c.name}</span>
              <span className="text-[10px] text-surface-600">{c.connected ? 'Connected' : 'Not connected'}</span>
            </div>
          </div>
          <button onClick={() => toggle(c.name, c.connected)} disabled={connecting === c.name} className={`p-1.5 rounded-lg transition-colors ${c.connected ? 'hover:bg-red-500/10 text-surface-600 hover:text-red-400' : 'hover:bg-helm-500/10 text-surface-600 hover:text-helm-400'} disabled:opacity-50`}>
            {connecting === c.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : c.connected ? <Unlink className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      ))}
    </div>
  );
}
