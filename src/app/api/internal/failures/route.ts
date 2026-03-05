import { NextResponse } from "next/server";
import { getSessionUser, canAccess } from "@/abstraction-layer/iam";
import { recordFailure, listFailures } from "@/services/failure-store";
import type { SystemName } from "@/data-layer/types";

/** GET: list recent failures. POST: record a new failure (or trigger simulated failure). */
export async function GET() {
  const user = getSessionUser();
  if (!canAccess(user, "employee_master", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const list = listFailures();
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  const user = getSessionUser();
  if (!canAccess(user, "employee_master", "read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (body.simulate === true && body.system) {
    const { setSimulateFailure } = await import("@/data-layer/system-gateway");
    setSimulateFailure(body.system as SystemName);
    return NextResponse.json({ ok: true, message: `Next call to system '${body.system}' will simulate a failure` });
  }
  const { systemName, endpoint, method, kind, errorMessage, responseBody, requestPayload, statusCode, expectedRequestSchema, expectedResponseSchema } = body;
  if (!systemName || !endpoint || !method || !kind || !errorMessage) {
    return NextResponse.json({ error: "Missing required fields: systemName, endpoint, method, kind, errorMessage" }, { status: 400 });
  }
  const failure = recordFailure({
    systemName,
    endpoint,
    method,
    kind,
    errorMessage,
    responseBody,
    requestPayload,
    statusCode,
    expectedRequestSchema,
    expectedResponseSchema,
  });
  return NextResponse.json(failure);
}
