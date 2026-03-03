import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { hrCases } from "@/data-layer/mock-data";

export async function GET(request: Request) {
  const user = getSessionUser();
  if (!canAccess(user, "cases", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const assignedToMe = searchParams.get("assignedToMe");
  let list = [...hrCases];
  if (type) list = list.filter((c) => c.type === type);
  if (assignedToMe === "true") list = list.filter((c) => c.assignedTo === user.id);
  return NextResponse.json(list);
}
