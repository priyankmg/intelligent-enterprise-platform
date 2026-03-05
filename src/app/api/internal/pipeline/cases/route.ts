import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { listPipelineCases } from "@/services/pipeline-cases-store";

/** GET: list pipeline healing cases (persisted). */
export async function GET() {
  try {
    const user = getSessionUser();
    if (!canAccess(user, "employee_master", "read"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const cases = listPipelineCases(50);
    return NextResponse.json(cases);
  } catch (e) {
    console.error("Pipeline cases error:", e);
    return NextResponse.json({ error: "Failed to list pipeline cases", message: String(e) }, { status: 500 });
  }
}
