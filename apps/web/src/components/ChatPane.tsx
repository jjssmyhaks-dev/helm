'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import { AnimatedMessage } from './AnimatedMessage';
import { AnimatedChatInput } from './AnimatedChatInput';
import {
  Anchor,
  Bot,
  MessageSquare,
  Plus,
  BarChart3,
  Settings,
  Sparkles,
  Users,
  Mail,
  PanelRightOpen,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { ToolSearchModal } from './connectors/ToolSearchModal';

function UserButtonSafe() {
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center text-white text-[10px] font-semibold">
      Y
    </div>
  );
}

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showToolSearch, setShowToolSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const userMsg: ChatMessage = { id: `t-${Date.now()}`, role: 'founder', content: input.trim(), createdAt: new Date().toISOString() };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setSending(true);
    const sid = `s-${Date.now()}`;
    setMessages((p) => [...p, { id: sid, role: 'agent', content: '', createdAt: new Date().toISOString() }]);

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

  const toggleRecording = async () => {
    if (isRecording) { setIsRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      setTimeout(() => { setIsRecording(false); stream.getTracks().forEach((t) => t.stop()); }, 5000);
    } catch {}
  };

  return (
    <div className="flex flex-col h-full bg-surface-0 relative">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-surface-300/30 bg-surface-0/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center shadow-lg shadow-helm-500/20">
            <Anchor className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-white text-sm tracking-tight">Helm</span>
            <span className="text-[11px] text-surface-600 ml-2 font-medium">AI Team</span>
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
            <motion.button
              key={i}
              onClick={action}
              className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all duration-150"
              title={title}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon className="w-4 h-4" />
            </motion.button>
          ))}
          <motion.button
            onClick={() => setShowSessions(!showSessions)}
            className={`p-2 rounded-lg transition-all duration-150 ${showSessions ? 'bg-surface-200 text-white' : 'hover:bg-surface-200 text-surface-600 hover:text-white'}`}
            title="History"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <MessageSquare className="w-4 h-4" />
          </motion.button>
          <div className="w-px h-5 bg-surface-300 mx-1" />
          <NotificationBell token={token} />
          <motion.button
            onClick={onToggleSidePanel}
            className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all duration-150"
            title="Panel"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <PanelRightOpen className="w-4 h-4" />
          </motion.button>
          <UserButtonSafe />
        </div>
      </header>

      {/* Session History */}
      <AnimatePresence>
        {showSessions && (
          <motion.div
            className="absolute top-[53px] right-4 z-50 w-80 max-h-96 overflow-y-auto bg-surface-100 border border-surface-300/50 rounded-2xl shadow-2xl"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
          >
            <div className="p-3 border-b border-surface-300/50">
              <h3 className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Recent Chats</h3>
            </div>
            {sessions.length === 0 ? (
              <div className="p-6 text-center text-surface-600 text-sm">No conversations yet</div>
            ) : (
              <div className="py-1 p-1">
                {sessions.map((s) => (
                  <button key={s.id} onClick={() => { onSessionChange(s.id); setShowSessions(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 ${s.id === sessionId ? 'bg-surface-200' : 'hover:bg-surface-200/50'}`}>
                    <div className="text-sm text-surface-800 truncate font-medium">{s.title || 'Untitled'}</div>
                    <div className="text-xs text-surface-600 mt-0.5">
                      {new Date(s.updatedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <motion.div
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-helm-500/20 to-helm-600/10 border border-helm-500/20 flex items-center justify-center mb-6"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="w-7 h-7 text-helm-400" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">What can I help with?</h2>
            <p className="text-surface-600 max-w-sm text-sm leading-relaxed mb-8">
              Ask anything about your business — I&apos;ll route it to the right specialist team.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full">
              {SUGGESTIONS.map((s) => (
                <motion.button
                  key={s.text}
                  onClick={() => setInput(s.text)}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-300/50 bg-surface-100/50 hover:bg-surface-200/50 hover:border-surface-400 transition-all duration-200 text-left"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-sm text-surface-700 group-hover:text-white transition-colors">{s.text}</span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <AnimatedMessage key={msg.id} role={msg.role} content={msg.content} createdAt={msg.createdAt} />
              ))}
            </AnimatePresence>

            {sending && (
              <motion.div
                className="flex gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
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
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Animated Input */}
      <AnimatedChatInput
        input={input}
        setInput={setInput}
        onSend={sendMessage}
        sending={sending}
        isRecording={isRecording}
        onToggleRecording={toggleRecording}
      />

      {/* Tool Search Modal */}
      <ToolSearchModal open={showToolSearch} onClose={() => setShowToolSearch(false)} />
    </div>
  );
}
