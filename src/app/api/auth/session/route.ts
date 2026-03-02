import { NextResponse } from "next/server";
import { getSessionUser } from "@/abstraction-layer/iam";

export async function GET() {
  const user = getSessionUser();
  return NextResponse.json(user);
}
