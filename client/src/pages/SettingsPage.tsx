// DBOT Account Integration, Risk Settings, & Notifications Configuration
import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Key,
  Shield,
  Send,
  CheckCircle,
  AlertTriangle,
  LogOut,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Sliders,
  DollarSign,
  LogIn,
  UserPlus,
  RotateCcw
} from 'lucide-react';
import { initiateDerivOAuth } from '../services/derivAuth';

export const SettingsPage: React.FC = () => {
  const {
    accounts,
    setAccounts,
    activeAccount,
    setActiveAccount,
    updateAccountBalance
  } = useStore();

  const [apiToken, setApiToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOAuthLogin = async () => {
    setIsOAuthLoading(true);
    setStatusMessage(null);
    try {
      await initiateDerivOAuth();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to initiate Deriv OAuth' });
      setIsOAuthLoading(false);
    }
  };

  const handleOAuthSignUp = async () => {
    setIsOAuthLoading(true);
    setStatusMessage(null);
    try {
      await initiateDerivOAuth({ prompt: 'registration' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to initiate Deriv Sign Up' });
      setIsOAuthLoading(false);
    }
  };

  // Global Risk Settings State
  const [maxStake, setMaxStake] = useState('50.00');
  const [maxDailyLoss, setMaxDailyLoss] = useState('100.00');
  const [takeProfitTarget, setTakeProfitTarget] = useState('100.00');
  const [maxConsecutiveLosses, setMaxConsecutiveLosses] = useState('5');
  const [cooldownSeconds, setCooldownSeconds] = useState('5');
  const [isSavingRisk, setIsSavingRisk] = useState(false);

  // Telegram Settings State
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  // Load existing accounts & risk settings
  useEffect(() => {
    fetch('/api/auth/accounts')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAccounts(data);
          if (!activeAccount) {
            setActiveAccount(data[0]);
          }
        }
      })
      .catch((e) => console.error(e));

    fetch('/api/risk/settings')
      .then((r) => r.json())
      .then((s) => {
        if (s) {
          setMaxStake(s.maxStake?.toString() || '50.00');
          setMaxDailyLoss(s.maxDailyLoss?.toString() || '100.00');
          setTakeProfitTarget(s.takeProfitTarget?.toString() || '100.00');
          setMaxConsecutiveLosses(s.maxConsecutiveLosses?.toString() || '5');
          setCooldownSeconds(s.cooldownSeconds?.toString() || '5');
        }
      })
      .catch((e) => console.error(e));
  }, []);

  // Connect Deriv Token
  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiToken.trim()) return;

    setIsConnecting(true);
    setStatusMessage(null);

    try {
      const resp = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: apiToken.trim() })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to authenticate with Deriv API');
      }

      const newAccount = data.account;
      setActiveAccount(newAccount);
      setAccounts([newAccount, ...accounts.filter((a) => a.accountId !== newAccount.accountId)]);
      setStatusMessage({
        type: 'success',
        text: `Successfully authenticated! Connected as ${newAccount.accountId} (${newAccount.isVirtual ? 'Demo' : 'Real'})`
      });
      setApiToken('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsConnecting(false);
    }
  };

  // Select Active Account
  const handleSelectAccount = async (acc: any) => {
    setActiveAccount(acc);
    try {
      const resp = await fetch('/api/auth/active-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: acc.accountId })
      });
      const data = await resp.json();
      if (data?.account) {
        updateAccountBalance(data.account.balance, data.account.currency);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Disconnect Account
  const handleDisconnect = async (accountId: string) => {
    if (confirm(`Disconnect account ${accountId}?`)) {
      await fetch('/api/auth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });
      const filtered = accounts.filter((a) => a.accountId !== accountId);
      setAccounts(filtered);
      if (activeAccount?.accountId === accountId) {
        setActiveAccount(filtered[0] || null);
      }
    }
  };

  // Reset Demo Balance
  const [resettingDemoId, setResettingDemoId] = useState<string | null>(null);

  const handleResetDemoBalance = async (accountId: string) => {
    setResettingDemoId(accountId);
    setStatusMessage(null);
    try {
      const resp = await fetch('/api/auth/reset-demo-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to reset demo balance');
      if (typeof data.balance === 'number') {
        updateAccountBalance(data.balance, data.currency);
      }
      setStatusMessage({ type: 'success', text: `Demo balance reset to $${(data.balance ?? 10000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${data.currency || 'USD'}` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to reset demo balance' });
    } finally {
      setResettingDemoId(null);
    }
  };

  // Save Risk Settings
  const handleSaveRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRisk(true);
    try {
      const resp = await fetch('/api/risk/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxStake,
          maxDailyLoss,
          takeProfitTarget,
          maxConsecutiveLosses,
          cooldownSeconds,
          maxDrawdownPercent: 20
        })
      });
      if (resp.ok) {
        alert('Risk management safeguards updated successfully!');
      }
    } catch (e: any) {
      alert(`Failed to save risk settings: ${e.message}`);
    } finally {
      setIsSavingRisk(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <Key className="w-6 h-6 text-amber-400" />
          Deriv Account Integration & Credentials
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Connect your Deriv account via official API Token or OAuth 2.0. DBOT operates with strict client-side encryption and never asks for your Deriv password.
        </p>
      </div>

      {/* 1. Account Authentication */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
        {/* OAuth 2.0 PKCE Section */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/30 via-slate-900/40 to-slate-900/60 border border-red-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold text-xs">
                D
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Deriv OAuth 2.0 Authentication (Recommended)
                </h3>
                <p className="text-[11px] text-slate-400">
                  One-click authorization with RFC 7636 PKCE. No passwords or tokens to copy.
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
              Secure PKCE
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleOAuthLogin}
              disabled={isOAuthLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-950/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Create Deriv Account (Sign Up)</span>
            </button>
          </div>
        </div>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wider text-slate-500">
            <span className="bg-[#0b101d] px-3">Or connect with Personal API Token</span>
          </div>
        </div>

        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          Connect with Personal API Token
        </h2>

        <form onSubmit={handleConnectToken} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Deriv API Token (Read & Trade Scopes Required)
            </label>
            <div className="flex gap-3">
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Paste your Deriv API token (e.g. a1-Xxxxxxxxxxxxxx)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={isConnecting || !apiToken}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors"
              >
                {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Connect Token'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Generate an API Token in your{' '}
              <a
                href="https://app.deriv.com/account/api-token"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 underline font-semibold inline-flex items-center gap-0.5"
              >
                Deriv Account Settings <ExternalLink className="w-3 h-3" />
              </a>
              . Ensure both <strong>Read</strong> and <strong>Trade</strong> permissions are checked.
            </p>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </form>

        {/* Connected Accounts List */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Connected Authorized Accounts
          </h3>

          {accounts.length === 0 ? (
            <div className="text-xs text-slate-500 py-3">
              No accounts registered yet. Paste an API token above to connect.
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((acc) => {
                const isActive = activeAccount?.accountId === acc.accountId;
                return (
                  <div
                    key={acc.accountId}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-slate-900 border-amber-500/40 shadow-sm shadow-amber-500/5'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          acc.isVirtual
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {acc.isVirtual ? 'DEMO' : 'REAL MONEY'}
                      </span>
                      <span className="font-mono font-bold text-sm text-slate-100">
                        {acc.accountId}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        ${(acc.balance ?? 0).toFixed(2)} {acc.currency || 'USD'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isActive && (
                        <button
                          onClick={() => {
                            if (!acc.isVirtual) {
                              if (confirm('Switching to REAL MONEY account. Continue?')) {
                                handleSelectAccount(acc);
                              }
                            } else {
                              handleSelectAccount(acc);
                            }
                          }}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                        >
                          Select
                        </button>
                      )}

                      {/* Reset Demo Balance button — only for virtual/demo accounts */}
                      {acc.isVirtual && (
                        <button
                          onClick={() => handleResetDemoBalance(acc.accountId)}
                          disabled={resettingDemoId === acc.accountId}
                          title="Reset Demo Balance to $10,000"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3 h-3 ${resettingDemoId === acc.accountId ? 'animate-spin' : ''}`} />
                          Reset
                        </button>
                      )}

                      <button
                        onClick={() => handleDisconnect(acc.accountId)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Disconnect"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Global Risk Management Engine Safeguards */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Independent Risk Management Engine Settings
          </h2>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
            ACTIVE ENFORCEMENT
          </span>
        </div>

        <p className="text-xs text-slate-400">
          These rules are executed by the DBOT engine independently of any bot's block logic. When any safeguard is breached, the bot is immediately halted.
        </p>

        <form onSubmit={handleSaveRisk} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Maximum Single Stake ($)
            </label>
            <input
              type="number"
              step="0.1"
              value={maxStake}
              onChange={(e) => setMaxStake(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Max Daily Loss Allowance ($)
            </label>
            <input
              type="number"
              step="1"
              value={maxDailyLoss}
              onChange={(e) => setMaxDailyLoss(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Daily Take Profit Target ($)
            </label>
            <input
              type="number"
              step="1"
              value={takeProfitTarget}
              onChange={(e) => setTakeProfitTarget(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Max Consecutive Losses Allowed
            </label>
            <input
              type="number"
              value={maxConsecutiveLosses}
              onChange={(e) => setMaxConsecutiveLosses(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Cooldown After Loss (Seconds)
            </label>
            <input
              type="number"
              value={cooldownSeconds}
              onChange={(e) => setCooldownSeconds(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSavingRisk}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-amber-500/20"
            >
              Save Risk Safeguards
            </button>
          </div>
        </form>
      </div>

      {/* 3. Telegram Notifications Setup */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-400" />
          Telegram Real-Time Alerts
        </h2>
        <p className="text-xs text-slate-400">
          Receive instant mobile notifications whenever a trade is placed, a contract closes, or a stop-loss is triggered.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Telegram Bot Token
            </label>
            <input
              type="password"
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
              placeholder="e.g. 123456789:ABCDefghIJKlmnoPQRstuv..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Telegram Chat ID
            </label>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="e.g. 987654321"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
