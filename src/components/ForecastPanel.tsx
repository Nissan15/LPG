import React, { useState } from 'react';
import { Calendar, Clock, TrendingDown, HelpCircle, RefreshCw, X } from 'lucide-react';
import type { CylinderConfig, ForecastResult } from '../types/lpg';

interface ForecastPanelProps {
  forecast: ForecastResult;
  config: CylinderConfig;
  onOpenAddModal: () => void;
}

export const ForecastPanel: React.FC<ForecastPanelProps> = ({
  forecast,
  config,
  onOpenAddModal,
}) => {
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const isReady = forecast.status === 'ready' && forecast.estimatedDaysRemaining !== null;

  return (
    <div className="bg-[#131822]/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>Depletion Forecast Engine</span>
          </h2>
          <p className="text-xs text-slate-400">
            Intelligent burn rate & exhaustion prediction
          </p>
        </div>
        <button
          onClick={() => setShowFormulaModal(true)}
          className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-colors"
          title="Inspect calculation method"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Formula Details</span>
        </button>
      </div>

      {/* Main Body */}
      {isReady ? (
        <div className="space-y-4 my-auto">
          {/* Main Countdown Display */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900/90 to-slate-900/50 border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
              <span>Time Until Depletion</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                forecast.confidence === 'High' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {forecast.confidence} Confidence
              </span>
            </div>

            <div className="flex items-baseline gap-3 my-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                {forecast.estimatedDaysRemaining}
              </span>
              <span className="text-sm font-semibold text-slate-400">days</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                {forecast.estimatedHoursRemaining}
              </span>
              <span className="text-sm font-semibold text-slate-400">hours</span>
            </div>

            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
              <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>
                Expected Empty Date:{' '}
                <strong className="text-slate-200">
                  {forecast.predictedDepletionDate?.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </strong>
              </span>
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <TrendingDown className="w-3 h-3 text-orange-400" />
                <span>Burn Velocity</span>
              </div>
              <div className="text-base font-bold text-white font-mono">
                {forecast.averageDailyConsumptionKg.toFixed(3)} <span className="text-xs font-normal text-slate-400">kg/day</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                ≈ {(forecast.burnRatePerHourKg * 1000).toFixed(1)} g/hr
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>Observed Window</span>
              </div>
              <div className="text-base font-bold text-white font-mono">
                {forecast.totalObservedDays} <span className="text-xs font-normal text-slate-400">days</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Across {forecast.validIntervalCount + 1} logged points
              </div>
            </div>
          </div>

          {forecast.refillDetected && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Cylinder refill detected. Forecasting based on current cylinder cycle.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center my-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 text-orange-400 mx-auto flex items-center justify-center">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Collecting Usage Data</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {forecast.statusMessage}
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20"
          >
            <span>Log a Reading</span>
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span>Cylinder: {config.capacityKg} kg LPG</span>
        <span>Tare: {config.tareWeightKg} kg</span>
      </div>

      {/* Formula Explanation Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#151c29] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowFormulaModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span>Scientific Depletion Forecaster Math</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Real-world, honest mathematical modeling without fabricated numbers.
            </p>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-semibold text-orange-400 block mb-1">1. Remaining LPG Gas</span>
                <code className="text-slate-200 font-mono text-[11px] block bg-slate-950 p-2 rounded">
                  Remaining LPG = Current Total Weight - Empty Cylinder (Tare)
                </code>
                <p className="mt-1 text-slate-400 text-[11px]">
                  Current: {forecast.currentTotalWeightKg} kg - {config.tareWeightKg} kg = <strong>{forecast.remainingGasKg} kg</strong>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-semibold text-emerald-400 block mb-1">2. Average Daily Consumption</span>
                <code className="text-slate-200 font-mono text-[11px] block bg-slate-950 p-2 rounded">
                  Avg Daily Rate = Σ (Gas Consumed between readings) / Σ (Elapsed Days)
                </code>
                <p className="mt-1 text-slate-400 text-[11px]">
                  Calculated from timestamp differences between sequential valid scale readings.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-semibold text-sky-400 block mb-1">3. Estimated Depletion & Target Date</span>
                <code className="text-slate-200 font-mono text-[11px] block bg-slate-950 p-2 rounded">
                  Days Remaining = Remaining LPG / Avg Daily Rate
                </code>
                <code className="text-slate-200 font-mono text-[11px] block bg-slate-950 p-2 rounded mt-1">
                  Target Timestamp = Current Time + (Days Remaining × 24 × 3600)
                </code>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
