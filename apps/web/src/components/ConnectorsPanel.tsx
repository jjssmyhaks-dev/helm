'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Link2,
  Unlink,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface Props {
  token: string;
}

const LAYER_BADGES: Record<string, string> = {
  research: 'bg-blue-500/20 text-blue-400',
  marketing: 'bg-purple-500/20 text-purple-400',
  operations: 'bg-green-500/20 text-green-400',
  finance: 'bg-amber-500/20 text-amber-400',
};

export function ConnectorsPanel({ token }: Props) {
  const [connectors, setConnectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  const fetchConnectors = async () => {
    try {
      const data = await api.listConnectors();
      setConnectors(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    api.setToken(token);
    fetchConnectors();
  }, [token]);

  const handleConnect = async (name: string) => {
    setConnecting(name);
    try {
      await api.connectConnector(name);
      await fetchConnectors();
    } catch {}
    setConnecting(null);
  };

  const handleDisconnect = async (name: string) => {
    setConnecting(name);
    try {
      await api.disconnectConnector(name);
      await fetchConnectors();
    } catch {}
    setConnecting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-dark-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {connectors.map((connector) => (
        <div
          key={connector.name}
          className="flex items-center justify-between p-3 rounded-lg bg-dark-800/50 border border-dark-700/50"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-dark-200">
                {connector.displayName}
              </span>
              {connector.connected ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-dark-600" />
              )}
            </div>
            <p className="text-xs text-dark-500 mt-0.5">{connector.description}</p>
            <div className="flex gap-1 mt-1">
              {connector.layers?.map((layer: string) => (
                <span
                  key={layer}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    LAYER_BADGES[layer.toLowerCase()] || 'bg-dark-700 text-dark-400'
                  }`}
                >
                  {layer}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() =>
              connector.connected
                ? handleDisconnect(connector.name)
                : handleConnect(connector.name)
            }
            disabled={connecting === connector.name}
            className={`p-2 rounded-lg transition-colors ${
              connector.connected
                ? 'hover:bg-red-500/10 text-dark-400 hover:text-red-400'
                : 'hover:bg-helm-500/10 text-dark-400 hover:text-helm-400'
            } disabled:opacity-50`}
            title={connector.connected ? 'Disconnect' : 'Connect'}
          >
            {connecting === connector.name ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : connector.connected ? (
              <Unlink className="w-4 h-4" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
