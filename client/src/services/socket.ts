// DBOT Frontend Socket.IO Client
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store/useStore';
import { TickData, BotStateSnapshot } from '../../../shared/types';

let socket: Socket | null = null;

export const initSocket = () => {
  if (socket) return socket;

  socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    useStore.getState().setWsConnected(true);
  });

  socket.on('disconnect', () => {
    useStore.getState().setWsConnected(false);
  });

  socket.on('market:tick', (tick: TickData) => {
    useStore.getState().updateTick(tick);
  });

  socket.on('account:balance', (data: { balance: number; currency: string; accountId?: string }) => {
    const state = useStore.getState();
    if (!state.activeAccount && data.accountId) {
      state.setActiveAccount({
        accountId: data.accountId,
        balance: Number(data.balance),
        currency: data.currency || 'USD',
        isVirtual: data.accountId.startsWith('VRTC') || data.accountId.includes('DEMO')
      });
    } else {
      state.updateAccountBalance(data.balance, data.currency);
    }
  });

  socket.on('trade:update', (data: any) => {
    // If trade closes, play subtle audio cue or refresh history if needed
  });

  return socket;
};

export const subscribeToBot = (botId: string) => {
  if (!socket) initSocket();
  socket?.emit('subscribe:bot', botId);

  // Event names must match server: 'bot:state:{botId}'
  socket?.on(`bot:state:${botId}`, (snapshot: BotStateSnapshot) => {
    useStore.getState().setBotSnapshot(botId, snapshot);
  });
};

export const unsubscribeFromBot = (botId: string) => {
  socket?.emit('unsubscribe:bot', botId);
  socket?.off(`bot:state:${botId}`);
};

export const getSocket = () => socket;
