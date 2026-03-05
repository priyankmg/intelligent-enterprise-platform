import type { TableId, SchemaChange, TableColumnDef } from "@/data-layer/types";
import { setContractResponseSchema } from "@/data-layer/contracts";
import { runPipelineAgentForSchemaChange } from "@/agents/pipeline-agent";
import { recordSchemaContractUpdate } from "@/services/schema-contract-updates-store";
import { recordPipelineCase } from "@/services/pipeline-cases-store";

/**
 * Tech Stack MCP (Mock): Invokes downstream systems when the database monitoring
 * agent detects schema changes. In production this would call a real MCP server.
 *
 * - notifyApiHealingAgent: Updates the API data contract from the new schema
 *   so the self-healing agent / middle layer stays in sync.
 * - invokePipelineAgent: Triggers the pipeline agent to update reporting
 *   pipeline queries affected by the schema change.
 */

const ERP_TABLE_TO_SYSTEM = {
  erp_employees: "erp" as const,
  erp_leave: "leave" as const,
  erp_policies: "policy" as const,
};

export interface NotifyApiHealingResult {
  ok: boolean;
  contractUpdated: boolean;
  systemName?: string;
  message: string;
}

/**
 * Notify API / Self-Healing side: database schema changed → update the
 * corresponding API data contract so the middle layer and self-healing
 * agent use the new schema.
 */
export function notifyApiHealingAgent(
  tableId: TableId,
  newColumns: TableColumnDef[]
): NotifyApiHealingResult {
  const systemName = ERP_TABLE_TO_SYSTEM[tableId];
  if (!systemName) {
    return { ok: false, contractUpdated: false, message: `Unknown table ${tableId} for API contract` };
  }

  // Build a JSON Schema from the new table columns so the API contract matches the DB
  const properties: Record<string, { type: string }> = {};
  const required: string[] = [];
  for (const col of newColumns) {
    const jsonType =
      col.type === "date" ? "string" : col.type === "number" ? "number" : col.type === "boolean" ? "boolean" : "string";
    properties[col.name] = { type: jsonType };
    if (col.name !== "dateOfTermination" && col.name !== "managerId") {
      required.push(col.name);
    }
  }
  const responseSchema = {
    type: "object",
    properties,
    required: required.length ? required : ["id", "name", "email"],
  };

  setContractResponseSchema(systemName, responseSchema, `schema-${Date.now()}`);
  const message = `API contract for ${systemName} updated from DB schema (${newColumns.length} columns). Self-healing will use new contract on next sync.`;
  recordSchemaContractUpdate({
    systemName,
    tableId,
    message,
    columnCount: newColumns.length,
  });
  return {
    ok: true,
    contractUpdated: true,
    systemName,
    message,
  };
}

export interface InvokePipelineAgentResult {
  ok: boolean;
  pipelinesUpdated: string[];
  message: string;
}

/**
 * Invoke the pipeline agent via "tech stack MCP": schema change → pipeline
 * agent updates impacted reporting pipeline queries.
 */
export function invokePipelineAgentForSchemaChange(
  tableId: TableId,
  schemaChanges: SchemaChange[],
  updatedViewIds: string[]
): InvokePipelineAgentResult {
  const result = runPipelineAgentForSchemaChange(tableId, schemaChanges, updatedViewIds);
  const message = result.updatedPipelineIds.length
    ? `Pipeline agent updated ${result.updatedPipelineIds.length} pipeline(s): ${result.updatedPipelineIds.join(", ")}`
    : "No pipelines required updates.";
  recordPipelineCase({
    tableId,
    updatedPipelineIds: result.updatedPipelineIds,
    message,
    triggeredBy: "database_monitoring",
  });
  return {
    ok: true,
    pipelinesUpdated: result.updatedPipelineIds,
    message,
  };
}
