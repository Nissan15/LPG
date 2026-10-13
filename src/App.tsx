import { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { AlertBanner } from './components/AlertBanner';
import { OverviewCards } from './components/OverviewCards';
import { CylinderVisual } from './components/CylinderVisual';
import { ForecastPanel } from './components/ForecastPanel';
import { UsageChart } from './components/UsageChart';
import { ReadingsTable } from './components/ReadingsTable';
import { ESP32StatusCard } from './components/ESP32StatusCard';
import { AddReadingModal } from './components/AddReadingModal';
import { SettingsModal } from './components/SettingsModal';

import type {
  CylinderConfig,
  ESP32Config,
  ESP32Status,
  OperatingMode,
  SupabaseConfig,
  WeightReading,
} from './types/lpg';

import { calculateForecast, calculateRemainingGas } from './utils/calculations';
import {
  getStoredCylinderConfig,
  getStoredESP32Config,
  getStoredOperatingMode,
  getStoredReadings,
  saveStoredCylinderConfig,
  saveStoredESP32Config,
  saveStoredOperatingMode,
  saveStoredReadings,
  generateSampleDataset,
  exportDataAsJSON,
  clearAllStoredData,
} from './utils/storage';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  isSupabaseConfigured,
} from './services/supabaseClient';
import {
  fetchReadingsFromSupabase,
  fetchLatestReadingFromSupabase,
  subscribeToSupabaseReadings,
  upsertReadingToSupabase,
  deleteReadingFromSupabase,
  batchSyncReadingsToSupabase,
  fetchConfigFromSupabase,
  saveConfigToSupabase,
} from './services/supabaseService';

