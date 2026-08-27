'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  Send,
  PanelRightOpen,
  Mic,
  MicOff,
  Anchor,
  Bot,
  Loader2,
  MessageSquare,
  Plus,
  BarChart3,
  Settings,
  Sparkles,
  ArrowUp,
  Users,
  Mail,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
// Safe user avatar — always shows fallback in demo mode
function UserButtonSafe(_props: any) {
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center text-white text-[10px] font-semibold">
      Y
    </div>
  );
}
import { useRouter } from 'next/navigation';
import { CapabilityBar } from './ai/CapabilityBar';
import { ToolInvocationCard } from './ai/ToolInvocationCard';
import { ToolSearchModal } from './connectors/ToolSearchModal';

interface ChatMessage {
  id: string;
  role: 'founder' | 'agent' | 'system';
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string | null;
  updatedAt: string;
  messages?: { content: string }[];
}

interface Props {
  token: string;
  sessionId: string | null;
  onSessionChange: (id: string) => void;
  onToggleSidePanel: () => void;
  onLogout: () => void;
}

const SUGGESTIONS = [
  { text: 'How is my cash flow looking?', icon: '💰' },
  { text: 'Research my competitors', icon: '🔍' },
  { text: 'Draft a marketing plan', icon: '📢' },
  { text: 'What are my tax obligations?', icon: '📋' },
];

