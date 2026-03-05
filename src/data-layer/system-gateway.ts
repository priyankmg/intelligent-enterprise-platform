import type { SystemName } from "@/data-layer/types";
import { getContract } from "./contracts";
import { recordFailure } from "@/services/failure-store";
import { employees } from "./mock-data";
import { leaveBalances, leaveRecords } from "./mock-data";
import { policies } from "./mock-data";

export type GatewayResult<T> =
  | { ok: true; data: T }
  | { ok: false; failureId: string; errorMessage: string; responseBody?: unknown; statusCode?: number };

/**
 * Simulate a failure for demo. Set to a system name to make that system "break"
 * (e.g. return wrong response shape or request rejected).
 */
let simulateFailureForSystem: SystemName | null = null;

export function setSimulateFailure(system: SystemName | null): void {
  simulateFailureForSystem = system;
}

/** Call ERP (Employee Master) - used by middle layer */
export function callErp(endpoint: string, _params?: unknown): GatewayResult<typeof employees> {
  const system: SystemName = "erp";
  const contract = getContract(system);

  if (simulateFailureForSystem === system) {
    const failure = recordFailure({
      systemName: system,
      endpoint,
      method: "GET",
      kind: "response_contract_changed",
      errorMessage: "Response contract changed: system now returns 'employeeId' instead of 'id' and added 'hireDate' instead of 'dateOfHire'",
      responseBody: employees.map((e) => ({
        employeeId: e.id,
        fullName: e.name,
        emailAddress: e.email,
        hireDate: e.dateOfHire,
        department: e.team,
        level: e.level,
        location: e.workLocation,
      })),
      statusCode: 200,
      expectedResponseSchema: contract.responseSchema,
    });
    setSimulateFailure(null);
    return { ok: false, failureId: failure.id, errorMessage: failure.errorMessage, responseBody: failure.responseBody, statusCode: 200 };
  }

  return { ok: true, data: employees };
}

/** Call Leave system */
export function callLeave(
  endpoint: string,
  params: { employeeId?: string }
): GatewayResult<{ balances: unknown[]; records: unknown[] }> {
  const system: SystemName = "leave";
  const contract = getContract(system);

  if (simulateFailureForSystem === system) {
    const failure = recordFailure({
      systemName: system,
      endpoint,
      method: "GET",
      kind: "request_rejected",
      requestPayload: params,
      errorMessage: "Request rejected: API v2 requires 'empId' instead of 'employeeId'. Payload version mismatch.",
      responseBody: { error: "INVALID_PAYLOAD", message: "Unknown field 'employeeId'. Use 'empId'.", required: ["empId"] },
      statusCode: 400,
      expectedRequestSchema: contract.requestSchema,
    });
    setSimulateFailure(null);
    return { ok: false, failureId: failure.id, errorMessage: failure.errorMessage, responseBody: failure.responseBody, statusCode: 400 };
  }

  const empId = params?.employeeId ?? "";
  const balances = leaveBalances[empId] ?? [];
  const records = leaveRecords.filter((r) => r.employeeId === empId);
  return { ok: true, data: { balances, records } };
}

/** Call Policy system */
export function callPolicy(endpoint: string): GatewayResult<typeof policies> {
  const system: SystemName = "policy";
  if (simulateFailureForSystem === system) {
    const failure = recordFailure({
      systemName: system,
      endpoint,
      method: "GET",
      kind: "response_contract_changed",
      errorMessage: "Response contract changed: policies now return 'content' instead of 'body'",
      responseBody: policies.map((p) => ({ ...p, content: p.body })),
      statusCode: 200,
      expectedResponseSchema: getContract(system).responseSchema,
    });
    setSimulateFailure(null);
    return { ok: false, failureId: failure.id, errorMessage: failure.errorMessage, responseBody: failure.responseBody, statusCode: 200 };
  }
  return { ok: true, data: policies };
}
