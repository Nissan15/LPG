import React from 'react';
import { Cpu, RefreshCw, CheckCircle2, Sliders, WifiOff, ArrowLeft } from 'lucide-react';
import type { ESP32Config, ESP32Status } from '../types/lpg';

interface ESP32StatusCardProps {
  esp32Config: ESP32Config;
  status: ESP32Status;
  onPollNow: () => void;
  onOpenSettings: () => void;
  onSwitchToManual: () => void;
}

export const ESP32StatusCard: React.FC<ESP32StatusCardProps> = ({
  esp32Config,
  status,
  onPollNow,
  onOpenSettings,
  onSwitchToManual,
}) => {
  return (
    <div className="bg-[#131822]/95 border border-orange-500/30 rounded-2xl p-4 sm:p-5 shadow-xl mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30 relative">
            <Cpu className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                ESP32 Hardware Mode Active
              </h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                status.isConnected
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {status.isConnected ? 'Connected' : 'Standby / Polling'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Target Endpoint: <code className="text-orange-300 font-mono text-[11px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{esp32Config.endpointUrl}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPollNow}
            disabled={status.isPolling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status.isPolling ? 'animate-spin text-orange-400' : ''}`} />
            <span>{status.isPolling ? 'Polling Hardware...' : 'Poll Sensor Now'}</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
            title="Configure ESP32 Endpoint"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={onSwitchToManual}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Manual</span>
          </button>
        </div>
      </div>

      <div className="pt-3">
        {status.isConnected ? (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Hardware verified! Last scale reading received: <strong className="font-mono text-white">{status.lastReading} kg</strong> ({status.lastChecked})
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <WifiOff className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <span>
                {status.errorMessage || 
                  'No physical ESP32 response detected yet. Ensure your ESP32 load cell scale is powered on your local Wi-Fi, or switch to Manual Mode to enter readings directly.'}
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
