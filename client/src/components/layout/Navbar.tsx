// DBOT Top Bar Navigation (Bulk Traders / Deriv Pro Interface)
import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import {
  ShieldAlert,
  Wifi,
  WifiOff,
  Bell,
  RefreshCw,
  Wallet,
  Key,
  X,
  LayoutDashboard,
  Bot,
  Gift,
  CandlestickChart,
  FlaskConical,
  LineChart,
  Terminal,
  Zap,
  Globe,
  ExternalLink,
  LogIn,
  UserPlus,
  RotateCcw
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { initiateDerivOAuth } from '../../services/derivAuth';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeAccount,
    wsConnected,
    notifications,
    updateAccountBalance,
    connectAccount
  } = useStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isConnectingToken, setIsConnectingToken] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  const handleOAuthLogin = async () => {
    setIsOAuthLoading(true);
    setTokenError(null);
    try {
      await initiateDerivOAuth();
    } catch (err: any) {
      setTokenError(err.message || 'Failed to initiate Deriv OAuth');
      setIsOAuthLoading(false);
    }
  };

  const handleOAuthSignUp = async () => {
    setIsOAuthLoading(true);
    setTokenError(null);
    try {
      await initiateDerivOAuth({ prompt: 'registration' });
    } catch (err: any) {
      setTokenError(err.message || 'Failed to initiate Deriv Sign Up');
      setIsOAuthLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const [isResettingDemo, setIsResettingDemo] = useState(false);

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    try {
      const resp = await fetch('/api/auth/balance');
      const data = await resp.json();
      if (data && typeof data.balance === 'number') {
        updateAccountBalance(data.balance, data.currency);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleResetDemoBalance = async () => {
    if (!activeAccount || !activeAccount.isVirtual) return;
    if (confirm(`Reset Demo account balance for ${activeAccount.accountId} back to $10,000 USD?`)) {
      setIsResettingDemo(true);
      try {
        const resp = await fetch('/api/auth/reset-demo-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: activeAccount.accountId })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error || 'Failed to reset demo balance');
        }
        updateAccountBalance(data.balance, data.currency);
      } catch (err: any) {
        alert(err.message || 'Error resetting demo balance');
      } finally {
        setIsResettingDemo(false);
      }
    }
  };

  const handleEmergencyStopAll = async () => {
    if (confirm('🚨 EMERGENCY STOP: Are you sure you want to halt ALL active bots immediately?')) {
      try {
        const botsResp = await fetch('/api/bots');
        const bots = await botsResp.json();
        for (const b of bots) {
          if (b.isActive) {
            await fetch(`/api/bots/${b.id}/emergency-stop`, { method: 'POST' });
          }
        }
        alert('All bots have been halted immediately.');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setIsConnectingToken(true);
    setTokenError(null);
    try {
      const resp = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to authorize token');
      const accountData = data.account || data;
      connectAccount({
        accountId: accountData.accountId || data.accountId,
        token: tokenInput.trim(),
        balance: Number(accountData.balance ?? data.balance ?? 0),
        currency: accountData.currency || data.currency || 'USD',
        isVirtual: Boolean(accountData.isVirtual ?? data.isVirtual)
      });
      setShowTokenModal(false);
      setTokenInput('');
    } catch (err: any) {
      setTokenError(err.message || 'Token verification failed');
    } finally {
      setIsConnectingToken(false);
    }
  };

  // Nav links matching the screenshot
  const navTabs = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Bot Builder', path: '/builder', icon: Bot },
    { name: 'Free Bots', path: '/library', icon: Gift },
    { name: 'D-Trader', path: '/market', icon: CandlestickChart },
    { name: 'Analysis Tool', path: '/backtest', icon: FlaskConical },
    { name: 'Charts', path: '/market', icon: LineChart },
    { name: 'Bulk Trader', path: '/console', icon: Terminal },
    { name: 'Ultimate Bot', path: '/analytics', icon: Zap }
  ];

  return (
    <>
      <header className="h-16 border-b border-slate-800/80 bg-[#0c1222] sticky top-0 z-40 px-3 lg:px-5 flex items-center justify-between select-none">
        {/* Left: Brand Identity (BULK TRADERS) */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            {/* Colorful Circular Brand Badge */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-cyan-400 p-0.5 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#0a0f1d] flex items-center justify-center text-[11px] font-black tracking-tighter text-amber-300">
                BT
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-wider text-slate-100 group-hover:text-amber-400 transition-colors uppercase">
                BULK TRADERS
              </span>
              <span className="text-[9px] text-slate-500 font-medium -mt-1 hidden sm:block">
                DBOT Quant Suite
              </span>
            </div>
          </div>

          {/* Center Nav Tabs (Rounded Pill Buttons matching screenshot) */}
          <nav className="hidden xl:flex items-center gap-1.5 ml-2">
            {navTabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.name}
                  onClick={() => navigate(tab.path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Controls: Language, Token, Balance, Kill Switch */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Connection Status Dot */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 border border-slate-800 bg-slate-900/80 px-2.5 py-1 rounded-full">
            {wsConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium text-[11px]">Deriv Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400 font-medium text-[11px]">Reconnecting</span>
              </>
            )}
          </div>

          {/* Language Selector */}
          <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-400 border border-slate-800 px-2 py-1 rounded-lg">
            <span>🇬🇧</span>
            <span>EN</span>
          </div>

          {/* Token Button (Opens quick token connect) */}
          <button
            onClick={() => setShowTokenModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Token</span>
          </button>

          {/* Account Balance Badge */}
          {activeAccount ? (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg p-1 pr-2.5">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                  activeAccount.isVirtual
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                }`}
              >
                {activeAccount.isVirtual ? 'DEMO' : 'REAL'}
              </span>

              <div className="flex items-center gap-1 text-xs font-bold font-mono text-slate-100">
                <span>${(activeAccount.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[10px] text-slate-400">{activeAccount.currency}</span>
              </div>

              <button
                onClick={handleRefreshBalance}
                title="Refresh Balance"
                className="p-1 text-slate-400 hover:text-white"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Reset Demo Balance — only visible for DEMO accounts */}
              {activeAccount.isVirtual && (
                <button
                  onClick={handleResetDemoBalance}
                  disabled={isResettingDemo}
                  title="Reset Demo Balance to $10,000"
                  className="p-1 text-slate-400 hover:text-emerald-400 disabled:opacity-50 transition-colors"
                >
                  <RotateCcw className={`w-3 h-3 ${isResettingDemo ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowTokenModal(true)}
              className="text-xs font-bold px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
            >
              Log in
            </button>
          )}

          {/* Sign Up / Kill Switch Red Button */}
          <button
            onClick={handleEmergencyStopAll}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-900/30 transition-all hover:scale-105 active:scale-95"
            title="Emergency Stop: Abort all active bots"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>KILL SWITCH</span>
          </button>

          {/* Notifications Icon */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Quick Deriv Connection Modal (OAuth 2.0 PKCE & Token) */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                Connect Deriv Account
              </h3>
              <button
                onClick={() => setShowTokenModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* OAuth 2.0 PKCE One-Click Buttons */}
            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={handleOAuthLogin}
                disabled={isOAuthLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-950/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isOAuthLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>Log in with Deriv (OAuth 2.0)</span>
              </button>

              <button
                type="button"
                onClick={handleOAuthSignUp}
                disabled={isOAuthLoading}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Create a New Deriv Account</span>
              </button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider text-slate-500">
                <span className="bg-[#0e1628] px-2">Or connect with API token</span>
              </div>
            </div>

            <form onSubmit={handleConnectToken} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Deriv API Token
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste your Read/Trade API Token here"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Obtain your API token from Deriv Account Settings &gt; API Token with Read and Trade scopes.
                </p>
              </div>

              {tokenError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {tokenError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTokenModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnectingToken || !tokenInput.trim()}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs"
                >
                  {isConnectingToken ? 'Verifying...' : 'Authorize & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
