import type { CareerSnapshot } from "@/data-layer/types";

/**
 * Reference snapshots from past employees: growth (promotion, high performer) vs termination.
 * Used by the career trajectory classifier (k-NN) to compare the current employee's snapshot.
 * These snapshots contain only job-relevant features; no protected characteristics (age, gender,
 * race, sexual orientation, etc.) are included or used in the model.
 */

/** Employees who grew: promotion, high performance, no serious cases */
export const growthSnapshots: CareerSnapshot[] = [
  { employeeId: "ref-g1", tenureMonths: 24, leaveBalanceHours: 80, avgManagerRating: 4.5, performanceImproving: 1, caseCount: 0, seriousCaseCount: 0, trainingCompletedRatio: 1, levelNumeric: 4, outcome: "growth" },
  { employeeId: "ref-g2", tenureMonths: 48, leaveBalanceHours: 120, avgManagerRating: 4, performanceImproving: 1, caseCount: 1, seriousCaseCount: 0, trainingCompletedRatio: 1, levelNumeric: 5, outcome: "growth" },
  { employeeId: "ref-g3", tenureMonths: 18, leaveBalanceHours: 60, avgManagerRating: 4.2, performanceImproving: 1, caseCount: 0, seriousCaseCount: 0, trainingCompletedRatio: 0.9, levelNumeric: 4, outcome: "growth" },
  { employeeId: "ref-g4", tenureMonths: 36, leaveBalanceHours: 96, avgManagerRating: 4.8, performanceImproving: 1, caseCount: 0, seriousCaseCount: 0, trainingCompletedRatio: 1, levelNumeric: 5, outcome: "growth" },
  { employeeId: "ref-g5", tenureMonths: 12, leaveBalanceHours: 40, avgManagerRating: 4, performanceImproving: 1, caseCount: 0, seriousCaseCount: 0, trainingCompletedRatio: 1, levelNumeric: 3, outcome: "growth" },
];

/** Employees who were terminated: low rating, investigations, or policy violations */
export const terminationSnapshots: CareerSnapshot[] = [
  { employeeId: "ref-t1", tenureMonths: 36, leaveBalanceHours: 8, avgManagerRating: 2, performanceImproving: 0, caseCount: 2, seriousCaseCount: 1, trainingCompletedRatio: 0.5, levelNumeric: 4, outcome: "termination" },
  { employeeId: "ref-t2", tenureMonths: 12, leaveBalanceHours: 16, avgManagerRating: 2.2, performanceImproving: 0, caseCount: 1, seriousCaseCount: 1, trainingCompletedRatio: 0.6, levelNumeric: 3, outcome: "termination" },
  { employeeId: "ref-t3", tenureMonths: 24, leaveBalanceHours: 24, avgManagerRating: 2.5, performanceImproving: 0, caseCount: 3, seriousCaseCount: 2, trainingCompletedRatio: 0.4, levelNumeric: 4, outcome: "termination" },
  { employeeId: "ref-t4", tenureMonths: 8, leaveBalanceHours: 0, avgManagerRating: 1.8, performanceImproving: 0, caseCount: 1, seriousCaseCount: 1, trainingCompletedRatio: 0.3, levelNumeric: 3, outcome: "termination" },
  { employeeId: "ref-t5", tenureMonths: 48, leaveBalanceHours: 40, avgManagerRating: 2.8, performanceImproving: 0, caseCount: 2, seriousCaseCount: 1, trainingCompletedRatio: 0.7, levelNumeric: 5, outcome: "termination" },
];

/** Canonical "good" employee snapshot for comparison */
export const canonicalGrowthSnapshot: CareerSnapshot = {
  employeeId: "canonical-growth",
  tenureMonths: 24,
  leaveBalanceHours: 80,
  avgManagerRating: 4.2,
  performanceImproving: 1,
  caseCount: 0,
  seriousCaseCount: 0,
  trainingCompletedRatio: 1,
  levelNumeric: 4,
  outcome: "growth",
};

/** Canonical "bad" employee snapshot (termination risk) */
export const canonicalTerminationSnapshot: CareerSnapshot = {
  employeeId: "canonical-termination",
  tenureMonths: 24,
  leaveBalanceHours: 16,
  avgManagerRating: 2.2,
  performanceImproving: 0,
  caseCount: 2,
  seriousCaseCount: 1,
  trainingCompletedRatio: 0.5,
  levelNumeric: 4,
  outcome: "termination",
};
