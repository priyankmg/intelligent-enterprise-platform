// 1.1 Employee Master (ERP)
export interface EmployeeAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface EmployeeMaster {
  id: string;
  name: string;
  email: string;
  dateOfHire: string;
  dateOfTermination?: string;
  team: string;
  managerId?: string;
  level: string;
  workLocation: string;
  /** Structured address for display; legacy string form also supported by API */
  address?: EmployeeAddress;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  maritalStatus?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  benefitsHistory: { effectiveDate: string; plan: string }[];
  teamHistory: { from: string; to?: string; team: string; managerId?: string }[];
}

// 1.2 Leave and Attendance
export interface LeaveBalance {
  employeeId: string;
  type: "sick" | "paid" | "floating" | "unpaid";
  balance: number;
  unit: "hours" | "days";
  accrued: number;
  used: number;
}
export interface LeaveRecord {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "denied";
  requestedAt: string;
}
export interface AttendanceRecord {
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: "present" | "absent" | "leave" | "holiday";
}

// 1.3 Disability and Accommodations
export interface AccommodationCase {
  id: string;
  employeeId: string;
  type: string;
  status: "submitted" | "under_review" | "approved" | "denied";
  submittedAt: string;
  decidedAt?: string;
  caseManagerId?: string;
  hasAttachments: boolean;
}

// 1.4 Performance and Feedback
export interface PerformanceReview {
  id: string;
  employeeId: string;
  cycle: string;
  selfInput?: string;
  managerRating?: number;
  finalDecision?: string;
  compensationChange?: string;
}
export interface Feedback {
  id: string;
  employeeId: string;
  fromEmployeeId: string;
  type: string;
  content: string;
  createdAt: string;
}

// 1.5 Employee Investigation and Cases
export interface CaseNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  type?: "interview" | "evidence" | "discussion" | "finding";
}

export interface HRCase {
  id: string;
  employeeId: string;
  type: "query" | "policy" | "safety" | "investigation" | "termination";
  subject: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
  assignedTo?: string;
  // Investigation / termination fields
  incidentDate?: string;
  initialFinding?: string;
  parentCaseId?: string; // termination case links to investigation
  caseNotes?: CaseNote[];
  terminationReason?: string; // set when HR submits formal termination
  rehireEligible?: boolean;
  appliedPolicyClauseId?: string; // for RAG: which policy clause was applied (e.g. restricted-area-device)
}

// 1.6 Training
export interface Training {
  id: string;
  name: string;
  type: "mandatory" | "optional" | "compliance" | "career";
  category: string;
  completed?: boolean;
  dueDate?: string;
}
export interface EmployeeTraining {
  employeeId: string;
  trainingId: string;
  status: "assigned" | "in_progress" | "completed";
  completedAt?: string;
}

// 1.7 Policy Central
export interface Policy {
  id: string;
  name: string;
  version: string;
  effectiveDate: string;
  body: string;
  category: string;
}

// IAM
export type Role = "employee" | "manager" | "hr" | "case_manager" | "admin";
export type SystemScope = "employee_master" | "leave" | "accommodations" | "performance" | "cases" | "training" | "policy";
export type Operation = "read" | "write" | "delete";

export interface UserGroup {
  id: string;
  name: string;
  permissions: { system: SystemScope; operation: Operation; attributeScope?: string }[];
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  employeeId: string;
  roles: Role[];
  groupIds: string[];
}

// Data aggregation snapshot (as of incident date)
export interface EmployeeSnapshot {
  snapshotDate: string;
  employee: EmployeeMaster;
  leave: { balances: LeaveBalance[]; records: LeaveRecord[] };
  attendance: AttendanceRecord[];
  accommodations: AccommodationCase[];
  performance: PerformanceReview[];
  cases: HRCase[];
  training: { training: Training; status: string }[];
  policies: Policy[];
}

// Policy metadata (for Semantic Layer Agent)
export interface PolicyClauseMetadata {
  id: string;
  name: string;
  description: string;
  severityLevel: "first_offense_minor" | "first_offense_severe" | "second_offense";
  howToInferFromSnapshot: string;
  rehireEligibilityRule: string;
}

export interface PolicyMetadata {
  policyId: string;
  policyName: string;
  effectiveDate: string;
  clauses: PolicyClauseMetadata[];
  definitions: Record<string, string>;
}

// Policy Evaluation Agent output
export interface PolicyEvaluationResult {
  appliedPolicyId: string;
  appliedClauseId: string;
  appliedClauseName: string;
  violated: boolean;
  evidence: string[];
  policyViolations: string[];
  inferredCorrectly: boolean;
  semanticLayerSummary?: string;
}

// Retrieval Augmentation Agent output
export interface SimilarCase {
  caseId: string;
  employeeId: string;
  subject: string;
  terminationReason: string;
  rehireEligible: boolean;
  appliedClauseId: string;
  similarity: string;
}

// AI agent recommendation for termination review (combined)
export interface TerminationRecommendation {
  recommendation: "recommend_termination" | "recommend_warning" | "insufficient_evidence";
  summary: string;
  evidence: string[];
  policyViolations: string[];
  mitigatingFactors: string[];
  similarCases: SimilarCase[];
  policyEvaluation: PolicyEvaluationResult;
  semanticLayerSummary?: string;
}

// --- Self-Healing Agent: API failure between middle layer and systems of record ---

export type SystemName = "erp" | "leave" | "attendance" | "accommodations" | "performance" | "cases" | "training" | "policy";

