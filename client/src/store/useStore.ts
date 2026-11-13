// DBOT Unified Zustand Store
import { create } from 'zustand';
import { ActiveSymbol, TickData, BotStateSnapshot } from '../../../shared/types';

export interface DerivAccountInfo {
  id?: string;
  accountId: string;
  currency: string;
  isVirtual: boolean;
  token?: string;
  balance: number;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface AppState {
  // Connection
  wsConnected: boolean;
  setWsConnected: (status: boolean) => void;

  // Account
  accounts: DerivAccountInfo[];
  activeAccount: DerivAccountInfo | null;
  setAccounts: (accounts: DerivAccountInfo[]) => void;
  setActiveAccount: (account: DerivAccountInfo | null) => void;
  updateAccountBalance: (balance: number, currency?: string) => void;
  connectAccount: (account: DerivAccountInfo) => void;

  // Market Data
  symbols: ActiveSymbol[];
  selectedSymbol: string;
  latestTicks: Record<string, TickData>;
  setSymbols: (symbols: ActiveSymbol[]) => void;
  setSelectedSymbol: (symbol: string) => void;
  updateTick: (tick: TickData) => void;

  // Bot Runners
  botSnapshots: Record<string, BotStateSnapshot>;
  selectedBotId: string | null;
  setBotSnapshot: (botId: string, snapshot: BotStateSnapshot) => void;
  setSelectedBotId: (botId: string | null) => void;

  // Notifications
  notifications: AppNotification[];
  setNotifications: (notifs: AppNotification[]) => void;
  addNotification: (notif: AppNotification) => void;
  markNotificationsAsRead: () => void;
}

export const useStore = create<AppState>((set) => ({
  wsConnected: true,
  setWsConnected: (wsConnected) => set({ wsConnected }),

  accounts: [],
  activeAccount: null,
  setAccounts: (accounts) => set({ accounts }),
  setActiveAccount: (activeAccount) => set({ activeAccount }),
  updateAccountBalance: (balance, currency) =>
    set((state) => {
      const numBalance = Number(balance);
      const curr = currency || state.activeAccount?.currency || 'USD';
      return {
        activeAccount: state.activeAccount
          ? { ...state.activeAccount, balance: numBalance, currency: curr }
          : null,
        accounts: state.accounts.map((acc) =>
          acc.accountId === state.activeAccount?.accountId
            ? { ...acc, balance: numBalance, currency: curr }
            : acc
        )
      };
    }),
  connectAccount: (account) =>
    set((state) => ({
      activeAccount: account,
      accounts: [account, ...state.accounts.filter((a) => a.accountId !== account.accountId)]
    })),

  symbols: [],
  selectedSymbol: 'R_100',
  latestTicks: {},
  setSymbols: (symbols) => set({ symbols }),
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
  updateTick: (tick) =>
    set((state) => ({
      latestTicks: { ...state.latestTicks, [tick.symbol]: tick }
    })),

  botSnapshots: {},
  selectedBotId: null,
  setBotSnapshot: (botId, snapshot) =>
    set((state) => ({
      botSnapshots: { ...state.botSnapshots, [botId]: snapshot }
    })),
  setSelectedBotId: (selectedBotId) => set({ selectedBotId }),

  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notif) =>
    set((state) => ({
      notifications: [notif, ...state.notifications]
    })),
  markNotificationsAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true }))
    }))
}));
