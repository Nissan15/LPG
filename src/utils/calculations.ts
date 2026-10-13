import type { CylinderConfig, ForecastResult, WeightReading } from '../types/lpg';

/**
 * Calculates net remaining LPG gas from total weight and cylinder tare weight.
 * Prevents negative gas quantities.
 */
export function calculateRemainingGas(totalWeightKg: number, tareWeightKg: number): number {
  if (isNaN(totalWeightKg) || isNaN(tareWeightKg)) return 0;
  const net = totalWeightKg - tareWeightKg;
  return Math.max(0, parseFloat(net.toFixed(2)));
}

/**
 * Formats duration in days and hours into human-readable string.
 */
export function formatDaysAndHours(days: number | null, hours: number | null): string {
  if (days === null || hours === null) return 'N/A';
  if (days === 0 && hours === 0) return 'Depleted';
  if (days === 0) return `${hours} hr${hours !== 1 ? 's' : ''}`;
  if (hours === 0) return `${days} day${days !== 1 ? 's' : ''}`;
  return `${days}d ${hours}h`;
}

/**
 * Evaluates readings history and generates the depletion forecast.
 */
export function calculateForecast(
  readings: WeightReading[],
  config: CylinderConfig,
  currentWeightOverride?: number
): ForecastResult {
  // Sort chronologically ascending
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const latestReading = sorted[sorted.length - 1];
  const currentTotalWeight = currentWeightOverride !== undefined 
    ? currentWeightOverride 
    : (latestReading ? latestReading.totalWeightKg : config.tareWeightKg + config.capacityKg);

  const remainingGasKg = calculateRemainingGas(currentTotalWeight, config.tareWeightKg);
  const remainingPercent = config.capacityKg > 0 
    ? Math.min(100, Math.max(0, parseFloat(((remainingGasKg / config.capacityKg) * 100).toFixed(1))))
    : 0;

  // Base result skeleton
  const baseResult: ForecastResult = {
    status: 'insufficient_data',
    statusMessage: 'Collecting usage data: At least 2 timestamped readings are required.',
    currentTotalWeightKg: parseFloat(currentTotalWeight.toFixed(2)),
    remainingGasKg,
    remainingPercent,
    averageDailyConsumptionKg: 0,
    burnRatePerHourKg: 0,
    estimatedDaysRemaining: null,
    estimatedHoursRemaining: null,
    totalHoursRemaining: null,
    predictedDepletionDate: null,
    validIntervalCount: 0,
    totalObservedDays: 0,
    totalGasConsumedKg: 0,
    confidence: 'Insufficient',
    refillDetected: false,
  };

  // Check if gas is completely zero
  if (remainingGasKg <= 0.05 && sorted.length > 0) {
    return {
      ...baseResult,
      status: 'empty',
      statusMessage: 'Cylinder is empty. Please replace or refill the cylinder.',
      confidence: 'High',
    };
  }

  // Need at least 2 readings
  if (sorted.length < 2) {
    return {
      ...baseResult,
      status: 'insufficient_data',
      statusMessage: sorted.length === 0 
        ? 'Collecting usage data: No weight readings logged yet.' 
        : 'Collecting usage data: 1 reading logged. Record at least 1 more reading to calculate consumption.',
    };
  }

  // Segment readings to handle cylinder refills
  let refillDetected = false;
  let activeCycleStartIndex = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prevWeight = sorted[i - 1].totalWeightKg;
    const currWeight = sorted[i].totalWeightKg;
    if (currWeight > prevWeight + 0.5) {
      refillDetected = true;
      activeCycleStartIndex = i;
    }
  }

  const currentCycleReadings = sorted.slice(activeCycleStartIndex);
  const validIntervals: { consumedKg: number; daysElapsed: number }[] = [];
  const sourceReadings = currentCycleReadings.length >= 2 ? currentCycleReadings : sorted;

  for (let i = 1; i < sourceReadings.length; i++) {
    const prev = sourceReadings[i - 1];
    const curr = sourceReadings[i];

    const prevRemaining = calculateRemainingGas(prev.totalWeightKg, config.tareWeightKg);
    const currRemaining = calculateRemainingGas(curr.totalWeightKg, config.tareWeightKg);

    const prevTime = new Date(prev.timestamp).getTime();
    const currTime = new Date(curr.timestamp).getTime();

    const elapsedMs = currTime - prevTime;
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

    const consumedKg = prevRemaining - currRemaining;

    if (elapsedDays > 0.0001 && consumedKg >= 0) {
      validIntervals.push({
        consumedKg,
        daysElapsed: elapsedDays,
      });
    }
  }

  if (validIntervals.length === 0) {
    return {
      ...baseResult,
      refillDetected,
      status: 'insufficient_data',
      statusMessage: 'Collecting usage data: Need valid forward-timed readings to establish consumption rate.',
    };
  }

  const totalConsumedKg = validIntervals.reduce((sum, item) => sum + item.consumedKg, 0);
  const totalDays = validIntervals.reduce((sum, item) => sum + item.daysElapsed, 0);

  if (totalConsumedKg <= 0.01) {
    return {
      ...baseResult,
      refillDetected,
      validIntervalCount: validIntervals.length,
      totalObservedDays: parseFloat(totalDays.toFixed(2)),
      totalGasConsumedKg: 0,
      status: 'zero_consumption',
      statusMessage: 'Zero gas consumption measured between readings. Forecast will activate once usage begins.',
      confidence: 'Low',
    };
  }

  const averageDailyConsumptionKg = totalConsumedKg / totalDays;
  const burnRatePerHourKg = averageDailyConsumptionKg / 24;

  const daysRemaining = remainingGasKg / averageDailyConsumptionKg;
  const totalHoursRemaining = Math.max(0, Math.round(daysRemaining * 24));
  const estimatedDays = Math.floor(daysRemaining);
  const estimatedHours = Math.floor((daysRemaining - estimatedDays) * 24);

  const referenceTime = new Date(latestReading.timestamp).getTime();
  const predictedDepletionDate = new Date(referenceTime + (daysRemaining * 24 * 60 * 60 * 1000));

  let confidence: 'High' | 'Medium' | 'Low' | 'Insufficient' = 'Low';
  if (validIntervals.length >= 4 && totalDays >= 3) {
    confidence = 'High';
  } else if (validIntervals.length >= 2 && totalDays >= 1) {
    confidence = 'Medium';
  }

  return {
    status: 'ready',
    statusMessage: 'Forecast active based on recorded consumption history.',
    currentTotalWeightKg: parseFloat(currentTotalWeight.toFixed(2)),
    remainingGasKg,
    remainingPercent,
    averageDailyConsumptionKg: parseFloat(averageDailyConsumptionKg.toFixed(3)),
    burnRatePerHourKg: parseFloat(burnRatePerHourKg.toFixed(4)),
    estimatedDaysRemaining: Math.max(0, estimatedDays),
    estimatedHoursRemaining: Math.max(0, estimatedHours),
    totalHoursRemaining,
    predictedDepletionDate,
    validIntervalCount: validIntervals.length,
    totalObservedDays: parseFloat(totalDays.toFixed(2)),
    totalGasConsumedKg: parseFloat(totalConsumedKg.toFixed(2)),
    confidence,
    refillDetected,
  };
}

/**
 * Generates projection points for plotting depletion trajectory on chart.
 */
export function generateProjectionPoints(
  latestReading: WeightReading,
  avgDailyConsumptionKg: number,
  tareWeightKg: number,
  daysToProject: number = 14
): { dateStr: string; timestamp: string; projectedWeight: number; isProjected: boolean }[] {
  if (avgDailyConsumptionKg <= 0) return [];

  const points: { dateStr: string; timestamp: string; projectedWeight: number; isProjected: boolean }[] = [];
  const startTime = new Date(latestReading.timestamp).getTime();
  const startWeight = latestReading.totalWeightKg;

  for (let d = 1; d <= daysToProject; d += 2) {
    const projTime = new Date(startTime + d * 24 * 60 * 60 * 1000);
    const weightDrop = d * avgDailyConsumptionKg;
    const projectedWeight = Math.max(tareWeightKg, parseFloat((startWeight - weightDrop).toFixed(2)));

    points.push({
      dateStr: projTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: projTime.toISOString(),
      projectedWeight,
      isProjected: true,
    });

    if (projectedWeight <= tareWeightKg) {
      break;
    }
  }

  return points;
}
