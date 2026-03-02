import { NextResponse } from "next/server";
import { getSessionUser } from "@/abstraction-layer/iam";
import { canAccess } from "@/abstraction-layer/iam";
import { hrCases } from "@/data-layer/mock-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionUser();
  if (!canAccess(user, "cases", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const cases = hrCases.filter((c) => c.employeeId === id);
  return NextResponse.json(cases);
}