export type FailureKind = "request_rejected" | "response_contract_changed";

export interface ApiFailure {
  id: string;
  timestamp: string;
  systemName: SystemName;
  endpoint: string;
  method: string;
  kind: FailureKind;
  /** Request payload sent (if any) */
  requestPayload?: unknown;
  /** Raw response body from system (error or unexpected shape) */
  responseBody?: unknown;
  /** HTTP status if available */
  statusCode?: number;
  errorMessage: string;
  /** Current contract version/schema the middle layer expected (for comparison) */
  expectedRequestSchema?: Record<string, unknown>;
  expectedResponseSchema?: Record<string, unknown>;
  /** Healing attempts so far */
  attempts: number;
  healed?: boolean;
  ticketId?: string;
}

/** Data contract (simplified schema) the middle layer uses for a system */
export interface DataContract {
  version: string;
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
  /** Optional: allow extra fields in response */
  responseAllowAdditional?: boolean;
}

/** Ticket created by Self-Healing Agent for engineering or FYI */
export interface HealingTicket {
  id: string;
  type: "engineering" | "fyi";
  systemName: SystemName;
  failureId: string;
  createdAt: string;
  title: string;
  body: string;
  status: "open" | "acknowledged" | "resolved";
  /** What the agent identified as the issue */
  agentIdentification?: string;
  /** What the agent tried (fixes applied, retries) */
  agentAttempts?: string;
  /** For engineering: what the team must look at. For FYI: the fix applied */
  resolutionNote?: string;
}

// --- Database Monitoring Agent: ERP datatable schema, views, pipelines, indexing ---

export type TableId = "erp_employees" | "erp_leave" | "erp_policies";

/** Single column in a table schema */
export interface TableColumnDef {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "object";
  /** Optional: enum or rule description that affects views/pipelines */
  valueRules?: string;
}

/** Snapshot of a table schema at a point in time */
export interface TableSchemaSnapshot {
  tableId: TableId;
  version: string;
  columns: TableColumnDef[];
  detectedAt: string;
}

/** Detected change between two schema versions */
export type SchemaChangeType = "column_added" | "column_removed" | "column_renamed" | "column_type_changed" | "value_rules_changed";

export interface SchemaChange {
  type: SchemaChangeType;
  columnName: string;
  /** For renames: new name; for type/rules: new value */
  newColumnName?: string;
  newType?: TableColumnDef["type"];
  newValueRules?: string;
}

/** View or materialized view that depends on a table */
export interface ViewDef {
  id: string;
  name: string;
  tableId: TableId;
  /** Query text or reference; used to detect impact and rewrite */
  query: string;
  /** Column names this view references (for impact analysis) */
  referencedColumns: string[];
  lastUpdatedAt: string;
}

/** Reporting pipeline that reads from table(s) or views */
export interface PipelineDef {
  id: string;
  name: string;
  /** Source table or view id */
  sourceTableId: TableId;
  query: string;
  referencedColumns: string[];
  lastUpdatedAt: string;
}

/** Indexing performance sample */
export interface IndexingMetricsSample {
  tableId: TableId;
  rowCount: number;
  durationMs: number;
  sampledAt: string;
}

/** Outcome of DB monitoring agent run */
export interface DatabaseMonitoringResult {
  runId: string;
  runAt: string;
  schemaChangeDetected: boolean;
  schemaChanges?: SchemaChange[];
  viewsUpdated?: string[];
  pipelinesUpdated?: string[];
  apiHealingNotified?: boolean;
  pipelineAgentInvoked?: boolean;
  performanceDegraded?: boolean;
  performanceActions?: string[];
  indexingMetrics?: IndexingMetricsSample;
}

// --- Career trajectory classifier: feature vector and result ---

/**
 * Flattened feature vector for career trajectory classification (normalized 0–1 or raw for distance).
 * Intentionally excludes protected characteristics: age, gender, race, ethnicity, sexual orientation,
 * religion, disability status, marital status, nationality, or any other legally protected attributes.
 * Only job-relevant, performance-related signals are used.
 */
export interface CareerSnapshot {
  employeeId: string;
  /** Tenure in months */
  tenureMonths: number;
  /** Total leave balance (hours) */
  leaveBalanceHours: number;
  /** Average manager rating (1–5) across reviews */
  avgManagerRating: number;
  /** 1 if performance is improving (latest rating >= previous), else 0 */
  performanceImproving: number;
  /** Total HR/investigation/termination cases involving this employee */
  caseCount: number;
  /** Count of investigation + termination cases */
  seriousCaseCount: number;
  /** Ratio of completed to required/mandatory trainings (0–1) */
  trainingCompletedRatio: number;
  /** Level as number: L3=3, L4=4, L5=5, L6=6 */
  levelNumeric: number;
  /** Label for reference snapshots: outcome this employee had */
  outcome?: "growth" | "termination";
}

/** A single factor in the trajectory result, with optional link to case(s) or data value for grounding */
export interface CareerTrajectoryFactor {
  label: string;
  /** Case IDs so the UI can link to /cases/[id] */
  caseIds?: string[];
  /** Human-readable value from data (e.g. "12 hours", "2.0/5 avg") */
  value?: string;
}

export interface CareerTrajectoryResult {
  trend: "growth" | "termination" | "neutral";
  confidence: number;
  summary: string;
  factors: string[];
  /** Grounded factors with links to cases and actual numbers for the UI */
  factorItems: CareerTrajectoryFactor[];
  snapshot: CareerSnapshot;
}
