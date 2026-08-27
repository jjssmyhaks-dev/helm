'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Mic, MicOff, ArrowUp, Sparkles, Search, Globe, FileText, Plug } from 'lucide-react';

interface Props {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  isRecording: boolean;
  onToggleRecording: () => void;
}

const CAPABILITIES = [
  { id: 'search', icon: Search, label: 'Web Search', color: 'text-blue-400' },
  { id: 'research', icon: Globe, label: 'Deep Research', color: 'text-violet-400' },
  { id: 'draft', icon: FileText, label: 'Draft', color: 'text-amber-400' },
  { id: 'tools', icon: Plug, label: 'Connect Tool', color: 'text-emerald-400' },
];

export function AnimatedChatInput({
  input,
  setInput,
  onSend,
  sending,
  isRecording,
  onToggleRecording,
}: Props) {
  const [activeCaps, setActiveCaps] = useState<Set<string>>(new Set());

  const toggleCap = (id: string) => {
    setActiveCaps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="px-5 py-4 border-t border-surface-300/30 bg-surface-0/80 backdrop-blur-xl">
      <div className="max-w-3xl mx-auto">
        {/* Capability bar */}
        <div className="flex items-center gap-1.5 mb-2.5 px-1">
          {CAPABILITIES.map((cap) => {
            const isActive = activeCaps.has(cap.id);
            return (
              <motion.button
                key={cap.id}
                onClick={() => toggleCap(cap.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                  isActive
                    ? 'bg-surface-200 text-white border border-surface-400/50'
                    : 'text-surface-600 hover:text-white hover:bg-surface-100 border border-transparent'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <cap.icon className={`w-3 h-3 ${isActive ? cap.color : ''}`} />
                {cap.label}
              </motion.button>
            );
          })}
        </div>

        {/* Input area */}
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <motion.div
              className={`relative rounded-2xl border transition-all duration-300 ${
                input
                  ? 'border-helm-500/40 shadow-lg shadow-helm-500/5'
                  : 'border-surface-300'
              }`}
              animate={input ? { boxShadow: '0 0 20px rgba(99,102,241,0.08)' } : { boxShadow: '0 0 0px rgba(99,102,241,0)' }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Helm..."
                rows={1}
                className="w-full px-4 py-3 pr-12 bg-transparent text-white placeholder-surface-600 focus:outline-none resize-none text-sm"
                style={{ minHeight: '48px', maxHeight: '160px' }}
              />
              <AnimatePresence>
                {input && (
                  <motion.div
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Sparkles className="w-4 h-4 text-helm-400" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice button */}
            <motion.button
              onClick={onToggleRecording}
              className={`p-2.5 rounded-xl transition-all duration-300 ${
                isRecording
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'bg-surface-200 text-surface-600 hover:text-white hover:bg-surface-300'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={isRecording ? { scale: [1, 1.05, 1] } : {}}
              transition={isRecording ? { duration: 1, repeat: Infinity } : {}}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </motion.button>

            {/* Send button */}
            <motion.button
              onClick={onSend}
              disabled={!input.trim() || sending}
              className="p-2.5 rounded-xl bg-gradient-to-r from-helm-600 to-helm-500 text-white shadow-lg shadow-helm-500/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              whileHover={input.trim() && !sending ? { scale: 1.05 } : {}}
              whileTap={input.trim() && !sending ? { scale: 0.95 } : {}}
            >
              <motion.div
                animate={sending ? { rotate: 360 } : { rotate: 0 }}
                transition={sending ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
              >
                <ArrowUp className="w-4 h-4" />
              </motion.div>
            </motion.button>
          </div>
        </div>

        <p className="text-center text-[10px] text-surface-600 mt-2.5">
          Helm can make mistakes. Verify important decisions.
        </p>
      </div>
    </div>
  );
}
