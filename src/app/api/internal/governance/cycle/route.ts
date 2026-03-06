import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { runGovernanceBackgroundCycle } from "@/services/governance-orchestrator";

/** POST: run one governance background cycle (anomaly, policy, bias). Called periodically by the runner. */
export async function POST() {
  const user = getSessionUser();
  if (!canAccess(user, "employee_master", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = runGovernanceBackgroundCycle();
  return NextResponse.json(result);
}
