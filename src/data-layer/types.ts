// 1.1 Employee Master (ERP)
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
  address?: string;
  emergencyContact?: string;
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
export interface HRCase {
  id: string;
  employeeId: string;
  type: "query" | "policy" | "safety" | "investigation";
  subject: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
  assignedTo?: string;
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
