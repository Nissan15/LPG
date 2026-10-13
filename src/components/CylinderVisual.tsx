import React from 'react';
import { Sliders } from 'lucide-react';
import type { CylinderConfig, ForecastResult } from '../types/lpg';

interface CylinderVisualProps {
  forecast: ForecastResult;
  config: CylinderConfig;
  onOpenSettings: () => void;
}

export const CylinderVisual: React.FC<CylinderVisualProps> = ({
  forecast,
  config,
  onOpenSettings,
}) => {
  const percent = Math.min(100, Math.max(0, forecast.remainingPercent));

  // Determine liquid fill gradient colors based on remaining percentage
  const getFillColors = () => {
    if (percent <= config.criticalGasThresholdPercent) {
      return {
        fillGradientStart: '#ef4444',
        fillGradientEnd: '#991b1b',
        statusBadge: 'Critical Empty',
        badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
      };
    }
    if (percent <= config.lowGasThresholdPercent) {
      return {
        fillGradientStart: '#f97316',
        fillGradientEnd: '#c2410c',
        statusBadge: 'Low Reserve',
        badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      };
    }
    return {
      fillGradientStart: '#10b981',
      fillGradientEnd: '#047857',
      statusBadge: 'Adequate Gas',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    };
  };

  const colors = getFillColors();

  return (
    <div className="bg-[#131822]/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>Cylinder Level Indicator</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time physical volumetric fill
          </p>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${colors.badgeClass}`}>
          {colors.statusBadge}
        </span>
      </div>

      {/* Main Cylinder Visual Graphics */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-2">
        {/* SVG Realistic Cylinder */}
        <div className="relative flex flex-col items-center">
          <svg
            width="170"
            height="320"
            viewBox="0 0 170 320"
            className="drop-shadow-2xl overflow-visible"
          >
            <defs>
              {/* Metallic body gradient */}
              <linearGradient id="cylinderBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1f293d" />
                <stop offset="25%" stopColor="#2e3e5c" />
                <stop offset="50%" stopColor="#3d527a" />
                <stop offset="75%" stopColor="#2e3e5c" />
                <stop offset="100%" stopColor="#192233" />
              </linearGradient>

              {/* Dynamic Gas Liquid Gradient */}
              <linearGradient id="gasLiquidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.fillGradientStart} />
                <stop offset="100%" stopColor={colors.fillGradientEnd} />
              </linearGradient>

              {/* Specular Highlight */}
              <linearGradient id="specularGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.0)" />
                <stop offset="35%" stopColor="rgba(255,255,255,0.15)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.25)" />
                <stop offset="65%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
              </linearGradient>

              {/* Clip path for liquid fill within the main cylinder chamber */}
              <clipPath id="cylinderInsideClip">
                <rect x="25" y="75" width="120" height="200" rx="20" />
              </clipPath>
            </defs>

            {/* Top Collar / Carry Handle */}
            <path
              d="M 50 45 C 50 25, 120 25, 120 45 L 115 75 L 55 75 Z"
              fill="#243046"
              stroke="#3b4d70"
              strokeWidth="2"
            />
            {/* Handle Cutout */}
            <rect x="68" y="40" width="34" height="15" rx="7" fill="#131822" stroke="#3b4d70" strokeWidth="1.5" />

            {/* Valve & Brass Nozzle */}
            <rect x="80" y="24" width="10" height="18" fill="#d97706" rx="2" />
            <circle cx="85" cy="20" r="7" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
            <rect x="83" y="16" width="4" height="4" fill="#fbbf24" />

            {/* Main Outer Cylinder Body */}
            <rect
              x="25"
              y="75"
              width="120"
              height="200"
              rx="20"
              fill="url(#cylinderBodyGrad)"
              stroke="#475569"
              strokeWidth="2"
            />

            {/* Liquid Fill Area */}
            <g clipPath="url(#cylinderInsideClip)">
              <rect x="25" y="75" width="120" height="200" fill="#151d2a" />
              
              <line x1="25" y1="125" x2="45" y2="125" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
              <text x="48" y="128" fill="#64748b" fontSize="8" fontFamily="monospace">75%</text>

              <line x1="25" y1="175" x2="45" y2="175" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
              <text x="48" y="178" fill="#64748b" fontSize="8" fontFamily="monospace">50%</text>

              <line x1="25" y1="225" x2="45" y2="225" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
              <text x="48" y="228" fill="#64748b" fontSize="8" fontFamily="monospace">25%</text>

              {/* Liquid Rect */}
              <rect
                x="25"
                y={75 + (200 - (200 * percent) / 100)}
                width="120"
                height={(200 * percent) / 100}
                fill="url(#gasLiquidGrad)"
                className="transition-all duration-700 ease-out"
              />

              {/* Liquid Wave / Surface Meniscus */}
              {percent > 0 && (
                <ellipse
                  cx="85"
                  cy={75 + (200 - (200 * percent) / 100)}
                  rx="60"
                  ry="5"
                  fill={colors.fillGradientStart}
                  opacity="0.8"
                />
              )}

              {/* Glass / Metallic Specular Shine */}
              <rect x="25" y="75" width="120" height="200" fill="url(#specularGlow)" />
            </g>

            {/* Middle Weld Bead Ring */}
            <line x1="25" y1="175" x2="145" y2="175" stroke="#4b5563" strokeWidth="1.5" opacity="0.6" />

            {/* Bottom Support Ring Base Foot */}
            <path
              d="M 40 270 L 35 295 C 35 302, 135 302, 135 295 L 130 270 Z"
              fill="#1e293b"
              stroke="#3b4d70"
              strokeWidth="2"
            />
            <rect x="60" y="280" width="50" height="6" rx="3" fill="#0f172a" />

            {/* Glowing Accent Point on fill level */}
            {percent > 0 && (
              <circle
                cx="145"
                cy={75 + (200 - (200 * percent) / 100)}
                r="4"
                fill={colors.fillGradientStart}
                className="animate-ping"
                opacity="0.7"
              />
            )}
          </svg>

          {/* Value Floating Overlay */}
          <div className="absolute top-[165px] flex flex-col items-center pointer-events-none">
            <span className="text-2xl font-black text-white font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {percent}%
            </span>
            <span className="text-xs font-semibold text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {forecast.remainingGasKg.toFixed(2)} kg
            </span>
          </div>
        </div>

        {/* Breakdown Stats & Legend */}
        <div className="flex-1 w-full space-y-3.5">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Net LPG Gas</span>
              <span className="font-semibold text-white font-mono">{forecast.remainingGasKg.toFixed(2)} kg</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Empty Tare Weight</span>
              <span className="font-semibold text-slate-300 font-mono">{config.tareWeightKg.toFixed(2)} kg</span>
            </div>
            <div className="h-px bg-slate-800 my-1.5" />
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span>Gross Scale Weight</span>
              <span className="text-orange-400 font-mono">{forecast.currentTotalWeightKg.toFixed(2)} kg</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Full Capacity</span>
              <span className="font-bold text-white font-mono text-sm">{config.capacityKg} kg</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Consumed Gas</span>
              <span className="font-bold text-slate-300 font-mono text-sm">
                {Math.max(0, config.capacityKg - forecast.remainingGasKg).toFixed(2)} kg
              </span>
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/60 hover:bg-slate-800 hover:text-white border border-slate-700/60 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-orange-400" />
            <span>Configure Cylinder Specs & Tare</span>
          </button>
        </div>
      </div>
    </div>
  );
};
