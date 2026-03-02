import { NextResponse } from "next/server";
import { getSessionUser } from "@/abstraction-layer/iam";
import { canAccess } from "@/abstraction-layer/iam";
import { trainings, employeeTrainings } from "@/data-layer/mock-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionUser();
  if (!canAccess(user, "training", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const assigned = employeeTrainings.filter((et) => et.employeeId === id);
  const withDetails = assigned.map((et) => {
    const t = trainings.find((x) => x.id === et.trainingId);
    return { ...et, training: t };
  });
  return NextResponse.json(withDetails);
}
