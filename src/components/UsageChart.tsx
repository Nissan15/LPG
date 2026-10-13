import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { BarChart2, LineChart as LineIcon, Calendar } from 'lucide-react';
import type { CylinderConfig, ForecastResult, WeightReading } from '../types/lpg';
import { generateProjectionPoints, calculateRemainingGas } from '../utils/calculations';

interface UsageChartProps {
  readings: WeightReading[];
  config: CylinderConfig;
  forecast: ForecastResult;
}

export const UsageChart: React.FC<UsageChartProps> = ({
  readings,
  config,
  forecast,
}) => {
  const [chartMode, setChartMode] = useState<'line' | 'bar'>('line');
  const [timeFilter, setTimeFilter] = useState<'all' | '30d' | '7d'>('all');

  // Filter readings based on time filter
  const filteredReadings = useMemo(() => {
    if (readings.length === 0) return [];
    const sorted = [...readings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (timeFilter === 'all') return sorted;

    const now = new Date().getTime();
    const daysLimit = timeFilter === '7d' ? 7 : 30;
    const cutoff = now - daysLimit * 24 * 60 * 60 * 1000;

    return sorted.filter(r => new Date(r.timestamp).getTime() >= cutoff);
  }, [readings, timeFilter]);

  // Prepare line chart data including historical + forecast projection points
  const lineChartData = useMemo(() => {
    if (filteredReadings.length === 0) return [];

    const historical = filteredReadings.map(r => {
      const date = new Date(r.timestamp);
      const remainingGas = calculateRemainingGas(r.totalWeightKg, config.tareWeightKg);
      return {
        timestamp: r.timestamp,
        dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalWeight: r.totalWeightKg,
        remainingGas,
        projectedWeight: null as number | null,
        isProjected: false,
        source: r.source,
        notes: r.notes,
      };
    });

    // If forecast is ready, connect the last historical point and add projection trajectory
    if (forecast.status === 'ready' && forecast.averageDailyConsumptionKg > 0 && historical.length > 0) {
      const latestReading = filteredReadings[filteredReadings.length - 1];
      const projectionPoints = generateProjectionPoints(
        latestReading,
        forecast.averageDailyConsumptionKg,
        config.tareWeightKg,
        14
      );

      // Link last historical point with projectedWeight start
      historical[historical.length - 1].projectedWeight = historical[historical.length - 1].totalWeight;

      const projected = projectionPoints.map(p => ({
        timestamp: p.timestamp,
        dateStr: `${p.dateStr} (Forecast)`,
        shortDate: `${p.dateStr}*`,
        totalWeight: null as number | null,
        remainingGas: calculateRemainingGas(p.projectedWeight, config.tareWeightKg),
        projectedWeight: p.projectedWeight,
        isProjected: true,
        source: 'forecast',
        notes: 'Projected linear burn rate',
      }));

      return [...historical, ...projected];
    }

    return historical;
  }, [filteredReadings, config.tareWeightKg, forecast]);

  // Prepare bar chart data for consumption intervals
  const barChartData = useMemo(() => {
    if (filteredReadings.length < 2) return [];

    const bars: { label: string; consumedKg: number; days: number; rateKgPerDay: number }[] = [];

    for (let i = 1; i < filteredReadings.length; i++) {
      const prev = filteredReadings[i - 1];
      const curr = filteredReadings[i];

      const prevNet = calculateRemainingGas(prev.totalWeightKg, config.tareWeightKg);
      const currNet = calculateRemainingGas(curr.totalWeightKg, config.tareWeightKg);

      const days = Math.max(
        0.05,
        (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      );

      const consumed = Math.max(0, prevNet - currNet);
      const rate = consumed / days;

      const d1 = new Date(prev.timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      const d2 = new Date(curr.timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

      bars.push({
        label: `${d1} → ${d2}`,
        consumedKg: parseFloat(consumed.toFixed(2)),
        days: parseFloat(days.toFixed(1)),
        rateKgPerDay: parseFloat(rate.toFixed(3)),
      });
    }

    return bars;
  }, [filteredReadings, config.tareWeightKg]);

  return (
    <div className="bg-[#131822]/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl mb-6">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Gas Weight Trajectory & History</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real measurements with future depletion forecast line
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chart View Toggle */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setChartMode('line')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                chartMode === 'line'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LineIcon className="w-3.5 h-3.5 text-orange-400" />
              <span>Weight Line</span>
            </button>
            <button
              onClick={() => setChartMode('bar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                chartMode === 'bar'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Usage Bars</span>
            </button>
          </div>

          {/* Time range filter */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {(['all', '30d', '7d'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all uppercase text-[11px] ${
                  timeFilter === f
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      {lineChartData.length === 0 ? (
        <div className="h-64 sm:h-80 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
          <Calendar className="w-10 h-10 text-slate-600 mb-2" />
          <h4 className="text-sm font-semibold text-slate-300">No Weight History Recorded</h4>
          <p className="text-xs text-slate-500 max-w-xs mt-1">
            Log your first weight reading using the "+ Log Reading" button or click "Demo Data" to view chart visuals.
          </p>
        </div>
      ) : chartMode === 'line' ? (
        <div className="h-72 sm:h-88 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
              <XAxis
                dataKey="shortDate"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#243046' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#243046' }}
                domain={[
                  (dataMin: number) => Math.max(0, Math.floor(Math.min(dataMin, config.tareWeightKg) - 1)),
                  (dataMax: number) => Math.ceil(dataMax + 2),
                ]}
                unit=" kg"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#131822',
                  borderColor: '#2e3e5c',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'Measured Scale Weight') return [`${value} kg`, name];
                  if (name === 'Projected Depletion') return [`${value} kg (Forecast)`, name];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]?.payload?.dateStr) {
                    return payload[0].payload.dateStr;
                  }
                  return label;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                formatter={(value) => <span className="text-slate-300 text-xs">{value}</span>}
              />

              {/* Tare Weight Empty Reference Line */}
              <ReferenceLine
                y={config.tareWeightKg}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{
                  value: `Tare Baseline: ${config.tareWeightKg} kg (Empty)`,
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'insideBottomRight',
                }}
              />

              {/* Real Measurements Line */}
              <Line
                type="monotone"
                dataKey="totalWeight"
                name="Measured Scale Weight"
                stroke="#f97316"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#f97316', stroke: '#0c0f14', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#ea580c', stroke: '#ffffff', strokeWidth: 2 }}
                connectNulls={false}
              />

              {/* Forecast Projection Line */}
              <Line
                type="linear"
                dataKey="projectedWeight"
                name="Projected Depletion"
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#38bdf8' }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* Usage Bar Chart */
        <div className="h-72 sm:h-88 w-full">
          {barChartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <p className="text-xs">Need at least 2 readings to plot consumption between intervals.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#243046' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#243046' }}
                  unit=" kg"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#131822',
                    borderColor: '#2e3e5c',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any, name: any, item: any) => {
                    if (name === 'Gas Consumed') {
                      return [`${value} kg (${item.payload.days} days, rate: ${item.payload.rateKgPerDay} kg/d)`, name];
                    }
                    return [value, name];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                  formatter={(value) => <span className="text-slate-300 text-xs">{value}</span>}
                />
                <Bar
                  dataKey="consumedKg"
                  name="Gas Consumed"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          Solid line: Verified scale weights
          <span className="w-2 h-2 rounded-full bg-sky-400 ml-2" />
          Dashed line: Scientific burn rate projection
        </span>
        <span className="text-slate-500">
          Tare baseline: {config.tareWeightKg} kg (represents 0% net LPG)
        </span>
      </div>
    </div>
  );
};
