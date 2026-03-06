import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import {
  listGovernanceEvents,
  listAnomalies,
  listBiasFindings,
  getPolicyVersions,
  getEventCountsByAgentAndActionType,
} from "@/services/governance-store";
import { getActionClassPolicies } from "@/agents/governance/action-classifier-agent";
import { getScopePolicy, agentAuthorizedActions, governedAgentLabels } from "@/data-layer/governance-config";
import type { GovernedAgentId } from "@/data-layer/types";

const GOVERNED_AGENT_IDS: GovernedAgentId[] = [
  "semantic_layer",
  "policy_evaluation",
  "termination_synthesis",
  "ai_assistant",
  "self_healing",
  "career_trajectory",
];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** GET: governance status, recent events, anomalies, bias findings, policy versions, action/scope config, action classifier summary. */
export async function GET(request: Request) {
  const user = getSessionUser();
  if (!canAccess(user, "employee_master", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId") ?? undefined;
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10) || 50);
  const events = listGovernanceEvents(limit, agentId as GovernedAgentId | undefined);
  const anomalies = listAnomalies(50);
  const biasFindings = listBiasFindings(50);
  const policyVersions = getPolicyVersions();
  const actionPolicies = getActionClassPolicies();
  const scopePolicies = GOVERNED_AGENT_IDS.map((id) => getScopePolicy(id)).filter(Boolean);
  const last7DayCounts = getEventCountsByAgentAndActionType(SEVEN_DAYS_MS);
  const actionClassifierSummary = GOVERNED_AGENT_IDS.map((id) => ({
    agentId: id,
    label: governedAgentLabels[id],
    authorized: agentAuthorizedActions[id],
    last7Days: last7DayCounts[id],
  }));
  return NextResponse.json({
    events,
    anomalies,
    biasFindings,
    policyVersions,
    actionPolicies,
    scopePolicies,
    actionClassifierSummary,
  });
}
