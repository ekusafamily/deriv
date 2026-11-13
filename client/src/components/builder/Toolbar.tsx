// DDBOt Native Toolbar Component (ported directly from DDBOt workspace-group & toolbar architecture)
import React, { useState } from 'react';
import {
  RotateCcw,
  FolderOpen,
  Save,
  AlignLeft,
  LineChart,
  Maximize2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  X
} from 'lucide-react';
import { formatSymbolName } from '../../../../shared/types';

interface ToolbarProps {
  botName: string;
  setBotName: (name: string) => void;
  activeSymbol: string;
  activeContractType: string;
  onReset: () => void;
  onOpenLoadModal: () => void;
  onSaveXml: () => void;
  onSortBlocks: () => void;
  onOpenChart: () => void;
  onZoomToFit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isRunning?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  botName,
  setBotName,
  activeSymbol,
  activeContractType,
  onReset,
  onOpenLoadModal,
  onSaveXml,
  onSortBlocks,
  onOpenChart,
  onZoomToFit,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  isRunning = false
}) => {
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleConfirmReset = () => {
    onReset();
    setShowResetDialog(false);
  };

  return (
    <>
      <div className="h-11 border-b border-slate-800/80 bg-[#0d1324] px-3 flex items-center justify-between z-10 select-none">
        {/* Left Toolbar Icons Group (Matching DDBOt WorkspaceGroup) */}
        <div className="flex items-center gap-1 sm:gap-1.5" data-testid="dt_toolbar_group_btn">
          {/* Reset Workspace */}
          <button
            onClick={() => setShowResetDialog(true)}
            id="db-toolbar__reset-button"
            title="Reset Workspace"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Import / Load Strategy */}
          <button
            onClick={onOpenLoadModal}
            id="db-toolbar__import-button"
            title="Import Native Deriv Bot"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Save / Export XML */}
          <button
            onClick={onSaveXml}
            id="db-toolbar__save-button"
            title="Save / Download XML Bot"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            <Save className="w-3.5 h-3.5 text-blue-400" />
          </button>

          {/* Sort & Align Blocks */}
          <button
            onClick={onSortBlocks}
            id="db-toolbar__sort-button"
            title="Sort Blocks (Align root blocks neatly)"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Live Charts */}
          <button
            onClick={onOpenChart}
            title={`View Live Chart for ${formatSymbolName(activeSymbol)}`}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            <LineChart className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          {/* Zoom to Fit */}
          <button
            onClick={onZoomToFit}
            title="Zoom to Fit"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Undo */}
          <button
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          {/* Redo */}
          <button
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          {/* Zoom In */}
          <button
            onClick={onZoomIn}
            title="Zoom In (+)"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={onZoomOut}
            title="Zoom Out (-)"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Info Chip: Bot Name and Market / Contract Type */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-200 border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none px-1 py-0.5 text-right max-w-[220px]"
            title="Click to rename bot"
          />
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {formatSymbolName(activeSymbol)} • {activeContractType}
          </span>
        </div>
      </div>

      {/* DDBOt Native Reset Confirm Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Reset Workspace?</span>
              </div>
              <button
                onClick={() => setShowResetDialog(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              {isRunning
                ? 'The workspace will be reset to the default strategy and any unsaved changes will be lost. Note: This will not affect your running bot.'
                : 'The workspace will be reset to the default Deriv Bot 4 root blocks. Any unsaved edits will be lost.'}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowResetDialog(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-900/30 transition-colors"
              >
                Reset Strategy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
