import { NextResponse } from "next/server";
import { getSessionUser } from "@/abstraction-layer/iam";
import { canAccess } from "@/abstraction-layer/iam";
import { employees } from "@/data-layer/mock-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionUser();
  if (!canAccess(user, "employee_master", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const emp = employees.find((e) => e.id === id);
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(emp);
}
