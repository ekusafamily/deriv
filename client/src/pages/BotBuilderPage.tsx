// DBOT Native Deriv Bot Builder Workspace (DDBOt modular architecture)
import React, { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import {
  initBlocklyBlocks,
  ensureAllBlocksRegistered,
  DERIV_DEFAULT_WORKSPACE_XML,
  exportStrategyFromWorkspace
} from '../components/builder/blockly-custom-blocks';
import { formatSymbolName } from '../../../shared/types';
import { useStore } from '../store/useStore';
import { getSocket } from '../services/socket';
import { MarketChart } from '../components/charts/MarketChart';
import { Toolbox } from '../components/builder/Toolbox';
import { Toolbar } from '../components/builder/Toolbar';
import { RunPanel, TelemetryMetrics, TradeItem, JournalLog } from '../components/builder/RunPanel';
import { QuickStrategyModal, QuickStrategyParams } from '../components/builder/QuickStrategyModal';
import {
  FolderOpen,
  X,
  FileCode,
  Upload,
  Download,
  AlertTriangle,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Sparkles,
  LineChart
} from 'lucide-react';

interface NativeBotItem {
  filename: string;
  name: string;
  sizeBytes: number;
  updatedAt: string;
}

export const BotBuilderPage: React.FC = () => {
  const { activeAccount, wsConnected } = useStore();
  const blocklyDivRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  // Bot Metadata
  const [botName, setBotName] = useState('Native Deriv Strategy Bot');
  const [currentBotId, setCurrentBotId] = useState<string | null>(null);
  const [activeSymbol, setActiveSymbol] = useState('1HZ100V');
  const [activeContractType, setActiveContractType] = useState('CALL');

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [isSlowMode, setIsSlowMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions' | 'journal'>('summary');

  // Telemetry Metrics
  const [metrics, setMetrics] = useState<TelemetryMetrics>({
    totalStake: 0,
    totalPayout: 0,
    numberOfRuns: 0,
    contractsLost: 0,
    contractsWon: 0,
    totalProfitLoss: 0
  });

  // Logs & Trades
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [journalLogs, setJournalLogs] = useState<JournalLog[]>([
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: 'DBOT Deriv Engine initialized. Ready to execute blocks.'
    }
  ]);

  // Modals
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showQuickStrategyModal, setShowQuickStrategyModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [nativeBotsList, setNativeBotsList] = useState<NativeBotItem[]>([]);
  const [isLoadingNativeBots, setIsLoadingNativeBots] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Status Bar State
  const [currentTimeGmt, setCurrentTimeGmt] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Real-time GMT Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const formatted = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} GMT`;
      setCurrentTimeGmt(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch native bots catalog from backend
  const loadNativeBotsCatalog = async () => {
    setIsLoadingNativeBots(true);
    try {
      const resp = await fetch('/api/native-bots');
      if (resp.ok) {
        const data = await resp.json();
        setNativeBotsList(data);
      }
    } catch (e) {
      console.warn('Failed to fetch native bots catalog:', e);
    } finally {
      setIsLoadingNativeBots(false);
    }
  };

  useEffect(() => {
    loadNativeBotsCatalog();
  }, []);

  // Initialize Blockly Workspace
  useEffect(() => {
    initBlocklyBlocks();

    if (blocklyDivRef.current && !workspaceRef.current) {
      const ws = Blockly.inject(blocklyDivRef.current, {
        theme: Blockly.Themes.Classic,
        renderer: 'zelos',
        grid: {
          spacing: 25,
          length: 3,
          colour: '#1e293b',
          snap: true
        },
        zoom: {
          controls: false,
          wheel: true,
          startScale: 0.85,
          maxScale: 2,
          minScale: 0.4,
          scaleSpeed: 1.15
        },
        trashcan: true,
        move: {
          scrollbars: true,
          drag: true,
          wheel: false
        }
      });

      // Load initial Deriv 4 Root Blocks
      try {
        const dom = Blockly.utils.xml.textToDom(DERIV_DEFAULT_WORKSPACE_XML);
        Blockly.Xml.domToWorkspace(dom, ws);
      } catch (err) {
        console.error('Error loading default Deriv blocks:', err);
      }

      workspaceRef.current = ws;

      // Listen to workspace changes
      ws.addChangeListener((e) => {
        if (e.type === Blockly.Events.BLOCK_CHANGE || e.type === Blockly.Events.BLOCK_CREATE) {
          try {
            const ast = exportStrategyFromWorkspace(ws, botName);
            setActiveSymbol(ast.market.symbol);
            setActiveContractType(ast.market.contract_type);
          } catch {
            // ignore during block drag
          }
        }
      });
    }

    return () => {
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      }
    };
  }, []);

  // Socket.IO event listeners for live execution telemetry
  useEffect(() => {
    if (!currentBotId) return;

    const handleBotState = (snapshot: any) => {
      if (!snapshot) return;
      setMetrics((prev) => ({
        ...prev,
        numberOfRuns: snapshot.totalTrades ?? prev.numberOfRuns,
        contractsWon: snapshot.winningTrades ?? prev.contractsWon,
        contractsLost: snapshot.losingTrades ?? prev.contractsLost,
        totalProfitLoss: snapshot.totalProfit ?? prev.totalProfitLoss
      }));

      if (snapshot.logs && Array.isArray(snapshot.logs)) {
        const newLogs: JournalLog[] = snapshot.logs.map((l: any) => ({
          timestamp: new Date(l.timestamp).toLocaleTimeString(),
          level: l.level || 'INFO',
          message: l.message
        }));
        setJournalLogs(newLogs);
      }
    };

    const handleTradeUpdate = (data: any) => {
      if (!data) return;
      const newTrade: TradeItem = {
        id: data.id || Math.random().toString(36).substring(7),
        time: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
        symbol: data.symbol || activeSymbol,
        contractType: data.contractType || activeContractType,
        status: data.status === 'WON' ? 'WON' : data.status === 'LOST' ? 'LOST' : 'PENDING',
        profit: data.profit || 0
      };

      setTrades((prev) => [newTrade, ...prev.slice(0, 49)]);

      setMetrics((prev) => {
        const totalStake = prev.totalStake + (data.stake || 0);
        const totalPayout = prev.totalPayout + (data.payout || 0);
        const numberOfRuns = prev.numberOfRuns + 1;
        const contractsWon = data.status === 'WON' ? prev.contractsWon + 1 : prev.contractsWon;
        const contractsLost = data.status === 'LOST' ? prev.contractsLost + 1 : prev.contractsLost;
        const totalProfitLoss = prev.totalProfitLoss + (data.profit || 0);

        return {
          totalStake,
          totalPayout,
          numberOfRuns,
          contractsWon,
          contractsLost,
          totalProfitLoss
        };
      });

      setJournalLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          level: data.status === 'WON' ? 'SUCCESS' : 'ERROR',
          message: `Contract ${data.status}: ${data.contractType} on ${formatSymbolName(data.symbol)} | Profit: ${(data.profit || 0).toFixed(2)} USD`
        },
        ...prev
      ]);
    };

    const socket = getSocket();
    if (socket) {
      socket.on(`bot:state:${currentBotId}`, handleBotState);
      socket.on(`bot:trade:${currentBotId}`, handleTradeUpdate);
    }

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off(`bot:state:${currentBotId}`, handleBotState);
        socket.off(`bot:trade:${currentBotId}`, handleTradeUpdate);
      }
    };
  }, [currentBotId, activeSymbol, activeContractType]);

  // Load Native Deriv Bot from catalog
  const handleLoadNativeBot = async (filename: string, botTitle: string) => {
    if (!workspaceRef.current) return;
    try {
      const resp = await fetch(`/api/native-bots/${encodeURIComponent(filename)}`);
      if (!resp.ok) throw new Error('Could not retrieve strategy XML from server');
      const xmlText = await resp.text();

      ensureAllBlocksRegistered(xmlText);
      workspaceRef.current.clear();
      const dom = Blockly.utils.xml.textToDom(xmlText);
      Blockly.Xml.domToWorkspace(dom, workspaceRef.current);

      setBotName(botTitle);
      setShowLoadModal(false);
      setJournalLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'SUCCESS',
          message: `Successfully loaded native bot "${botTitle}" into workspace.`
        },
        ...prev
      ]);
    } catch (err: any) {
      alert(`Error loading bot: ${err.message}`);
    }
  };

  // Upload Local XML file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceRef.current) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const xmlText = event.target?.result as string;
        ensureAllBlocksRegistered(xmlText);
        workspaceRef.current?.clear();
        const dom = Blockly.utils.xml.textToDom(xmlText);
        Blockly.Xml.domToWorkspace(dom, workspaceRef.current!);
        const cleanName = file.name.replace(/\.xml$/i, '');
        setBotName(cleanName);
        setShowLoadModal(false);
        setJournalLogs((prev) => [
          {
            timestamp: new Date().toLocaleTimeString(),
            level: 'SUCCESS',
            message: `Imported XML bot "${file.name}".`
          },
          ...prev
        ]);
      } catch (err: any) {
        alert(`Failed to parse XML file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Save / Export XML to Disk
  const handleSaveXml = () => {
    if (!workspaceRef.current) return;
    try {
      const dom = Blockly.Xml.workspaceToDom(workspaceRef.current);
      const xmlText = Blockly.Xml.domToPrettyText(dom);
      const blob = new Blob([xmlText], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${botName.replace(/\s+/g, '_')}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export error: ${e.message}`);
    }
  };

  // Reset to default 4 Deriv root blocks
  const handleResetWorkspace = () => {
    if (!workspaceRef.current) return;
    workspaceRef.current.clear();
    const dom = Blockly.utils.xml.textToDom(DERIV_DEFAULT_WORKSPACE_XML);
    Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
    setBotName('Native Deriv Strategy Bot');
    setJournalLogs((prev) => [
      {
        timestamp: new Date().toLocaleTimeString(),
        level: 'INFO',
        message: 'Workspace reset to canonical Deriv 4 Root Blocks.'
      },
      ...prev
    ]);
  };

  // Sort and Align the 4 Root Blocks Neatly
  const handleSortBlocks = () => {
    if (!workspaceRef.current) return;
    const blocks = workspaceRef.current.getTopBlocks(false);
    for (const b of blocks) {
      if (b.type === 'trade_definition') {
        b.moveTo(new Blockly.utils.Coordinate(20, 20));
      } else if (b.type === 'during_purchase') {
        b.moveTo(new Blockly.utils.Coordinate(680, 20));
      } else if (b.type === 'after_purchase') {
        b.moveTo(new Blockly.utils.Coordinate(680, 190));
      } else if (b.type === 'before_purchase') {
        b.moveTo(new Blockly.utils.Coordinate(20, 520));
      }
    }
  };

  // Start or Stop Bot Execution
  const handleToggleRun = async () => {
    if (isRunning) {
      try {
        if (currentBotId) {
          await fetch(`/api/bots/${currentBotId}/stop`, { method: 'POST' });
        }
        setIsRunning(false);
        setJournalLogs((prev) => [
          {
            timestamp: new Date().toLocaleTimeString(),
            level: 'WARN',
            message: `Bot "${botName}" stopped by user.`
          },
          ...prev
        ]);
      } catch (e) {
        console.error(e);
      }
    } else {
      if (!workspaceRef.current) return;
      try {
        const strategyAst = exportStrategyFromWorkspace(workspaceRef.current, botName);

        const createResp = await fetch('/api/bots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: botName,
            description: `Generated from Bot Builder on ${new Date().toLocaleDateString()}`,
            symbol: strategyAst.market.symbol,
            contractType: strategyAst.market.contract_type,
            strategyAst: JSON.stringify(strategyAst),
            workspaceXml: Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspaceRef.current))
          })
        });

        const botData = await createResp.json();
        if (!createResp.ok) throw new Error(botData.error || 'Failed to initialize bot');
        const botId = botData.id;
        setCurrentBotId(botId);

        const startResp = await fetch(`/api/bots/${botId}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runMode: activeAccount?.isVirtual === false ? 'LIVE_REAL' : 'PAPER',
            accountId: activeAccount?.accountId
          })
        });

        const startData = await startResp.json();
        if (!startResp.ok) throw new Error(startData.error || 'Failed to start execution');

        getSocket()?.emit('subscribe:bot', botId);

        setIsRunning(true);
        setActiveTab('summary');
        setJournalLogs((prev) => [
          {
            timestamp: new Date().toLocaleTimeString(),
            level: 'SUCCESS',
            message: `Bot "${botName}" started in ${activeAccount?.isVirtual === false ? 'REAL MONEY' : 'PAPER TRADING'} mode.`
          },
          ...prev
        ]);
      } catch (err: any) {
        alert(`Failed to start bot: ${err.message}`);
      }
    }
  };

  // Apply Quick Strategy from Modal
  const handleApplyQuickStrategy = async (params: QuickStrategyParams, xmlString: string) => {
    if (!workspaceRef.current) return;
    try {
      ensureAllBlocksRegistered(xmlString);
      workspaceRef.current.clear();
      const dom = Blockly.utils.xml.textToDom(xmlString);
      Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
      handleSortBlocks();
      setBotName(`Quick ${params.strategy.toUpperCase()}`);
      setActiveSymbol(params.symbol);
      setJournalLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'SUCCESS',
          message: `Generated Quick Strategy "${params.strategy.toUpperCase()}" with ${params.stake} USD base stake on ${formatSymbolName(params.symbol)}.`
        },
        ...prev
      ]);
    } catch (e: any) {
      alert(`Error loading quick strategy: ${e.message}`);
    }
  };

  // AI Strategy Generator
  const handleGenerateAiBot = async (customPrompt?: string) => {
    setIsAiGenerating(true);
    const promptToUse = customPrompt || aiPrompt;
    try {
      const nativeCandidate = nativeBotsList.find((b) => {
        if (/speed/i.test(promptToUse) && /speed/i.test(b.name)) return true;
        if (/digit|differ/i.test(promptToUse) && /differ|even/i.test(b.name)) return true;
        if (/accumulator/i.test(promptToUse) && /accumulator/i.test(b.name)) return true;
        return false;
      }) || nativeBotsList[0];

      if (nativeCandidate) {
        await handleLoadNativeBot(nativeCandidate.filename, `AI: ${nativeCandidate.name}`);
      }

      setShowAiModal(false);
      setAiPrompt('');
      setJournalLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'SUCCESS',
          message: `AI Bot Generator synthesized strategy for: "${promptToUse}"`
        },
        ...prev
      ]);
    } catch (e: any) {
      alert(`AI Generation error: ${e.message}`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Quick Block Insertion from Toolbox
  const handleInsertBlock = (blockType: string) => {
    if (!workspaceRef.current) return;
    try {
      const ws = workspaceRef.current;
      const block = ws.newBlock(blockType);
      block.initSvg();
      block.render();

      // Safely compute view position in workspace coordinates
      let x = 120;
      let y = 120;
      try {
        const metrics = ws.getMetrics();
        if (metrics) {
          const scale = ws.scale || 1;
          x = (metrics.viewLeft || 0) + 60;
          y = (metrics.viewTop || 0) + 60;
        }
      } catch {
        // Fallback to default offset
        x = 120;
        y = 120;
      }

      block.moveTo(new Blockly.utils.Coordinate(x, y));
      block.select();
    } catch (e: any) {
      console.warn('Block insertion notice:', e.message);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-[#0a0f1d] text-slate-100 font-sans selection:bg-amber-500/30">
      {/* ======================================================== */}
      {/* MAIN 3-COLUMN WORKSPACE: LEFT BLOCKS | CANVAS | RUN PANEL */}
      {/* ======================================================== */}
      <div className="flex flex-1 w-full h-[calc(100%-36px)] overflow-hidden relative">
        {/* Left Column: Modular Toolbox Sidebar */}
        <Toolbox
          onInsertBlock={handleInsertBlock}
          onOpenQuickStrategy={() => setShowQuickStrategyModal(true)}
          onOpenAiGenerator={() => setShowAiModal(true)}
        />

        {/* Center Column: Toolbar & Blockly Canvas */}
        <section className="flex-1 min-w-0 flex flex-col h-full bg-[#0a0f1d] relative overflow-hidden">
          <Toolbar
            botName={botName}
            setBotName={setBotName}
            activeSymbol={activeSymbol}
            activeContractType={activeContractType}
            onReset={handleResetWorkspace}
            onOpenLoadModal={() => setShowLoadModal(true)}
            onSaveXml={handleSaveXml}
            onSortBlocks={handleSortBlocks}
            onOpenChart={() => setShowChartModal(true)}
            onZoomToFit={() => workspaceRef.current?.zoomToFit()}
            onUndo={() => workspaceRef.current?.undo(false)}
            onRedo={() => workspaceRef.current?.undo(true)}
            onZoomIn={() => workspaceRef.current?.zoom(1)}
            onZoomOut={() => workspaceRef.current?.zoom(-1)}
            isRunning={isRunning}
          />

          {/* Blockly Workspace Container */}
          <div className="flex-1 w-full h-full relative" ref={blocklyDivRef} />
        </section>

        {/* Right Column: Modular Run Panel */}
        <RunPanel
          isRunning={isRunning}
          onToggleRun={handleToggleRun}
          isSlowMode={isSlowMode}
          onToggleSlowMode={() => setIsSlowMode(!isSlowMode)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          metrics={metrics}
          onResetMetrics={() =>
            setMetrics({
              totalStake: 0,
              totalPayout: 0,
              numberOfRuns: 0,
              contractsLost: 0,
              contractsWon: 0,
              totalProfitLoss: 0
            })
          }
          trades={trades}
          journalLogs={journalLogs}
          isVirtualAccount={activeAccount?.isVirtual !== false}
          onOpenAiModal={() => setShowAiModal(true)}
        />
      </div>

      {/* ======================================================== */}
      {/* BOTTOM STATUS BAR */}
      {/* ======================================================== */}
      <footer className="h-9 border-t border-slate-800/80 bg-[#090d18] px-4 flex items-center justify-between text-xs text-slate-400 z-30 select-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-medium text-slate-300">
            {wsConnected ? 'Deriv Engine Connected' : 'Deriv Offline (Simulated Fallback)'}
          </span>
        </div>

        <div className="hidden sm:block font-mono text-[11px] text-slate-400">
          {currentTimeGmt}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className="p-1 hover:text-white transition-colors"
            title="Theme Toggle"
          >
            {isDarkTheme ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <span className="text-[11px] flex items-center gap-1 font-semibold text-slate-300">
            <span>🇬🇧</span> EN
          </span>

          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                setIsFullscreen(true);
              } else {
                document.exitFullscreen();
                setIsFullscreen(false);
              }
            }}
            className="p-1 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <a
            href="/help"
            className="text-[11px] text-slate-400 hover:text-amber-400 transition-colors hidden md:inline"
          >
            About this platform
          </a>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* QUICK STRATEGY MODAL */}
      {/* ======================================================== */}
      <QuickStrategyModal
        isOpen={showQuickStrategyModal}
        onClose={() => setShowQuickStrategyModal(false)}
        onApplyStrategy={handleApplyQuickStrategy}
      />

      {/* ======================================================== */}
      {/* MODAL 1: LOAD NATIVE DERIV BOTS & UPLOAD XML */}
      {/* ======================================================== */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-amber-400" />
                Import Native Deriv Bot Strategy
              </h2>
              <button
                onClick={() => setShowLoadModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Area */}
            <div className="mt-4 p-4 border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl bg-slate-900/50 flex flex-col items-center justify-center text-center transition-colors">
              <Upload className="w-8 h-8 text-amber-400 mb-2" />
              <p className="text-xs font-bold text-slate-200">
                Upload XML Strategy file from your device
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports Deriv Bot 2.0 XML and Binary Bot legacy XML files
              </p>
              <label className="mt-3 cursor-pointer px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide shadow-md transition-all">
                <span>Browse XML File</span>
                <input
                  type="file"
                  accept=".xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Native Pre-built Bots Library */}
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Pre-built Deriv Bot Library ({nativeBotsList.length} Available)
              </p>
              {isLoadingNativeBots ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Loading bots catalog...
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {nativeBotsList.map((bot) => (
                    <div
                      key={bot.filename}
                      className="p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-200">{bot.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {(bot.sizeBytes / 1024).toFixed(1)} KB • {bot.filename}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleLoadNativeBot(bot.filename, bot.name)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
                      >
                        Load
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: AI BOT GENERATOR */}
      {/* ======================================================== */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-400" />
                AI Bot Generator
              </h2>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-3">
              Describe your algorithmic strategy in natural language. DBOT AI will automatically build and arrange the Deriv blocks for you.
            </p>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g., Create an aggressive Volatility 100 Speed Bot on 1-tick duration predicting digit under 7 with 2.0x Martingale after loss..."
              rows={3}
              className="mt-3 w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
            />

            {/* Quick Prompt Chips */}
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Popular Presets:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '🚀 ALEXSPEEDBOT EXPRO2 (Digit Under)',
                  '📈 SMA Golden Crossover on Vol 100',
                  '⚡ RSI Oversold Mean Reversion',
                  '🎯 Digit Differs High Win Rate',
                  '🛡️ Martingale Progression Guard'
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleGenerateAiBot(preset)}
                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGenerateAiBot()}
                disabled={isAiGenerating || !aiPrompt.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold text-xs tracking-wide shadow-lg shadow-red-900/40 transition-all flex items-center gap-1.5"
              >
                {isAiGenerating ? 'Synthesizing...' : 'Generate & Insert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: QUICK MARKET CHART MODAL */}
      {/* ======================================================== */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-700/80 rounded-2xl max-w-4xl w-full p-5 shadow-2xl relative flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <LineChart className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-black text-slate-100">
                  {formatSymbolName(activeSymbol)} Live Candlestick Chart
                </h2>
              </div>
              <button
                onClick={() => setShowChartModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 mt-3 rounded-xl overflow-hidden border border-slate-800 bg-[#070b14]">
              <MarketChart symbol={activeSymbol} height={420} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default BotBuilderPage;
