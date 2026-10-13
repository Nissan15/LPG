import React from 'react';
import { Scale, Flame, Zap, Clock, HelpCircle, Edit3 } from 'lucide-react';
import type { CylinderConfig, ForecastResult } from '../types/lpg';
import { formatDaysAndHours } from '../utils/calculations';

interface OverviewCardsProps {
  forecast: ForecastResult;
  config: CylinderConfig;
  onOpenSettings: () => void;
  readingTimestamp?: string | null;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  forecast,
  config,
  onOpenSettings,
  readingTimestamp,
}) => {
  const getStatusColor = (percent: number) => {
    if (percent <= config.criticalGasThresholdPercent) {
      return {
        text: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        bar: 'bg-red-500',
        glow: 'shadow-red-500/20',
      };
    }
    if (percent <= config.lowGasThresholdPercent) {
      return {
        text: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        bar: 'bg-orange-500',
        glow: 'shadow-orange-500/20',
      };
    }
    return {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      bar: 'bg-emerald-500',
      glow: 'shadow-emerald-500/20',
    };
  };

  const statusColors = getStatusColor(forecast.remainingPercent);

  // Format reading timestamp if provided
  const formattedTime = readingTimestamp
    ? new Date(readingTimestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* CARD 1: Current Scale Weight */}
      <div className="relative group bg-[#131822]/90 hover:bg-[#151c29] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition-all duration-300 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Total Scale Weight
            </span>
            {formattedTime && (
              <span className="text-[10px] text-emerald-400 font-mono block mt-0.5" title={`Reading timestamp: ${readingTimestamp}`}>
                Live: {formattedTime}
              </span>
            )}
          </div>
          <div className="p-2 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700/50">
            <Scale className="w-4 h-4 text-slate-300" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
            {forecast.currentTotalWeightKg.toFixed(2)}
          </span>
          <span className="text-sm font-semibold text-slate-400">kg</span>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            Tare: <strong className="text-slate-300 font-mono">{config.tareWeightKg} kg</strong>
          </span>
          <button
            onClick={onOpenSettings}
            className="text-[11px] font-medium text-orange-400 hover:text-orange-300 flex items-center gap-1 hover:underline"
            title="Configure empty cylinder tare weight"
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit Tare</span>
          </button>
        </div>
      </div>

      {/* CARD 2: Remaining Gas (Net) */}
      <div className="relative group bg-[#131822]/90 hover:bg-[#151c29] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition-all duration-300 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Remaining LPG
          </span>
          <div className={`p-2 rounded-xl ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}>
            <Flame className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2 mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
              {forecast.remainingGasKg.toFixed(2)}
            </span>
            <span className="text-sm font-semibold text-slate-400">kg</span>
          </div>
          <span className={`text-sm font-bold font-mono px-2 py-0.5 rounded-full ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}>
            {forecast.remainingPercent}%
          </span>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-700 rounded-full ${statusColors.bar}`}
              style={{ width: `${forecast.remainingPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Empty</span>
            <span>Capacity: {config.capacityKg} kg</span>
          </div>
        </div>
      </div>

      {/* CARD 3: Daily Burn Rate / Consumption */}
      <div className="relative group bg-[#131822]/90 hover:bg-[#151c29] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition-all duration-300 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Average Daily Burn
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        {forecast.status === 'ready' ? (
          <>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {forecast.averageDailyConsumptionKg.toFixed(3)}
              </span>
              <span className="text-sm font-semibold text-slate-400">kg/day</span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Hourly: <strong className="text-slate-300 font-mono">{(forecast.burnRatePerHourKg * 1000).toFixed(1)} g/h</strong></span>
              <span className="text-[11px] text-emerald-400 font-medium">Over {forecast.totalObservedDays}d span</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2 py-1">
              <span className="text-base sm:text-lg font-semibold text-slate-400 italic">
                Collecting usage data
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
              Need ≥ 2 readings with measurable consumption
            </div>
          </>
        )}
      </div>

      {/* CARD 4: Estimated Time Remaining */}
      <div className="relative group bg-[#131822]/90 hover:bg-[#151c29] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition-all duration-300 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Estimated Depletion
          </span>
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {forecast.status === 'ready' && forecast.estimatedDaysRemaining !== null ? (
          <>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {formatDaysAndHours(forecast.estimatedDaysRemaining, forecast.estimatedHoursRemaining)}
              </span>
              <span className="text-xs font-semibold text-slate-400 uppercase">left</span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 truncate" title={forecast.predictedDepletionDate?.toLocaleString()}>
                Target: <strong className="text-slate-300">{forecast.predictedDepletionDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong>
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {forecast.confidence} Conf.
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2 py-1">
              <span className="text-base sm:text-lg font-semibold text-slate-400 italic">
                Collecting usage data
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              <span>Awaiting sufficient readings</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
