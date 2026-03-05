import type { SystemName, DataContract } from "@/data-layer/types";

/**
 * Data contracts (request/response schema) the middle layer uses when calling
 * each system of record. The Self-Healing Agent can update these when it
 * detects payload version or response contract changes.
 */
const contracts: Record<SystemName, DataContract> = {
  erp: {
    version: "1.0",
    responseSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        email: { type: "string" },
        dateOfHire: { type: "string" },
        team: { type: "string" },
        level: { type: "string" },
        workLocation: { type: "string" },
      },
      required: ["id", "name", "email", "dateOfHire", "team", "level"],
    },
    responseAllowAdditional: true,
  },
  leave: {
    version: "1.0",
    responseSchema: {
      type: "object",
      properties: {
        balances: { type: "array" },
        records: { type: "array" },
      },
      required: ["balances", "records"],
    },
    responseAllowAdditional: true,
  },
  attendance: { version: "1.0", responseAllowAdditional: true },
  accommodations: { version: "1.0", responseAllowAdditional: true },
  performance: { version: "1.0", responseAllowAdditional: true },
  cases: { version: "1.0", responseAllowAdditional: true },
  training: { version: "1.0", responseAllowAdditional: true },
  policy: { version: "1.0", responseAllowAdditional: true },
};

export function getContract(systemName: SystemName): DataContract {
  return { ...contracts[systemName] };
}

export function updateContract(
  systemName: SystemName,
  update: Partial<DataContract>
): DataContract {
  const current = contracts[systemName];
  contracts[systemName] = { ...current, ...update };
  return contracts[systemName];
}

export function setContractResponseSchema(
  systemName: SystemName,
  responseSchema: Record<string, unknown>,
  version?: string
): void {
  const c = contracts[systemName];
  c.responseSchema = responseSchema;
  if (version) c.version = version;
}

export function setContractRequestSchema(
  systemName: SystemName,
  requestSchema: Record<string, unknown>,
  version?: string
): void {
  const c = contracts[systemName];
  c.requestSchema = requestSchema;
  if (version) c.version = version;
}
