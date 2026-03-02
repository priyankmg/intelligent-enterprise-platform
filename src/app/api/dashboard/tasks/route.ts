import { NextResponse } from "next/server";
import { getSessionUser } from "@/abstraction-layer/iam";
import { hrCases, leaveRecords, accommodationCases } from "@/data-layer/mock-data";

export async function GET() {
  const user = getSessionUser();
  const openCases = hrCases.filter(
    (c) => c.assignedTo === user.id && c.status !== "resolved"
  );
  const pendingLeaves = leaveRecords.filter((r) => r.status === "pending");
  const pendingAccommodations = accommodationCases.filter(
    (a) => a.status === "under_review" || a.status === "submitted"
  );
  const tasks = [
    ...openCases.map((c) => ({
      id: c.id,
      type: "case" as const,
      title: c.subject,
      status: c.status,
      createdAt: c.createdAt,
      late: false,
    })),
    ...pendingLeaves.map((r) => ({
      id: r.id,
      type: "leave" as const,
      title: `Leave request: ${r.type} ${r.startDate}–${r.endDate}`,
      status: r.status,
      createdAt: r.requestedAt,
      late: false,
    })),
    ...pendingAccommodations.map((a) => ({
      id: a.id,
      type: "accommodation" as const,
      title: `Accommodation: ${a.type}`,
      status: a.status,
      createdAt: a.submittedAt,
      late: false,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return NextResponse.json({ tasks });
}
