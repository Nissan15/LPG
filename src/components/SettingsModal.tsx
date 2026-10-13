import React, { useState } from 'react';
import {
  X,
  Sliders,
  Cpu,
  Database,
  Cloud,
  Check,
  Copy,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  UploadCloud,
} from 'lucide-react';
import type { CylinderConfig, ESP32Config, SupabaseConfig } from '../types/lpg';
import { ARDUINO_ESP32_FIRMWARE_SKETCH, fetchESP32Weight } from '../services/esp32Service';
import { testSupabaseConnection } from '../services/supabaseClient';
import { fetchLatestReadingFromSupabase } from '../services/supabaseService';
import { SUPABASE_SQL_SCHEMA } from '../services/supabaseSchemaCode';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CylinderConfig;
  onSaveConfig: (config: CylinderConfig) => void;
  esp32Config: ESP32Config;
  onSaveESP32Config: (config: ESP32Config) => void;
  supabaseConfig: SupabaseConfig;
  onSaveSupabaseConfig: (config: SupabaseConfig) => void;
  onLoadSampleData: () => void;
  onClearData: () => void;
  onExportData: () => void;
  onSyncWithSupabase?: () => Promise<void>;
  totalReadingsCount: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  esp32Config,
  onSaveESP32Config,
  supabaseConfig,
  onSaveSupabaseConfig,
  onLoadSampleData,
  onClearData,
  onExportData,
  onSyncWithSupabase,
  totalReadingsCount,
}) => {
  const [activeTab, setActiveTab] = useState<'cylinder' | 'esp32' | 'supabase' | 'data'>('cylinder');

  // Cylinder state
  const [tareWeight, setTareWeight] = useState(config.tareWeightKg.toString());
  const [capacity, setCapacity] = useState(config.capacityKg.toString());
  const [lowThreshold, setLowThreshold] = useState(config.lowGasThresholdPercent.toString());
  const [depletionDays, setDepletionDays] = useState(config.depletionWarningDays.toString());

  // ESP32 state
  const [endpointUrl, setEndpointUrl] = useState(esp32Config.endpointUrl);
  const [pollInterval, setPollInterval] = useState(esp32Config.pollIntervalSeconds.toString());
  const [autoLog, setAutoLog] = useState(esp32Config.autoLogReadings);

  // Supabase state
  const [supabaseUrl, setSupabaseUrl] = useState(supabaseConfig.supabaseUrl);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(supabaseConfig.supabaseAnonKey);
  const [supabaseAutoSync, setSupabaseAutoSync] = useState(supabaseConfig.autoSync);

  // Ping test state
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    message: string;
    weight?: number;
  } | null>(null);

  // Supabase test state
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [supabaseResult, setSupabaseResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Copy states
  const [hasCopiedSketch, setHasCopiedSketch] = useState(false);
  const [hasCopiedSql, setHasCopiedSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const applyPreset = (cap: number, tare: number) => {
    setCapacity(cap.toString());
    setTareWeight(tare.toString());
  };

  const handleSave = () => {
    const updatedConfig: CylinderConfig = {
      tareWeightKg: Math.max(0.1, parseFloat(tareWeight) || config.tareWeightKg),
      capacityKg: Math.max(0.1, parseFloat(capacity) || config.capacityKg),
      lowGasThresholdPercent: Math.max(1, Math.min(50, parseFloat(lowThreshold) || 20)),
      criticalGasThresholdPercent: 10,
      depletionWarningDays: Math.max(1, parseFloat(depletionDays) || 3),
    };

    const updatedESP32: ESP32Config = {
      endpointUrl: endpointUrl.trim(),
      pollIntervalSeconds: Math.max(5, parseInt(pollInterval, 10) || 30),
      autoLogReadings: autoLog,
    };

    const updatedSupabase: SupabaseConfig = {
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      autoSync: supabaseAutoSync,
    };

    onSaveConfig(updatedConfig);
    onSaveESP32Config(updatedESP32);
    onSaveSupabaseConfig(updatedSupabase);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const handleTestPing = async () => {
    setIsTestingPing(true);
    setPingResult(null);

    // 1. If custom local REST endpoint is specified, test it
    if (endpointUrl.trim()) {
      const res = await fetchESP32Weight(endpointUrl.trim(), 4000);
      if (res.success && res.weightKg !== undefined) {
        setIsTestingPing(false);
        setPingResult({
          success: true,
          weight: res.weightKg,
          message: `Direct ESP32 endpoint reached! Returned weight reading: ${res.weightKg} kg`,
        });
        return;
      }
    }

    // 2. Default & Recommended: Check Supabase public.lpg_readings table
    const supaRes = await fetchLatestReadingFromSupabase(config.tareWeightKg);
    setIsTestingPing(false);

    if (supaRes.success) {
      if (supaRes.reading) {
        setPingResult({
          success: true,
          weight: supaRes.reading.totalWeightKg,
          message: `Supabase Cloud Connected! Latest reading from public.lpg_readings: ${supaRes.reading.totalWeightKg} kg (${new Date(supaRes.reading.timestamp).toLocaleString()})`,
        });
      } else {
        setPingResult({
          success: true,
          message: 'Connected to Supabase public.lpg_readings table! Waiting for first ESP32 reading upload (table is currently empty).',
        });
      }
    } else {
      setPingResult({
        success: false,
        message: supaRes.error || (endpointUrl.trim() ? 'Failed to connect to both direct endpoint and Supabase table.' : 'Failed to connect to Supabase. Check your URL and anon key in the Supabase tab.'),
      });
    }
  };

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseResult(null);

    const res = await testSupabaseConnection(supabaseUrl.trim(), supabaseAnonKey.trim());
    setIsTestingSupabase(false);

    setSupabaseResult({
      success: res.success,
      message: res.message,
    });
  };

  const handleSyncSupabase = async () => {
    if (!onSyncWithSupabase) return;
    setIsSyncingSupabase(true);
    try {
      await onSyncWithSupabase();
      setSupabaseResult({
        success: true,
        message: 'Successfully synchronized local records with Supabase cloud database!',
      });
    } catch (err: unknown) {
      const error = err as Error;
      setSupabaseResult({
        success: false,
        message: `Sync failed: ${error.message}`,
      });
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleCopySketch = () => {
    navigator.clipboard.writeText(ARDUINO_ESP32_FIRMWARE_SKETCH);
    setHasCopiedSketch(true);
    setTimeout(() => setHasCopiedSketch(false), 2500);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setHasCopiedSql(true);
    setTimeout(() => setHasCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#131822] border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">System Settings & Integrations</h3>
              <p className="text-xs text-slate-400">Configure cylinder tare, Supabase cloud sync, and ESP32 hardware</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 my-4 border-b border-slate-800 pb-2 shrink-0">
          <button
            onClick={() => setActiveTab('cylinder')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'cylinder'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Cylinder Specs</span>
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'supabase'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase Cloud</span>
          </button>

          <button
            onClick={() => setActiveTab('esp32')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'esp32'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>ESP32 Hardware</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'data'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data Management</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {/* TAB 1: Cylinder Specs */}
          {activeTab === 'cylinder' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">
                  Standard Cylinder Presets:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset(14.2, 15.3)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-orange-500 text-left transition-all"
                  >
                    <span className="font-bold text-white block">14.2 kg Domestic</span>
                    <span className="text-[10px] text-slate-400">Tare: 15.3 kg</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(19.0, 18.5)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-orange-500 text-left transition-all"
                  >
                    <span className="font-bold text-white block">19.0 kg Commercial</span>
                    <span className="text-[10px] text-slate-400">Tare: 18.5 kg</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(5.0, 4.8)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-orange-500 text-left transition-all"
                  >
                    <span className="font-bold text-white block">5.0 kg Mini / Chhotu</span>
                    <span className="text-[10px] text-slate-400">Tare: 4.8 kg</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Empty Tare Weight (kg) <span className="text-orange-400">*</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mb-1.5">
                    Weight of the empty metal cylinder (stamped on cylinder collar).
                  </p>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={tareWeight}
                    onChange={(e) => setTareWeight(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Nominal Gas Capacity (kg) <span className="text-orange-400">*</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mb-1.5">
                    Net weight of LPG when 100% full (e.g. 14.2 kg or 19.0 kg).
                  </p>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Low Gas Alert Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="40"
                    value={lowThreshold}
                    onChange={(e) => setLowThreshold(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-slate-500">Default: 20% remaining</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Depletion Approaching Alert (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={depletionDays}
                    onChange={(e) => setDepletionDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-slate-500">Alerts when predicted days left ≤ this value</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Supabase Cloud Database */}
          {activeTab === 'supabase' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-slate-300 space-y-1.5">
                <span className="font-semibold text-emerald-400 block flex items-center gap-1.5">
                  <Cloud className="w-4 h-4" />
                  <span>Supabase PostgreSQL Cloud Integration</span>
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Connect your Supabase project to synchronize LPG readings and cylinder specs securely across all your devices. Enter your project credentials below or set them in <code>.env</code>.
                </p>
              </div>

              {/* Supabase URL */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Supabase Project URL <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://yourprojectid.supabase.co"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Found in your Supabase Dashboard under <strong>Project Settings → API → Project URL</strong>
                </span>
              </div>

              {/* Anon Key */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Supabase Anon Public API Key <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="password"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Found under <strong>Project Settings → API → Project API keys → anon (public)</strong>
                </span>
              </div>

              {/* Auto sync checkbox & action buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supabaseAutoSync}
                    onChange={(e) => setSupabaseAutoSync(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-slate-300 text-xs font-medium">Auto-sync readings with cloud</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestSupabase}
                    disabled={isTestingSupabase}
                    className="px-3 py-1.5 rounded-lg font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>{isTestingSupabase ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncSupabase}
                    disabled={isSyncingSupabase}
                    className="px-3 py-1.5 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    <UploadCloud className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                    <span>{isSyncingSupabase ? 'Syncing...' : 'Sync Local to Cloud'}</span>
                  </button>
                </div>
              </div>

              {/* Supabase Ping Notification */}
              {supabaseResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    supabaseResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  {supabaseResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold block">{supabaseResult.success ? 'Supabase Connected' : 'Connection Failed'}</span>
                    <span className="text-[11px] opacity-90">{supabaseResult.message}</span>
                  </div>
                </div>
              )}

              {/* SQL Schema for Supabase Editor */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-300">Supabase SQL Schema (Run in SQL Editor)</span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    {hasCopiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedSql ? 'Copied SQL!' : 'Copy SQL'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px] overflow-x-auto max-h-36 leading-relaxed">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: ESP32 Hardware */}
          {activeTab === 'esp32' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 space-y-2">
                <span className="font-semibold text-orange-400 block">ESP32 Hardware & Cloud Integration</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your ESP32 uploads weight readings directly to the Supabase <code className="text-emerald-400 font-mono">public.lpg_readings</code> table (HTTP 201). 
                  The dashboard queries Supabase and listens via Supabase Realtime. Direct local HTTP endpoint is optional.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  ESP32 Direct Endpoint URL (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    placeholder="Leave blank to use Supabase public.lpg_readings (Recommended)"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestPing}
                    disabled={isTestingPing}
                    className="px-3.5 py-2 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingPing ? 'animate-spin' : ''}`} />
                    <span>{isTestingPing ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Leave blank to pull directly from Supabase Cloud table (default & recommended).
                </span>
              </div>

              {pingResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    pingResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  {pingResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold block">{pingResult.success ? 'Success' : 'Connection Failed'}</span>
                    <span className="text-[11px] opacity-90">{pingResult.message}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Poll Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="3600"
                    value={pollInterval}
                    onChange={(e) => setPollInterval(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoLog}
                      onChange={(e) => setAutoLog(e.target.checked)}
                      className="rounded border-slate-700 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-slate-300 text-xs font-medium">Auto-record polled readings to history</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-300">ESP32 Arduino C++ Firmware Sketch</span>
                  <button
                    type="button"
                    onClick={handleCopySketch}
                    className="flex items-center gap-1 text-[11px] font-semibold text-orange-400 hover:text-orange-300"
                  >
                    {hasCopiedSketch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedSketch ? 'Copied to Clipboard!' : 'Copy Sketch'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px] overflow-x-auto max-h-40 leading-relaxed">
                  {ARDUINO_ESP32_FIRMWARE_SKETCH}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: Data Management */}
          {activeTab === 'data' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-semibold text-slate-200 block mb-1">Storage Database</span>
                <p className="text-[11px] text-slate-400">
                  Currently holding <strong className="text-orange-400">{totalReadingsCount}</strong> readings locally.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onExportData}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 flex items-center gap-2.5 text-left transition-colors"
                >
                  <Download className="w-4 h-4 text-orange-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Export JSON Backup</span>
                    <span className="text-[10px] text-slate-400">Download complete dataset</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLoadSampleData();
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 flex items-center gap-2.5 text-left transition-colors"
                >
                  <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Load Demo Records</span>
                    <span className="text-[10px] text-slate-400">Simulate 6-day consumption cycle</span>
                  </div>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all recorded scale readings?')) {
                      onClearData();
                      onClose();
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All Historical Readings</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
            {saveSuccess && (
              <>
                <Check className="w-4 h-4" />
                <span>Settings saved!</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md shadow-orange-500/25 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
