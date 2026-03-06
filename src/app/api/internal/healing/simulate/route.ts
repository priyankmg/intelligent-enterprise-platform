import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { setSimulateFailure, callErp, callLeave, callPolicy } from "@/data-layer/system-gateway";
import { runSelfHealingAgent } from "@/agents/self-healing-agent";
import type { SystemName } from "@/data-layer/types";

/**
 * Single endpoint: set simulate flag and immediately call the system in the same
 * request so the failure is recorded and healing runs without relying on cross-request state.
 */
export async function POST(request: Request) {
  try {
    const user = getSessionUser();
    if (!canAccess(user, "employee_master", "read"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const system = (body.system ?? "erp") as SystemName;
    if (!["erp", "leave", "policy"].includes(system)) {
      return NextResponse.json({ error: "Invalid system. Use erp, leave, or policy." }, { status: 400 });
    }

    setSimulateFailure(system);

    if (system === "erp") {
      const result = callErp("/employees", {});
      if (!result.ok) {
        const healing = await runSelfHealingAgent(result.failureId);
        const healingResult = healing && !("blocked" in healing) ? healing : null;
        return NextResponse.json({
          ok: true,
          failureId: result.failureId,
          healed: healingResult?.healed ?? false,
          ticketId: healingResult?.ticketId,
          message: healingResult?.healed ? "Case created and healed." : "Case created; requires attention.",
        });
      }
    } else if (system === "leave") {
      const result = callLeave("/employees/emp-1/leave", { employeeId: "emp-1" });
      if (!result.ok) {
        const healing = await runSelfHealingAgent(result.failureId);
        const healingResult = healing && !("blocked" in healing) ? healing : null;
        return NextResponse.json({
          ok: true,
          failureId: result.failureId,
          healed: healingResult?.healed ?? false,
          ticketId: healingResult?.ticketId,
          message: healingResult?.healed ? "Case created and healed." : "Case created; requires attention.",
        });
      }
    } else {
      const result = callPolicy("/policies");
      if (!result.ok) {
        const healing = await runSelfHealingAgent(result.failureId);
        const healingResult = healing && !("blocked" in healing) ? healing : null;
        return NextResponse.json({
          ok: true,
          failureId: result.failureId,
          healed: healingResult?.healed ?? false,
          ticketId: healingResult?.ticketId,
          message: healingResult?.healed ? "Case created and healed." : "Case created; requires attention.",
        });
      }
    }

    setSimulateFailure(null);
    return NextResponse.json({
      ok: true,
      message: "No failure was triggered (unexpected). Try again.",
    });
  } catch (err) {
    console.error("Simulate/healing error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Simulate failed", message: String(err) },
      { status: 200 }
    );
  }
}
