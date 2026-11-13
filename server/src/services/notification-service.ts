// DBOT Multi-Channel Notification Service
// In-app alerts, browser notifications, and optional Telegram bot dispatches

import { PrismaClient } from '@prisma/client';

export type NotificationType =
  | 'INFO'
  | 'BOT_STARTED'
  | 'BOT_STOPPED'
  | 'TRADE_OPENED'
  | 'TRADE_CLOSED'
  | 'PROFIT_TARGET'
  | 'LOSS_LIMIT'
  | 'CONNECTION_LOST'
  | 'AUTH_EXPIRED'
  | 'EXECUTION_ERROR';

export interface NotificationPayload {
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  private telegramToken: string | null = null;
  private telegramChatId: string | null = null;

  constructor(private prisma: PrismaClient) {
    this.telegramToken = process.env.TELEGRAM_BOT_TOKEN || null;
    this.telegramChatId = process.env.TELEGRAM_CHAT_ID || null;
  }

  public setTelegramConfig(token: string, chatId: string) {
    this.telegramToken = token;
    this.telegramChatId = chatId;
  }

  public async notify(payload: NotificationPayload): Promise<void> {
    try {
      // 1. Persist notification in database
      await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message
        }
      });

      // 2. Dispatch to Telegram if configured
      if (this.telegramToken && this.telegramChatId) {
        await this.sendTelegramAlert(payload.title, payload.message);
      }
    } catch (err) {
      console.error('Failed to dispatch notification:', err);
    }
  }

  private async sendTelegramAlert(title: string, message: string): Promise<void> {
    try {
      const text = `🤖 *DBOT Alert: ${title}*\n\n${message}`;
      const url = `https://api.telegram.org/bot${this.telegramToken}/sendMessage`;
      
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.telegramChatId,
          text,
          parse_mode: 'Markdown'
        })
      });
    } catch (e) {
      console.error('Telegram notification error:', e);
    }
  }
}
