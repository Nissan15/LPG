import React from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronRight, X } from 'lucide-react';
import type { CylinderConfig, ForecastResult } from '../types/lpg';

interface AlertBannerProps {
  forecast: ForecastResult;
  config: CylinderConfig;
  onOpenSettings: () => void;
  onOpenAddModal: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  forecast,
  config,
  onOpenSettings,
  onOpenAddModal,
}) => {
  const [dismissedAlerts, setDismissedAlerts] = React.useState<Record<string, boolean>>({});

  const dismissAlert = (key: string) => {
    setDismissedAlerts(prev => ({ ...prev, [key]: true }));
  };

  const alerts: {
    key: string;
    type: 'critical' | 'warning' | 'info';
    icon: React.ReactNode;
    title: string;
    message: string;
    action?: { label: string; onClick: () => void };
  }[] = [];

  // Check 1: Tare weight configuration issue
  if (forecast.currentTotalWeightKg > 0 && forecast.currentTotalWeightKg < config.tareWeightKg) {
    alerts.push({
      key: 'tare_mismatch',
      type: 'critical',
      icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
      title: 'Weight Reading Below Tare Weight',
      message: `Current scale weight (${forecast.currentTotalWeightKg} kg) is lower than configured empty cylinder tare weight (${config.tareWeightKg} kg). Please verify your tare weight setting or scale calibration.`,
      action: {
        label: 'Adjust Tare Weight',
        onClick: onOpenSettings,
      },
    });
  }

  // Check 2: Critical Gas Warning (< 10%)
  else if (forecast.remainingPercent > 0 && forecast.remainingPercent <= config.criticalGasThresholdPercent) {
    alerts.push({
      key: 'critical_gas',
      type: 'critical',
      icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0 animate-bounce" />,
      title: 'CRITICAL: Gas Level Extremely Low!',
      message: `Only ${forecast.remainingGasKg} kg (${forecast.remainingPercent}%) LPG remaining. Cylinder will deplete shortly. Book a replacement immediately.`,
      action: forecast.estimatedDaysRemaining !== null ? undefined : {
        label: 'Log New Reading',
        onClick: onOpenAddModal,
      },
    });
  }

  // Check 3: Low Gas Warning (< 20%)
  else if (forecast.remainingPercent > 0 && forecast.remainingPercent <= config.lowGasThresholdPercent) {
    alerts.push({
      key: 'low_gas',
      type: 'warning',
      icon: <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />,
      title: 'Low Gas Warning',
      message: `Gas level is below ${config.lowGasThresholdPercent}% (${forecast.remainingGasKg} kg / ${forecast.remainingPercent}% remaining). Keep a backup cylinder ready.`,
    });
  }

  // Check 4: Depletion Approaching Warning (e.g. <= 3 days left)
  if (
    forecast.status === 'ready' &&
    forecast.estimatedDaysRemaining !== null &&
    forecast.estimatedDaysRemaining <= config.depletionWarningDays &&
    forecast.remainingPercent > 0
  ) {
    alerts.push({
      key: 'approaching_depletion',
      type: 'warning',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      title: 'Approaching Depletion Forecaster Alert',
      message: `Estimated exhaustion in approx. ${forecast.estimatedDaysRemaining} day${forecast.estimatedDaysRemaining === 1 ? '' : 's'} and ${forecast.estimatedHoursRemaining || 0} hours (Target date: ${forecast.predictedDepletionDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}).`,
    });
  }

  // Check 5: Insufficient data notice
  if (forecast.status === 'insufficient_data') {
    alerts.push({
      key: 'insufficient_data',
      type: 'info',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
      title: 'Usage Forecast: Collecting Data',
      message: forecast.statusMessage,
      action: {
        label: 'Log Reading Now',
        onClick: onOpenAddModal,
      },
    });
  }

  const visibleAlerts = alerts.filter(a => !dismissedAlerts[a.key]);

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2.5 mb-6">
      {visibleAlerts.map(alert => {
        const bgStyles = {
          critical: 'bg-red-950/40 border-red-500/40 text-red-200 shadow-red-950/20',
          warning: 'bg-orange-950/40 border-orange-500/40 text-orange-200 shadow-orange-950/20',
          info: 'bg-slate-900/80 border-slate-700 text-slate-300 shadow-slate-950/20',
        }[alert.type];

        const titleStyles = {
          critical: 'text-red-300',
          warning: 'text-orange-300',
          info: 'text-sky-300',
        }[alert.type];

        return (
          <div
            key={alert.key}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border backdrop-blur-md shadow-lg transition-all ${bgStyles}`}
          >
            <div className="flex items-start gap-3">
              {alert.icon}
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold tracking-wide ${titleStyles}`}>
                    {alert.title}
                  </span>
                </div>
                <p className="text-xs sm:text-sm mt-0.5 opacity-90 leading-relaxed text-slate-300">
                  {alert.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {alert.action && (
                <button
                  onClick={alert.action.onClick}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-all hover:scale-105"
                >
                  <span>{alert.action.label}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => dismissAlert(alert.key)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Dismiss Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
