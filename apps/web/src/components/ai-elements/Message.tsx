'use client';

import { motion } from 'framer-motion';
import { Bot, User, Anchor } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface Props {
  role: 'user' | 'assistant';
  children: React.ReactNode;
  content?: string;
  isStreaming?: boolean;
}

function UserAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-surface-300 to-surface-400 flex items-center justify-center flex-shrink-0">
      <User className="w-4 h-4 text-white" />
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-helm-500/20">
      <Anchor className="w-4 h-4 text-white" />
    </div>
  );
}

export function Message({ role, children, content, isStreaming = false }: Props) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`group flex gap-3 py-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar — left for assistant, right for user */}
      {!isUser && <AssistantAvatar />}

      {/* Message body */}
      <div className={`flex flex-col ${isUser ? 'max-w-[70%] items-end' : 'max-w-full'}`}>
        {/* Role label */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-surface-700">Helm</span>
          </div>
        )}

        {/* Content */}
        <div
          className={`${
            isUser
              ? 'bg-surface-200 border border-surface-300/50 text-surface-800 rounded-2xl rounded-br-md px-4 py-3'
              : 'text-surface-800'
          } text-[14px] leading-relaxed`}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{content || children}</span>
          ) : (
            <>
              {content && <MarkdownRenderer content={content} />}
              {isStreaming && (
                <motion.span
                  className="inline-block w-0.5 h-4 bg-helm-500 ml-0.5 align-middle"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
              {children}
            </>
          )}
        </div>
      </div>

      {/* Avatar — right for user */}
      {isUser && <UserAvatar />}
    </motion.div>
  );
}

export function MessageContent({ children }: { children: React.ReactNode }) {
  return <div className="text-[14px] leading-relaxed">{children}</div>;
}

export function MessageActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {children}
    </div>
  );
}
