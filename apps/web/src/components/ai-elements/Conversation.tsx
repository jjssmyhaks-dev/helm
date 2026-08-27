'use client';

import { useRef, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface Props {
  children: ReactNode;
  scrollToBottom?: boolean;
}

export function Conversation({ children, scrollToBottom }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToBottom) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [children, scrollToBottom]);

  const handleScroll = () => {
    // Auto-scroll detection could be added here
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scroll-smooth"
      >
        <div className="max-w-[768px] mx-auto px-4 py-6">
          {children}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}

export function ConversationScrollButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      onClick={onClick}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 p-2 rounded-full bg-surface-200 border border-surface-300 text-surface-600 hover:text-white hover:bg-surface-300 transition-all shadow-lg"
    >
      <ArrowDown className="w-4 h-4" />
    </motion.button>
  );
}
