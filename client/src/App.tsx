// DBOT Main App Component with React Router
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { BotBuilderPage } from './pages/BotBuilderPage';
import { StrategyLibraryPage } from './pages/StrategyLibraryPage';
import { ExecutionConsolePage } from './pages/ExecutionConsolePage';
import { MarketWatchPage } from './pages/MarketWatchPage';
import { BacktestingPage } from './pages/BacktestingPage';
import { TradeHistoryPage } from './pages/TradeHistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpDocsPage } from './pages/HelpDocsPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { initSocket } from './services/socket';
import { useStore } from './store/useStore';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isBuilder = location.pathname === '/builder';

  return (
    <div className="flex flex-col min-h-screen bg-[#080d1a] text-slate-100 font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {!isBuilder && <Sidebar />}
        <main
          className={`flex-1 overflow-y-auto ${
            isBuilder
              ? 'p-0 w-full h-[calc(100vh-64px)] overflow-hidden'
              : 'p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto'
          }`}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/builder" element={<BotBuilderPage />} />
            <Route path="/library" element={<StrategyLibraryPage />} />
            <Route path="/console" element={<ExecutionConsolePage />} />
            <Route path="/market" element={<MarketWatchPage />} />
            <Route path="/backtest" element={<BacktestingPage />} />
            <Route path="/history" element={<TradeHistoryPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/callback" element={<OAuthCallbackPage />} />
            <Route path="/help" element={<HelpDocsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  useEffect(() => {
    initSocket();

    // Fetch authorized Deriv accounts and live streamed balance on mount
    fetch('/api/auth/accounts')
      .then((r) => r.json())
      .then((accounts) => {
        if (Array.isArray(accounts) && accounts.length > 0) {
          useStore.getState().setAccounts(accounts);
          const current = useStore.getState().activeAccount;
          const matched = accounts.find((a) => a.accountId === current?.accountId) || accounts[0];
          useStore.getState().setActiveAccount(matched);

          // Request latest live streamed balance from Deriv
          fetch('/api/auth/balance')
            .then((r) => r.json())
            .then((bal) => {
              if (bal && typeof bal.balance === 'number') {
                useStore.getState().updateAccountBalance(bal.balance, bal.currency);
              }
            })
            .catch(() => {});
        }
      })
      .catch((e) => console.warn('Could not load initial Deriv accounts:', e));
  }, []);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};
