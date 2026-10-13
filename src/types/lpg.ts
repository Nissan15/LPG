export type OperatingMode = 'manual' | 'esp32';

export interface WeightReading {
  id: string;
  timestamp: string; // ISO 8601 string
  totalWeightKg: number; // Scale reading (cylinder + gas)
  remainingGasKg: number; // Calculated: totalWeightKg - tareWeightKg (>= 0)
  source: 'manual' | 'esp32';
  notes?: string;
}

export interface CylinderConfig {
  tareWeightKg: number; // Weight of empty cylinder (kg)
  capacityKg: number; // Nominal full gas capacity (kg), e.g. 14.2 kg
  lowGasThresholdPercent: number; // Default 20%
  criticalGasThresholdPercent: number; // Default 10%
  depletionWarningDays: number; // Default 3 days
}

export interface ESP32Config {
  endpointUrl: string; // URL of ESP32 HTTP Server endpoint
  pollIntervalSeconds: number; // Interval for polling in seconds
  autoLogReadings: boolean; // Whether polled values are auto-recorded into history
}

export interface ESP32Status {
  isConnected: boolean;
  isPolling: boolean;
  lastChecked: string | null;
  lastReading: number | null;
  readingTimestamp?: string | null;
  totalCloudReadings?: number;
  errorMessage: string | null;
  statusCode?: number;
}

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  autoSync: boolean;
}

export interface SupabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  lastSynced: string | null;
  errorMessage: string | null;
}

export type ForecastStatus = 
  | 'ready'
  | 'insufficient_data'
  | 'zero_consumption'
  | 'increasing_weight'
  | 'empty'
  | 'over_capacity';

export interface ForecastResult {
  status: ForecastStatus;
  statusMessage: string;
  currentTotalWeightKg: number;
  remainingGasKg: number;
  remainingPercent: number;
  averageDailyConsumptionKg: number; // kg per 24 hours
  burnRatePerHourKg: number; // kg per hour
  estimatedDaysRemaining: number | null;
  estimatedHoursRemaining: number | null;
  totalHoursRemaining: number | null;
  predictedDepletionDate: Date | null;
  validIntervalCount: number;
  totalObservedDays: number;
  totalGasConsumedKg: number;
  confidence: 'High' | 'Medium' | 'Low' | 'Insufficient';
  refillDetected: boolean;
}

export interface AlertNotification {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  isDismissible?: boolean;
}
