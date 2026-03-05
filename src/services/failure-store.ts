import type { ApiFailure } from "@/data-layer/types";
import { readJsonFile, writeJsonFile } from "@/lib/persist";

const FILENAME = "failures.json";

let failures: ApiFailure[] = [];
let idSeq = 1;
let loaded = false;

function load(): void {
  if (loaded) return;
  loaded = true;
  const data = readJsonFile<ApiFailure[]>(FILENAME);
  if (Array.isArray(data)) {
    failures = data;
    const nums = data.map((f) => parseInt(f.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
    idSeq = nums.length ? Math.max(...nums) + 1 : 1;
  }
}

function save(): void {
  writeJsonFile(FILENAME, failures);
}

export function recordFailure(failure: Omit<ApiFailure, "id" | "timestamp" | "attempts">): ApiFailure {
  load();
  const entry: ApiFailure = {
    ...failure,
    id: `fail-${idSeq++}`,
    timestamp: new Date().toISOString(),
    attempts: 0,
  };
  failures.push(entry);
  save();
  return entry;
}

export function getFailure(id: string): ApiFailure | undefined {
  load();
  return failures.find((f) => f.id === id);
}

export function listFailures(limit = 50): ApiFailure[] {
  load();
  return [...failures].reverse().slice(0, limit);
}

export function updateFailure(
  id: string,
  patch: Partial<Pick<ApiFailure, "attempts" | "healed" | "ticketId">>
): ApiFailure | undefined {
  load();
  const f = failures.find((x) => x.id === id);
  if (!f) return undefined;
  Object.assign(f, patch);
  save();
  return f;
}
