import type {
  EmployeeMaster,
  LeaveBalance,
  LeaveRecord,
  AttendanceRecord,
  AccommodationCase,
  PerformanceReview,
  HRCase,
  Training,
  EmployeeTraining,
  Policy,
  UserGroup,
} from "./types";

export const employees: EmployeeMaster[] = [
  {
    id: "emp-1",
    name: "Alex Chen",
    email: "alex.chen@company.com",
    dateOfHire: "2021-03-15",
    team: "Product",
    managerId: "emp-2",
    level: "L4",
    workLocation: "HQ",
    teamHistory: [{ from: "2021-03-15", team: "Product", managerId: "emp-2" }],
    benefitsHistory: [{ effectiveDate: "2021-03-15", plan: "Standard" }],
  },
  {
    id: "emp-2",
    name: "Jordan Lee",
    email: "jordan.lee@company.com",
    dateOfHire: "2019-06-01",
    team: "Product",
    level: "L6",
    workLocation: "HQ",
    teamHistory: [{ from: "2019-06-01", team: "Product" }],
    benefitsHistory: [{ effectiveDate: "2019-06-01", plan: "Premium" }],
  },
  {
    id: "emp-3",
    name: "Sam Rivera",
    email: "sam.rivera@company.com",
    dateOfHire: "2022-01-10",
    dateOfTermination: "2025-01-20",
    team: "Engineering",
    managerId: "emp-2",
    level: "L3",
    workLocation: "Remote",
    teamHistory: [{ from: "2022-01-10", to: "2025-01-20", team: "Engineering", managerId: "emp-2" }],
    benefitsHistory: [{ effectiveDate: "2022-01-10", plan: "Standard" }],
  },
];

export const leaveBalances: Record<string, LeaveBalance[]> = {
  "emp-1": [
    { employeeId: "emp-1", type: "sick", balance: 40, unit: "hours", accrued: 48, used: 8 },
    { employeeId: "emp-1", type: "paid", balance: 80, unit: "hours", accrued: 96, used: 16 },
    { employeeId: "emp-1", type: "floating", balance: 16, unit: "hours", accrued: 16, used: 0 },
  ],
  "emp-2": [
    { employeeId: "emp-2", type: "sick", balance: 56, unit: "hours", accrued: 56, used: 0 },
    { employeeId: "emp-2", type: "paid", balance: 120, unit: "hours", accrued: 120, used: 0 },
  ],
};

export const leaveRecords: LeaveRecord[] = [
  {
    id: "lv-1",
    employeeId: "emp-1",
    type: "paid",
    startDate: "2025-02-10",
    endDate: "2025-02-12",
    status: "approved",
    requestedAt: "2025-02-01T10:00:00Z",
  },
  {
    id: "lv-2",
    employeeId: "emp-1",
    type: "sick",
    startDate: "2025-02-25",
    endDate: "2025-02-25",
    status: "pending",
    requestedAt: "2025-02-24T09:00:00Z",
  },
];

export const attendanceToday: AttendanceRecord[] = [
  { employeeId: "emp-1", date: "2025-02-28", checkIn: "09:00", checkOut: "18:00", status: "present" },
  { employeeId: "emp-2", date: "2025-02-28", checkIn: "08:30", status: "present" },
];

export const accommodationCases: AccommodationCase[] = [
  {
    id: "acc-1",
    employeeId: "emp-1",
    type: "work_from_home",
    status: "approved",
    submittedAt: "2024-11-01T00:00:00Z",
    decidedAt: "2024-11-15T00:00:00Z",
    caseManagerId: "hr-1",
    hasAttachments: false,
  },
];

export const performanceReviews: PerformanceReview[] = [
  {
    id: "perf-1",
    employeeId: "emp-1",
    cycle: "2024",
    selfInput: "Strong delivery on Q3 roadmap.",
    managerRating: 4,
    finalDecision: "Exceeds",
    compensationChange: "5% merit",
  },
];

export const hrCases: HRCase[] = [
  {
    id: "case-1",
    employeeId: "emp-1",
    type: "query",
    subject: "Leave policy for parental leave",
    status: "open",
    createdAt: "2025-02-20T14:00:00Z",
    assignedTo: "hr-1",
  },
  {
    id: "case-2",
    employeeId: "emp-3",
    type: "investigation",
    subject: "Exit process",
    status: "resolved",
    createdAt: "2025-01-18T00:00:00Z",
    assignedTo: "hr-1",
  },
];

export const trainings: Training[] = [
  { id: "tr-1", name: "Data Security Essentials", type: "mandatory", category: "compliance", dueDate: "2025-03-31" },
  { id: "tr-2", name: "Product Management Career Track", type: "optional", category: "career" },
];

export const employeeTrainings: EmployeeTraining[] = [
  { employeeId: "emp-1", trainingId: "tr-1", status: "completed", completedAt: "2025-01-15" },
  { employeeId: "emp-1", trainingId: "tr-2", status: "in_progress" },
];

export const policies: Policy[] = [
  {
    id: "pol-1",
    name: "Leave Accrual Policy",
    version: "2.1",
    effectiveDate: "2024-01-01",
    body: "Full-time employees accrue 8 hours sick and 8 hours paid leave per 15 days. Floating holidays: 2 per year.",
    category: "leave",
  },
  {
    id: "pol-2",
    name: "Performance Review Process",
    version: "1.0",
    effectiveDate: "2024-01-01",
    body: "Annual review cycle. Self-input, manager rating, calibration, final decision and compensation.",
    category: "performance",
  },
];

export const userGroups: UserGroup[] = [
  {
    id: "grp-managers",
    name: "Managers",
    permissions: [
      { system: "performance", operation: "read" },
      { system: "employee_master", operation: "read", attributeScope: "basic" },
    ],
  },
  {
    id: "grp-hr",
    name: "HR",
    permissions: [
      { system: "employee_master", operation: "read" },
      { system: "leave", operation: "read" },
      { system: "accommodations", operation: "read", attributeScope: "no_medical" },
      { system: "cases", operation: "read" },
      { system: "performance", operation: "read" },
      { system: "policy", operation: "read" },
    ],
  },
  {
    id: "grp-case-managers",
    name: "Disability & Accommodation Case Managers",
    permissions: [
      { system: "accommodations", operation: "read" },
      { system: "accommodations", operation: "write" },
      { system: "accommodations", operation: "delete" },
    ],
  },
  {
    id: "grp-admin",
    name: "Admin",
    permissions: [
      { system: "employee_master", operation: "read" },
      { system: "employee_master", operation: "write" },
      { system: "leave", operation: "read" },
      { system: "leave", operation: "write" },
      { system: "accommodations", operation: "read" },
      { system: "accommodations", operation: "write" },
      { system: "performance", operation: "read" },
      { system: "cases", operation: "read" },
      { system: "cases", operation: "write" },
      { system: "training", operation: "read" },
      { system: "training", operation: "write" },
      { system: "policy", operation: "read" },
      { system: "policy", operation: "write" },
    ],
  },
];

// Mock session: current user (simulate SSO)
export const currentUser = {
  id: "user-1",
  email: "jordan.lee@company.com",
  name: "Jordan Lee",
  employeeId: "emp-2",
  roles: ["manager", "hr"] as const,
  groupIds: ["grp-managers", "grp-hr"],
};