export function App() {
  const [readings, setReadings] = useState<WeightReading[]>(() => getStoredReadings());
  const [config, setConfig] = useState<CylinderConfig>(() => getStoredCylinderConfig());
  const [esp32Config, setEsp32Config] = useState<ESP32Config>(() => getStoredESP32Config());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => getStoredSupabaseConfig());
  const [mode, setMode] = useState<OperatingMode>(() => getStoredOperatingMode());

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [esp32Status, setEsp32Status] = useState<ESP32Status>({
    isConnected: false,
    isPolling: false,
    lastChecked: null,
    lastReading: null,
    errorMessage: null,
  });

  const isCloudActive = useMemo(() => isSupabaseConfigured(), [supabaseConfig]);

  useEffect(() => {
    saveStoredReadings(readings);
  }, [readings]);

  useEffect(() => {
    saveStoredCylinderConfig(config);
  }, [config]);

  useEffect(() => {
    saveStoredESP32Config(esp32Config);
  }, [esp32Config]);

  useEffect(() => {
    saveStoredSupabaseConfig(supabaseConfig);
  }, [supabaseConfig]);

  useEffect(() => {
    saveStoredOperatingMode(mode);
  }, [mode]);

  useEffect(() => {
    setReadings(prev =>
      prev.map(r => ({
        ...r,
        remainingGasKg: calculateRemainingGas(r.totalWeightKg, config.tareWeightKg),
      }))
    );
  }, [config.tareWeightKg]);

  // Initial cloud fetch on mount if Supabase is configured
  useEffect(() => {
    if (!isCloudActive || !supabaseConfig.autoSync) return;

    async function initCloudSync() {
      // 1. Fetch cloud config if available
      const cfgRes = await fetchConfigFromSupabase();
      if (cfgRes.success && cfgRes.config) {
        setConfig(cfgRes.config);
      }

      // 2. Fetch cloud readings
      const readingsRes = await fetchReadingsFromSupabase();
      if (readingsRes.success && readingsRes.readings && readingsRes.readings.length > 0) {
        setReadings(prev => {
          // Merge local and cloud by ID
          const map = new Map<string, WeightReading>();
          prev.forEach(r => map.set(r.id, r));
          readingsRes.readings!.forEach(r => map.set(r.id, r));
          return Array.from(map.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
      }
    }

    initCloudSync();
  }, [isCloudActive, supabaseConfig.autoSync]);

  // ESP32 Live Query Logic: fetches latest reading from Supabase public.lpg_readings
  const pollESP32 = useCallback(async () => {
    if (mode !== 'esp32') return;

    setEsp32Status(prev => ({ ...prev, isPolling: true }));
    const nowTimeStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (!isCloudActive) {
      setEsp32Status({
        isConnected: false,
        isPolling: false,
        lastChecked: nowTimeStr,
        lastReading: null,
        readingTimestamp: null,
        errorMessage: 'Supabase client is not configured. Please add your Supabase URL & Anon Key in Settings.',
        statusCode: 400,
      });
      return;
    }

    // 1. Retrieve the latest reading using the timestamp column in descending order
    const latestRes = await fetchLatestReadingFromSupabase(config.tareWeightKg);

    if (!latestRes.success) {
      setEsp32Status({
        isConnected: false,
        isPolling: false,
        lastChecked: nowTimeStr,
        lastReading: null,
        readingTimestamp: null,
        errorMessage: latestRes.error || 'Failed to fetch data from Supabase public.lpg_readings.',
        statusCode: 500,
      });
      return;
    }

    if (latestRes.isEmpty || !latestRes.reading) {
      setEsp32Status({
        isConnected: false,
        isPolling: false,
        lastChecked: nowTimeStr,
        lastReading: null,
        readingTimestamp: null,
        totalCloudReadings: 0,
        errorMessage: 'Supabase table public.lpg_readings is currently empty. Waiting for ESP32 upload...',
        statusCode: 200,
      });
      return;
    }

    const latest = latestRes.reading;
    setEsp32Status({
      isConnected: true,
      isPolling: false,
      lastChecked: nowTimeStr,
      lastReading: latest.totalWeightKg,
      readingTimestamp: latest.timestamp,
      totalCloudReadings: latestRes.totalCount,
      errorMessage: null,
      statusCode: 200,
    });

    // 2. Refresh full reading list to update dashboard charts, forecasts, and tables
    const allRes = await fetchReadingsFromSupabase(config.tareWeightKg);
    if (allRes.success && allRes.readings && allRes.readings.length > 0) {
      setReadings(allRes.readings);
    } else {
      setReadings(prev => {
        const exists = prev.some(r => r.id === latest.id);
        if (exists) return prev;
        return [...prev, latest].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    }
  }, [mode, isCloudActive, config.tareWeightKg]);

  // Periodic polling interval
  useEffect(() => {
    if (mode !== 'esp32') return;

    pollESP32();

    const interval = setInterval(() => {
      pollESP32();
    }, Math.max(5000, esp32Config.pollIntervalSeconds * 1000));

    return () => clearInterval(interval);
  }, [mode, esp32Config.pollIntervalSeconds, pollESP32]);

  // Supabase Realtime Subscription: listens to live INSERTs from ESP32 on public.lpg_readings
  useEffect(() => {
    if (!isCloudActive) return;

    const unsubscribe = subscribeToSupabaseReadings((newReading) => {
      const nowTimeStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setEsp32Status(prev => ({
        ...prev,
        isConnected: true,
        isPolling: false,
        lastChecked: nowTimeStr,
        lastReading: newReading.totalWeightKg,
        readingTimestamp: newReading.timestamp,
        totalCloudReadings: (prev.totalCloudReadings || 0) + 1,
        errorMessage: null,
        statusCode: 201,
      }));

      setReadings(prev => {
        const exists = prev.some(r => r.id === newReading.id);
        if (exists) return prev;
        return [...prev, newReading].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    }, config.tareWeightKg);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isCloudActive, config.tareWeightKg]);

  const forecast = useMemo(() => {
    const currentWeightOverride = (mode === 'esp32' && esp32Status.isConnected && esp32Status.lastReading !== null)
      ? esp32Status.lastReading
      : undefined;

    return calculateForecast(readings, config, currentWeightOverride);
  }, [readings, config, mode, esp32Status]);

  // Handler: Add new manual reading
  const handleAddReading = (newReadingData: Omit<WeightReading, 'id' | 'remainingGasKg'>) => {
    const netGas = calculateRemainingGas(newReadingData.totalWeightKg, config.tareWeightKg);
    const reading: WeightReading = {
      ...newReadingData,
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      remainingGasKg: netGas,
    };

    setReadings(prev => [...prev, reading].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ));

    // Async sync to Supabase if configured
    if (isCloudActive) {
      upsertReadingToSupabase(reading).catch(err => {
        console.error('Failed to sync new reading to Supabase:', err);
      });
    }
  };

  // Handler: Delete reading
  const handleDeleteReading = (id: string) => {
    setReadings(prev => prev.filter(r => r.id !== id));

    if (isCloudActive) {
      deleteReadingFromSupabase(id).catch(err => {
        console.error('Failed to delete reading from Supabase:', err);
      });
    }
  };

  // Handler: Full bidirectional sync with Supabase
  const handleSyncWithSupabase = async () => {
    if (!isCloudActive) {
      throw new Error('Supabase URL and Anon Key are required to sync.');
    }

    // 1. Push local readings to Supabase
    if (readings.length > 0) {
      const pushRes = await batchSyncReadingsToSupabase(readings);
      if (!pushRes.success) {
        throw new Error(`Failed to push local records: ${pushRes.error}`);
      }
    }

    // 2. Push config to Supabase
    await saveConfigToSupabase(config);

    // 3. Pull latest readings from Supabase
    const pullRes = await fetchReadingsFromSupabase();
    if (!pullRes.success) {
      throw new Error(`Failed to pull cloud records: ${pullRes.error}`);
    }

    if (pullRes.readings) {
      setReadings(pullRes.readings);
    }
  };

  const handleLoadSampleData = () => {
    const sampleData = generateSampleDataset(config.tareWeightKg);
    setReadings(sampleData);
    if (isCloudActive) {
      batchSyncReadingsToSupabase(sampleData).catch(console.error);
    }
  };

  const handleClearData = () => {
    clearAllStoredData();
    setReadings([]);
  };

  const latestReading = readings.length > 0 
    ? [...readings].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[readings.length - 1] 
    : undefined;

  return (
    <div className="min-h-screen bg-[#0c0f14] text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Navbar */}
      <Header
        mode={mode}
        onModeChange={setMode}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onLoadSampleData={handleLoadSampleData}
        onExportData={exportDataAsJSON}
        hasReadings={readings.length > 0}
        isSupabaseConfigured={isCloudActive}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Dynamic Alerts */}
        <AlertBanner
          forecast={forecast}
          config={config}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />

        {/* ESP32 Hardware Status Banner (Active in ESP32 Mode) */}
        {mode === 'esp32' && (
          <ESP32StatusCard
            esp32Config={esp32Config}
            status={esp32Status}
            onPollNow={pollESP32}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onSwitchToManual={() => setMode('manual')}
          />
        )}

        {/* Row 1: Key Metric Summary Cards */}
        <OverviewCards
          forecast={forecast}
          config={config}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          readingTimestamp={
            mode === 'esp32'
              ? (esp32Status.readingTimestamp || latestReading?.timestamp)
              : latestReading?.timestamp
          }
        />

        {/* Row 2: Physical Visual Cylinder Gauge & Depletion Forecast Engine */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <CylinderVisual
            forecast={forecast}
            config={config}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />
          <ForecastPanel
            forecast={forecast}
            config={config}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />
        </div>

        {/* Row 3: Interactive Usage History Chart (Recharts) */}
        <UsageChart
          readings={readings}
          config={config}
          forecast={forecast}
        />

        {/* Row 4: Historical Scale Weight Log Table */}
        <ReadingsTable
          readings={readings}
          config={config}
          onDeleteReading={handleDeleteReading}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onLoadSampleData={handleLoadSampleData}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#080b0f] py-6 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400 font-medium">Smart LPG Monitor</span>
            <span>—</span>
            <span>{isCloudActive ? 'Supabase Cloud Connected' : 'LocalStorage Offline'} • Vercel Ready</span>
          </div>
          <div className="text-slate-400">
            Tare Weight Math: <code className="text-slate-300 font-mono text-[11px]">Remaining LPG = Scale Weight - Tare Weight</code>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddReadingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddReading={handleAddReading}
        config={config}
        latestReading={latestReading}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={config}
        onSaveConfig={setConfig}
        esp32Config={esp32Config}
        onSaveESP32Config={setEsp32Config}
        supabaseConfig={supabaseConfig}
        onSaveSupabaseConfig={setSupabaseConfig}
        onLoadSampleData={handleLoadSampleData}
        onClearData={handleClearData}
        onExportData={exportDataAsJSON}
        onSyncWithSupabase={handleSyncWithSupabase}
        totalReadingsCount={readings.length}
      />
    </div>
  );
}

export default App;
