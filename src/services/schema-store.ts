import type {
  TableId,
  TableSchemaSnapshot,
  TableColumnDef,
  ViewDef,
  PipelineDef,
  SchemaChange,
} from "@/data-layer/types";

/** Current schema per table (last known by the monitoring agent) */
const currentSchemas: Record<TableId, TableSchemaSnapshot> = {} as Record<TableId, TableSchemaSnapshot>;

/** History of schema snapshots for diffing */
const schemaHistory: TableSchemaSnapshot[] = [];

/** Registered views that depend on tables */
const views: ViewDef[] = [];

/** Registered reporting pipelines */
const pipelines: PipelineDef[] = [];

// --- Seed ERP employees schema (matches EmployeeMaster fields we use in APIs) ---
const initialErpEmployeesSchema: TableSchemaSnapshot = {
  tableId: "erp_employees",
  version: "1.0",
  detectedAt: new Date().toISOString(),
  columns: [
    { name: "id", type: "string" },
    { name: "name", type: "string" },
    { name: "email", type: "string" },
    { name: "dateOfHire", type: "date" },
    { name: "dateOfTermination", type: "date" },
    { name: "team", type: "string" },
    { name: "managerId", type: "string" },
    { name: "level", type: "string" },
    { name: "workLocation", type: "string" },
    { name: "phone", type: "string" },
    { name: "dateOfBirth", type: "date" },
    { name: "nationality", type: "string" },
    { name: "maritalStatus", type: "string" },
    { name: "emergencyContact", type: "string" },
    { name: "emergencyContactPhone", type: "string" },
  ],
};

currentSchemas.erp_employees = initialErpEmployeesSchema;
schemaHistory.push({ ...initialErpEmployeesSchema });

// --- Seed sample views and pipelines ---
const now = () => new Date().toISOString();
views.push(
  {
    id: "view-1",
    name: "Active Employees List",
    tableId: "erp_employees",
    query: "SELECT id, name, email, team, level, workLocation FROM erp_employees WHERE dateOfTermination IS NULL",
    referencedColumns: ["id", "name", "email", "team", "level", "workLocation", "dateOfTermination"],
    lastUpdatedAt: now(),
  },
  {
    id: "view-2",
    name: "HR Headcount by Team",
    tableId: "erp_employees",
    query: "SELECT team, COUNT(*) AS headcount FROM erp_employees GROUP BY team",
    referencedColumns: ["team"],
    lastUpdatedAt: now(),
  }
);

pipelines.push(
  {
    id: "pipe-1",
    name: "Monthly Headcount Report",
    sourceTableId: "erp_employees",
    query: "SELECT team, level, workLocation, COUNT(*) FROM erp_employees WHERE dateOfTermination IS NULL GROUP BY team, level, workLocation",
    referencedColumns: ["team", "level", "workLocation", "dateOfTermination"],
    lastUpdatedAt: now(),
  },
  {
    id: "pipe-2",
    name: "New Hire Pipeline",
    sourceTableId: "erp_employees",
    query: "SELECT id, name, email, dateOfHire, team FROM erp_employees WHERE dateOfHire >= :reportStart",
    referencedColumns: ["id", "name", "email", "dateOfHire", "team"],
    lastUpdatedAt: now(),
  }
);

export function getCurrentSchema(tableId: TableId): TableSchemaSnapshot | undefined {
  return currentSchemas[tableId] ? { ...currentSchemas[tableId] } : undefined;
}

export function setCurrentSchema(snapshot: TableSchemaSnapshot): void {
  currentSchemas[snapshot.tableId] = { ...snapshot };
  schemaHistory.push({ ...snapshot });
}

export function getSchemaHistory(tableId: TableId, limit = 10): TableSchemaSnapshot[] {
  return schemaHistory
    .filter((s) => s.tableId === tableId)
    .slice(-limit)
    .map((s) => ({ ...s }));
}

/** Compare new schema with last known; returns list of changes */
export function diffSchema(
  tableId: TableId,
  newColumns: TableColumnDef[]
): SchemaChange[] {
  const current = currentSchemas[tableId];
  const changes: SchemaChange[] = [];
  const currentColMap = new Map((current?.columns ?? []).map((c) => [c.name, c]));
  const newColMap = new Map(newColumns.map((c) => [c.name, c]));

  const added: string[] = [];
  const removed: string[] = [];

  for (const col of newColumns) {
    const prev = currentColMap.get(col.name);
    if (!prev) {
      added.push(col.name);
      changes.push({ type: "column_added", columnName: col.name });
    } else {
      if (prev.type !== col.type) {
        changes.push({ type: "column_type_changed", columnName: col.name, newType: col.type });
      }
      if (prev.valueRules !== col.valueRules) {
        changes.push({
          type: "value_rules_changed",
          columnName: col.name,
          newValueRules: col.valueRules,
        });
      }
    }
  }
  for (const name of currentColMap.keys()) {
    if (!newColMap.has(name)) {
      removed.push(name);
      changes.push({ type: "column_removed", columnName: name });
    }
  }

  // If exactly one added and one removed, treat as column rename: replace added+removed with single renamed
  if (added.length === 1 && removed.length === 1) {
    return changes.filter(
      (c) => c.type !== "column_added" && c.type !== "column_removed"
    ).concat({
      type: "column_renamed" as const,
      columnName: removed[0],
      newColumnName: added[0],
    });
  }
  return changes;
}

export function getViewsByTable(tableId: TableId): ViewDef[] {
  return views.filter((v) => v.tableId === tableId).map((v) => ({ ...v }));
}

export function getPipelinesByTable(tableId: TableId): PipelineDef[] {
  return pipelines.filter((p) => p.sourceTableId === tableId).map((p) => ({ ...p }));
}

/** Return view/pipeline ids that reference any of the given column names */
export function getImpactedViewIds(tableId: TableId, columnNames: string[]): string[] {
  const set = new Set(columnNames);
  return views
    .filter((v) => v.tableId === tableId && v.referencedColumns.some((c) => set.has(c)))
    .map((v) => v.id);
}

export function getImpactedPipelineIds(tableId: TableId, columnNames: string[]): string[] {
  const set = new Set(columnNames);
  return pipelines
    .filter((p) => p.sourceTableId === tableId && p.referencedColumns.some((c) => set.has(c)))
    .map((p) => p.id);
}

export function updateViewQuery(viewId: string, newQuery: string): ViewDef | undefined {
  const v = views.find((x) => x.id === viewId);
  if (!v) return undefined;
  v.query = newQuery;
  v.lastUpdatedAt = new Date().toISOString();
  return { ...v };
}

export function updatePipelineQuery(pipelineId: string, newQuery: string): PipelineDef | undefined {
  const p = pipelines.find((x) => x.id === pipelineId);
  if (!p) return undefined;
  p.query = newQuery;
  p.lastUpdatedAt = new Date().toISOString();
  return { ...p };
}

export function getAllViews(): ViewDef[] {
  return views.map((v) => ({ ...v }));
}

export function getAllPipelines(): PipelineDef[] {
  return pipelines.map((p) => ({ ...p }));
}
