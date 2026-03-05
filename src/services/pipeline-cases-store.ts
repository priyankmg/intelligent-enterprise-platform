import type { TableId } from "@/data-layer/types";
import { readJsonFile, writeJsonFile } from "@/lib/persist";

const FILENAME = "pipeline-cases.json";

export interface PipelineCaseRecord {
  id: string;
  timestamp: string;
  tableId: TableId;
  updatedPipelineIds: string[];
  message: string;
  triggeredBy: "database_monitoring" | "manual";
}

let cases: PipelineCaseRecord[] = [];
let idSeq = 1;
let loaded = false;

function load(): void {
  if (loaded) return;
  loaded = true;
  const data = readJsonFile<PipelineCaseRecord[]>(FILENAME);
  if (Array.isArray(data)) {
    cases = data;
    const nums = data.map((c) => parseInt(c.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
    idSeq = nums.length ? Math.max(...nums) + 1 : 1;
  }
}

function save(): void {
  writeJsonFile(FILENAME, cases);
}

export function recordPipelineCase(entry: Omit<PipelineCaseRecord, "id" | "timestamp">): PipelineCaseRecord {
  load();
  const full: PipelineCaseRecord = {
    ...entry,
    id: `pipe-${idSeq++}`,
    timestamp: new Date().toISOString(),
  };
  cases.push(full);
  save();
  return full;
}

export function listPipelineCases(limit = 50): PipelineCaseRecord[] {
  load();
  return [...cases].reverse().slice(0, limit);
}
