import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { runSelfHealingAgent } from "@/agents/self-healing-agent";

/** POST: run Self-Healing Agent for a failure (by failureId). Governance is enforced inside the agent. */
export async function POST(request: Request) {
  const user = getSessionUser();
  if (!canAccess(user, "employee_master", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const failureId = body.failureId as string;
  if (!failureId) {
    return NextResponse.json({ error: "Missing failureId" }, { status: 400 });
  }
  const result = await runSelfHealingAgent(failureId);
  if (!result) return NextResponse.json({ error: "Failure not found" }, { status: 404 });
  if ("blocked" in result && result.blocked)
    return NextResponse.json({ error: "Governance blocked", blockReason: result.blockReason }, { status: 403 });
  return NextResponse.json(result);
}
