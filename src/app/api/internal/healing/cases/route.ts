import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { listFailures } from "@/services/failure-store";
import { getTicket } from "@/services/ticket-store";
import { listSchemaContractUpdates } from "@/services/schema-contract-updates-store";

export interface HealingCase {
  caseId: string;
  timestamp: string;
  title: string;
  status: "healed" | "requires_attention";
  issueDescription: string;
  stepsTaken: string;
  outcome: string;
  systemName: string;
  kind: string;
  endpoint: string;
  ticketId?: string;
  canRunHealing: boolean;
  source?: "failure" | "schema_change";
}

/** GET: list healing cases (failures + schema-driven contract updates). */
export async function GET() {
  const user = getSessionUser();
  if (!canAccess(user, "employee_master", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const failures = listFailures();
  const schemaUpdates = listSchemaContractUpdates();

  const failureCases: HealingCase[] = failures.map((f) => {
    const ticket = f.ticketId ? getTicket(f.ticketId) : undefined;
    const healed = f.healed === true;
    const status: "healed" | "requires_attention" = healed ? "healed" : "requires_attention";
    const issueType = `${f.systemName.toUpperCase()} · ${f.kind.replace(/_/g, " ")}`;
    const title = `${issueType} : ${healed ? "Healed" : "Requires attention"}`;
    return {
      caseId: f.id,
      timestamp: f.timestamp,
      title,
      status,
      issueDescription: f.errorMessage,
      stepsTaken: ticket?.agentAttempts ?? "—",
      outcome: ticket?.resolutionNote ?? (healed ? "Agent updated contract and retry succeeded." : "Agent could not resolve; engineering ticket created."),
      systemName: f.systemName,
      kind: f.kind,
      endpoint: f.endpoint,
      ticketId: f.ticketId,
      canRunHealing: !f.ticketId,
      source: "failure" as const,
    };
  });

  const schemaCases: HealingCase[] = schemaUpdates.map((s) => ({
    caseId: s.id,
    timestamp: s.timestamp,
    title: `Schema change → API contract updated (${s.systemName})`,
    status: "healed" as const,
    issueDescription: s.message,
    stepsTaken: "Database monitoring agent detected schema change; tech-stack MCP updated API data contract.",
    outcome: `Contract for ${s.systemName} updated with ${s.columnCount} columns.`,
    systemName: s.systemName,
    kind: "schema_change",
    endpoint: s.tableId,
    canRunHealing: false,
    source: "schema_change" as const,
  }));

  const cases = [...failureCases, ...schemaCases].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return NextResponse.json(cases);
}
