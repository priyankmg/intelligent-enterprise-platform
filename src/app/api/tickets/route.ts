import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { listTickets } from "@/services/ticket-store";

export async function GET(request: Request) {
  const user = getSessionUser();
  if (!canAccess(user, "cases", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const systemName = searchParams.get("systemName") ?? undefined;
  const type = searchParams.get("type") as "engineering" | "fyi" | undefined;
  const list = listTickets(systemName, type);
  return NextResponse.json(list);
}
