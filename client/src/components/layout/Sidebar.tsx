// DBOT Left Expandable Sidebar Navigation
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  BookOpen,
  Terminal,
  TrendingUp,
  History,
  PieChart,
  Settings,
  HelpCircle,
  FlaskConical,
  Bell
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Bot Builder', path: '/builder', icon: Cpu },
  { name: 'Strategy Library', path: '/library', icon: BookOpen },
  { name: 'Live Console', path: '/console', icon: Terminal, badge: 'LIVE' },
  { name: 'Market Watch', path: '/market', icon: TrendingUp },
  { name: 'Backtesting', path: '/backtest', icon: FlaskConical },
  { name: 'Trade History', path: '/history', icon: History },
  { name: 'Analytics', path: '/analytics', icon: PieChart },
  { name: 'Notifications', path: '/notifications', icon: Bell },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Help & Docs', path: '/help', icon: HelpCircle }
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-16 md:w-60 border-r border-slate-800/80 bg-[#090d18] flex flex-col justify-between shrink-0 transition-all select-none">
      <div className="py-4 px-2 md:px-3 space-y-1">
        <div className="hidden md:block px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-500/5'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="hidden md:inline truncate">{item.name}</span>
              {item.badge && (
                <span className="hidden md:inline ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Disclaimer */}
      <div className="hidden md:block p-4 border-t border-slate-800/60 bg-slate-900/40 text-[11px] text-slate-400">
        <p className="font-semibold text-slate-300">Third-Party App</p>
        <p className="mt-0.5 leading-relaxed">
          DBOT connects via official Deriv API. Trading involves high risk of loss.
        </p>
      </div>
    </aside>
  );
};
