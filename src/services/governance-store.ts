import type {
  GovernanceEvent,
  GovernanceAnomaly,
  PolicyVersionRecord,
  GovernanceBiasFinding,
  GovernedAgentId,
} from "@/data-layer/types";
import { readJsonFile, writeJsonFile } from "@/lib/persist";

const EVENTS_FILE = "governance-events.json";
const ANOMALIES_FILE = "governance-anomalies.json";
const POLICY_VERSIONS_FILE = "governance-policy-versions.json";
const BIAS_FINDINGS_FILE = "governance-bias-findings.json";

let events: GovernanceEvent[] = [];
let anomalies: GovernanceAnomaly[] = [];
let policyVersions: PolicyVersionRecord[] = [];
let biasFindings: GovernanceBiasFinding[] = [];
let eventsLoaded = false;
let anomaliesLoaded = false;
let policyLoaded = false;
let biasLoaded = false;
let eventIdSeq = 1;
let anomalyIdSeq = 1;
let biasIdSeq = 1;

function loadEvents(): void {
  if (eventsLoaded) return;
  eventsLoaded = true;
  const data = readJsonFile<GovernanceEvent[]>(EVENTS_FILE);
  if (Array.isArray(data)) {
    events = data;
    const nums = data.map((e) => parseInt(e.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
    eventIdSeq = nums.length ? Math.max(...nums) + 1 : 1;
  }
}

function loadAnomalies(): void {
  if (anomaliesLoaded) return;
  anomaliesLoaded = true;
  const data = readJsonFile<GovernanceAnomaly[]>(ANOMALIES_FILE);
  if (Array.isArray(data)) anomalies = data;
  const nums = anomalies.map((a) => parseInt(a.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
  anomalyIdSeq = nums.length ? Math.max(...nums) + 1 : 1;
}

function loadPolicyVersions(): void {
  if (policyLoaded) return;
  policyLoaded = true;
  const data = readJsonFile<PolicyVersionRecord[]>(POLICY_VERSIONS_FILE);
  if (Array.isArray(data)) policyVersions = data;
}

function loadBiasFindings(): void {
  if (biasLoaded) return;
  biasLoaded = true;
  const data = readJsonFile<GovernanceBiasFinding[]>(BIAS_FINDINGS_FILE);
  if (Array.isArray(data)) {
    biasFindings = data;
    const nums = data.map((b) => parseInt(b.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
    biasIdSeq = nums.length ? Math.max(...nums) + 1 : 1;
  }
}

export function appendGovernanceEvent(event: Omit<GovernanceEvent, "id">): GovernanceEvent {
  loadEvents();
  const entry: GovernanceEvent = { ...event, id: `gov-evt-${eventIdSeq++}` };
  events.push(entry);
  writeJsonFile(EVENTS_FILE, events);
  return entry;
}

export function listGovernanceEvents(limit = 100, agentId?: GovernedAgentId): GovernanceEvent[] {
  loadEvents();
  let list = [...events].reverse();
  if (agentId) list = list.filter((e) => e.agentId === agentId);
  return list.slice(0, limit);
}

export function getRecentEventsByAgent(agentId: GovernedAgentId, sinceMs: number): GovernanceEvent[] {
  loadEvents();
  const since = Date.now() - sinceMs;
  return events.filter((e) => e.agentId === agentId && new Date(e.timestamp).getTime() >= since);
}

/** Counts per agent and per action type (read/write/delete) for events in the last sinceMs. */
export function getEventCountsByAgentAndActionType(sinceMs: number): Record<
  GovernedAgentId,
  { read: number; write: number; delete: number }
> {
  loadEvents();
  const since = Date.now() - sinceMs;
  const agentIds: GovernedAgentId[] = [
    "semantic_layer",
    "policy_evaluation",
    "termination_synthesis",
    "ai_assistant",
    "self_healing",
    "career_trajectory",
  ];
  const empty = (): { read: number; write: number; delete: number } => ({ read: 0, write: 0, delete: 0 });
  const counts: Record<GovernedAgentId, { read: number; write: number; delete: number }> = {} as Record<
    GovernedAgentId,
    { read: number; write: number; delete: number }
  >;
  for (const id of agentIds) counts[id] = { ...empty() };
  for (const e of events) {
    if (new Date(e.timestamp).getTime() < since) continue;
    const c = counts[e.agentId];
    if (!c) continue;
    if (e.actionClass === "read_data") c.read += 1;
    else if (e.actionClass === "write_record") c.write += 1;
    else if (e.actionClass === "delete_record") c.delete += 1;
  }
  return counts;
}

export function appendAnomaly(anomaly: Omit<GovernanceAnomaly, "id">): GovernanceAnomaly {
  loadAnomalies();
  const entry: GovernanceAnomaly = { ...anomaly, id: `gov-anom-${anomalyIdSeq++}` };
  anomalies.push(entry);
  writeJsonFile(ANOMALIES_FILE, anomalies);
  return entry;
}

export function listAnomalies(limit = 50, acknowledged?: boolean): GovernanceAnomaly[] {
  loadAnomalies();
  let list = [...anomalies].reverse();
  if (acknowledged !== undefined) list = list.filter((a) => a.acknowledged === acknowledged);
  return list.slice(0, limit);
}

export function acknowledgeAnomaly(id: string): void {
  loadAnomalies();
  const a = anomalies.find((x) => x.id === id);
  if (a) {
    a.acknowledged = true;
    writeJsonFile(ANOMALIES_FILE, anomalies);
  }
}

export function upsertPolicyVersion(record: PolicyVersionRecord): void {
  loadPolicyVersions();
  const idx = policyVersions.findIndex((p) => p.policyId === record.policyId);
  if (idx >= 0) policyVersions[idx] = record;
  else policyVersions.push(record);
  writeJsonFile(POLICY_VERSIONS_FILE, policyVersions);
}

export function getPolicyVersions(): PolicyVersionRecord[] {
  loadPolicyVersions();
  return [...policyVersions];
}

export function getPolicyVersion(policyId: string): PolicyVersionRecord | undefined {
  loadPolicyVersions();
  return policyVersions.find((p) => p.policyId === policyId);
}

export function appendBiasFinding(finding: Omit<GovernanceBiasFinding, "id">): GovernanceBiasFinding {
  loadBiasFindings();
  const entry: GovernanceBiasFinding = { ...finding, id: `gov-bias-${biasIdSeq++}` };
  biasFindings.push(entry);
  writeJsonFile(BIAS_FINDINGS_FILE, biasFindings);
  return entry;
}

export function listBiasFindings(limit = 50, acknowledged?: boolean): GovernanceBiasFinding[] {
  loadBiasFindings();
  let list = [...biasFindings].reverse();
  if (acknowledged !== undefined) list = list.filter((b) => b.acknowledged === acknowledged);
  return list.slice(0, limit);
}

export function acknowledgeBiasFinding(id: string): void {
  loadBiasFindings();
  const b = biasFindings.find((x) => x.id === id);
  if (b) {
    b.acknowledged = true;
    writeJsonFile(BIAS_FINDINGS_FILE, biasFindings);
  }
}
