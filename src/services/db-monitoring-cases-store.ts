import type { DatabaseMonitoringResult } from "@/data-layer/types";
import { readJsonFile, writeJsonFile } from "@/lib/persist";

const FILENAME = "db-monitoring-cases.json";

export interface DbMonitoringCaseRecord {
  id: string;
  runId: string;
  runAt: string;
  tableId: string;
  schemaChangeDetected: boolean;
  schemaChanges?: DatabaseMonitoringResult["schemaChanges"];
  viewsUpdated?: string[];
  pipelinesUpdated?: string[];
  apiHealingNotified?: boolean;
  pipelineAgentInvoked?: boolean;
  performanceDegraded?: boolean;
  performanceActions?: string[];
}

let cases: DbMonitoringCaseRecord[] = [];
let idSeq = 1;
let loaded = false;

function load(): void {
  if (loaded) return;
  loaded = true;
  const data = readJsonFile<DbMonitoringCaseRecord[]>(FILENAME);
  if (Array.isArray(data)) {
    cases = data;
    const nums = data.map((c) => parseInt(c.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
    idSeq = nums.length ? Math.max(...nums) + 1 : 1;
  }
}

function save(): void {
  writeJsonFile(FILENAME, cases);
}

export function recordDbMonitoringCase(result: DatabaseMonitoringResult, tableId = "erp_employees"): DbMonitoringCaseRecord {
  load();
  const entry: DbMonitoringCaseRecord = {
    id: `dbmon-${idSeq++}`,
    runId: result.runId,
    runAt: result.runAt,
    tableId,
    schemaChangeDetected: result.schemaChangeDetected,
    schemaChanges: result.schemaChanges,
    viewsUpdated: result.viewsUpdated,
    pipelinesUpdated: result.pipelinesUpdated,
    apiHealingNotified: result.apiHealingNotified,
    pipelineAgentInvoked: result.pipelineAgentInvoked,
    performanceDegraded: result.performanceDegraded,
    performanceActions: result.performanceActions,
  };
  cases.push(entry);
  save();
  return entry;
}

export function listDbMonitoringCases(limit = 50): DbMonitoringCaseRecord[] {
  load();
  return [...cases].reverse().slice(0, limit);
}
