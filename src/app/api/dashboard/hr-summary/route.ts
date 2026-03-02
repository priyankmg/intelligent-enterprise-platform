import { NextResponse } from "next/server";
import { getSessionUser } from "@/abstraction-layer/iam";
import { canAccess } from "@/abstraction-layer/iam";
import {
  employees,
  attendanceToday,
  leaveBalances,
} from "@/data-layer/mock-data";

export async function GET(request: Request) {
  const user = getSessionUser();
  if (!canAccess(user, "employee_master", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "default";

  if (view === "came_to_work_today") {
    const presentIds = new Set(attendanceToday.map((a) => a.employeeId));
    const list = employees.filter((e) => presentIds.has(e.id));
    return NextResponse.json(list);
  }

  if (view === "low_leave_balance") {
    const low: typeof employees = [];
    for (const emp of employees) {
      const balances = leaveBalances[emp.id];
      if (!balances) continue;
      const total = balances.reduce((s, b) => s + b.balance, 0);
      if (total < 24) low.push(emp); // e.g. &lt; 24 hours
    }
    return NextResponse.json(low);
  }

  if (view === "terminated_last_month") {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 1);
    const list = employees.filter(
      (e) =>
        e.dateOfTermination &&
        new Date(e.dateOfTermination) >= cutoff
    );
    return NextResponse.json(list);
  }

  return NextResponse.json({
    totalEmployees: employees.length,
    presentToday: attendanceToday.length,
  });
}
