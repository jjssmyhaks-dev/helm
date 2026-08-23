'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Send,
  PanelRightOpen,
  Mic,
  MicOff,
  Anchor,
  Bot,
  Loader2,
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

interface ChatMessage {
  id: string;
  role: 'founder' | 'agent' | 'system';
  content: string;
  createdAt: string;
}

interface Props {
  token: string;
  sessionId: string | null;
  onSessionChange: (id: string) => void;
  onToggleSidePanel: () => void;
  onLogout: () => void;
}

export function ChatPane({ token, sessionId, onSessionChange, onToggleSidePanel, onLogout }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.setToken(token);
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'founder',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    // Add placeholder for streaming response
    const streamingId = `streaming-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: streamingId,
      role: 'agent',
      content: '',
      createdAt: new Date().toISOString(),
    }]);

    try {
      await api.streamMessage(
        userMessage.content,
        sessionId || undefined,
        // onChunk: update the streaming message
        (chunk: string) => {
          setMessages((prev) => prev.map((m) =>
            m.id === streamingId
              ? { ...m, content: m.content + chunk }
              : m,
          ));
        },
        // onSession: update session ID
        (newSessionId: string) => {
          onSessionChange(newSessionId);
        },
        // onDone: finalize
        () => {
          setSending(false);
        },
      );
    } catch (err: any) {
      setMessages((prev) => prev.map((m) =>
        m.id === streamingId
          ? { ...m, content: `Error: ${err.message}` }
          : m,
      ));
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      // In production: stop STT, send transcript
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      // In production: send stream to STT provider, on result call sendMessage with transcript
      // For now, simulate with a timeout
      setTimeout(() => {
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
      }, 5000);
    } catch {
      // Microphone permission denied
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-dark-700 bg-dark-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-helm-600 flex items-center justify-center">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-white">Helm</span>
          <span className="text-xs text-dark-500 ml-2">AI Team for Solo Founders</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidePanel}
            className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
            title="Toggle side panel"
          >
            <PanelRightOpen className="w-5 h-5" />
          </button>
          <UserButton 
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
              },
            }}
          />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-helm-600/20 flex items-center justify-center mb-4">
              <Anchor className="w-8 h-8 text-helm-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Welcome to Helm
            </h2>
            <p className="text-dark-500 max-w-md">
              Your AI operating system is ready. Ask me anything about your business
              — research, marketing, operations, or finance.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 max-w-lg">
              {[
                'How is my cash flow looking?',
                'Research my competitors',
                'Draft a marketing plan',
                'What are my tax obligations?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="px-4 py-3 rounded-xl border border-dark-600 bg-dark-800 text-sm text-dark-300 hover:border-helm-500 hover:text-white transition-colors text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 mb-4 ${msg.role === 'founder' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role !== 'founder' && (
              <div className="w-8 h-8 rounded-lg bg-helm-600/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-helm-400" />
              </div>
            )}
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'founder'
                  ? 'bg-helm-600 text-white rounded-br-md'
                  : msg.role === 'agent'
                  ? 'bg-dark-800 text-dark-100 border border-dark-700 rounded-bl-md'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'founder' && (
              <div className="w-8 h-8 rounded-lg bg-helm-600 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-xs font-medium">You</span>
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-helm-600/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-helm-400" />
            </div>
            <div className="bg-dark-800 border border-dark-700 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-dark-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Helm is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-dark-700 bg-dark-900/80 backdrop-blur-sm">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Helm anything..."
              rows={1}
              className="w-full px-4 py-3 pr-12 rounded-xl bg-dark-800 border border-dark-600 text-white placeholder-dark-500 focus:outline-none focus:border-helm-500 focus:ring-1 focus:ring-helm-500 resize-none text-sm"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
          </div>
          <button
            onClick={toggleRecording}
            className={`p-3 rounded-xl transition-colors ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-dark-700 text-dark-400 hover:text-white hover:bg-dark-600'
            }`}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="p-3 rounded-xl bg-helm-600 text-white hover:bg-helm-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
