// DBOT & Deriv Native Blockly Block Definitions, Workspace Exporter & Toolboxes
import * as Blockly from 'blockly';
import { StrategyAST, DerivContractType, DurationUnit, formatSymbolName } from '../../../../shared/types';

let blocksInitialized = false;

// Deriv Minimal Clean Block Color Theme (Directly aligned with official Deriv Bot & DDBOt)
const DERIV_ROOT_COLOR = '#064e72';      // Canonical Deriv dark petrol blue for the 4 root blocks
const DERIV_ACCENT_COLOR = '#1e293b';    // Clean dark slate for sub-parameters and options
const DERIV_PURCHASE_COLOR = '#00a86b';  // Crisp Deriv green purchase block
const DERIV_SELL_COLOR = '#e53935';      // Clean Deriv red exit block
const DERIV_LOGIC_COLOR = '#243044';     // Minimal neutral navy for logic blocks
const DERIV_MATH_COLOR = '#1e293b';      // Minimal neutral dark slate for math numbers and operations
const DERIV_INDICATOR_COLOR = '#243044'; // Subtle slate for indicators
const DERIV_TEXT_COLOR = '#1e293b';      // Subtle slate for text & utilities

export const initBlocklyBlocks = () => {
  if (blocksInitialized) return;
  blocksInitialized = true;

  // Ensure FieldDropdown gracefully accepts any value loaded from external XML bots (custom symbols, contract types, sounds)
  try {
    const origDropdownValidation = (Blockly.FieldDropdown.prototype as any).doClassValidation_;
    (Blockly.FieldDropdown.prototype as any).doClassValidation_ = function (newValue: any) {
      if (newValue === null || newValue === undefined) return null;
      const options = this.getOptions(false);
      const exists = options.some((opt: [string, string]) => opt[1] === newValue);
      if (!exists && newValue) {
        const friendlyLabel = formatSymbolName(String(newValue)) || String(newValue);
        options.push([friendlyLabel, String(newValue)]);
      }
      return newValue;
    };
  } catch (e) {
    console.warn('FieldDropdown patch skipped', e);
  }

  // ========================================================
  // 1. DERIV NATIVE ROOT BLOCK: 1. Trade parameters
  // ========================================================
  Blockly.Blocks['trade_definition'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('1. Trade parameters')
        .appendField(new Blockly.FieldImage('https://developers.deriv.com/img/favicon.png', 20, 20, 'T'));

      this.appendStatementInput('TRADE_OPTIONS')
        .setCheck(null);

      this.appendDummyInput()
        .appendField('Run once at start:');

      this.appendStatementInput('INITIALIZATION')
        .setCheck(null);

      this.appendDummyInput()
        .appendField('Trade options:');

      this.appendStatementInput('SUBMARKET')
        .setCheck(null);

      this.appendStatementInput('CUSTOM_BLOCKS')
        .setCheck(null);

      this.setColour(DERIV_ROOT_COLOR);
      this.setTooltip('Define trading market, trade type, candle interval and stake parameters');
      this.setDeletable(false);
    }
  };

  // Trade Definition Market (Market > Submarket > Symbol)
  Blockly.Blocks['trade_definition_market'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Market:')
        .appendField(
          new Blockly.FieldDropdown([
            ['synthetics', 'synthetic_index'],
            ['forex', 'forex'],
            ['cryptocurrency', 'cryptocurrency']
          ]),
          'MARKET_LIST'
        )
        .appendField('>')
        .appendField(
          new Blockly.FieldDropdown([
            ['Continuous Indices', 'random_index'],
            ['Major Pairs', 'major_pairs'],
            ['Crypto', 'crypto']
          ]),
          'SUBMARKET_LIST'
        )
        .appendField('>')
        .appendField(
          new Blockly.FieldDropdown([
            ['Volatility 100 (1s) Index', '1HZ100V'],
            ['Volatility 75 (1s) Index', '1HZ75V'],
            ['Volatility 50 (1s) Index', '1HZ50V'],
            ['Volatility 25 (1s) Index', '1HZ25V'],
            ['Volatility 10 (1s) Index', '1HZ10V'],
            ['Volatility 150 (1s) Index', '1HZ150V'],
            ['Volatility 250 (1s) Index', '1HZ250V'],
            ['Volatility 300 (1s) Index', '1HZ300V'],
            ['Volatility 100 Index', 'R_100'],
            ['Volatility 75 Index', 'R_75'],
            ['Volatility 50 Index', 'R_50'],
            ['Volatility 25 Index', 'R_25'],
            ['Volatility 10 Index', 'R_10'],
            ['Boom 300 Index', 'BOOM300'],
            ['Boom 500 Index', 'BOOM500'],
            ['Boom 1000 Index', 'BOOM1000'],
            ['Crash 300 Index', 'CRASH300'],
            ['Crash 500 Index', 'CRASH500'],
            ['Crash 1000 Index', 'CRASH1000'],
            ['Jump 10 Index', 'JUMP_10'],
            ['Jump 50 Index', 'JUMP_50'],
            ['Jump 100 Index', 'JUMP_100'],
            ['Step Index', 'STEP_INDEX'],
            ['Bear Market Index', 'RDBEAR'],
            ['Bull Market Index', 'RDBULL'],
            ['EUR/USD Forex', 'frxEURUSD'],
            ['GBP/USD Forex', 'frxGBPUSD'],
            ['USD/JPY Forex', 'frxUSDJPY'],
            ['BTC/USD Crypto', 'cryBTCUSD'],
            ['ETH/USD Crypto', 'cryETHUSD']
          ]),
          'SYMBOL_LIST'
        );

      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_ACCENT_COLOR);
      this.setDeletable(false);
    }
  };

  // Trade Definition Trade Type
  Blockly.Blocks['trade_definition_tradetype'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Trade Type:')
        .appendField(
          new Blockly.FieldDropdown([
            ['Up/Down', 'callput'],
            ['Digits', 'digits'],
            ['High/Low', 'highlow'],
            ['Touch/No Touch', 'touchnotouch'],
            ['Reset', 'reset'],
            ['Asian', 'asian']
          ]),
          'TRADETYPECAT_LIST'
        )
        .appendField('>')
        .appendField(
          new Blockly.FieldDropdown([
            ['Rise/Fall', 'risefall'],
            ['Matches/Differs', 'matchesdiffers'],
            ['Over/Under', 'overunder'],
            ['Even/Odd', 'evenodd']
          ]),
          'TRADETYPE_LIST'
        );

      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_ACCENT_COLOR);
      this.setDeletable(false);
    }
  };

  // Trade Definition Contract Type
  Blockly.Blocks['trade_definition_contracttype'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Contract Type:')
        .appendField(
          new Blockly.FieldDropdown([
            ['Both', 'both'],
            ['Rise', 'CALL'],
            ['Fall', 'PUT'],
            ['Digit Under', 'DIGITUNDER'],
            ['Digit Over', 'DIGITOVER'],
            ['Digit Differs', 'DIGITDIFF'],
            ['Digit Matches', 'DIGITMATCH'],
            ['Digit Even', 'DIGITEVEN'],
            ['Digit Odd', 'DIGITODD']
          ]),
          'TYPE_LIST'
        );

      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_ACCENT_COLOR);
      this.setDeletable(false);
    }
  };

  // Trade Definition Candle Interval
  Blockly.Blocks['trade_definition_candleinterval'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Default Candle Interval:')
        .appendField(
          new Blockly.FieldDropdown([
            ['1 minute', '60'],
            ['2 minutes', '120'],
            ['3 minutes', '180'],
            ['5 minutes', '300'],
            ['10 minutes', '600'],
            ['15 minutes', '900'],
            ['30 minutes', '1800'],
            ['1 hour', '3600']
          ]),
          'CANDLEINTERVAL_LIST'
        );

      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_ACCENT_COLOR);
      this.setDeletable(false);
    }
  };

  // Trade Definition Restart Buy/Sell on Error
  Blockly.Blocks['trade_definition_restartbuysell'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Restart buy/sell on error (disable for better performance):')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'TIME_MACHINE_ENABLED');

      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_ACCENT_COLOR);
      this.setDeletable(false);
    }
  };

  // Trade Definition Restart on Error
  Blockly.Blocks['trade_definition_restartonerror'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Restart last trade on error (bot ignores the unsuccessful trade):')
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'RESTARTONERROR');

      this.setPreviousStatement(true, null);
      this.setNextStatement(false);
      this.setColour(DERIV_ACCENT_COLOR);
      this.setDeletable(false);
    }
  };

  // Trade Definition Trade Options (Duration & Stake)
  Blockly.Blocks['trade_definition_tradeoptions'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Duration:')
        .appendField(
          new Blockly.FieldDropdown([
            ['Ticks', 't'],
            ['Seconds', 's'],
            ['Minutes', 'm'],
            ['Hours', 'h'],
            ['Days', 'd']
          ]),
          'DURATIONTYPE_LIST'
        );

      this.appendValueInput('DURATION')
        .setCheck(['Number', null]);

      this.appendDummyInput()
        .appendField('Stake:')
        .appendField(new Blockly.FieldLabel('USD'), 'CURRENCY_LIST');

      this.appendValueInput('AMOUNT')
        .setCheck(['Number', null]);

      this.appendDummyInput()
        .appendField('(min: 0.35 - max: 50000)', 'AMOUNT_LIMITS');

      this.appendValueInput('PREDICTION')
        .setCheck(['Number', null])
        .appendField('Prediction:');

      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(false);
      this.setColour(DERIV_ACCENT_COLOR);
    }
  };

  // Multiplier Trade Options
  Blockly.Blocks['trade_definition_multiplier'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Multiplier:')
        .appendField(new Blockly.FieldNumber(10, 1, 100), 'MULTIPLIER');
      this.setPreviousStatement(true, null);
      this.setNextStatement(false);
      this.setColour(DERIV_ACCENT_COLOR);
    }
  };

  // Accumulator Trade Options
  Blockly.Blocks['trade_definition_accumulator'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Growth Rate (%):')
        .appendField(
          new Blockly.FieldDropdown([
            ['1%', '0.01'],
            ['2%', '0.02'],
            ['3%', '0.03'],
            ['4%', '0.04'],
            ['5%', '0.05']
          ]),
          'GROWTHRATE_LIST'
        );
      this.appendValueInput('GROWTH_RATE')
        .setCheck(['Number', null]);
      this.appendValueInput('AMOUNT')
        .setCheck(['Number', null]);
      this.appendStatementInput('ACCUMULATOR_PARAMS')
        .setCheck(null);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_ACCENT_COLOR);
    }
  };

  // Accumulator Take Profit Block
  Blockly.Blocks['accumulator_take_profit'] = {
    init: function () {
      this.appendValueInput('AMOUNT')
        .setCheck(['Number', null])
        .appendField('Accumulator Take Profit:');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_PURCHASE_COLOR);
    }
  };

  // ========================================================
  // 2. DERIV NATIVE ROOT BLOCK: 2. Purchase conditions
  // ========================================================
  Blockly.Blocks['before_purchase'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('2. Purchase conditions')
        .appendField(new Blockly.FieldImage('https://developers.deriv.com/img/favicon.png', 20, 20, 'P'));

      this.appendStatementInput('BEFOREPURCHASE_STACK')
        .setCheck(null);

      this.setColour(DERIV_ROOT_COLOR);
      this.setTooltip('Define the triggers and indicators required before buying a contract');
      this.setDeletable(false);
    }
  };

  // Purchase Action Block
  Blockly.Blocks['purchase'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Purchase')
        .appendField(
          new Blockly.FieldDropdown([
            ['Rise (CALL)', 'CALL'],
            ['Fall (PUT)', 'PUT'],
            ['Digit Under', 'DIGITUNDER'],
            ['Digit Over', 'DIGITOVER'],
            ['Digit Differs', 'DIGITDIFF'],
            ['Digit Matches', 'DIGITMATCH'],
            ['Digit Even', 'DIGITEVEN'],
            ['Digit Odd', 'DIGITODD'],
            ['Buy Accumulator', 'ACCU'],
            ['Higher', 'HIGHER'],
            ['Lower', 'LOWER'],
            ['Touch', 'TOUCH'],
            ['No Touch', 'NOTOUCH']
          ]),
          'PURCHASE_LIST'
        );

      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_PURCHASE_COLOR);
      this.setTooltip('Purchases the selected contract type in the market');
    }
  };

  // Apollo Purchase (vendor alias)
  Blockly.Blocks['apollo_purchase'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Purchase')
        .appendField(
          new Blockly.FieldDropdown([
            ['Rise (CALL)', 'CALL'],
            ['Fall (PUT)', 'PUT'],
            ['Digit Under', 'DIGITUNDER'],
            ['Digit Over', 'DIGITOVER'],
            ['Digit Differs', 'DIGITDIFF'],
            ['Digit Matches', 'DIGITMATCH'],
            ['Digit Even', 'DIGITEVEN'],
            ['Digit Odd', 'DIGITODD'],
            ['Buy Accumulator', 'ACCU'],
            ['Higher', 'HIGHER'],
            ['Lower', 'LOWER'],
            ['Touch', 'TOUCH'],
            ['No Touch', 'NOTOUCH']
          ]),
          'PURCHASE_LIST'
        );
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_PURCHASE_COLOR);
    }
  };

  // Ask Price / Payout query blocks
  Blockly.Blocks['ask_price'] = {
    init: function () {
      this.appendDummyInput().appendField('Ask Price');
      this.setOutput(true, 'Number');
      this.setColour(DERIV_MATH_COLOR);
    }
  };

  Blockly.Blocks['payout'] = {
    init: function () {
      this.appendDummyInput().appendField('Payout');
      this.setOutput(true, 'Number');
      this.setColour(DERIV_MATH_COLOR);
    }
  };

  // ========================================================
  // 3. DERIV NATIVE ROOT BLOCK: 3. Sell conditions (optional)
  // ========================================================
  Blockly.Blocks['during_purchase'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('3. Sell conditions')
        .appendField(new Blockly.FieldImage('https://developers.deriv.com/img/favicon.png', 20, 20, 'S'));

      this.appendStatementInput('DURING_PURCHASE_STACK')
        .setCheck(null);

      this.setColour(DERIV_ROOT_COLOR);
      this.setTooltip('Sell active contract before expiry if available');
      this.setDeletable(true);
    }
  };

  Blockly.Blocks['check_sell'] = {
    init: function () {
      this.appendDummyInput().appendField('Sell is available');
      this.setOutput(true, 'Boolean');
      this.setColour(DERIV_SELL_COLOR);
    }
  };

  Blockly.Blocks['sell_at_market'] = {
    init: function () {
      this.appendDummyInput().appendField('Sell at market');
      this.setPreviousStatement(true, null);
      this.setNextStatement(false);
      this.setColour(DERIV_SELL_COLOR);
    }
  };

  Blockly.Blocks['sell_price'] = {
    init: function () {
      this.appendDummyInput().appendField('Current Sell Price');
      this.setOutput(true, 'Number');
      this.setColour(DERIV_MATH_COLOR);
    }
  };

  // ========================================================
  // 4. DERIV NATIVE ROOT BLOCK: 4. Restart trading conditions
  // ========================================================
  Blockly.Blocks['after_purchase'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('4. Restart trading conditions')
        .appendField(new Blockly.FieldImage('https://developers.deriv.com/img/favicon.png', 20, 20, 'R'));

      this.appendStatementInput('AFTERPURCHASE_STACK')
        .setCheck(null);

      this.setColour(DERIV_ROOT_COLOR);
      this.setTooltip('Decide if bot should trade again, adjust stake on win/loss or halt execution');
      this.setDeletable(false);
    }
  };

  Blockly.Blocks['trade_again'] = {
    init: function () {
      this.appendDummyInput().appendField('Trade again');
      this.setPreviousStatement(true, null);
      this.setNextStatement(false);
      this.setColour(DERIV_PURCHASE_COLOR);
    }
  };

  Blockly.Blocks['contract_check_result'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Result is')
        .appendField(
          new Blockly.FieldDropdown([
            ['win', 'win'],
            ['loss', 'loss']
          ]),
          'CHECK_RESULT'
        );
      this.setOutput(true, 'Boolean');
      this.setColour(DERIV_LOGIC_COLOR);
    }
  };

  Blockly.Blocks['read_details'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Contract Detail:')
        .appendField(
          new Blockly.FieldDropdown([
            ['Deal Reference ID', '1'],
            ['Purchase Price (Stake)', '2'],
            ['Payout', '3'],
            ['Profit / Loss', '4'],
            ['Contract Type', '5'],
            ['Entry Spot Time', '6'],
            ['Entry Spot Price', '7'],
            ['Exit Spot Time', '8'],
            ['Exit Spot Price', '9'],
            ['Barrier', '10'],
            ['Result', '11']
          ]),
          'DETAIL_INDEX'
        );
      this.setOutput(true, null);
      this.setColour(DERIV_LOGIC_COLOR);
    }
  };

  // ========================================================
  // 5. ANALYSIS & TICKS BLOCKS
  // ========================================================
  Blockly.Blocks['tick'] = {
    init: function () {
      this.appendDummyInput().appendField('Last Tick');
      this.setOutput(true, 'Number');
      this.setColour(DERIV_LOGIC_COLOR);
    }
  };

  Blockly.Blocks['ticks'] = {
    init: function () {
      this.appendDummyInput().appendField('Tick List');
      this.setOutput(true, 'Array');
      this.setColour(DERIV_LOGIC_COLOR);
    }
  };

  Blockly.Blocks['last_digit'] = {
    init: function () {
      this.appendDummyInput().appendField('Last Digit of Tick');
      this.setOutput(true, 'Number');
      this.setColour(DERIV_LOGIC_COLOR);
    }
  };

  Blockly.Blocks['lastDigitList'] = {
    init: function () {
      this.appendDummyInput().appendField('Last Digits List');
      this.setOutput(true, 'Array');
      this.setColour(DERIV_LOGIC_COLOR);
    }
  };

  Blockly.Blocks['check_direction'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Direction is')
        .appendField(
          new Blockly.FieldDropdown([
            ['Rising', 'rise'],
            ['Falling', 'fall'],
            ['No Change', '']
          ]),
          'CHECK_DIRECTION'
        );
      this.setOutput(true, 'Boolean');
      this.setColour(DERIV_LOGIC_COLOR);
    }
  };

  Blockly.Blocks['ohlc'] = {
    init: function () {
      this.appendDummyInput().appendField('Candles (OHLC) List');
      this.setOutput(true, 'Array');
      this.setColour(DERIV_LOGIC_COLOR);
    }
  };

  Blockly.Blocks['get_ohlc'] = {
    init: function () {
      this.appendDummyInput().appendField('Get Candle List');
      this.setOutput(true, 'Array');
      this.setColour(DERIV_LOGIC_COLOR);
    }
  };

  Blockly.Blocks['stat'] = {
    init: function () {
      this.appendDummyInput().appendField('Analysis Stat');
      this.setOutput(true, 'Number');
      this.setColour(DERIV_LOGIC_COLOR);
    }
  };

  // ========================================================
  // 6. TECHNICAL INDICATORS
  // ========================================================
  Blockly.Blocks['sma_statement'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('SMA Period:')
        .appendField(new Blockly.FieldNumber(10, 2, 200), 'PERIOD');
      this.setOutput(true, 'Number');
      this.setColour(DERIV_INDICATOR_COLOR);
    }
  };

  Blockly.Blocks['smaa_statement'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('SMA Array (Period:')
        .appendField(new Blockly.FieldNumber(10, 2, 200), 'PERIOD')
        .appendField(')');
      this.setOutput(true, 'Array');
      this.setColour(DERIV_INDICATOR_COLOR);
    }
  };

  Blockly.Blocks['ema_statement'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('EMA Period:')
        .appendField(new Blockly.FieldNumber(10, 2, 200), 'PERIOD');
      this.setOutput(true, 'Number');
      this.setColour(DERIV_INDICATOR_COLOR);
    }
  };

  Blockly.Blocks['emaa_statement'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('EMA Array (Period:')
        .appendField(new Blockly.FieldNumber(10, 2, 200), 'PERIOD')
        .appendField(')');
      this.setOutput(true, 'Array');
      this.setColour(DERIV_INDICATOR_COLOR);
    }
  };

  Blockly.Blocks['rsi_statement'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('RSI (Period:')
        .appendField(new Blockly.FieldNumber(14, 2, 100), 'PERIOD')
        .appendField(')');
      this.setOutput(true, 'Number');
      this.setColour(DERIV_INDICATOR_COLOR);
    }
  };

  Blockly.Blocks['rsia_statement'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('RSI Array (Period:')
        .appendField(new Blockly.FieldNumber(14, 2, 100), 'PERIOD')
        .appendField(')');
      this.setOutput(true, 'Array');
      this.setColour(DERIV_INDICATOR_COLOR);
    }
  };

  Blockly.Blocks['macda_statement'] = {
    init: function () {
      this.appendDummyInput().appendField('MACD Value');
      this.setOutput(true, 'Number');
      this.setColour(DERIV_INDICATOR_COLOR);
    }
  };

  Blockly.Blocks['bb_statement'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Bollinger Bands')
        .appendField(
          new Blockly.FieldDropdown([
            ['Upper Band', 'UPPER'],
            ['Middle Band', 'MIDDLE'],
            ['Lower Band', 'LOWER']
          ]),
          'BAND'
        );
      this.setOutput(true, 'Number');
      this.setColour(DERIV_INDICATOR_COLOR);
    }
  };

  // ========================================================
  // 7. UTILITY & NOTIFICATIONS
  // ========================================================
  Blockly.Blocks['notify'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Notify')
        .appendField(
          new Blockly.FieldDropdown([
            ['green (success)', 'success'],
            ['blue (info)', 'info'],
            ['yellow (warn)', 'warn'],
            ['red (error)', 'error']
          ]),
          'NOTIFICATION_TYPE'
        )
        .appendField('Sound:')
        .appendField(
          new Blockly.FieldDropdown([
            ['Silent', 'silent'],
            ['Announcement', 'announcement'],
            ['Earned money', 'earned-money'],
            ['Job done', 'job-done'],
            ['Error', 'error']
          ]),
          'NOTIFICATION_SOUND'
        );
      this.appendValueInput('MESSAGE')
        .setCheck(null)
        .appendField('Message:');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_TEXT_COLOR);
    }
  };

  Blockly.Blocks['notify_telegram'] = {
    init: function () {
      this.appendDummyInput().appendField('Send Telegram Notification:');
      this.appendValueInput('MESSAGE').setCheck(null);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_TEXT_COLOR);
    }
  };

  Blockly.Blocks['total_profit'] = {
    init: function () {
      this.appendDummyInput().appendField('Total Profit');
      this.setOutput(true, 'Number');
      this.setColour(DERIV_MATH_COLOR);
    }
  };

  Blockly.Blocks['total_runs'] = {
    init: function () {
      this.appendDummyInput().appendField('Number of Runs');
      this.setOutput(true, 'Number');
      this.setColour(DERIV_MATH_COLOR);
    }
  };

  Blockly.Blocks['balance'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Balance:')
        .appendField(
          new Blockly.FieldDropdown([
            ['number', 'NUM'],
            ['string', 'STR']
          ]),
          'BALANCE_TYPE'
        );
      this.setOutput(true, null);
      this.setColour(DERIV_MATH_COLOR);
    }
  };

  Blockly.Blocks['text_statement'] = {
    init: function () {
      this.appendValueInput('TEXT').setCheck(null).appendField('text:');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_TEXT_COLOR);
    }
  };

  Blockly.Blocks['math_number_positive'] = {
    init: function () {
      this.appendDummyInput().appendField(new Blockly.FieldNumber(1, 0), 'NUM');
      this.setOutput(true, 'Number');
      this.setColour(DERIV_MATH_COLOR);
    }
  };

  Blockly.Blocks['set_tp'] = {
    init: function () {
      this.appendDummyInput().appendField('Target Profit Reached');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_PURCHASE_COLOR);
    }
  };

  Blockly.Blocks['set_sl'] = {
    init: function () {
      this.appendDummyInput().appendField('Stop Loss Reached');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_SELL_COLOR);
    }
  };

  // btnotify (BinaryTool Notification Block used across AI bots)
  Blockly.Blocks['btnotify'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('BinaryTool Notify')
        .appendField(
          new Blockly.FieldDropdown([
            ['green (success)', 'success'],
            ['blue (info)', 'info'],
            ['yellow (warn)', 'warn'],
            ['red (error)', 'error']
          ]),
          'NOTIFICATION_TYPE'
        )
        .appendField('Sound:')
        .appendField(
          new Blockly.FieldDropdown([
            ['Silent', 'silent'],
            ['Announcement', 'announcement'],
            ['Earned money', 'earned_money'],
            ['Earned money (dash)', 'earned-money'],
            ['Job done', 'job-done'],
            ['Error', 'error']
          ]),
          'NOTIFICATION_SOUND'
        );
      this.appendValueInput('MESSAGE')
        .setCheck(null)
        .appendField('Message:');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_TEXT_COLOR);
    }
  };

  // lists_statement (Deriv DBot list item statement block)
  Blockly.Blocks['lists_statement'] = {
    init: function () {
      this.appendValueInput('VALUE')
        .setCheck(null)
        .appendField('List item:');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_MATH_COLOR);
    }
  };

  // tick_analysis (Deriv DBot Tick Analysis Root/Stack Block)
  Blockly.Blocks['tick_analysis'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Tick Analysis')
        .appendField(new Blockly.FieldImage('https://developers.deriv.com/img/favicon.png', 20, 20, 'A'));
      this.appendStatementInput('TICKANALYSIS_STACK')
        .setCheck(null);
      this.appendStatementInput('STACK')
        .setCheck(null);
      this.setColour('#00838f');
      this.setTooltip('Runs on every tick to compute stats or check digit patterns');
    }
  };

  // timeout (Deriv DBot Timeout Block)
  Blockly.Blocks['timeout'] = {
    init: function () {
      this.appendValueInput('SECONDS')
        .setCheck(null)
        .appendField('Run after (seconds):');
      this.appendStatementInput('TIMEOUTSTACK')
        .setCheck(null);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_TEXT_COLOR);
    }
  };

  // Deriv DBot statement-compatible text_join
  Blockly.Blocks['text_join'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Text Join')
        .appendField(new Blockly.FieldTextInput('text'), 'VARIABLE');
      this.appendStatementInput('STACK')
        .setCheck(null);
      this.setOutput(true, null);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_TEXT_COLOR);
    }
  };

  // Deriv DBot statement-compatible lists_create_with
  Blockly.Blocks['lists_create_with'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('Create List')
        .appendField(new Blockly.FieldTextInput('list'), 'VARIABLE');
      this.appendStatementInput('STACK')
        .setCheck(null);
      this.setOutput(true, null);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(DERIV_MATH_COLOR);
    }
  };

  // ========================================================
  // 8. LEGACY DBOT_* ALIASES (FOR BACKWARDS COMPATIBILITY)
  // ========================================================
  Blockly.Blocks['dbot_trade_definition'] = Blockly.Blocks['trade_definition'];
  Blockly.Blocks['dbot_purchase_condition'] = Blockly.Blocks['purchase'];
  Blockly.Blocks['dbot_indicator_sma'] = Blockly.Blocks['sma_statement'];
  Blockly.Blocks['dbot_indicator_ema'] = Blockly.Blocks['ema_statement'];
  Blockly.Blocks['dbot_indicator_rsi'] = Blockly.Blocks['rsi_statement'];
  Blockly.Blocks['dbot_indicator_macd'] = Blockly.Blocks['macda_statement'];
  Blockly.Blocks['dbot_current_price'] = Blockly.Blocks['tick'];
  Blockly.Blocks['dbot_last_digit'] = Blockly.Blocks['last_digit'];
  Blockly.Blocks['dbot_number'] = Blockly.Blocks['math_number_positive'];
};

