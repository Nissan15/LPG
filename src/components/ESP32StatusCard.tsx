import React from 'react';
import { Cpu, RefreshCw, CheckCircle2, Sliders, WifiOff, ArrowLeft, Database } from 'lucide-react';
import type { ESP32Config, ESP32Status } from '../types/lpg';

interface ESP32StatusCardProps {
  esp32Config: ESP32Config;
  status: ESP32Status;
  onPollNow: () => void;
  onOpenSettings: () => void;
  onSwitchToManual: () => void;
}

export const ESP32StatusCard: React.FC<ESP32StatusCardProps> = ({
  status,
  onPollNow,
  onOpenSettings,
  onSwitchToManual,
}) => {
  // Format the reading's timestamp from the Supabase record
  const formattedReadingTime = status.readingTimestamp
    ? new Date(status.readingTimestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div className="bg-[#131822]/95 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xl mb-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 relative">
            <Cpu className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                <span>ESP32 Hardware Mode</span>
                <span className="text-xs text-slate-400 font-normal hidden sm:inline">(Cloud Stream)</span>
              </h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                status.isConnected
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : status.isPolling
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {status.isConnected
                  ? 'Live Stream Active'
                  : status.isPolling
                  ? 'Syncing Cloud...'
                  : 'Waiting for Data'}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Source:</span>
              <code className="text-emerald-300 font-mono text-[11px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                Supabase public.lpg_readings
              </code>
              <span className="text-[10px] text-slate-500 hidden md:inline">• Realtime Enabled</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPollNow}
            disabled={status.isPolling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 transition-colors shadow-sm"
            title="Fetch latest reading from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status.isPolling ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{status.isPolling ? 'Syncing...' : 'Refresh from Cloud'}</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
            title="Configure Cylinder and Supabase Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={onSwitchToManual}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Manual Mode</span>
          </button>
        </div>
      </div>

      {/* Status Details / Honest Diagnostics */}
      <div className="pt-3">
        {status.isConnected && status.lastReading !== null ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                ESP32 upload received: scale weight is <strong className="font-mono text-white text-sm">{status.lastReading.toFixed(2)} kg</strong>
              </span>
            </div>
            {formattedReadingTime && (
              <span className="text-[11px] text-slate-400 font-mono">
                Latest Reading: <strong className="text-slate-300">{formattedReadingTime}</strong>
              </span>
            )}
          </div>
        ) : status.isPolling ? (
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-400" />
            <span>Checking Supabase public.lpg_readings for latest ESP32 scale weight...</span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <WifiOff className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <span>
                {status.errorMessage || 
                  'No weight readings found in Supabase public.lpg_readings yet. Waiting for your ESP32 to publish scale data.'}
              </span>
            </div>
            <button
              onClick={onSwitchToManual}
              className="text-orange-400 hover:text-orange-300 font-semibold underline text-[11px] shrink-0 self-start sm:self-auto"
            >
              Use Manual Mode Instead
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
