import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { runCareerTrajectoryAgent } from "@/agents/career-trajectory-agent";
import { hrCases } from "@/data-layer/mock-data";
import { governanceCheckBeforeAction, governanceRecordAfterAction } from "@/services/governance-orchestrator";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionUser();
  if (!canAccess(user, "employee_master", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const check = governanceCheckBeforeAction({
    agentId: "career_trajectory",
    actionClass: "recommendation",
    dataScopesUsed: ["employee_snapshot", "performance", "leave", "cases", "training", "career_reference_data"],
    toolsUsed: ["buildCareerSnapshot", "kNNPredict"],
    policyIdsUsed: [],
    scope: { employeeId: id },
  });
  if (!check.allowed) {
    governanceRecordAfterAction({
      agentId: "career_trajectory",
      actionClass: "recommendation",
      riskLevel: "medium",
      scope: { employeeId: id },
      outcome: {},
      blastRadius: [id],
      scopeAllowed: check.scopeEnforcerAllowed,
      actionAllowed: check.actionClassifierAllowed,
      blockReason: check.blockReason,
    });
    return NextResponse.json({ error: "Governance blocked", blockReason: check.blockReason }, { status: 403 });
  }
  const result = runCareerTrajectoryAgent(id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  governanceRecordAfterAction({
    agentId: "career_trajectory",
    actionClass: "recommendation",
    riskLevel: "medium",
    scope: { employeeId: id },
    outcome: { trend: result.trend, confidence: result.confidence },
    decision: result.trend,
    blastRadius: [id],
    scopeAllowed: true,
    actionAllowed: true,
  });

  const seriousCases = hrCases.filter((c) => c.employeeId === id && (c.type === "investigation" || c.type === "termination"));
  const caseIds = seriousCases.map((c) => c.id);
  const factorItems = result.factorItems.map((item) => {
    if (item.label === "Investigation or termination-related cases on record" && caseIds.length > 0)
      return { ...item, caseIds };
    return item;
  });

  return NextResponse.json({ ...result, factorItems });
}
