import React, { useState } from 'react';
import { Trash2, Plus, Database, Cpu, User, ArrowDown, ArrowUp, Clock, FileText, Search } from 'lucide-react';
import type { CylinderConfig, WeightReading } from '../types/lpg';
import { calculateRemainingGas } from '../utils/calculations';

interface ReadingsTableProps {
  readings: WeightReading[];
  config: CylinderConfig;
  onDeleteReading: (id: string) => void;
  onOpenAddModal: () => void;
  onLoadSampleData: () => void;
}

export const ReadingsTable: React.FC<ReadingsTableProps> = ({
  readings,
  config,
  onDeleteReading,
  onOpenAddModal,
  onLoadSampleData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Sort descending (newest first) for table display
  const sortedDesc = [...readings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Compute delta compared to the chronologically prior reading
  const readingsWithDelta = sortedDesc.map((reading, index) => {
    const previous = sortedDesc[index + 1];
    let deltaKg: number | null = null;
    let isRefill = false;

    if (previous) {
      const prevNet = calculateRemainingGas(previous.totalWeightKg, config.tareWeightKg);
      const currNet = calculateRemainingGas(reading.totalWeightKg, config.tareWeightKg);
      deltaKg = parseFloat((currNet - prevNet).toFixed(2));
      if (deltaKg > 0.5) {
        isRefill = true;
      }
    }

    const netGas = calculateRemainingGas(reading.totalWeightKg, config.tareWeightKg);
    const date = new Date(reading.timestamp);

    return {
      ...reading,
      netGas,
      deltaKg,
      isRefill,
      dateFormatted: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      timeFormatted: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  });

  const filtered = readingsWithDelta.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.dateFormatted.toLowerCase().includes(term) ||
      r.totalWeightKg.toString().includes(term) ||
      (r.notes && r.notes.toLowerCase().includes(term))
    );
  });

  const displayed = showAll ? filtered : filtered.slice(0, 8);

  return (
    <div className="bg-[#131822]/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Historical Weight Log</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {readings.length} records
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Timestamped scale readings saved in LocalStorage
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {readings.length > 3 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search date or note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          )}

          {readings.length === 0 && (
            <button
              onClick={onLoadSampleData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Demo Data</span>
            </button>
          )}

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Reading</span>
          </button>
        </div>
      </div>

      {/* Table / Empty State */}
      {readings.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">No Readings Logged Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
            Start by entering your current cylinder weight manually or load sample records to test the forecasting algorithms.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
            >
              + Log First Reading
            </button>
            <button
              onClick={onLoadSampleData}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
            >
              Load Demo Dataset
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 font-semibold">Date & Time</th>
                <th className="py-3 px-3 font-semibold">Total Weight</th>
                <th className="py-3 px-3 font-semibold">Net Gas</th>
                <th className="py-3 px-3 font-semibold">Change</th>
                <th className="py-3 px-3 font-semibold">Source</th>
                <th className="py-3 px-3 font-semibold">Notes</th>
                <th className="py-3 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {displayed.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-200">
                      {item.dateFormatted}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{item.timeFormatted}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-bold text-white font-mono text-sm">
                      {item.totalWeightKg.toFixed(2)}
                    </span>
                    <span className="text-slate-400 ml-1 text-[11px]">kg</span>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-semibold text-emerald-400 font-mono">
                      {item.netGas.toFixed(2)}
                    </span>
                    <span className="text-slate-400 ml-1 text-[11px]">kg</span>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    {item.deltaKg === null ? (
                      <span className="text-slate-500 font-mono">Baseline</span>
                    ) : item.isRefill ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-400 font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-[11px]">
                        <ArrowUp className="w-3 h-3" />
                        <span>+{item.deltaKg} kg (Refill)</span>
                      </span>
                    ) : item.deltaKg < 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-orange-400 font-mono font-medium text-[11px]">
                        <ArrowDown className="w-3 h-3" />
                        <span>{Math.abs(item.deltaKg)} kg</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">0.00 kg</span>
                    )}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    {item.source === 'esp32' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-400 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20">
                        <Cpu className="w-3 h-3" />
                        <span>ESP32</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Manual</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 max-w-xs truncate text-slate-400 text-xs" title={item.notes || ''}>
                    {item.notes || <span className="text-slate-600">—</span>}
                  </td>

                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onDeleteReading(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-80 group-hover:opacity-100"
                      title="Delete reading"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length > 8 && (
            <div className="mt-3 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs font-semibold text-orange-400 hover:text-orange-300 py-1.5 px-3 rounded-lg hover:bg-orange-500/10 transition-colors"
              >
                {showAll ? 'Show Fewer Records' : `View All ${filtered.length} Records`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
