'use client';

import { Bot, User } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessage {
  id: string;
  role: 'founder' | 'agent' | 'system';
  content: string;
  createdAt: string;
}

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: Props) {
  if (message.role === 'founder') {
    return (
      <div className="flex gap-3 mb-4 justify-end">
        <div className="max-w-[70%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed bg-helm-600 text-white">
          {message.content}
        </div>
        <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-4 h-4 text-dark-400" />
        </div>
      </div>
    );
  }

  if (message.role === 'system') {
    return (
      <div className="flex gap-3 mb-4">
        <div className="max-w-[70%] rounded-2xl rounded-bl-md px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
          {message.content}
        </div>
      </div>
    );
  }

  // Agent message with markdown
  return (
    <div className="flex gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-helm-600/20 flex items-center justify-center flex-shrink-0 mt-1">
        <Bot className="w-4 h-4 text-helm-400" />
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed bg-dark-800 text-dark-100 border border-dark-700">
        {message.content ? (
          <MarkdownRenderer content={message.content} />
        ) : isStreaming ? (
          <div className="flex items-center gap-2 text-dark-500">
            <div className="w-2 h-2 bg-helm-400 rounded-full animate-pulse" />
            <span className="text-sm">Thinking...</span>
          </div>
        ) : null}
        {isStreaming && message.content && (
          <span className="inline-block w-0.5 h-4 bg-helm-400 ml-0.5 animate-pulse" />
        )}
      </div>
    </div>
  );
}
