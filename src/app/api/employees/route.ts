import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { employees } from "@/data-layer/mock-data";

export async function GET(request: Request) {
  const user = getSessionUser();
  if (!canAccess(user, "employee_master", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const terminatedInMonths = searchParams.get("terminatedInMonths");
  let list = [...employees];
  if (terminatedInMonths) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - parseInt(terminatedInMonths, 10));
    list = list.filter(
      (e) => e.dateOfTermination && new Date(e.dateOfTermination) >= cutoff
    );
  }
  return NextResponse.json(list);
}
