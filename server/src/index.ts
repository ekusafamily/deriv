// DBOT Main Backend Server (Express + Socket.IO + Prisma + Deriv Engine)

import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { DerivClient } from './deriv/deriv-client';
import { StrategyRunner } from './engine/strategy-runner';
import { HistoricalBacktester } from './engine/backtester';
import { NotificationService } from './services/notification-service';
import { z } from 'zod';
import { STRATEGY_TEMPLATES } from '../../shared/strategy-templates';
import { StrategyASTSchema } from '../../shared/strategy-schema';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const prisma = new PrismaClient();
const notificationService = new NotificationService(prisma);
const PORT = process.env.PORT || 3001;
// Deriv WebSocket connections require a NUMERIC registered app_id.
// DERIV_CLIENT_ID is the OAuth 2.0 client identifier (alphanumeric) and must never be
// passed to the socket endpoint - doing so is rejected with HTTP 401.
const parseNumericAppId = (value: string | undefined): number | null => {
  const trimmed = (value || '').trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
};

const DERIV_APP_ID: number =
  parseNumericAppId(process.env.DERIV_APP_ID) ??
  parseNumericAppId(process.env.DERIV_LEGACY_APP_ID) ??
  parseNumericAppId(process.env.DERIV_CLIENT_ID) ??
  1089;

const DERIV_OAUTH_CLIENT_ID = process.env.DERIV_CLIENT_ID || '';
const DERIV_REDIRECT_URI = process.env.DERIV_REDIRECT_URI || '';
const DERIV_OAUTH_AUTHORIZE_URL = 'https://auth.deriv.com/oauth2/auth';
const DERIV_OAUTH_TOKEN_URL = 'https://auth.deriv.com/oauth2/token';

// In-memory active runners pool: botId -> StrategyRunner
const activeRunners = new Map<string, StrategyRunner>();

// Shared Deriv Public Client for market symbols, ticks, and candles
const publicDerivClient = new DerivClient({
  appId: DERIV_APP_ID,
  onTick: (tick) => {
    io.emit('market:tick', tick);
    // Broadcast tick to all active bot runners
    for (const runner of activeRunners.values()) {
      runner.onTick(tick);
    }
  }
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Initial connection for public market data
publicDerivClient.connect().catch((err) => {
  console.warn('Initial public Deriv WS connection notice:', err.message);
});

// Relay public DerivClient ticks → Socket.IO for the browser.
publicDerivClient.setTickCallback((tick) => {
  io.emit('market:tick', tick);
  for (const runner of activeRunners.values()) {
    runner.onTick(tick);
  }
});

// Relay balance updates from any connected DerivClient.
publicDerivClient.setBalanceCallback((balance: number, currency: string) => {
  io.emit('account:balance', { balance, currency });
});

// ==========================================
// ACTIVE DERIV ACCOUNT BALANCE STREAMING MANAGER
// ==========================================
let activeAccountClient: DerivClient | null = null;
let activeAccountId: string | null = null;

async function startAccountBalanceStream(token: string, accountId?: string) {
  // If active client is already open and authorized for this token and connected, return it
  if (activeAccountClient && activeAccountClient.isConnected && activeAccountId === accountId) {
    return { client: activeAccountClient, resolvedId: activeAccountId, authData: activeAccountClient.authorizedAccount };
  }

  // Cleanup old client if switching accounts
  if (activeAccountClient) {
    try {
      activeAccountClient.disconnect();
    } catch {}
    activeAccountClient = null;
  }

  const client = new DerivClient({
    appId: DERIV_APP_ID,
    onBalance: async (balance: number, currency: string, incomingAccountId?: string) => {
      const targetId = incomingAccountId || accountId || activeAccountId;
      console.log(`[Deriv Live Stream] Balance for ${targetId}: $${balance} ${currency}`);

      if (targetId) {
        await prisma.derivAccount.updateMany({
          where: { accountId: targetId },
          data: { balance, currency }
        }).catch(() => {});
      }

      io.emit('account:balance', {
        accountId: targetId,
        balance,
        currency
      });
    }
  });

  await client.connect();
  const authData = await client.authorize(token);
  const isVirtual = Boolean(authData.is_virtual);
  const resolvedId = authData.loginid || accountId || (isVirtual ? 'VRTC_DEMO' : 'CR_REAL');
  activeAccountId = resolvedId;
  activeAccountClient = client;

  // Immediately subscribe to live balance stream from Deriv
  await client.subscribeBalance().catch((err) => {
    console.warn('[Deriv] Balance subscription notice:', err.message);
  });

  return { client, authData, resolvedId };
}

// Auto-initialize balance stream if an account is already stored in database
(async () => {
  try {
    const saved = await prisma.derivAccount.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (saved && saved.token) {
      console.log(`[Deriv] Restoring live balance stream for account ${saved.accountId}...`);
      await startAccountBalanceStream(saved.token, saved.accountId);
    }
  } catch (e: any) {
    console.warn('[Deriv] Initial saved account stream notice:', e.message);
  }
})();

// ==========================================
// 1. HEALTH & SYSTEM STATUS
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'DBOT Trading Platform Engine',
    timestamp: new Date().toISOString(),
    activeBots: activeRunners.size,
    appId: DERIV_APP_ID,
    database: 'CONNECTED'
  });
});