// ========================================================
// ENSURE ALL BLOCKS FROM XML ARE REGISTERED (AUTO-FALLBACK)
// ========================================================
export const ensureAllBlocksRegistered = (xmlText: string) => {
  try {
    initBlocklyBlocks();
    const dom = Blockly.utils.xml.textToDom(xmlText);
    const blockElements = dom.querySelectorAll('block, shadow');
    blockElements.forEach((el) => {
      const type = el.getAttribute('type');
      if (type && !Blockly.Blocks[type]) {
        const fieldNames: string[] = [];
        const valueNames: string[] = [];
        const statementNames: string[] = [];
        for (let i = 0; i < el.children.length; i++) {
          const child = el.children[i];
          const name = child.getAttribute('name');
          if (!name) continue;
          const tag = child.tagName.toLowerCase();
          if (tag === 'field') fieldNames.push(name);
          else if (tag === 'value') valueNames.push(name);
          else if (tag === 'statement') statementNames.push(name);
        }
        Blockly.Blocks[type] = {
          init: function () {
            const di = this.appendDummyInput().appendField(`[${type}]`);
            fieldNames.forEach((fn) => {
              di.appendField(new Blockly.FieldTextInput(''), fn);
            });
            valueNames.forEach((vn) => {
              this.appendValueInput(vn).setCheck(null);
            });
            statementNames.forEach((sn) => {
              this.appendStatementInput(sn).setCheck(null);
            });
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setOutput(true, null);
            this.setColour('#64748b');
          }
        };
      }
    });
  } catch (e) {
    console.warn('ensureAllBlocksRegistered fallback error', e);
  }
};

