import type {
  TableId,
  TableSchemaSnapshot,
  TableColumnDef,
  SchemaChange,
  DatabaseMonitoringResult,
} from "@/data-layer/types";
import {
  getCurrentSchema,
  setCurrentSchema,
  diffSchema,
  getImpactedViewIds,
  getImpactedPipelineIds,
  updateViewQuery,
  getViewsByTable,
  getPipelinesByTable,
} from "@/services/schema-store";
import {
  getLatestSample,
  recordIndexingSample,
  isIndexingDegraded,
  getDegradationThresholdMs,
  getLargeTableThreshold,
} from "@/services/indexing-metrics-store";
import {
  notifyApiHealingAgent,
  invokePipelineAgentForSchemaChange,
} from "@/services/tech-stack-mcp";

/** Source of "current" schema from ERP (mock: we return a modified copy for testing) */
export type ErpSchemaProvider = (tableId: TableId) => TableColumnDef[];

const defaultErpSchemaProvider: ErpSchemaProvider = (tableId: TableId) => {
  const current = getCurrentSchema(tableId);
  if (!current) return [];
  return current.columns.map((c) => ({ ...c }));
};

/**
 * Database Monitoring Agent:
 * 1. Schema change detection → update impacted views/pipelines; notify API healing + pipeline agent via MCP.
 * 2. Performance monitoring → detect indexing degradation; apply caching / priority indexing recommendations.
 */
export async function runDatabaseMonitoringAgent(
  options: {
    tableId?: TableId;
    /** Inject "current" schema from ERP (e.g. with a new column to simulate change) */
    erpSchemaProvider?: ErpSchemaProvider;
    /** Inject indexing sample to simulate growth/degradation */
    injectIndexingSample?: { rowCount: number; durationMs: number };
  } = {}
): Promise<DatabaseMonitoringResult> {
  const runId = `dbmon-${Date.now()}`;
  const runAt = new Date().toISOString();
  const tableId: TableId = options.tableId ?? "erp_employees";
  const provider = options.erpSchemaProvider ?? defaultErpSchemaProvider;

  const result: DatabaseMonitoringResult = {
    runId,
    runAt,
    schemaChangeDetected: false,
    performanceDegraded: false,
    performanceActions: [],
  };

  // --- 1. Fetch "current" schema from ERP (mock provider) and compare ---
  const newColumns = provider(tableId);
  if (newColumns.length === 0) return result;

  const prevSnapshot = getCurrentSchema(tableId);
  const changes = prevSnapshot ? diffSchema(tableId, newColumns) : [];

  if (changes.length > 0) {
    result.schemaChangeDetected = true;
    result.schemaChanges = changes;

    const affectedColumnNames = new Set(changes.map((c) => c.columnName));
    changes.forEach((c) => {
      if (c.newColumnName) affectedColumnNames.add(c.newColumnName);
    });

    // 1a. Update impacted views' queries (column renames, removals)
    const impactedViewIds = getImpactedViewIds(tableId, [...affectedColumnNames]);
    const viewsUpdated: string[] = [];
    for (const view of getViewsByTable(tableId)) {
      if (!impactedViewIds.includes(view.id)) continue;
      let newQuery = view.query;
      for (const ch of changes) {
        if (ch.type === "column_renamed" && ch.newColumnName) {
          const re = new RegExp(`\\b${escapeRe(ch.columnName)}\\b`, "g");
          newQuery = newQuery.replace(re, ch.newColumnName);
        }
        if (ch.type === "column_removed") {
          newQuery = removeColumnFromQuery(newQuery, ch.columnName);
        }
      }
      if (newQuery !== view.query) {
        updateViewQuery(view.id, newQuery);
        viewsUpdated.push(view.id);
      }
    }
    result.viewsUpdated = viewsUpdated;

    // 1b. Persist new schema as current
    setCurrentSchema({
      tableId,
      version: `${prevSnapshot?.version ?? "0"}-${Date.now()}`,
      columns: newColumns.map((c) => ({ ...c })),
      detectedAt: runAt,
    });

    // 1c. Invoke tech-stack MCP: notify API healing agent (update data contract)
    const apiResult = notifyApiHealingAgent(tableId, newColumns);
    result.apiHealingNotified = apiResult.ok && apiResult.contractUpdated;

    // 1d. Invoke tech-stack MCP: pipeline agent for cascading pipeline query updates
    const pipeResult = invokePipelineAgentForSchemaChange(tableId, changes, viewsUpdated);
    result.pipelineAgentInvoked = pipeResult.ok;
    result.pipelinesUpdated = pipeResult.pipelinesUpdated ?? [];
  }

  // --- 2. Performance monitoring: indexing duration ---
  if (options.injectIndexingSample) {
    recordIndexingSample({
      tableId,
      rowCount: options.injectIndexingSample.rowCount,
      durationMs: options.injectIndexingSample.durationMs,
    });
  }

  const perf = isIndexingDegraded(tableId);
  if (perf.degraded && perf.latest) {
    result.performanceDegraded = true;
    result.indexingMetrics = perf.latest;
    result.performanceActions = [
      "Enable caching for most popular metadata (e.g. team, level, workLocation).",
      "Prioritize indexing on high-traffic columns to reduce overall index build time.",
      "Consider partitioning table by date or team for large row counts.",
    ];
  } else if (perf.latest) {
    result.indexingMetrics = perf.latest;
  }

  return result;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeColumnFromQuery(query: string, columnName: string): string {
  const re = new RegExp(
    `,\\s*${escapeRe(columnName)}\\b|\\b${escapeRe(columnName)}\\s*,`,
    "gi"
  );
  return query.replace(re, (m) => (m.startsWith(",") ? "," : ""));
}

/** Return current degradation threshold and large-table threshold for UI */
export function getIndexingThresholds() {
  return {
    degradationThresholdMs: getDegradationThresholdMs(),
    largeTableThreshold: getLargeTableThreshold(),
  };
}