// ==========================================
// 2. DERIV MARKET DATA & ASSETS
// ==========================================
app.get('/api/symbols', async (req, res) => {
  try {
    const symbols = await publicDerivClient.getActiveSymbols();
    res.json(symbols);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch symbols' });
  }
});

app.get('/api/candles', async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || 'R_100';
    const count = parseInt((req.query.count as string) || '100', 10);
    const granularity = parseInt((req.query.granularity as string) || '60', 10);

    const candles = await publicDerivClient.getCandles(symbol, granularity, count);
    res.json(candles);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch candles' });
  }
});

// ==========================================
// 3. ACCOUNT INTEGRATION & AUTHENTICATION
// ==========================================
app.post('/api/auth/connect', async (req, res) => {
  try {
    const { token, accountId } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Deriv API Token is required.' });
    }

    // Verify token with Deriv and start active balance streaming
    const { authData, resolvedId } = await startAccountBalanceStream(token.trim(), accountId);

    const isVirtual = Boolean(authData.is_virtual);
    const resolvedAccountId = authData.loginid || resolvedId || (isVirtual ? 'VRTC_DEMO' : 'CR_REAL');
    const currency = authData.currency || 'USD';
    const balance = Number(authData.balance ?? 0);

    // Upsert into database
    const savedAccount = await prisma.derivAccount.upsert({
      where: { accountId: resolvedAccountId },
      update: {
        token: token.trim(),
        currency,
        isVirtual,
        balance
      },
      create: {
        accountId: resolvedAccountId,
        token: token.trim(),
        currency,
        isVirtual,
        balance
      }
    });

    await prisma.auditEvent.create({
      data: {
        action: 'CONNECT_ACCOUNT',
        details: `Connected Deriv account ${resolvedAccountId} (${isVirtual ? 'DEMO' : 'REAL'})`
      }
    });

    await notificationService.notify({
      type: 'INFO',
      title: 'Deriv Account Connected',
      message: `Successfully connected ${resolvedAccountId} (${isVirtual ? 'Demo' : 'Real'}) with balance $${balance.toFixed(2)}`
    });

    // Also broadcast initial balance update immediately
    io.emit('account:balance', {
      accountId: resolvedAccountId,
      balance,
      currency
    });

    res.json({
      success: true,
      accountId: resolvedAccountId,
      balance,
      currency,
      isVirtual,
      account: savedAccount,
      derivAuth: {
        loginid: authData.loginid,
        email: authData.email,
        currency: authData.currency,
        balance: authData.balance,
        is_virtual: authData.is_virtual,
        account_list: authData.account_list
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Deriv authentication failed' });
  }
});

app.get('/api/auth/accounts', async (req, res) => {
  try {
    const accounts = await prisma.derivAccount.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(accounts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/active-account', async (req, res) => {
  try {
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });
    const account = await prisma.derivAccount.findUnique({ where: { accountId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const { authData } = await startAccountBalanceStream(account.token, account.accountId);
    const balance = authData.balance ?? account.balance;
    const currency = authData.currency || account.currency;

    io.emit('account:balance', { accountId: account.accountId, balance, currency });

    res.json({
      success: true,
      account: {
        ...account,
        balance,
        currency
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/balance', async (req, res) => {
  try {
    if (activeAccountClient && activeAccountClient.isConnected && activeAccountClient.isAuthorized) {
      try {
        const resp = await activeAccountClient.sendRequest({ balance: 1 }, 5000);
        if (resp && resp.balance !== undefined) {
          const balObj = resp.balance;
          const balance = typeof balObj === 'object' && balObj !== null ? Number(balObj.balance) : Number(balObj);
          const currency = typeof balObj === 'object' && balObj !== null ? (balObj.currency || 'USD') : 'USD';
          if (!isNaN(balance)) {
            if (activeAccountId) {
              await prisma.derivAccount.updateMany({
                where: { accountId: activeAccountId },
                data: { balance, currency }
              }).catch(() => {});
            }
            io.emit('account:balance', { accountId: activeAccountId, balance, currency });
            return res.json({ balance, currency, accountId: activeAccountId });
          }
        }
      } catch (e: any) {
        console.warn('[Deriv] /api/auth/balance direct fetch notice:', e.message);
      }
    }

    // Fallback to database
    const account = activeAccountId
      ? await prisma.derivAccount.findUnique({ where: { accountId: activeAccountId } })
      : await prisma.derivAccount.findFirst({ orderBy: { updatedAt: 'desc' } });

    if (account) {
      return res.json({ balance: account.balance, currency: account.currency, accountId: account.accountId });
    }
    res.json({ balance: 0, currency: 'USD', accountId: null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RESET DEMO ACCOUNT BALANCE (resetdemobalance.md)
// POST https://api.derivws.com/trading/v1/options/accounts/{account_id}/reset-demo-balance
// ==========================================
app.post('/api/auth/reset-demo-balance', async (req, res) => {
  try {
    const targetAccountId = req.body.accountId || activeAccountId;
    if (!targetAccountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }

    const account = await prisma.derivAccount.findUnique({ where: { accountId: targetAccountId } });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (!account.isVirtual) {
      return res.status(400).json({
        errors: [{ status: 400, code: 'ValidationError', message: 'Only demo accounts can have their balance reset' }]
      });
    }

    const derivApiBase = process.env.DERIV_API_BASE || 'https://api.derivws.com';
    const restUrl = `${derivApiBase}/trading/v1/options/accounts/${encodeURIComponent(account.accountId)}/reset-demo-balance`;

    let resetSuccess = false;
    let failureDetail = '';

    // 1. Try official Deriv REST API endpoint
    try {
      console.log(`[Deriv Reset Demo] Calling REST endpoint: ${restUrl}`);
      const restResp = await fetch(restUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.token}`,
          'Deriv-App-ID': String(DERIV_APP_ID)
        }
      });

      if (restResp.ok) {
        resetSuccess = true;
      } else {
        const errorBody: any = await restResp.json().catch(() => null);
        failureDetail = errorBody?.errors?.[0]?.message || `HTTP ${restResp.status} ${restResp.statusText}`;
        console.warn('[Deriv Reset Demo] REST API response:', restResp.status, failureDetail);
      }
    } catch (restErr: any) {
      failureDetail = restErr.message;
      console.warn('[Deriv Reset Demo] REST call error:', restErr.message);
    }

    // 2. Fallback to Deriv WebSocket topup_virtual if REST API returned an error or isn't reached
    if (!resetSuccess && activeAccountClient && activeAccountClient.isConnected && activeAccountClient.isAuthorized) {
      try {
        console.log('[Deriv Reset Demo] Attempting WebSocket topup_virtual fallback...');
        const wsResp = await activeAccountClient.topupVirtual();
        if (wsResp && !wsResp.error) {
          resetSuccess = true;
        } else if (wsResp?.error) {
          failureDetail = wsResp.error.message || failureDetail;
        }
      } catch (wsErr: any) {
        if (!failureDetail) failureDetail = wsErr.message;
      }
    }

    if (!resetSuccess) {
      return res.status(400).json({
        error: failureDetail || 'Failed to reset demo balance on Deriv'
      });
    }

    // 3. Immediately refresh and stream the new balance from Deriv
    let newBalance = 10000;
    let currency = account.currency || 'USD';

    if (activeAccountClient && activeAccountClient.isConnected && activeAccountClient.isAuthorized) {
      try {
        const balResp = await activeAccountClient.sendRequest({ balance: 1 }, 5000);
        if (balResp && balResp.balance !== undefined) {
          const balObj = balResp.balance;
          newBalance = typeof balObj === 'object' && balObj !== null ? Number(balObj.balance) : Number(balObj);
          currency = typeof balObj === 'object' && balObj !== null ? (balObj.currency || currency) : currency;
        }
      } catch {}
    }

    // 4. Update Database & Broadcast to Frontend via Socket.IO
    await prisma.derivAccount.updateMany({
      where: { accountId: account.accountId },
      data: { balance: newBalance, currency }
    });

    await prisma.auditEvent.create({
      data: {
        action: 'RESET_DEMO_BALANCE',
        details: `Reset demo balance for account ${account.accountId} to $${newBalance.toFixed(2)}`
      }
    });

    await notificationService.notify({
      type: 'INFO',
      title: 'Demo Balance Reset',
      message: `Demo account ${account.accountId} balance reset to $${newBalance.toFixed(2)} ${currency}`
    });

    io.emit('account:balance', {
      accountId: account.accountId,
      balance: newBalance,
      currency
    });

    res.json({
      success: true,
      message: 'Demo balance successfully reset to default ($10,000 USD)',
      balance: newBalance,
      currency,
      accountId: account.accountId
    });
  } catch (err: any) {
    console.error('Reset demo balance error:', err);
    res.status(500).json({ error: err.message || 'Failed to reset demo balance' });
  }
});

app.post('/api/auth/disconnect', async (req, res) => {
  try {
    const { accountId } = req.body;
    if (accountId) {
      await prisma.derivAccount.deleteMany({ where: { accountId } });
      if (activeAccountId === accountId) {
        if (activeAccountClient) {
          try { activeAccountClient.disconnect(); } catch {}
          activeAccountClient = null;
        }
        activeAccountId = null;
        // If there is another account, connect to it
        const remaining = await prisma.derivAccount.findFirst({ orderBy: { updatedAt: 'desc' } });
        if (remaining && remaining.token) {
          startAccountBalanceStream(remaining.token, remaining.accountId).catch(() => {});
        }
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3b. DERIV OAUTH 2.0 PKCE FLOW
// ==========================================
app.get('/api/auth/deriv/config', (req, res) => {
  res.json({
    clientId: DERIV_OAUTH_CLIENT_ID,
    redirectUri: DERIV_REDIRECT_URI || `${req.headers.origin || `http://localhost:${PORT}`}/callback`,
    authUrl: DERIV_OAUTH_AUTHORIZE_URL,
    scopes: ['trade', 'account_manage']
  });
});

app.post('/api/auth/deriv/token', async (req, res) => {
  try {
    const { code, codeVerifier, redirectUri } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    if (!codeVerifier) {
      return res.status(400).json({ error: 'code_verifier is required for PKCE flow' });
    }

    const targetRedirectUri = redirectUri || DERIV_REDIRECT_URI || `${req.headers.origin || `http://localhost:${PORT}`}/callback`;

    // Form-encoded body as required by Deriv OAuth 2.0 PKCE specification
    const formParams = new URLSearchParams();
    formParams.append('grant_type', 'authorization_code');
    formParams.append('client_id', DERIV_OAUTH_CLIENT_ID);
    formParams.append('code', code);
    formParams.append('code_verifier', codeVerifier);
    formParams.append('redirect_uri', targetRedirectUri);

    console.log('[Deriv OAuth] Exchanging code with PKCE at', DERIV_OAUTH_TOKEN_URL);
    const tokenResp = await fetch(DERIV_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formParams.toString()
    });

    const tokenData: any = await tokenResp.json();
    if (!tokenResp.ok || !tokenData.access_token) {
      console.error('[Deriv OAuth] Token exchange error:', tokenData);
      return res.status(400).json({
        error: tokenData.error_description || tokenData.error || 'Token exchange failed',
        details: tokenData
      });
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;

    // Authorize with Deriv WebSocket client & start live balance stream
    const { authData, resolvedId } = await startAccountBalanceStream(accessToken);

    const isVirtual = Boolean(authData.is_virtual);
    const resolvedAccountId = authData.loginid || resolvedId || (isVirtual ? 'VRTC_DEMO' : 'CR_REAL');
    const currency = authData.currency || 'USD';
    const balance = Number(authData.balance ?? 0);

    const savedAccount = await prisma.derivAccount.upsert({
      where: { accountId: resolvedAccountId },
      update: { token: accessToken, currency, isVirtual, balance },
      create: { accountId: resolvedAccountId, token: accessToken, currency, isVirtual, balance }
    });

    await prisma.auditEvent.create({
      data: {
        action: 'OAUTH_CONNECT_ACCOUNT',
        details: `Connected Deriv account ${resolvedAccountId} via OAuth 2.0 PKCE (${isVirtual ? 'DEMO' : 'REAL'})`
      }
    });

    await notificationService.notify({
      type: 'INFO',
      title: 'Deriv Account Connected (OAuth)',
      message: `Successfully connected ${resolvedAccountId} (${isVirtual ? 'Demo' : 'Real'}) with balance $${balance.toFixed(2)}`
    });

    io.emit('account:balance', {
      accountId: resolvedAccountId,
      balance,
      currency
    });

    res.json({
      success: true,
      account: savedAccount,
      accessToken,
      expiresIn,
      derivAuth: {
        loginid: authData.loginid,
        email: authData.email,
        currency: authData.currency,
        balance: authData.balance,
        is_virtual: authData.is_virtual,
        account_list: authData.account_list
      }
    });
  } catch (err: any) {
    console.error('[Deriv OAuth] Error:', err);
    res.status(500).json({ error: err.message || 'OAuth token exchange failed' });
  }
});

app.get('/api/auth/deriv/authorize', (req, res) => {
  if (!DERIV_OAUTH_CLIENT_ID) {
    return res.status(500).json({ error: 'OAuth not configured (DERIV_CLIENT_ID required)' });
  }
  const prompt = req.query.prompt as string;
  const redirectUri = (req.query.redirect_uri as string) || DERIV_REDIRECT_URI || `${req.headers.origin || `http://localhost:${PORT}`}/callback`;
  const scopes = 'trade account_manage';
  const state = crypto.randomUUID().replace(/-/g, '');

  const authUrl = new URL(DERIV_OAUTH_AUTHORIZE_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', DERIV_OAUTH_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);

  if (prompt === 'registration') {
    authUrl.searchParams.set('prompt', 'registration');
    if (process.env.DERIV_TRACKING_TOKEN) {
      authUrl.searchParams.set('t', process.env.DERIV_TRACKING_TOKEN);
    }
    if (process.env.DERIV_UTM_CAMPAIGN) {
      authUrl.searchParams.set('utm_campaign', process.env.DERIV_UTM_CAMPAIGN);
    }
    authUrl.searchParams.set('utm_medium', 'affiliate');
    if (process.env.DERIV_UTM_SOURCE) {
      authUrl.searchParams.set('utm_source', process.env.DERIV_UTM_SOURCE);
    }
  }

  res.redirect(authUrl.toString());
});

app.get('/api/auth/deriv/callback', (req, res) => {
  const query = new URLSearchParams(req.query as any).toString();
  const front = new URL('/callback', req.headers.origin || `http://localhost:${PORT}`);
  front.search = query;
  res.redirect(front.href);
});

// ==========================================
// 4. STRATEGY TEMPLATES & NATIVE DERIV BOTS LIBRARY
// ==========================================
app.get('/api/templates', (req, res) => {
  res.json(STRATEGY_TEMPLATES);
});

// Native Deriv Bot XML Library from DDBOt repository
const NATIVE_BOTS_DIR = 'C:\\antigravity\\DDBOt\\public\\bots';

app.get('/api/native-bots', (req, res) => {
  try {
    if (!fs.existsSync(NATIVE_BOTS_DIR)) {
      return res.json([]);
    }
    const files = fs.readdirSync(NATIVE_BOTS_DIR).filter((f) => f.endsWith('.xml'));
    const bots = files.map((file) => {
      const stats = fs.statSync(path.join(NATIVE_BOTS_DIR, file));
      // Clean up display name
      const cleanName = file
        .replace(/\.xml$/i, '')
        .replace(/_[0-9]+$/g, '')
        .replace(/_/g, ' ')
        .trim();
      return {
        filename: file,
        name: cleanName,
        sizeBytes: stats.size,
        updatedAt: stats.mtime
      };
    });
    res.json(bots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/native-bots/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    // Basic sanitization
    const safeFilename = path.basename(filename);
    const targetPath = path.join(NATIVE_BOTS_DIR, safeFilename);
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Native bot XML file not found' });
    }
    const xmlContent = fs.readFileSync(targetPath, 'utf8');
    res.setHeader('Content-Type', 'application/xml');
    res.send(xmlContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. BOTS CRUD OPERATIONS
// ==========================================
app.get('/api/bots', async (req, res) => {
  try {
    const bots = await prisma.bot.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5
        }
      }
    });
    res.json(bots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bots', async (req, res) => {
  try {
    const { name, description, symbol, contractType, strategyAst, workspaceXml } = req.body;

    // Validate Strategy AST
    const parsedAst = typeof strategyAst === 'string' ? JSON.parse(strategyAst) : strategyAst;
    const validatedAst = StrategyASTSchema.parse(parsedAst);

    const bot = await prisma.bot.create({
      data: {
        name,
        description,
        symbol: symbol || validatedAst.market.symbol,
        contractType: contractType || validatedAst.market.contract_type,
        strategyAst: JSON.stringify(validatedAst),
        workspaceXml: workspaceXml || '',
        versions: {
          create: {
            versionNumber: 1,
            workspaceXml: workspaceXml || '',
            strategyAst: JSON.stringify(validatedAst),
            changeNotes: 'Initial bot creation'
          }
        }
      }
    });

    res.json(bot);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/bots/:id', async (req, res) => {
  try {
    const bot = await prisma.bot.findUnique({
      where: { id: req.params.id },
      include: { versions: { orderBy: { versionNumber: 'desc' } } }
    });
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    res.json(bot);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bots/:id', async (req, res) => {
  try {
    const { name, description, symbol, contractType, strategyAst, workspaceXml, changeNotes } = req.body;

    const parsedAst = typeof strategyAst === 'string' ? JSON.parse(strategyAst) : strategyAst;
    const validatedAst = StrategyASTSchema.parse(parsedAst);

    const currentBot = await prisma.bot.findUnique({
      where: { id: req.params.id },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
    });

    const nextVersionNumber = (currentBot?.versions[0]?.versionNumber ?? 0) + 1;

    const updated = await prisma.bot.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        symbol: symbol || validatedAst.market.symbol,
        contractType: contractType || validatedAst.market.contract_type,
        strategyAst: JSON.stringify(validatedAst),
        workspaceXml: workspaceXml ?? currentBot?.workspaceXml,
        versions: {
          create: {
            versionNumber: nextVersionNumber,
            workspaceXml: workspaceXml ?? currentBot?.workspaceXml,
            strategyAst: JSON.stringify(validatedAst),
            changeNotes: changeNotes || `Updated to version ${nextVersionNumber}`
          }
        }
      }
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/bots/:id', async (req, res) => {
  try {
    const botId = req.params.id;
    if (activeRunners.has(botId)) {
      const runner = activeRunners.get(botId)!;
      await runner.stop();
      activeRunners.delete(botId);
    }

    await prisma.bot.delete({ where: { id: botId } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. BOT EXECUTION LIFECYCLE (START/PAUSE/STOP)
// ==========================================
app.post('/api/bots/:id/start', async (req, res) => {
  try {
    const botId = req.params.id;
    const { runMode, accountId } = req.body; // "PAPER", "LIVE_DEMO", "LIVE_REAL"

    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    if (activeRunners.has(botId)) {
      return res.status(400).json({ error: 'Bot is already running.' });
    }

    const strategyAst = JSON.parse(bot.strategyAst);
    const isPaperTrading = runMode === 'PAPER' || !runMode;
    const isRealMoney = runMode === 'LIVE_REAL';

    // Account validation for Live trading
    let derivClientToUse = publicDerivClient;
    if (!isPaperTrading) {
      if (!accountId) {
        return res.status(400).json({ error: 'Connected account is required for live trading.' });
      }

      const account = await prisma.derivAccount.findUnique({ where: { accountId } });
      if (!account) return res.status(404).json({ error: 'Account not found.' });

      if (isRealMoney && account.isVirtual) {
        return res.status(400).json({ error: 'Cannot start Real Money trading with a Demo account.' });
      }

      // Initialize dedicated authenticated Deriv client
      const authClient = new DerivClient({
        appId: DERIV_APP_ID,
        onContractUpdate: (contract) => {
          runner.onContractUpdate(contract);
        },
        onBalance: async (balance, currency) => {
          await prisma.derivAccount.updateMany({
            where: { accountId },
            data: { balance, currency }
          }).catch(() => {});
          io.emit('account:balance', { accountId, balance, currency });
        }
      });
      await authClient.connect();
      await authClient.authorize(account.token);
      await authClient.subscribeBalance().catch(() => {});
      derivClientToUse = authClient;
    }

    // Create Execution Session in Database
    const session = await prisma.executionSession.create({
      data: {
        botId,
        runMode: runMode || 'PAPER',
        status: 'RUNNING',
        initialBalance: isPaperTrading ? 10000 : 0
      }
    });

    const runner = new StrategyRunner({
      botId,
      name: bot.name,
      strategy: strategyAst,
      derivClient: derivClientToUse,
      isPaperTrading,
      isRealMoney,
      initialBalance: isPaperTrading ? 10000 : undefined,
      onStateChange: (snap) => {
        io.to(`bot:${botId}`).emit(`bot:state:${botId}`, snap);
      },
      onTradeCompleted: async (contract) => {
        try {
          await prisma.trade.create({
            data: {
              sessionId: session.id,
              contractId: contract.contract_id,
              symbol: contract.symbol,
              contractType: contract.contract_type,
              stake: contract.buy_price,
              payout: contract.payout,
              profit: contract.profit,
              status: contract.status.toUpperCase(),
              entrySpot: contract.entry_spot,
              exitSpot: contract.exit_spot,
              isPaperTrade: isPaperTrading
            }
          });

          // Emit on the bot-specific room channel that the client listens to
          io.to(`bot:${botId}`).emit(`bot:trade:${botId}`, {
            id: String(contract.contract_id),
            symbol: contract.symbol,
            contractType: contract.contract_type,
            timestamp: Date.now(),
            status: contract.status === 'won' ? 'WON' : 'LOST',
            profit: contract.profit ?? 0,
            stake: contract.buy_price ?? 0,
            payout: contract.payout ?? 0
          });
          // Also emit the global event for dashboards / other listeners
          io.emit('trade:update', { botId, contract });

          await notificationService.notify({
            type: contract.status === 'won' ? 'TRADE_CLOSED' : 'TRADE_CLOSED',
            title: `Trade ${contract.status.toUpperCase()}!`,
            message: `Bot "${bot.name}" ${contract.status} $${Math.abs(contract.profit).toFixed(2)} on ${contract.symbol}`
          });
        } catch (dbErr) {
          console.error('Failed to log trade to DB:', dbErr);
        }
      }
    });

    activeRunners.set(botId, runner);
    await runner.start();

    await prisma.bot.update({ where: { id: botId }, data: { isActive: true } });

    await notificationService.notify({
      type: 'BOT_STARTED',
      title: 'Bot Started',
      message: `Bot "${bot.name}" is now executing in ${runMode || 'PAPER'} mode.`
    });

    res.json({
      success: true,
      sessionId: session.id,
      snapshot: runner.getSnapshot()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bots/:id/pause', (req, res) => {
  const runner = activeRunners.get(req.params.id);
  if (!runner) return res.status(404).json({ error: 'Bot is not running.' });
  runner.pause();
  res.json({ success: true, snapshot: runner.getSnapshot() });
});

app.post('/api/bots/:id/resume', (req, res) => {
  const runner = activeRunners.get(req.params.id);
  if (!runner) return res.status(404).json({ error: 'Bot is not running.' });
  runner.resume();
  res.json({ success: true, snapshot: runner.getSnapshot() });
});

app.post('/api/bots/:id/stop', async (req, res) => {
  const runner = activeRunners.get(req.params.id);
  if (runner) {
    await runner.stop();
    activeRunners.delete(req.params.id);
  }
  await prisma.bot.update({ where: { id: req.params.id }, data: { isActive: false } }).catch(() => {});
  res.json({ success: true });
});

app.post('/api/bots/:id/emergency-stop', async (req, res) => {
  const runner = activeRunners.get(req.params.id);
  if (runner) {
    await runner.emergencyStop();
    activeRunners.delete(req.params.id);
  }
  await prisma.bot.update({ where: { id: req.params.id }, data: { isActive: false } }).catch(() => {});
  await notificationService.notify({
    type: 'LOSS_LIMIT',
    title: 'EMERGENCY STOP',
    message: `Emergency stop initiated for Bot #${req.params.id}. All execution aborted.`
  });
  res.json({ success: true });
});

app.get('/api/bots/:id/status', (req, res) => {
  const runner = activeRunners.get(req.params.id);
  if (!runner) {
    return res.json({ status: 'STOPPED', activeContract: null });
  }
  res.json(runner.getSnapshot());
});

// ==========================================
// 7. HISTORICAL BACKTESTING
// ==========================================
app.post('/api/backtest', async (req, res) => {
  try {
    const { strategy, symbol, granularity, count, initialBalance } = req.body;
    const validatedAst = StrategyASTSchema.parse(strategy);
    const selectedSymbol = symbol || validatedAst.market.symbol;

    // Fetch candles from Deriv
    const candles = await publicDerivClient.getCandles(
      selectedSymbol,
      granularity || 60,
      count || 500
    );

    if (candles.length < 30) {
      return res.status(400).json({ error: 'Insufficient historical data points available for backtesting.' });
    }

    const report = HistoricalBacktester.run({
      strategy: validatedAst as any,
      candles,
      initialBalance: initialBalance || 1000
    });

    // Save backtest job
    await prisma.backtestJob.create({
      data: {
        symbol: selectedSymbol,
        contractType: validatedAst.market.contract_type,
        strategyAst: JSON.stringify(validatedAst),
        startDate: new Date(candles[0].epoch * 1000),
        endDate: new Date(candles[candles.length - 1].epoch * 1000),
        initialBalance: report.initialBalance,
        finalBalance: report.finalBalance,
        totalProfit: report.netProfit,
        winRate: report.winRate,
        maxDrawdown: report.maxDrawdown,
        totalTrades: report.totalTrades,
        tradesJson: JSON.stringify(report.trades.slice(0, 100))
      }
    });

    res.json(report);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 8. TRADE HISTORY & CSV EXPORT
// ==========================================
app.get('/api/trades', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;
    const status = req.query.status as string;
    const isPaper = req.query.paper === 'true';

    const where: any = {};
    if (symbol) where.symbol = symbol;
    if (status) where.status = status.toUpperCase();
    if (req.query.paper !== undefined) where.isPaperTrade = isPaper;

    const trades = await prisma.trade.findMany({
      where,
      orderBy: { entryTime: 'desc' },
      take: 100
    });

    res.json(trades);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trades/export', async (req, res) => {
  try {
    const trades = await prisma.trade.findMany({
      orderBy: { entryTime: 'desc' }
    });

    let csv = 'ID,ContractID,Symbol,ContractType,Stake,Payout,Profit,Status,EntrySpot,ExitSpot,EntryTime,IsPaper\n';
    trades.forEach((t) => {
      csv += `"${t.id}","${t.contractId || ''}","${t.symbol}","${t.contractType}",${t.stake},${t.payout},${t.profit},"${t.status}","${t.entrySpot || ''}","${t.exitSpot || ''}","${t.entryTime.toISOString()}",${t.isPaperTrade}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dbot_trades.csv"');
    res.status(200).send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. ANALYTICS & DASHBOARD METRICS
// ==========================================
app.get('/api/analytics', async (req, res) => {
  try {
    const trades = await prisma.trade.findMany({
      orderBy: { entryTime: 'asc' }
    });

    const totalTrades = trades.length;
    const wins = trades.filter((t) => t.status === 'WON').length;
    const losses = trades.filter((t) => t.status === 'LOST').length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const totalProfit = trades.reduce((acc, t) => acc + t.profit, 0);
    const totalStake = trades.reduce((acc, t) => acc + t.stake, 0);

    let cumulativeProfit = 0;
    const equityCurve = trades.map((t) => {
      cumulativeProfit += t.profit;
      return {
        time: t.entryTime.toISOString(),
        profit: cumulativeProfit
      };
    });

    const activeBotsCount = activeRunners.size;

    res.json({
      totalTrades,
      wins,
      losses,
      winRate,
      totalProfit,
      totalStake,
      equityCurve,
      activeBotsCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. NOTIFICATIONS
// ==========================================
app.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. RISK SETTINGS
// ==========================================
app.get('/api/risk/settings', async (req, res) => {
  try {
    let settings = await prisma.riskSetting.findFirst();
    if (!settings) {
      settings = await prisma.riskSetting.create({ data: {} });
    }
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// All fields optional so a partial update never silently writes NaN. Values are coerced
// from strings (form posts) and range-checked against sane trading limits.
const RiskSettingSchema = z.object({
  maxStake: z.coerce.number().min(0.35).max(100000).optional(),
  maxDailyLoss: z.coerce.number().min(0).max(1000000).optional(),
  takeProfitTarget: z.coerce.number().min(0).max(1000000).optional(),
  maxConsecutiveLosses: z.coerce.number().int().min(1).max(100).optional(),
  cooldownSeconds: z.coerce.number().int().min(0).max(3600).optional(),
  maxDrawdownPercent: z.coerce.number().min(0).max(100).optional(),
  emergencyStopEnabled: z.coerce.boolean().optional()
});

app.post('/api/risk/settings', async (req, res) => {
  try {
    const parsed = RiskSettingSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid risk settings', details: parsed.error.flatten().fieldErrors });
    }

    const data = parsed.data;
    // Only write fields that were actually supplied; undefined keeps the existing value.
    const updateData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) updateData[key] = value;
    }

    let settings = await prisma.riskSetting.findFirst();

    if (settings) {
      settings = await prisma.riskSetting.update({ where: { id: settings.id }, data: updateData });
    } else {
      settings = await prisma.riskSetting.create({ data: updateData });
    }
    res.json(settings);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// SOCKET.IO REALTIME EVENTS
// ==========================================
io.on('connection', (socket) => {
  socket.emit('connection:ack', { message: 'Connected to DBOT Execution Engine', timestamp: Date.now() });

  // Stream current live balance to newly connected frontend
  if (activeAccountId) {
    prisma.derivAccount.findUnique({ where: { accountId: activeAccountId } }).then((acc) => {
      if (acc) {
        socket.emit('account:balance', {
          accountId: acc.accountId,
          balance: acc.balance,
          currency: acc.currency
        });
      }
    }).catch(() => {});
  }

  socket.on('account:select', async (targetAccountId: string) => {
    try {
      const account = await prisma.derivAccount.findUnique({ where: { accountId: targetAccountId } });
      if (account) {
        await startAccountBalanceStream(account.token, account.accountId);
      }
    } catch (err: any) {
      console.warn('Socket account:select notice:', err.message);
    }
  });

  socket.on('account:refresh', async () => {
    if (activeAccountClient && activeAccountClient.isConnected) {
      try {
        await activeAccountClient.subscribeBalance();
      } catch {}
    }
  });

  socket.on('subscribe:bot', (botId: string) => {
    socket.join(`bot:${botId}`);
    const runner = activeRunners.get(botId);
    if (runner) {
      socket.emit(`bot:state:${botId}`, runner.getSnapshot());
    }
  });

  socket.on('unsubscribe:bot', (botId: string) => {
    socket.leave(`bot:${botId}`);
  });
});

// Serve production client build if available
const clientDistPath = fs.existsSync(path.resolve(__dirname, '../../dist/client'))
  ? path.resolve(__dirname, '../../dist/client')
  : path.resolve(__dirname, '../../client');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start Server
server.listen(PORT, () => {
  console.log(`DBOT Engine running on http://localhost:${PORT}`);
});
