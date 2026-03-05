import { readJsonFile, writeJsonFile } from "@/lib/persist";

const FILENAME = "schema-contract-updates.json";

export interface SchemaContractUpdateCase {
  id: string;
  timestamp: string;
  systemName: string;
  tableId: string;
  message: string;
  columnCount: number;
}

let cases: SchemaContractUpdateCase[] = [];
let idSeq = 1;
let loaded = false;

function load(): void {
  if (loaded) return;
  loaded = true;
  const data = readJsonFile<SchemaContractUpdateCase[]>(FILENAME);
  if (Array.isArray(data)) {
    cases = data;
    const nums = data.map((c) => parseInt(c.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
    idSeq = nums.length ? Math.max(...nums) + 1 : 1;
  }
}

function save(): void {
  writeJsonFile(FILENAME, cases);
}

export function recordSchemaContractUpdate(entry: Omit<SchemaContractUpdateCase, "id" | "timestamp">): SchemaContractUpdateCase {
  load();
  const full: SchemaContractUpdateCase = {
    ...entry,
    id: `schema-${idSeq++}`,
    timestamp: new Date().toISOString(),
  };
  cases.push(full);
  save();
  return full;
}

export function listSchemaContractUpdates(limit = 50): SchemaContractUpdateCase[] {
  load();
  return [...cases].reverse().slice(0, limit);
}