export function ChatPane({ token, sessionId, onSessionChange, onToggleSidePanel, onLogout }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [activeCapabilities, setActiveCapabilities] = useState<Set<string>>(new Set());
  const [toolInvocations, setToolInvocations] = useState<Array<{ toolName: string; status: 'running' | 'complete' | 'error'; input?: Record<string, unknown>; output?: string | Record<string, unknown> | null }>>([]);
  const [showToolSearch, setShowToolSearch] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.setToken(token);
  }, [token]);

  const loadSessions = useCallback(async () => {
    try {
      const sessionList = await api.listSessions();
      setSessions(sessionList);
    } catch {}
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    if (sessionId) loadHistory(sessionId);
    else setMessages([]);
  }, [sessionId]);

  useEffect(() => {
    if (messages.length > 0) loadSessions();
  }, [messages.length, loadSessions]);

  const loadHistory = async (sid: string) => {
    try {
      const history = await api.getChatHistory(sid);
      if (history?.messages) {
        setMessages(history.messages.map((m: any) => ({
          id: m.id,
          role: m.role === 'FOUNDER' ? 'founder' : 'agent',
          content: m.content,
          createdAt: m.createdAt,
        })));
      }
    } catch { setMessages([]); }
  };

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
        (chunk: string) => {
          setMessages((prev) => prev.map((m) =>
            m.id === streamingId ? { ...m, content: m.content + chunk } : m
          ));
        },
        (newSessionId: string) => onSessionChange(newSessionId),
        () => setSending(false),
      );
    } catch (err: any) {
      setMessages((prev) => prev.map((m) =>
        m.id === streamingId ? { ...m, content: `Error: ${err.message}` } : m
      ));
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const toggleRecording = async () => {
    if (isRecording) { setIsRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      setTimeout(() => { setIsRecording(false); stream.getTracks().forEach((t) => t.stop()); }, 5000);
    } catch {}
  };

  const newChat = () => { onSessionChange(''); setMessages([]); setShowSessions(false); };
  const switchSession = (sid: string) => { onSessionChange(sid); setShowSessions(false); };

  return (
    <div className="flex flex-col h-full bg-surface-0 relative">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-surface-300/50 bg-surface-0/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center shadow-glow">
            <Anchor className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-white text-sm tracking-tight">Helm</span>
            <span className="text-[11px] text-surface-600 ml-2 font-medium">AI Team</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={newChat} className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all duration-150" title="New chat">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all duration-150" title="Dashboard">
            <BarChart3 className="w-4 h-4" />
          </button>
          <button onClick={() => router.push('/leads')} className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all duration-150" title="Leads">
            <Users className="w-4 h-4" />
          </button>
          <button onClick={() => router.push('/emails')} className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all duration-150" title="Emails">
            <Mail className="w-4 h-4" />
          </button>
          <button onClick={() => router.push('/settings')} className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all duration-150" title="Settings">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={() => setShowSessions(!showSessions)} className={`p-2 rounded-lg transition-all duration-150 ${showSessions ? 'bg-surface-200 text-white' : 'hover:bg-surface-200 text-surface-600 hover:text-white'}`} title="History">
            <MessageSquare className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-surface-300 mx-1" />
          <NotificationBell token={token} />
          <button onClick={onToggleSidePanel} className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all duration-150" title="Panel">
            <PanelRightOpen className="w-4 h-4" />
          </button>
          <UserButtonSafe appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
        </div>
      </header>

      {/* Session History Dropdown */}
      {showSessions && (
        <div className="absolute top-[53px] right-4 z-50 w-80 max-h-96 overflow-y-auto glass-strong rounded-2xl shadow-elevated animate-scale-in">
          <div className="p-3 border-b border-surface-300/50">
            <h3 className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Recent Chats</h3>
          </div>
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-surface-600 text-sm">No conversations yet</div>
          ) : (
            <div className="py-1 p-1">
              {sessions.map((s) => (
                <button key={s.id} onClick={() => switchSession(s.id)} className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 ${s.id === sessionId ? 'bg-surface-200' : 'hover:bg-surface-200/50'}`}>
                  <div className="text-sm text-surface-800 truncate font-medium">{s.title || 'Untitled'}</div>
                  <div className="text-xs text-surface-600 mt-0.5">
                    {new Date(s.updatedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            {/* Logo */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-helm-500/20 to-helm-600/10 border border-helm-500/20 flex items-center justify-center mb-6 animate-float">
              <Sparkles className="w-7 h-7 text-helm-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
              What can I help with?
            </h2>
            <p className="text-surface-600 max-w-sm text-sm leading-relaxed mb-8">
              Ask anything about your business — I&apos;ll route it to the right specialist team.
            </p>

            {/* Suggestion cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-300/50 bg-surface-100/50 hover:bg-surface-200/50 hover:border-surface-400 transition-all duration-200 text-left"
                >
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-sm text-surface-700 group-hover:text-white transition-colors">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'founder' ? 'justify-end' : 'justify-start'}`}>
                {msg.role !== 'founder' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-helm-500/20 to-helm-600/10 border border-helm-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-helm-400" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'founder' ? 'order-first' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                      msg.role === 'founder'
                        ? 'bg-gradient-to-r from-helm-600 to-helm-500 text-white rounded-br-md shadow-glow'
                        : msg.role === 'agent'
                        ? 'bg-surface-100 border border-surface-300/50 text-surface-800 rounded-bl-md'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {msg.role === 'agent' ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                  <div className={`text-[10px] text-surface-600 mt-1 ${msg.role === 'founder' ? 'text-right' : 'text-left'} px-1`}>
                    {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {msg.role === 'founder' && (
                  <div className="w-7 h-7 rounded-lg bg-surface-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-[10px] font-semibold">You</span>
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-helm-500/20 to-helm-600/10 border border-helm-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-helm-400" />
                </div>
                <div className="bg-surface-100 border border-surface-300/50 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-surface-600 text-sm">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-helm-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-helm-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-helm-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs">Thinking...</span>
                  </div>
            {toolInvocations.length > 0 && (
              <div className="space-y-2 ml-10">
                {toolInvocations.map((inv, i) => (
                  <ToolInvocationCard key={i} invocation={inv} />
                ))}
              </div>
            )}
            {thinkingMessage && (
              <div className="ml-10 px-4 py-2 text-xs text-surface-600 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1 h-1 rounded-full bg-helm-400 animate-bounce" />
                  <span className="w-1 h-1 rounded-full bg-helm-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-1 rounded-full bg-helm-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                {thinkingMessage}
              </div>
            )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-surface-300/50 bg-surface-0/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-1 mb-2 px-1">
            <CapabilityBar activeCapabilities={activeCapabilities} onToggle={(cap) => setActiveCapabilities((prev) => { const next = new Set(prev); if (next.has(cap)) next.delete(cap); else next.add(cap); return next; })} onOpenTools={() => setShowToolSearch(true)} isRecording={isRecording} />
          </div>
          <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Helm..."
              rows={1}
              className="w-full px-4 py-3 pr-12 rounded-2xl bg-surface-100 border border-surface-300 text-white placeholder-surface-600 focus:outline-none focus:ring-2 focus:ring-helm-500/30 focus:border-helm-500 resize-none text-sm transition-all duration-200"
              style={{ minHeight: '48px', maxHeight: '160px' }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleRecording}
              className={`p-2.5 rounded-xl transition-all duration-200 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20'
                  : 'bg-surface-200 text-surface-600 hover:text-white hover:bg-surface-300'
              }`}
              title={isRecording ? 'Stop' : 'Voice'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="p-2.5 rounded-xl bg-gradient-to-r from-helm-600 to-helm-500 text-white hover:from-helm-500 hover:to-helm-400 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-glow disabled:shadow-none"
              title="Send"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
          </div>
        <p className="text-center text-[10px] text-surface-600 mt-2">
          Helm can make mistakes. Verify important decisions.
        </p>
      </div>
    </div>
  );
}
