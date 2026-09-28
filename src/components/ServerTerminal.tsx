import React, { useState } from 'react';
import { Terminal, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';
import { SystemLog } from '../types';

interface ServerTerminalProps {
  logs: SystemLog[];
  onRefresh: () => void;
  onResetDb: () => void;
}

export default function ServerTerminal({ logs, onRefresh, onResetDb }: ServerTerminalProps) {
  const [clearing, setClearing] = useState(false);

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'SUCCESS':
        return 'text-emerald-400 font-bold';
      case 'WARN':
        return 'text-amber-400 font-bold';
      case 'ERROR':
        return 'text-rose-400 font-bold';
      default:
        return 'text-indigo-400 font-bold';
    }
  };

  const handleResetClick = () => {
    if (window.confirm('WARNING: Are you sure you want to reset the Asset Database? This will restore original seed CPUs and clear custom scan history.')) {
      onResetDb();
    }
  };

  return (
    <div className="space-y-4" id="terminal-section">
      {/* Admin Panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">System Administration Desk</h3>
          <p className="text-xs text-gray-500 mt-1">Manage database records, inspect background synchronization logs, or clear tracking history.</p>
        </div>

        <button
          onClick={handleResetClick}
          className="inline-flex items-center justify-center px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          Reset Custody Database
        </button>
      </div>

      {/* Terminal View */}
      <div className="bg-slate-950 rounded-xl border border-slate-900 p-5 font-mono text-xs text-slate-300 shadow-xl overflow-hidden flex flex-col h-[520px]">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wide">Live Asset Custody Console Engine</span>
          </div>

          <button
            onClick={onRefresh}
            className="text-slate-400 hover:text-white flex items-center transition-colors font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh Log Feed
          </button>
        </div>

        {/* Console logs */}
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin text-slate-300 pr-2">
          {logs.length === 0 ? (
            <p className="text-slate-500 italic">No system logs loaded. Generate activity inside other panels first.</p>
          ) : (
            [...logs].reverse().map((log) => (
              <div key={log.id} className="hover:bg-slate-900/40 p-1 rounded transition-colors flex items-start space-x-2">
                <span className="text-slate-600 font-bold">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className={getLevelColor(log.level)}>{log.level.toUpperCase()}:</span>
                <span className="text-slate-200 leading-relaxed flex-1">{log.message}</span>
              </div>
            ))
          )}
        </div>

        {/* Terminal Footer */}
        <div className="border-t border-slate-900 pt-3 mt-4 text-[10px] text-slate-500 flex justify-between items-center">
          <span>Active Session Terminal Stream</span>
          <span className="flex items-center text-emerald-500 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            LOGS STREAMING
          </span>
        </div>
      </div>
    </div>
  );
}