// ========================================================
// 4 CANONICAL DERIV BOT ROOT BLOCKS DEFAULT WORKSPACE XML
// ========================================================
export const DERIV_DEFAULT_WORKSPACE_XML = `<xml xmlns="https://developers.google.com/blockly/xml" is_dbot="true" collection="false">
  <variables>
    <variable id="var_loss">Loss</variable>
    <variable id="var_stake">Stake</variable>
    <variable id="var_target">Target Profit</variable>
  </variables>
  <block type="trade_definition" id="trade_def_root" deletable="false" x="20" y="20">
    <statement name="TRADE_OPTIONS">
      <block type="trade_definition_market" deletable="false" movable="false">
        <field name="MARKET_LIST">synthetic_index</field>
        <field name="SUBMARKET_LIST">random_index</field>
        <field name="SYMBOL_LIST">1HZ100V</field>
        <next>
          <block type="trade_definition_tradetype" deletable="false" movable="false">
            <field name="TRADETYPECAT_LIST">callput</field>
            <field name="TRADETYPE_LIST">risefall</field>
            <next>
              <block type="trade_definition_contracttype" deletable="false" movable="false">
                <field name="TYPE_LIST">both</field>
                <next>
                  <block type="trade_definition_candleinterval" deletable="false" movable="false">
                    <field name="CANDLEINTERVAL_LIST">60</field>
                    <next>
                      <block type="trade_definition_restartbuysell" deletable="false" movable="false">
                        <field name="TIME_MACHINE_ENABLED">FALSE</field>
                        <next>
                          <block type="trade_definition_restartonerror" deletable="false" movable="false">
                            <field name="RESTARTONERROR">TRUE</field>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
    <statement name="INITIALIZATION">
      <block type="variables_set">
        <field name="VAR" id="var_stake">Stake</field>
        <value name="VALUE">
          <block type="math_number"><field name="NUM">1</field></block>
        </value>
        <next>
          <block type="variables_set">
            <field name="VAR" id="var_target">Target Profit</field>
            <value name="VALUE">
              <block type="math_number"><field name="NUM">25</field></block>
            </value>
            <next>
              <block type="variables_set">
                <field name="VAR" id="var_loss">Loss</field>
                <value name="VALUE">
                  <block type="math_number"><field name="NUM">20</field></block>
                </value>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
    <statement name="SUBMARKET">
      <block type="trade_definition_tradeoptions">
        <field name="DURATIONTYPE_LIST">t</field>
        <value name="DURATION">
          <block type="math_number"><field name="NUM">5</field></block>
        </value>
        <value name="AMOUNT">
          <block type="variables_get">
            <field name="VAR" id="var_stake">Stake</field>
          </block>
        </value>
      </block>
    </statement>
  </block>
  <block type="during_purchase" id="during_pur_root" x="680" y="20">
    <statement name="DURING_PURCHASE_STACK">
      <block type="controls_if">
        <value name="IF0">
          <block type="check_sell"></block>
        </value>
        <statement name="DO0">
          <block type="sell_at_market"></block>
        </statement>
      </block>
    </statement>
  </block>
  <block type="after_purchase" id="after_pur_root" x="680" y="190">
    <statement name="AFTERPURCHASE_STACK">
      <block type="trade_again"></block>
    </statement>
  </block>
  <block type="before_purchase" id="before_pur_root" x="20" y="520">
    <statement name="BEFOREPURCHASE_STACK">
      <block type="purchase">
        <field name="PURCHASE_LIST">CALL</field>
      </block>
    </statement>
  </block>
</xml>`;

