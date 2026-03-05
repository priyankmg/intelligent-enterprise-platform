import type { TableId, IndexingMetricsSample } from "@/data-layer/types";

const samples: IndexingMetricsSample[] = [];
const MAX_SAMPLES = 100;

/** Baseline: above this duration (ms) we consider indexing degraded */
const DEGRADATION_THRESHOLD_MS = 2000;
/** Row count above which we start caring about performance */
const LARGE_TABLE_THRESHOLD = 100_000;

export function recordIndexingSample(sample: Omit<IndexingMetricsSample, "sampledAt">): IndexingMetricsSample {
  const full: IndexingMetricsSample = {
    ...sample,
    sampledAt: new Date().toISOString(),
  };
  samples.push(full);
  if (samples.length > MAX_SAMPLES) samples.shift();
  return { ...full };
}

export function getLatestSample(tableId: TableId): IndexingMetricsSample | undefined {
  const found = [...samples].reverse().find((s) => s.tableId === tableId);
  return found ? { ...found } : undefined;
}

export function getRecentSamples(tableId: TableId, count = 20): IndexingMetricsSample[] {
  return samples
    .filter((s) => s.tableId === tableId)
    .slice(-count)
    .map((s) => ({ ...s }));
}

/** Returns true if latest indexing is degraded (slow) for a large table */
export function isIndexingDegraded(tableId: TableId): {
  degraded: boolean;
  latest?: IndexingMetricsSample;
  thresholdMs: number;
} {
  const latest = getLatestSample(tableId);
  if (!latest) return { degraded: false, thresholdMs: DEGRADATION_THRESHOLD_MS };
  const degraded =
    latest.rowCount >= LARGE_TABLE_THRESHOLD && latest.durationMs >= DEGRADATION_THRESHOLD_MS;
  return {
    degraded,
    latest: { ...latest },
    thresholdMs: DEGRADATION_THRESHOLD_MS,
  };
}

export function getDegradationThresholdMs(): number {
  return DEGRADATION_THRESHOLD_MS;
}

export function getLargeTableThreshold(): number {
  return LARGE_TABLE_THRESHOLD;
}
