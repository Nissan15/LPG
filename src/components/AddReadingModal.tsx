import React, { useState, useEffect } from 'react';
import { X, Scale, Calendar, AlertTriangle, FileText } from 'lucide-react';
import type { CylinderConfig, WeightReading } from '../types/lpg';
import { calculateRemainingGas } from '../utils/calculations';

interface AddReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddReading: (reading: Omit<WeightReading, 'id' | 'remainingGasKg'>) => void;
  config: CylinderConfig;
  latestReading?: WeightReading;
}

export const AddReadingModal: React.FC<AddReadingModalProps> = ({
  isOpen,
  onClose,
  onAddReading,
  config,
  latestReading,
}) => {
  const getCurrentLocalDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const local = new Date(now.getTime() - offset);
    return local.toISOString().slice(0, 16);
  };

  const [weightInput, setWeightInput] = useState<string>('');
  const [datetimeInput, setDatetimeInput] = useState<string>(getCurrentLocalDateTime());
  const [notesInput, setNotesInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDatetimeInput(getCurrentLocalDateTime());
      if (latestReading) {
        setWeightInput(latestReading.totalWeightKg.toString());
      } else {
        setWeightInput((config.tareWeightKg + config.capacityKg).toFixed(2));
      }
      setNotesInput('');
      setErrorMsg(null);
    }
  }, [isOpen, latestReading, config]);

  if (!isOpen) return null;

  const parsedWeight = parseFloat(weightInput);
  const isValidNumber = !isNaN(parsedWeight) && parsedWeight > 0;
  const netGas = isValidNumber ? calculateRemainingGas(parsedWeight, config.tareWeightKg) : 0;
  const isBelowTare = isValidNumber && parsedWeight < config.tareWeightKg;
  const gasPercent = isValidNumber && config.capacityKg > 0 
    ? Math.min(100, parseFloat(((netGas / config.capacityKg) * 100).toFixed(1)))
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidNumber) {
      setErrorMsg('Please enter a valid positive weight in kilograms.');
      return;
    }

    if (parsedWeight < 1) {
      setErrorMsg('Weight seems unrealistically low. Please enter a realistic cylinder weight.');
      return;
    }

    onAddReading({
      timestamp: new Date(datetimeInput).toISOString(),
      totalWeightKg: parseFloat(parsedWeight.toFixed(2)),
      source: 'manual',
      notes: notesInput.trim() || undefined,
    });

    onClose();
  };

  const handleQuickAdjust = (delta: number) => {
    const current = isNaN(parsedWeight) ? config.tareWeightKg + config.capacityKg : parsedWeight;
    const next = Math.max(0, current + delta);
    setWeightInput(next.toFixed(2));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#131822] border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Log Scale Reading</h3>
              <p className="text-xs text-slate-400">Manual weight entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Gross Scale Weight (kg) <span className="text-orange-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="200"
                value={weightInput}
                onChange={(e) => {
                  setWeightInput(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="e.g. 27.50"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-lg font-bold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-600"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 font-mono">
                kg
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-slate-500">Quick nudge:</span>
              <button
                type="button"
                onClick={() => handleQuickAdjust(-0.5)}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
              >
                -0.5kg
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdjust(-0.2)}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
              >
                -0.2kg
              </button>
              <button
                type="button"
                onClick={() => setWeightInput((config.tareWeightKg + config.capacityKg).toFixed(2))}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30"
              >
                Set Full ({config.tareWeightKg + config.capacityKg}kg)
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Empty Tare Weight:</span>
              <span className="text-slate-300 font-mono font-medium">{config.tareWeightKg} kg</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Net Remaining LPG:</span>
              <span className={`font-mono text-sm ${netGas > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {netGas.toFixed(2)} kg ({gasPercent}%)
              </span>
            </div>

            {isBelowTare && (
              <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Scale weight is lower than tare weight ({config.tareWeightKg} kg). Net gas will be 0 kg.
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date & Time of Reading</span>
            </label>
            <input
              type="datetime-local"
              value={datetimeInput}
              onChange={(e) => setDatetimeInput(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Notes / Context (Optional)</span>
            </label>
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="e.g. After Sunday dinner cooking, New refill cylinder"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-600"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md shadow-orange-500/25 transition-all transform active:scale-95"
            >
              Save Reading
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
