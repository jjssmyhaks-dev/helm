'use client';

import { Search, BookOpen, PenTool, Plug, Mic, MicOff } from 'lucide-react';

interface Props {
  activeCapabilities: Set<string>;
  onToggle: (capability: string) => void;
  onOpenTools: () => void;
  isRecording: boolean;
}

const CAPABILITIES = [
  { id: 'web_search', label: 'Web Search', icon: Search, color: 'text-blue-400' },
  { id: 'deep_research', label: 'Deep Research', icon: BookOpen, color: 'text-purple-400' },
  { id: 'draft', label: 'Draft', icon: PenTool, color: 'text-amber-400' },
];

export function CapabilityBar({ activeCapabilities, onToggle, onOpenTools, isRecording }: Props) {
  return (
    <div className="flex items-center gap-1 px-1">
      {CAPABILITIES.map(({ id, label, icon: Icon, color }) => (
        <button
          key={id}
          onClick={() => onToggle(id)}
          title={label}
          className={`p-2 rounded-lg transition-all duration-150 ${
            activeCapabilities.has(id)
              ? `bg-helm-500/20 ${color} border border-helm-500/30`
              : 'text-surface-600 hover:text-white hover:bg-surface-200'
          }`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}

      <div className="w-px h-4 bg-surface-300 mx-1" />

      <button
        onClick={onOpenTools}
        title="Connect Tool"
        className="p-2 rounded-lg text-surface-600 hover:text-white hover:bg-surface-200 transition-all duration-150"
      >
        <Plug className="w-4 h-4" />
      </button>

      <button
        onClick={() => onToggle('voice')}
        title={isRecording ? 'Stop recording' : 'Voice input'}
        className={`p-2 rounded-lg transition-all duration-150 ${
          isRecording
            ? 'bg-red-500 text-white animate-pulse'
            : 'text-surface-600 hover:text-white hover:bg-surface-200'
        }`}
      >
        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
    </div>
  );
}
