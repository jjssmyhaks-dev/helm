'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Bell, CheckCircle, AlertTriangle, Clock, X } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  body: string;
  priority: string;
  read: boolean;
  createdAt: string;
}

interface Props { token: string; }

export function NotificationBell({ token }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { api.setToken(token); }, [token]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [notifs, count] = await Promise.all([
          api.request<Notification[]>('GET', '/notifications'),
          api.request<{ count: number }>('GET', '/notifications/unread-count'),
        ]);
        setNotifications(notifs);
        setUnreadCount(count.count);
      } catch {}
    };
    fetch();
    const i = setInterval(fetch, 15000);
    return () => clearInterval(i);
  }, [token]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id: string) => {
    try { await api.request('PATCH', `/notifications/${id}/read`); setUnreadCount((c) => Math.max(0, c - 1)); } catch {}
  };

  const getIcon = (title: string) => {
    if (title.includes('Approval')) return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    if (title.includes('Completed')) return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
    if (title.includes('Failed')) return <X className="w-3.5 h-3.5 text-red-400" />;
    return <Clock className="w-3.5 h-3.5 text-surface-600" />;
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all duration-150">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto glass-strong rounded-2xl shadow-elevated z-50 animate-scale-in">
          <div className="p-3 border-b border-surface-300/50 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Notifications</h3>
            {unreadCount > 0 && <span className="text-[10px] text-helm-400 font-medium">{unreadCount} unread</span>}
          </div>
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-surface-600 text-xs">No notifications yet</div>
          ) : (
            <div className="py-1">
              {notifications.slice(0, 15).map((n) => (
                <button key={n.id} onClick={() => markRead(n.id)} className={`w-full text-left px-3 py-2.5 hover:bg-surface-200/50 transition-colors ${!n.read ? 'bg-surface-100/50' : ''}`}>
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">{getIcon(n.title)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-surface-800">{n.title}</div>
                      <p className="text-[11px] text-surface-600 mt-0.5 line-clamp-2">{n.body}</p>
                      <span className="text-[10px] text-surface-600 mt-1 block">
                        {new Date(n.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-helm-400 flex-shrink-0 mt-1.5" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
