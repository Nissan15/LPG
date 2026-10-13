import React from 'react';
import { Flame, Plus, Settings, Cpu, User, Database, Download, Cloud } from 'lucide-react';
import type { OperatingMode } from '../types/lpg';

interface HeaderProps {
  mode: OperatingMode;
  onModeChange: (mode: OperatingMode) => void;
  onOpenAddModal: () => void;
  onOpenSettingsModal: () => void;
  onLoadSampleData: () => void;
  onExportData: () => void;
  hasReadings: boolean;
  isSupabaseConfigured?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  onOpenAddModal,
  onOpenSettingsModal,
  onLoadSampleData,
  onExportData,
  hasReadings,
  isSupabaseConfigured = false,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0c0f14]/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20 text-white font-bold">
              <Flame className="w-5 h-5 text-white animate-pulse" />
              <div className="absolute -inset-0.5 rounded-xl bg-orange-500/30 blur-sm -z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Smart LPG Monitor
                </h1>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v1.0 Live
                </span>
                {isSupabaseConfigured && (
                  <span
                    className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    title="Connected to Supabase PostgreSQL database"
                  >
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    <span>Cloud Synced</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Gas Usage & Depletion Forecaster
              </p>
            </div>
          </div>

          {/* Mobile Quick Action */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenAddModal}
              className="p-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 transition-colors"
              title="Add Reading"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={onOpenSettingsModal}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 sm:gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => onModeChange('manual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                mode === 'manual'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Manual Mode</span>
            </button>
            <button
              onClick={() => onModeChange('esp32')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                mode === 'esp32'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-orange-400" />
              <span>ESP32 Hardware</span>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            </button>
          </div>

          {/* Quick Actions (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center gap-2">
            {!hasReadings && (
              <button
                onClick={onLoadSampleData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
                title="Load sample dataset to evaluate charts and forecaster"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Demo Data</span>
              </button>
            )}

            {hasReadings && (
              <button
                onClick={onExportData}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all"
                title="Export JSON Backup"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden lg:inline">Export</span>
              </button>
            )}

            <button
              onClick={onOpenSettingsModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 hover:text-white transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Log Reading</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
