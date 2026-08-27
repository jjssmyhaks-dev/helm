'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Paperclip, Mic, MicOff, Globe, FileText, Plug, Sparkles } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onVoiceToggle?: () => void;
  isRecording?: boolean;
  disabled?: boolean;
  placeholder?: string;
  capabilities?: { id: string; label: string; icon: React.ReactNode; active: boolean; color: string }[];
  onCapabilityToggle?: (id: string) => void;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  onVoiceToggle,
  isRecording = false,
  disabled = false,
  placeholder = 'Message Helm...',
  capabilities = [],
  onCapabilityToggle,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="w-full max-w-[768px] mx-auto px-4 pb-6">
      <motion.div
        className={`relative rounded-2xl border transition-all duration-300 ${
          focused
            ? 'border-surface-400 shadow-lg shadow-surface-300/20'
            : 'border-surface-300'
        } bg-white`}
        layout
      >
        {/* Capability bar */}
        {capabilities.length > 0 && (
          <div className="flex items-center gap-1 px-3 pt-3 pb-1">
            {capabilities.map((cap) => (
              <motion.button
                key={cap.id}
                onClick={() => onCapabilityToggle?.(cap.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all duration-200 ${
                  cap.active
                    ? 'bg-surface-200 text-surface-800 border border-surface-300'
                    : 'text-surface-500 hover:text-surface-700 hover:bg-surface-100 border border-transparent'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {cap.icon}
                {cap.label}
              </motion.button>
            ))}
          </div>
        )}

        {/* Textarea */}
        <div className="flex items-end gap-2 px-3 py-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent text-surface-800 placeholder-surface-400 text-[14px] leading-relaxed focus:outline-none py-1.5"
            style={{ minHeight: '24px', maxHeight: '200px' }}
          />
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-1">
            <motion.button
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </motion.button>
            {onVoiceToggle && (
              <motion.button
                onClick={onVoiceToggle}
                className={`p-1.5 rounded-lg transition-colors ${
                  isRecording
                    ? 'text-red-500 bg-red-50'
                    : 'text-surface-400 hover:text-surface-600 hover:bg-surface-100'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
                transition={isRecording ? { duration: 1, repeat: Infinity } : {}}
                title={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </motion.button>
            )}
          </div>

          <motion.button
            onClick={onSubmit}
            disabled={!value.trim() || disabled}
            className={`p-2 rounded-xl transition-all duration-200 ${
              value.trim() && !disabled
                ? 'bg-surface-800 text-white hover:bg-surface-700 shadow-md'
                : 'bg-surface-200 text-surface-400 cursor-not-allowed'
            }`}
            whileHover={value.trim() && !disabled ? { scale: 1.05 } : {}}
            whileTap={value.trim() && !disabled ? { scale: 0.95 } : {}}
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>

      <p className="text-center text-[11px] text-surface-400 mt-2">
        Helm can make mistakes. Verify important decisions.
      </p>
    </div>
  );
}
