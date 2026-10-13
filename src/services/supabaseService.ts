import { getSupabaseClient } from './supabaseClient';
import type { CylinderConfig, WeightReading } from '../types/lpg';

/**
 * Maps database row to application WeightReading model
 */
function mapRowToReading(row: any): WeightReading {
  return {
    id: row.id,
    timestamp: row.timestamp,
    totalWeightKg: parseFloat(row.total_weight_kg),
    remainingGasKg: parseFloat(row.remaining_gas_kg),
    source: row.source === 'esp32' ? 'esp32' : 'manual',
    notes: row.notes || undefined,
  };
}

/**
 * Fetches all readings from Supabase sorted chronologically ascending
 */
export async function fetchReadingsFromSupabase(): Promise<{ success: boolean; readings?: WeightReading[]; error?: string }> {
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

    const readings = (data || []).map(mapRowToReading);
    return { success: true, readings };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message };
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
