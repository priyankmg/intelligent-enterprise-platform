import { NextResponse } from "next/server";
import { getSessionUser } from "@/abstraction-layer/iam";
import { canAccess } from "@/abstraction-layer/iam";
import { policies } from "@/data-layer/mock-data";

export async function GET() {
  const user = getSessionUser();
  if (!canAccess(user, "policy", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(policies);
}
