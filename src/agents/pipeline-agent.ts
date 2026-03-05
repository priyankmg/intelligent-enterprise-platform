import type { TableId, SchemaChange } from "@/data-layer/types";
import {
  getImpactedPipelineIds,
  updatePipelineQuery,
  getPipelinesByTable,
} from "@/services/schema-store";

export interface PipelineAgentResult {
  updatedPipelineIds: string[];
  updates: { pipelineId: string; previousQuery: string; newQuery: string }[];
}

/**
 * Pipeline Agent: Given a schema change (and optionally which views were already
 * updated), finds reporting pipelines that depend on the changed columns and
 * updates their queries to align with the new schema (e.g. column renames,
 * new columns available for use).
 *
 * Invoked by the tech-stack MCP when the database monitoring agent detects
 * a schema change.
 */
export function runPipelineAgentForSchemaChange(
  tableId: TableId,
  schemaChanges: SchemaChange[],
  _updatedViewIds: string[]
): PipelineAgentResult {
  const affectedColumns = new Set(schemaChanges.map((c) => c.columnName));
  schemaChanges.forEach((c) => {
    if (c.newColumnName) affectedColumns.add(c.newColumnName);
  });
  const impactedIds = getImpactedPipelineIds(tableId, [...affectedColumns]);
  const updates: { pipelineId: string; previousQuery: string; newQuery: string }[] = [];
  const pipelines = getPipelinesByTable(tableId);

  for (const pipe of pipelines) {
    if (!impactedIds.includes(pipe.id)) continue;
    let newQuery = pipe.query;
    for (const change of schemaChanges) {
      if (!pipe.referencedColumns.includes(change.columnName)) continue;
      if (change.type === "column_renamed" && change.newColumnName) {
        const re = new RegExp(`\\b${escapeRegex(change.columnName)}\\b`, "g");
        newQuery = newQuery.replace(re, change.newColumnName);
      }
      if (change.type === "column_removed") {
        newQuery = removeColumnFromQuery(newQuery, change.columnName);
      }
    }
    if (newQuery !== pipe.query) {
      const updated = updatePipelineQuery(pipe.id, newQuery);
      if (updated) {
        updates.push({ pipelineId: pipe.id, previousQuery: pipe.query, newQuery: updated.query });
      }
    }
  }

  const updatedPipelineIds = [...new Set(updates.map((u) => u.pipelineId))];
  return { updatedPipelineIds, updates };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeColumnFromQuery(query: string, columnName: string): string {
  const re = new RegExp(`,\\s*${escapeRegex(columnName)}\\b|\\b${escapeRegex(columnName)}\\s*,`, "gi");
  return query.replace(re, (m) => (m.startsWith(",") ? "," : ""));
}
