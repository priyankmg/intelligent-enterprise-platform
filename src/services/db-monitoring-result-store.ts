import type { DatabaseMonitoringResult } from "@/data-layer/types";

let lastResult: DatabaseMonitoringResult | null = null;

export function setLastResult(result: DatabaseMonitoringResult): void {
  lastResult = result;
}

export function getLastResult(): DatabaseMonitoringResult | null {
  return lastResult ? { ...lastResult } : null;
}
