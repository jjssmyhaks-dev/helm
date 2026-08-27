'use client';

import { motion } from 'framer-motion';

interface SuggestionItem {
  text: string;
  icon?: string;
}

interface Props {
  suggestions: SuggestionItem[];
  onSelect: (text: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full">
      {suggestions.map((s, i) => (
        <motion.button
          key={i}
          onClick={() => onSelect(s.text)}
          className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-200 bg-white hover:bg-surface-50 hover:border-surface-300 transition-all duration-200 text-left shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.08 }}
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.99 }}
        >
          {s.icon && <span className="text-base">{s.icon}</span>}
          <span className="text-sm text-surface-600 group-hover:text-surface-800 transition-colors">{s.text}</span>
        </motion.button>
      ))}
    </div>
  );
}