// Compatibility alias
export const DEFAULT_WORKSPACE_XML = DERIV_DEFAULT_WORKSPACE_XML;

// ========================================================
// TOOLBOX XML MATCHING NATIVE DERIV BOT BLOCKS MENU
// ========================================================
export const DBOT_TOOLBOX_XML = `<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
  <category name="Analysis Logics 🔥" colour="#e53935">
    <block type="controls_if"></block>
    <block type="logic_compare"></block>
    <block type="logic_operation"></block>
    <block type="logic_negate"></block>
    <block type="check_direction"></block>
    <block type="contract_check_result"></block>
  </category>

  <category name="Market Structure 🏗️" colour="#0284c7">
    <block type="trade_definition_market"></block>
    <block type="trade_definition_tradetype"></block>
    <block type="trade_definition_contracttype"></block>
    <block type="trade_definition_candleinterval"></block>
    <block type="trade_definition_tradeoptions"></block>
  </category>

  <category name="Trade parameters" colour="#0f3b5f">
    <block type="trade_definition"></block>
    <block type="trade_definition_market"></block>
    <block type="trade_definition_tradeoptions"></block>
    <block type="trade_definition_multiplier"></block>
    <block type="trade_definition_accumulator"></block>
  </category>

  <category name="Purchase conditions" colour="#00a86b">
    <block type="before_purchase"></block>
    <block type="purchase"></block>
    <block type="ask_price"></block>
    <block type="payout"></block>
  </category>

  <category name="Sell conditions (optional)" colour="#d32f2f">
    <block type="during_purchase"></block>
    <block type="check_sell"></block>
    <block type="sell_at_market"></block>
    <block type="sell_price"></block>
  </category>

  <category name="Restart trading conditions" colour="#00796b">
    <block type="after_purchase"></block>
    <block type="trade_again"></block>
    <block type="contract_check_result"></block>
    <block type="read_details"></block>
    <block type="total_profit"></block>
    <block type="total_runs"></block>
  </category>

  <category name="Analysis" colour="#00838f">
    <block type="tick"></block>
    <block type="ticks"></block>
    <block type="last_digit"></block>
    <block type="lastDigitList"></block>
    <block type="ohlc"></block>
    <block type="get_ohlc"></block>
    <block type="stat"></block>
  </category>

  <category name="Utility" colour="#f57c00">
    <block type="notify"></block>
    <block type="notify_telegram"></block>
    <block type="balance"></block>
    <block type="text"></block>
    <block type="text_print"></block>
    <block type="math_number"></block>
    <block type="math_arithmetic"></block>
    <block type="variables_get"></block>
    <block type="variables_set"></block>
  </category>

  <category name="BULK TRADERS Tools" colour="#8e24aa">
    <block type="sma_statement"></block>
    <block type="ema_statement"></block>
    <block type="rsi_statement"></block>
    <block type="macda_statement"></block>
    <block type="bb_statement"></block>
    <block type="set_tp"></block>
    <block type="set_sl"></block>
  </category>
</xml>`;

