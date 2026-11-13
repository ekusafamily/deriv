// DBOT Strategy Schema & Validation via Zod
import { z } from 'zod';

export const StrategyConditionSchema = z.object({
  id: z.string(),
  leftOperand: z.object({
    type: z.enum(['INDICATOR', 'PRICE', 'LAST_DIGIT', 'CONSTANT']),
    indicatorName: z.enum(['SMA', 'EMA', 'RSI', 'MACD', 'BOLLINGER_UPPER', 'BOLLINGER_LOWER']).optional(),
    period: z.number().int().positive().max(500).optional(),
    value: z.number().optional()
  }),
  operator: z.enum([
    'GREATER_THAN',
    'LESS_THAN',
    'EQUALS',
    'GREATER_EQUAL',
    'LESS_EQUAL',
    'NOT_EQUALS',
    'CROSSES_ABOVE',
    'CROSSES_BELOW'
  ]),
  rightOperand: z.object({
    type: z.enum(['INDICATOR', 'PRICE', 'LAST_DIGIT', 'CONSTANT']),
    indicatorName: z.enum(['SMA', 'EMA', 'RSI', 'MACD', 'BOLLINGER_UPPER', 'BOLLINGER_LOWER']).optional(),
    period: z.number().int().positive().max(500).optional(),
    value: z.number().optional()
  })
});

export const StrategyASTSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  market: z.object({
    symbol: z.string().min(1),
    contract_type: z.enum([
      'CALL',
      'PUT',
      'HIGHER',
      'LOWER',
      'ONETOUCH',
      'NOTOUCH',
      'DIGITMATCH',
      'DIGITDIFF',
      'DIGITOVER',
      'DIGITUNDER',
      'DIGITEVEN',
      'DIGITODD'
    ]),
    duration: z.number().int().positive(),
    duration_unit: z.enum(['t', 's', 'm', 'h', 'd']),
    currency: z.string().default('USD'),
    barrier: z.string().optional(),
    prediction: z.number().int().min(0).max(9).optional()
  }),
  entry_conditions: z.object({
    gate: z.enum(['AND', 'OR']).default('AND'),
    conditions: z.array(StrategyConditionSchema).min(1),
    action: z.literal('BUY')
  }),
  risk_management: z.object({
    initial_stake: z.number().positive(),
    max_stake: z.number().positive(),
    take_profit: z.number().positive(),
    stop_loss: z.number().positive(),
    max_consecutive_losses: z.number().int().positive().default(5),
    cooldown_seconds: z.number().int().min(0).default(3),
    max_trades: z.number().int().positive().default(50)
  }),
  progression: z.object({
    type: z.enum(['FIXED', 'MARTINGALE', 'DALEMBERT', 'OSCARS_GRIND']).default('FIXED'),
    multiplier: z.number().min(1).max(10).default(2),
    max_level: z.number().int().min(1).max(20).default(5),
    reset_on_win: z.boolean().default(true)
  })
});

export type ValidatedStrategyAST = z.infer<typeof StrategyASTSchema>;
