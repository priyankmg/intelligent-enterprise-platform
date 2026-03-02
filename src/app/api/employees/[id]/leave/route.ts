import { NextResponse } from "next/server";
import { getSessionUser } from "@/abstraction-layer/iam";
import { canAccess } from "@/abstraction-layer/iam";
import {
  leaveBalances,
  leaveRecords,
} from "@/data-layer/mock-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionUser();
  if (!canAccess(user, "leave", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const balances = leaveBalances[id] ?? [];
  const records = leaveRecords.filter((r) => r.employeeId === id);
  return NextResponse.json({ balances, records });
}
