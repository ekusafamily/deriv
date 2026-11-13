import { describe, it, expect, vi } from 'vitest';
import { DerivClient } from '../server/src/deriv/deriv-client';

describe('DerivClient Balance Streaming', () => {
  it('should parse and stream balance from incoming Deriv WebSocket messages', () => {
    const onBalanceMock = vi.fn();
    const client = new DerivClient({
      appId: 1089,
      onBalance: onBalanceMock
    });

    // Simulate incoming Deriv balance stream frame
    const rawDerivBalanceMsg = JSON.stringify({
      echo_req: { balance: 1, subscribe: 1 },
      msg_type: 'balance',
      subscription: { id: 'sub-balance-123' },
      balance: {
        balance: 10452.75,
        currency: 'USD',
        id: 'bal-id-456',
        loginid: 'VRTC1234567'
      }
    });

    (client as any).handleIncomingMessage(rawDerivBalanceMsg);

    expect(onBalanceMock).toHaveBeenCalledWith(10452.75, 'USD', 'VRTC1234567');
  });

  it('should handle numeric or normalized balance objects', () => {
    const onBalanceMock = vi.fn();
    const client = new DerivClient({
      appId: 1089,
      onBalance: onBalanceMock
    });

    const rawMsg = JSON.stringify({
      msg_type: 'balance',
      balance: 500.5,
      currency: 'EUR'
    });

    (client as any).handleIncomingMessage(rawMsg);

    expect(onBalanceMock).toHaveBeenCalledWith(500.5, 'EUR', undefined);
  });

  it('should register balance subscription in activeSubscriptions', async () => {
    const client = new DerivClient({ appId: 1089 });

    // Mock sendRequest to simulate Deriv response
    vi.spyOn(client, 'sendRequest').mockResolvedValueOnce({
      msg_type: 'balance',
      subscription: { id: 'stream-id-888' },
      balance: {
        balance: 25000.0,
        currency: 'USD',
        loginid: 'CR99999'
      }
    });

    const resp = await client.subscribeBalance();

    expect((client as any).activeSubscriptions.has('balance')).toBe(true);
    expect((client as any).activeSubscriptions.get('balance')).toBe('stream-id-888');
    expect(resp.balance.balance).toBe(25000.0);
  });
});

