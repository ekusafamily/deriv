// DBOT Notifications View
import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  ShieldAlert,
  Trash2,
  ExternalLink
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { notifications, setNotifications, markNotificationsAsRead } = useStore();
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const handleMarkAllRead = () => {
    markNotificationsAsRead();
  };

  const filtered = notifications.filter((n) => {
    if (filterType === 'ALL') return true;
    return n.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" />
            Execution Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time feed of bot lifecycle events, closed trades, stop loss alerts, and Deriv API connection status.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
        >
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          Mark All As Read
        </button>
      </div>

      {/* Notifications List */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No notification events in the inbox.
          </div>
        ) : (
          filtered.map((item) => {
            const isRead = item.isRead;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-colors flex items-start gap-3.5 ${
                  isRead
                    ? 'bg-slate-900/40 border-slate-800/80 text-slate-300'
                    : 'bg-slate-900/90 border-amber-500/30 text-slate-100 shadow-sm shadow-amber-500/5'
                }`}
              >
                <div className="p-2 rounded-lg bg-slate-800/80 shrink-0 mt-0.5">
                  {item.type.includes('TRADE') ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : item.type.includes('LOSS') || item.type.includes('ERROR') ? (
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Info className="w-4 h-4 text-amber-400" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-100">{item.title}</h3>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
