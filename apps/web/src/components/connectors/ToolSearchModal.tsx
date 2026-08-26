'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Search, X, Plug, Check, Loader2, ExternalLink } from 'lucide-react';

interface Tool {
  name: string;
  displayName: string;
  description: string;
  appName: string;
}

interface ToolSuggestion {
  toolName: string;
  appName: string;
  description: string;
  relevance: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect?: (tool: Tool) => void;
  intent?: string;
}

export function ToolSearchModal({ open, onClose, onSelect, intent }: Props) {
  const [search, setSearch] = useState('');
  const [tools, setTools] = useState<Tool[]>([]);
  const [suggestions, setSuggestions] = useState<ToolSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<Set<string>>(new Set());

  const loadTools = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.request<Tool[]>('GET', '/connectors/apps');
      setTools(data);
    } catch (err) {
      console.error('Failed to load tools:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    if (!intent) return;
    try {
      const data = await api.request<ToolSuggestion[]>('GET', `/connectors/tools/suggest?intent=${encodeURIComponent(intent)}`);
      setSuggestions(data);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    }
  }, [intent]);

  useEffect(() => {
    if (open) {
      loadTools();
      loadSuggestions();
      setSearch('');
    }
  }, [open, loadTools, loadSuggestions]);

  const filteredTools = tools.filter((t) =>
    !search || t.displayName.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleConnect = async (tool: Tool) => {
    try {
      await api.request('POST', `/connectors/${tool.appName}/connect`);
      setConnected((prev) => new Set(prev).add(tool.appName));
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[550px] max-h-[70vh] glass-strong rounded-2xl shadow-elevated overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-300/50">
          <div className="flex items-center gap-2">
            <Plug className="w-5 h-5 text-helm-400" />
            <h3 className="text-sm font-semibold text-white">Connect a Tool</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 1000+ tools..."
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-200 border border-surface-300 text-white text-sm focus:outline-none focus:ring-2 focus:ring-helm-500/30"
            />
          </div>
        </div>

        {/* AI Suggestions */}
        {suggestions.length > 0 && !search && (
          <div className="px-5 pb-3">
            <div className="text-[10px] text-surface-600 uppercase tracking-wider mb-2">AI Suggested</div>
            <div className="space-y-1">
              {suggestions.slice(0, 3).map((s) => (
                <button
                  key={s.toolName}
                  onClick={() => onSelect?.({ name: s.toolName, displayName: s.toolName, description: s.description, appName: s.appName })}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-helm-500/10 border border-helm-500/20 hover:bg-helm-500/20 transition-all text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-helm-500/20 flex items-center justify-center">
                    <Plug className="w-3.5 h-3.5 text-helm-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-white">{s.toolName}</div>
                    <div className="text-[10px] text-surface-600 truncate">{s.description}</div>
                  </div>
                  <span className="text-[10px] text-helm-400">{Math.round(s.relevance * 100)}%</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tool List */}
        <div className="overflow-y-auto max-h-[400px] px-5 pb-5">
          <div className="text-[10px] text-surface-600 uppercase tracking-wider mb-2">
            {search ? `Results (${filteredTools.length})` : 'All Tools'}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-helm-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTools.slice(0, 30).map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-200/50 transition-all group"
                >
                  <div className="w-7 h-7 rounded-lg bg-surface-200 flex items-center justify-center">
                    <Plug className="w-3.5 h-3.5 text-surface-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white">{tool.displayName}</div>
                    <div className="text-[10px] text-surface-600 truncate">{tool.description || tool.appName}</div>
                  </div>
                  {connected.has(tool.appName) ? (
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <Check className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConnect(tool)}
                      className="text-[10px] text-helm-400 hover:text-white px-2 py-1 rounded-lg bg-helm-500/10 hover:bg-helm-500/20 transition-all opacity-0 group-hover:opacity-100"
                    >
                      Connect
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
