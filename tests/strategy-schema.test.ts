import { describe, it, expect } from 'vitest';
import { StrategyASTSchema } from '../shared/strategy-schema';
import { STRATEGY_TEMPLATES } from '../shared/strategy-templates';

describe('Strategy AST Validation with Zod', () => {
  it('validates all built-in strategy templates successfully', () => {
    for (const template of STRATEGY_TEMPLATES) {
      const parsed = StrategyASTSchema.safeParse(template.ast);
      expect(parsed.success, `Template ${template.name} failed validation: ${parsed.error?.message}`).toBe(true);
    }
  });

  it('rejects invalid operators', () => {
    const invalidStrategy = {
      id: 'bad_bot',
      name: 'Bad Bot',
      market: {
        symbol: 'R_100',
        contract_type: 'CALL',
        duration: 5,
        duration_unit: 't'
      },
      entry_conditions: {
        gate: 'AND',
        conditions: [
          {
            id: 'c1',
            leftOperand: { type: 'PRICE' },
            operator: 'INVALID_OPERATOR', // invalid
            rightOperand: { type: 'CONSTANT', value: 10 }
          }
        ],
        action: 'BUY'
      },
      risk_management: {
        initial_stake: 1,
        max_stake: 10,
        take_profit: 20,
        stop_loss: 20
      },
      progression: {
        type: 'FIXED'
      }
    };

    const parsed = StrategyASTSchema.safeParse(invalidStrategy);
    expect(parsed.success).toBe(false);
  });

  it('rejects non-positive stakes and durations', () => {
    const badStake = {
      id: 'bad_stake',
      name: 'Bad Stake',
      market: {
        symbol: 'R_100',
        contract_type: 'CALL',
        duration: -5, // invalid
        duration_unit: 't'
      },
      entry_conditions: {
        gate: 'AND',
        conditions: [
          {
            id: 'c1',
            leftOperand: { type: 'PRICE' },
            operator: 'GREATER_THAN',
            rightOperand: { type: 'CONSTANT', value: 10 }
          }
        ],
        action: 'BUY'
      },
      risk_management: {
        initial_stake: -1, // invalid negative stake
        max_stake: 10,
        take_profit: 20,
        stop_loss: 20
      },
      progression: {
        type: 'FIXED'
      }
    };

    const parsed = StrategyASTSchema.safeParse(badStake);
    expect(parsed.success).toBe(false);
  });
});
