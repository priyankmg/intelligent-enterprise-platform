import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { getEmployeeSnapshot } from "@/services/data-aggregation";
import { hrCases } from "@/data-layer/mock-data";

/**
 * Data aggregation: when HR initiates termination review, pull employee snapshot
 * from all systems as of incident date.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionUser();
  if (!canAccess(user, "cases", "read") || !canAccess(user, "employee_master", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const c = hrCases.find((x) => x.id === id);
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  const incidentDate = c.incidentDate ?? c.createdAt.slice(0, 10);
  const snapshot = getEmployeeSnapshot(c.employeeId, incidentDate);
  if (!snapshot) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  return NextResponse.json(snapshot);
}
