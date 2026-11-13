-- DBOT PostgreSQL & Supabase Database Migration
-- Run this script in Supabase SQL Editor or Render PostgreSQL psql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "email" TEXT UNIQUE,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Deriv Accounts Table
CREATE TABLE IF NOT EXISTS "DerivAccount" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE,
    "accountId" TEXT UNIQUE NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isVirtual" BOOLEAN NOT NULL DEFAULT true,
    "token" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bots Table
CREATE TABLE IF NOT EXISTS "Bot" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "symbol" TEXT NOT NULL DEFAULT 'R_100',
    "contractType" TEXT NOT NULL DEFAULT 'CALL',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "workspaceXml" TEXT,
    "strategyAst" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bot Versions Table
CREATE TABLE IF NOT EXISTS "BotVersion" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "botId" TEXT NOT NULL REFERENCES "Bot"("id") ON DELETE CASCADE,
    "versionNumber" INTEGER NOT NULL,
    "workspaceXml" TEXT,
    "strategyAst" TEXT NOT NULL,
    "changeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Execution Sessions Table
CREATE TABLE IF NOT EXISTS "ExecutionSession" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "botId" TEXT NOT NULL REFERENCES "Bot"("id") ON DELETE CASCADE,
    "accountId" TEXT REFERENCES "DerivAccount"("id") ON DELETE SET NULL,
    "runMode" TEXT NOT NULL DEFAULT 'PAPER',
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winningTrades" INTEGER NOT NULL DEFAULT 0,
    "losingTrades" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stoppedAt" TIMESTAMP(3)
);

-- 6. Trades Table
CREATE TABLE IF NOT EXISTS "Trade" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "sessionId" TEXT NOT NULL REFERENCES "ExecutionSession"("id") ON DELETE CASCADE,
    "contractId" INTEGER,
    "proposalId" TEXT,
    "symbol" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "stake" DOUBLE PRECISION NOT NULL,
    "payout" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "profit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL,
    "entrySpot" DOUBLE PRECISION,
    "exitSpot" DOUBLE PRECISION,
    "barrier" TEXT,
    "entryTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitTime" TIMESTAMP(3),
    "isPaperTrade" BOOLEAN NOT NULL DEFAULT false
);

-- 7. Risk Settings Table
CREATE TABLE IF NOT EXISTS "RiskSetting" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "userId" TEXT,
    "maxStake" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "maxDailyLoss" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "takeProfitTarget" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "maxConsecutiveLosses" INTEGER NOT NULL DEFAULT 5,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 5,
    "maxDrawdownPercent" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "emergencyStopEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Audit Events Table
CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Backtest Jobs Table
CREATE TABLE IF NOT EXISTS "BacktestJob" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "symbol" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "strategyAst" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL DEFAULT '1m',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
    "finalBalance" DOUBLE PRECISION,
    "totalProfit" DOUBLE PRECISION,
    "winRate" DOUBLE PRECISION,
    "maxDrawdown" DOUBLE PRECISION,
    "totalTrades" INTEGER,
    "tradesJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
