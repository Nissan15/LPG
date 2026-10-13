import { getSupabaseClient } from './supabaseClient';
import type { CylinderConfig, WeightReading } from '../types/lpg';
import { calculateRemainingGas } from '../utils/calculations';

/**
 * Maps database row to application WeightReading model.
 * Gracefully handles Supabase numeric types, nulls, and timestamp formats.
 */
export function mapRowToReading(row: any, tareWeightKg?: number): WeightReading {
  const totalWeight = typeof row.total_weight_kg === 'number'
    ? row.total_weight_kg
    : parseFloat(row.total_weight_kg || '0');

  let remainingGas = 0;
  if (row.remaining_gas_kg !== null && row.remaining_gas_kg !== undefined && !isNaN(Number(row.remaining_gas_kg))) {
    remainingGas = parseFloat(row.remaining_gas_kg);
  } else if (tareWeightKg !== undefined) {
    remainingGas = calculateRemainingGas(totalWeight, tareWeightKg);
  }

  return {
    id: String(row.id || `supa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
    totalWeightKg: isNaN(totalWeight) ? 0 : parseFloat(totalWeight.toFixed(2)),
    remainingGasKg: isNaN(remainingGas) ? 0 : parseFloat(remainingGas.toFixed(2)),
    source: (row.source === 'esp32' || row.source === 'ESP32') ? 'esp32' : (row.source || 'esp32'),
    notes: row.notes || undefined,
  };
}

/**
 * Fetches all readings from Supabase sorted chronologically ascending
 */
export async function fetchReadingsFromSupabase(tareWeightKg?: number): Promise<{
  success: boolean;
  readings?: WeightReading[];
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client not configured' };
  }

  try {
    const { data, error } = await client
      .from('lpg_readings')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    const readings = (data || []).map(r => mapRowToReading(r, tareWeightKg));
    return { success: true, readings };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves the latest scale reading from Supabase ordered by timestamp descending.
 */
export async function fetchLatestReadingFromSupabase(tareWeightKg?: number): Promise<{
  success: boolean;
  reading?: WeightReading;
  totalCount?: number;
  isEmpty?: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Supabase client is not configured. Please enter your Supabase URL and Anon Key.',
    };
  }

  try {
    const { data, error, count } = await client
      .from('lpg_readings')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: true, isEmpty: true, totalCount: 0 };
    }

    const latest = mapRowToReading(data[0], tareWeightKg);
    return { success: true, reading: latest, totalCount: count || data.length };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Subscribes to Supabase Realtime changes on public.lpg_readings.
 * Triggers callback immediately when the ESP32 inserts a new row!
 */
export function subscribeToSupabaseReadings(
  onNewReading: (reading: WeightReading) => void,
  tareWeightKg?: number
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channel = client
      .channel('realtime_lpg_readings_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'lpg_readings' },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const reading = mapRowToReading(payload.new, tareWeightKg);
            onNewReading(reading);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Subscribed to public.lpg_readings updates.');
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.error('Failed to setup Supabase Realtime subscription:', err);
    return null;
  }
}

/**
 * Upserts a single reading into Supabase
 */
export async function upsertReadingToSupabase(reading: WeightReading): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client not configured' };
  }

  try {
    const { error } = await client.from('lpg_readings').upsert({
      id: reading.id,
      timestamp: reading.timestamp,
      total_weight_kg: reading.totalWeightKg,
      remaining_gas_kg: reading.remainingGasKg,
      source: reading.source,
      notes: reading.notes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Batch syncs multiple local readings to Supabase
 */
export async function batchSyncReadingsToSupabase(readings: WeightReading[]): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client || readings.length === 0) {
    return { success: false, error: 'No client or no readings to sync' };
  }

  try {
    const rows = readings.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      total_weight_kg: r.totalWeightKg,
      remaining_gas_kg: r.remainingGasKg,
      source: r.source,
      notes: r.notes || null,
    }));

    const { error } = await client.from('lpg_readings').upsert(rows);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a reading from Supabase by ID
 */
export async function deleteReadingFromSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client not configured' };
  }

  try {
    const { error } = await client.from('lpg_readings').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Fetches cylinder configuration from Supabase
 */
export async function fetchConfigFromSupabase(): Promise<{ success: boolean; config?: CylinderConfig; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client not configured' };
  }

  try {
    const { data, error } = await client
      .from('lpg_config')
      .select('*')
      .eq('id', 'primary')
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'No config record found' };
    }

    const config: CylinderConfig = {
      tareWeightKg: parseFloat(data.tare_weight_kg),
      capacityKg: parseFloat(data.capacity_kg),
      lowGasThresholdPercent: parseFloat(data.low_gas_threshold_percent),
      criticalGasThresholdPercent: parseFloat(data.critical_gas_threshold_percent),
      depletionWarningDays: parseFloat(data.depletion_warning_days),
    };

    return { success: true, config };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Saves cylinder configuration to Supabase
 */
export async function saveConfigToSupabase(config: CylinderConfig): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client not configured' };
  }

  try {
    const { error } = await client.from('lpg_config').upsert({
      id: 'primary',
      tare_weight_kg: config.tareWeightKg,
      capacity_kg: config.capacityKg,
      low_gas_threshold_percent: config.lowGasThresholdPercent,
      critical_gas_threshold_percent: config.criticalGasThresholdPercent,
      depletion_warning_days: config.depletionWarningDays,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}
