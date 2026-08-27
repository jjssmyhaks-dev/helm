'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  Anchor,
  MessageSquare,
  Plus,
  BarChart3,
  Settings,
  Users,
  Mail,
  PanelRightOpen,
  User,
  Brain,
  Wrench,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ArrowDown,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { ToolSearchModal } from './connectors/ToolSearchModal';
import HelmAiInput from './HelmAiInput';

/* ─── Safe Clerk fallback ─── */
function UserAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-surface-300 to-surface-400 flex items-center justify-center flex-shrink-0">
      <User className="w-4 h-4 text-white" />
    </div>
  );
}

function HelmAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-helm-500/20">
      <Anchor className="w-4 h-4 text-white" />
    </div>
  );
}

/* ─── Types ─── */
interface ChatMessage {
  id: string;
  role: 'founder' | 'agent' | 'system';
  content: string;
  createdAt: string;
  reasoning?: string;
  tools?: Array<{ name: string; status: 'running' | 'complete' | 'error'; description?: string }>;
}

interface ChatSession {
  id: string;
  title: string | null;
  updatedAt: string;
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
  { text: 'Score my leads and suggest next actions', icon: '🎯' },
  { text: 'Analyze my SEO performance', icon: '📊' },
];

/* ─── Main ChatPane ─── */
export function ChatPane({ token, sessionId, onSessionChange, onToggleSidePanel, onLogout }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { api.setToken(token); }, [token]);

  const loadSessions = useCallback(async () => {
    try { const list = await api.listSessions(); setSessions(list); } catch {}
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => {
    if (sessionId) loadHistory(sessionId);
    else setMessages([]);
  }, [sessionId]);
  useEffect(() => { if (messages.length > 0) loadSessions(); }, [messages.length, loadSessions]);

  const loadHistory = async (sid: string) => {
    try {
      const h = await api.getChatHistory(sid);
      if (h?.messages) setMessages(h.messages.map((m: any) => ({
        id: m.id, role: m.role === 'FOUNDER' ? 'founder' : 'agent',
        content: m.content, createdAt: m.createdAt,
      })));
    } catch { setMessages([]); }
  };

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; }
  }, [input]);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Scroll detection
  const handleScroll = () => {
    const el = scrollRef.current;
    if (el) {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollBtn(!atBottom);
    }
  };

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const userMsg: ChatMessage = { id: `t-${Date.now()}`, role: 'founder', content: input.trim(), createdAt: new Date().toISOString() };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setSending(true);

    const sid = `s-${Date.now()}`;
    setMessages((p) => [...p, { id: sid, role: 'agent', content: '', createdAt: new Date().toISOString(), tools: [] }]);

    try {
      await api.streamMessage(userMsg.content, sessionId || undefined,
        (chunk: string) => setMessages((p) => p.map((m) => m.id === sid ? { ...m, content: m.content + chunk } : m)),
        (ns: string) => onSessionChange(ns),
        () => setSending(false),
      );
    } catch (err: any) {
      setMessages((p) => p.map((m) => m.id === sid ? { ...m, content: `Error: ${err.message}` } : m));
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

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-surface-200 bg-white/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center shadow-md">
            <Anchor className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-surface-800 text-sm">Helm</span>
            <span className="text-[11px] text-surface-500 ml-1.5">AI Team</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[
            { icon: Plus, action: () => { onSessionChange(''); setMessages([]); setShowSessions(false); }, title: 'New chat' },
            { icon: BarChart3, action: () => {}, title: 'Dashboard' },
            { icon: Users, action: () => {}, title: 'Leads' },
            { icon: Mail, action: () => {}, title: 'Emails' },
            { icon: Settings, action: () => {}, title: 'Settings' },
          ].map(({ icon: Icon, action, title }, i) => (
            <motion.button key={i} onClick={action} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors" title={title} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Icon className="w-4 h-4" />
            </motion.button>
          ))}
          <motion.button onClick={() => setShowSessions(!showSessions)} className={`p-2 rounded-lg transition-colors ${showSessions ? 'bg-surface-100 text-surface-700' : 'hover:bg-surface-100 text-surface-500 hover:text-surface-700'}`} title="History" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <MessageSquare className="w-4 h-4" />
          </motion.button>
          <div className="w-px h-5 bg-surface-200 mx-1" />
          <NotificationBell token={token} />
          <motion.button onClick={onToggleSidePanel} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors" title="Panel" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <PanelRightOpen className="w-4 h-4" />
          </motion.button>
          <UserAvatar />
        </div>
      </header>

      {/* ─── Session History Dropdown ─── */}
      <AnimatePresence>
        {showSessions && (
          <motion.div className="absolute top-[53px] right-4 z-50 w-80 max-h-96 overflow-y-auto bg-white border border-surface-200 rounded-2xl shadow-2xl" initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}>
            <div className="p-3 border-b border-surface-200">
              <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Recent Chats</h3>
            </div>
            {sessions.length === 0 ? (
              <div className="p-6 text-center text-surface-400 text-sm">No conversations yet</div>
            ) : (
              <div className="py-1 p-1">
                {sessions.map((s) => (
                  <button key={s.id} onClick={() => { onSessionChange(s.id); setShowSessions(false); }} className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${s.id === sessionId ? 'bg-surface-100' : 'hover:bg-surface-50'}`}>
                    <div className="text-sm text-surface-700 truncate font-medium">{s.title || 'Untitled'}</div>
                    <div className="text-xs text-surface-400 mt-0.5">{new Date(s.updatedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Messages / Empty State ─── */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <div className="max-w-[768px] mx-auto px-4 py-6">
          {isEmpty ? (
            /* ─── Empty State: Claude/ChatGPT style ─── */
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center mb-6 shadow-xl shadow-helm-500/20 mx-auto">
                  <Anchor className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-surface-800 mb-2">How can I help you today?</h2>
                <p className="text-surface-500 max-w-sm text-sm mb-8">
                  I can help with research, marketing, operations, finance, and more.
                </p>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button key={i} onClick={() => setInput(s.text)} className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-200 bg-white hover:bg-surface-50 hover:border-surface-300 transition-all text-left shadow-sm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }} whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.99 }}>
                    <span className="text-base">{s.icon}</span>
                    <span className="text-sm text-surface-600 group-hover:text-surface-800 transition-colors">{s.text}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            /* ─── Message List ─── */
            <div className="space-y-1">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <MessageBubble msg={msg} />
                </div>
              ))}

              {/* Thinking indicator */}
              {sending && messages[messages.length - 1]?.content === '' && (
                <ThinkingBubble />
              )}

              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} onClick={scrollToBottom} className="fixed bottom-28 left-1/2 -translate-x-1/2 z-10 p-2 rounded-full bg-white border border-surface-200 text-surface-500 hover:text-surface-700 hover:bg-surface-50 transition-all shadow-lg">
              <ArrowDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Prompt Input ─── */}
      <div className="w-full max-w-[768px] mx-auto px-4 pb-6 pt-2">
        <HelmAiInput
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          disabled={sending}
          isRecording={isRecording}
          onToggleRecording={toggleRecording}
        />
        <p className="text-center text-[11px] text-surface-400 mt-2">Helm can make mistakes. Verify important decisions.</p>
      </div>


    </div>
  );
}

/* ─── Message Bubble ─── */
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'founder';

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={`group flex gap-3 py-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <HelmAvatar />}

      <div className={`flex flex-col ${isUser ? 'max-w-[70%] items-end' : 'max-w-full'}`}>
        {!isUser && <span className="text-xs font-semibold text-surface-600 mb-1 ml-1">Helm</span>}
        <div className={`${isUser ? 'bg-surface-200 border border-surface-200 text-surface-800 rounded-2xl rounded-br-md px-4 py-3' : 'text-surface-800'} text-[14px] leading-relaxed`}>
          {isUser ? (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          ) : (
            <>
              {/* Tool cards */}
              {msg.tools && msg.tools.length > 0 && (
                <div className="mb-2">
                  {msg.tools.map((tool, i) => (
                    <ToolCardInline key={i} name={tool.name} status={tool.status} description={tool.description} />
                  ))}
                </div>
              )}
              {/* Reasoning */}
              {msg.reasoning && <ReasoningBlock content={msg.reasoning} />}
              {/* Content */}
              {msg.content && <MarkdownRenderer content={msg.content} />}
              {/* Streaming cursor is handled by the parent via isStreaming prop */}
            </>
          )}
        </div>
      </div>

      {isUser && <UserAvatar />}
    </motion.div>
  );
}

/* ─── Thinking Bubble ─── */
function ThinkingBubble() {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 py-4">
      <HelmAvatar />
      <div>
        <span className="text-xs font-semibold text-surface-600 mb-1.5 ml-1 block">Helm</span>
        <div className="flex items-center gap-3 px-4 py-3 bg-surface-50 border border-surface-200 rounded-2xl rounded-bl-md">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="w-2 h-2 rounded-full bg-surface-400" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </div>
          <span className="text-xs text-surface-500">Thinking...</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Tool Card (inline) ─── */
function ToolCardInline({ name, status, description }: { name: string; status: string; description?: string }) {
  const config = {
    running: { color: 'text-helm-500', bg: 'bg-helm-50', border: 'border-helm-200', spin: true },
    complete: { color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', spin: false },
    error: { color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', spin: false },
  }[status] || { color: 'text-surface-400', bg: 'bg-surface-50', border: 'border-surface-200', spin: false };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bg} ${config.border} text-xs mb-1`}>
      {config.spin ? <Loader2 className={`w-3 h-3 ${config.color} animate-spin`} /> : <CheckCircle2 className={`w-3 h-3 ${config.color}`} />}
      <Wrench className="w-3 h-3 text-surface-400" />
      <span className="font-medium text-surface-700">{name}</span>
      {description && <span className="text-surface-500">— {description}</span>}
    </div>
  );
}

/* ─── Reasoning Block ─── */
function ReasoningBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-700 transition-colors">
        <Brain className="w-3 h-3" />
        <span className="font-medium">Reasoning</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}><ChevronDown className="w-3 h-3" /></motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="mt-1 ml-4 px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-xs text-surface-600 leading-relaxed whitespace-pre-wrap">{content}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
