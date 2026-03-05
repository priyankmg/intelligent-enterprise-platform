import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { runCareerTrajectoryAgent } from "@/agents/career-trajectory-agent";
import { hrCases } from "@/data-layer/mock-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionUser();
  if (!canAccess(user, "employee_master", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const result = runCareerTrajectoryAgent(id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const seriousCases = hrCases.filter((c) => c.employeeId === id && (c.type === "investigation" || c.type === "termination"));
  const caseIds = seriousCases.map((c) => c.id);
  const factorItems = result.factorItems.map((item) => {
    if (item.label === "Investigation or termination-related cases on record" && caseIds.length > 0)
      return { ...item, caseIds };
    return item;
  });

  return NextResponse.json({ ...result, factorItems });
}