// ========================================================
// AST EXTRACTOR & CODE GENERATOR FROM BLOCKLY WORKSPACE
// ========================================================
export const exportStrategyFromWorkspace = (
  workspace: Blockly.WorkspaceSvg,
  botName: string = 'DBOT Strategy'
): StrategyAST => {
  const allBlocks = workspace.getAllBlocks(false);

  // Default values
  let symbol = '1HZ100V';
  let contract_type: DerivContractType = 'CALL';
  let duration = 5;
  let duration_unit: DurationUnit = 't';
  let currency = 'USD';
  let initial_stake = 1.0;
  let take_profit = 25.0;
  let stop_loss = 20.0;
  let prediction: number | undefined = undefined;
  let multiplier = 2.0;
  let max_level = 4;
  let reset_on_win = true;
  let max_consecutive_losses = 4;
  let cooldown_seconds = 3;
  let max_trades = 50;
  let max_stake = 50.0;

  // 1. Inspect trade_definition or trade_definition_market
  const marketBlock = allBlocks.find(b => b.type === 'trade_definition_market');
  if (marketBlock) {
    const val = marketBlock.getFieldValue('SYMBOL_LIST');
    if (val) symbol = val;
  }

  // 2. Inspect contract type
  const contractTypeBlock = allBlocks.find(b => b.type === 'trade_definition_contracttype');
  if (contractTypeBlock) {
    const val = contractTypeBlock.getFieldValue('TYPE_LIST');
    if (val && val !== 'both') contract_type = val as DerivContractType;
  }

  // 3. Inspect purchase block
  const purchaseBlock = allBlocks.find(b => b.type === 'purchase' || b.type === 'apollo_purchase');
  if (purchaseBlock) {
    const val = purchaseBlock.getFieldValue('PURCHASE_LIST');
    if (val && val !== 'ACCU') contract_type = val as DerivContractType;
  }

  // 4. Inspect trade options (duration, stake, prediction)
  const tradeOptionsBlock = allBlocks.find(b => b.type === 'trade_definition_tradeoptions');
  if (tradeOptionsBlock) {
    const durType = tradeOptionsBlock.getFieldValue('DURATIONTYPE_LIST');
    if (durType) duration_unit = durType as DurationUnit;

    const curr = tradeOptionsBlock.getFieldValue('CURRENCY_LIST');
    if (curr) currency = curr;

    // Check duration input block
    const durInput = tradeOptionsBlock.getInputTargetBlock('DURATION');
    if (durInput) {
      const durVal = durInput.getFieldValue('NUM');
      if (durVal) duration = parseFloat(durVal) || 5;
    }

    // Check amount input block
    const amtInput = tradeOptionsBlock.getInputTargetBlock('AMOUNT');
    if (amtInput) {
      const amtVal = amtInput.getFieldValue('NUM');
      if (amtVal) initial_stake = parseFloat(amtVal) || 1.0;
    }

    // Check prediction input block
    const predInput = tradeOptionsBlock.getInputTargetBlock('PREDICTION');
    if (predInput) {
      const pVal = predInput.getFieldValue('NUM');
      if (pVal !== undefined && pVal !== null && pVal !== '') {
        prediction = parseInt(pVal, 10);
      }
    }
  }

  // 5. Inspect multiplier trade options
  const multiplierBlock = allBlocks.find(b => b.type === 'trade_definition_multiplier');
  if (multiplierBlock) {
    const multVal = multiplierBlock.getFieldValue('MULTIPLIER');
    if (multVal) multiplier = parseFloat(multVal) || 2.0;
  }

  // 6. Inspect accumulator trade options
  const accumulatorBlock = allBlocks.find(b => b.type === 'trade_definition_accumulator');
  if (accumulatorBlock) {
    const growthRate = accumulatorBlock.getFieldValue('GROWTHRATE_LIST');
    if (growthRate) multiplier = 1 + parseFloat(growthRate);
  }

  // 7. Inspect variables for Stake, Loss, Target Profit
  for (const block of allBlocks) {
    if (block.type === 'variables_set') {
      const varName = block.getField('VAR')?.getText()?.toLowerCase() || '';
      const valBlock = block.getInputTargetBlock('VALUE');
      const valNum = valBlock?.getFieldValue('NUM');
      if (valNum) {
        const parsed = parseFloat(valNum);
        if (varName.includes('stake') && !isNaN(parsed) && parsed > 0) {
          initial_stake = parsed;
        } else if ((varName.includes('target') || varName.includes('tp') || varName.includes('profit')) && !isNaN(parsed)) {
          take_profit = parsed;
        } else if ((varName.includes('loss') || varName.includes('stop') || varName.includes('sl')) && !isNaN(parsed)) {
          stop_loss = parsed;
        }
      }
    }
  }

  // 8. Parse after_purchase blocks for progression settings
  const afterPurchaseBlock = allBlocks.find(b => b.type === 'after_purchase');
  if (afterPurchaseBlock) {
    const stack = afterPurchaseBlock.getInputTargetBlock('AFTERPURCHASE_STACK');
    if (stack) {
      // Walk the stack to find contract_check_result and trade_again
      let currentBlock = stack;
      while (currentBlock) {
        if (currentBlock.type === 'contract_check_result') {
          const result = currentBlock.getFieldValue('CHECK_RESULT');
          // This is a conditional block, check its children
        }
        // Check for set_tp / set_sl blocks
        if (currentBlock.type === 'set_tp') {
          const tpInput = currentBlock.getInputTargetBlock('AMOUNT');
          if (tpInput) {
            const tpVal = tpInput.getFieldValue('NUM');
            if (tpVal) take_profit = parseFloat(tpVal) || take_profit;
          }
        }
        if (currentBlock.type === 'set_sl') {
          const slInput = currentBlock.getInputTargetBlock('AMOUNT');
          if (slInput) {
            const slVal = slInput.getFieldValue('NUM');
            if (slVal) stop_loss = parseFloat(slVal) || stop_loss;
          }
        }
        currentBlock = currentBlock.getNextBlock();
      }
    }
  }

  // 9. Try to parse progression logic from after_purchase blocks
  // Look for variables_set with multiplier progression logic
  for (const block of allBlocks) {
    if (block.type === 'variables_set') {
      const varName = block.getField('VAR')?.getText()?.toLowerCase() || '';
      if (varName.includes('multiplier') || varName.includes('martingale')) {
        const valBlock = block.getInputTargetBlock('VALUE');
        const valNum = valBlock?.getFieldValue('NUM');
        if (valNum) {
          const parsed = parseFloat(valNum);
          if (!isNaN(parsed) && parsed > 0) multiplier = parsed;
        }
      }
    }
  }

  return {
    id: `bot_${Date.now()}`,
    name: botName,
    description: `Exported from Visual Builder for ${formatSymbolName(symbol)} (${contract_type})`,
    market: {
      symbol,
      contract_type,
      duration,
      duration_unit,
      currency,
      prediction
    },
    entry_conditions: {
      gate: 'AND',
      conditions: [
        {
          id: 'c1',
          leftOperand: { type: 'PRICE' },
          operator: 'GREATER_THAN',
          rightOperand: { type: 'INDICATOR', indicatorName: 'SMA', period: 10 }
        }
      ],
      action: 'BUY'
    },
    risk_management: {
      initial_stake: initial_stake || 1.0,
      max_stake: max_stake || Math.max((initial_stake || 1.0) * 10, 50),
      take_profit: take_profit || 25,
      stop_loss: stop_loss || 20,
      max_consecutive_losses: max_consecutive_losses || 4,
      cooldown_seconds: cooldown_seconds || 3,
      max_trades: max_trades || 50
    },
    progression: {
      type: 'MARTINGALE',
      multiplier: multiplier || 2.0,
      max_level: max_level || 4,
      reset_on_win: reset_on_win !== false
    }
  };
};
