import type { CylinderConfig, ESP32Config, OperatingMode, WeightReading } from '../types/lpg';
import { calculateRemainingGas } from './calculations';

const STORAGE_KEYS = {
  READINGS: 'smart_lpg_readings_v1',
  CYLINDER_CONFIG: 'smart_lpg_config_v1',
  ESP32_CONFIG: 'smart_lpg_esp32_config_v1',
  OPERATING_MODE: 'smart_lpg_mode_v1',
};

export const DEFAULT_CYLINDER_CONFIG: CylinderConfig = {
  tareWeightKg: 15.3,
  capacityKg: 14.2,
  lowGasThresholdPercent: 20,
  criticalGasThresholdPercent: 10,
  depletionWarningDays: 3,
};

export const DEFAULT_ESP32_CONFIG: ESP32Config = {
  endpointUrl: import.meta.env.VITE_ESP32_API_URL || 'http://192.168.1.180/api/weight',
  pollIntervalSeconds: Number(import.meta.env.VITE_ESP32_POLL_INTERVAL) || 30,
  autoLogReadings: false,
};

export function getStoredReadings(): WeightReading[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.READINGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  } catch (err) {
    console.error('Failed to load readings from localStorage:', err);
    return [];
  }
}

export function saveStoredReadings(readings: WeightReading[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.READINGS, JSON.stringify(readings));
  } catch (err) {
    console.error('Failed to save readings to localStorage:', err);
  }
}

export function getStoredCylinderConfig(): CylinderConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CYLINDER_CONFIG);
    if (!raw) return DEFAULT_CYLINDER_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CYLINDER_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CYLINDER_CONFIG;
  }
}

export function saveStoredCylinderConfig(config: CylinderConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CYLINDER_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save cylinder config:', err);
  }
}

export function getStoredESP32Config(): ESP32Config {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ESP32_CONFIG);
    if (!raw) return DEFAULT_ESP32_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_ESP32_CONFIG, ...parsed };
  } catch {
    return DEFAULT_ESP32_CONFIG;
  }
}

export function saveStoredESP32Config(config: ESP32Config): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ESP32_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save ESP32 config:', err);
  }
}

export function getStoredOperatingMode(): OperatingMode {
  try {
    const mode = localStorage.getItem(STORAGE_KEYS.OPERATING_MODE);
    return mode === 'esp32' ? 'esp32' : 'manual';
  } catch {
    return 'manual';
  }
}

export function saveStoredOperatingMode(mode: OperatingMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.OPERATING_MODE, mode);
  } catch (err) {
    console.error('Failed to save operating mode:', err);
  }
}

export function generateSampleDataset(tareWeightKg: number = 15.3): WeightReading[] {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const sampleSteps = [
    { daysAgo: 6, weightOffset: 14.2, note: 'New cylinder delivered & installed' },
    { daysAgo: 5, weightOffset: 13.8, note: 'Regular daily cooking' },
    { daysAgo: 4, weightOffset: 13.3, note: 'Baking & evening meal' },
    { daysAgo: 3, weightOffset: 12.8, note: 'Family lunch & dinner' },
    { daysAgo: 2, weightOffset: 12.35, note: 'Breakfast & tea' },
    { daysAgo: 0.5, weightOffset: 11.75, note: 'Latest manual scale check' },
  ];

  return sampleSteps.map((step, idx) => {
    const time = new Date(now.getTime() - step.daysAgo * dayMs);
    const totalWeightKg = parseFloat((tareWeightKg + step.weightOffset).toFixed(2));
    const remainingGasKg = calculateRemainingGas(totalWeightKg, tareWeightKg);

    return {
      id: `sample-${idx + 1}-${Date.now()}`,
      timestamp: time.toISOString(),
      totalWeightKg,
      remainingGasKg,
      source: 'manual',
      notes: step.note,
    };
  });
}

export function exportDataAsJSON(): void {
  const data = {
    appName: 'Smart LPG Monitor',
    exportedAt: new Date().toISOString(),
    config: getStoredCylinderConfig(),
    esp32Config: getStoredESP32Config(),
    readings: getStoredReadings(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lpg-monitor-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function clearAllStoredData(): void {
  localStorage.removeItem(STORAGE_KEYS.READINGS);
}
