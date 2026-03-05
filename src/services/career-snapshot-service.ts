import type { CareerSnapshot } from "@/data-layer/types";
import type { EmployeeMaster, PerformanceReview, HRCase } from "@/data-layer/types";
import { employees, leaveBalances, performanceReviews, hrCases, employeeTrainings, trainings } from "@/data-layer/mock-data";

/**
 * Builds a career snapshot (feature vector) for an employee from current system data.
 * Used as input to the career trajectory classifier.
 * Only job-relevant features are included; protected characteristics (age, gender, race,
 * sexual orientation, religion, disability, marital status, nationality, etc.) are never used.
 */
export function buildCareerSnapshot(employeeId: string): CareerSnapshot | null {
  const employee = employees.find((e) => e.id === employeeId);
  if (!employee) return null;

  const asOf = employee.dateOfTermination ? new Date(employee.dateOfTermination) : new Date();
  const hireDate = new Date(employee.dateOfHire);
  const tenureMonths = Math.max(0, (asOf.getFullYear() - hireDate.getFullYear()) * 12 + (asOf.getMonth() - hireDate.getMonth()));

  const balances = leaveBalances[employeeId] ?? [];
  const leaveBalanceHours = balances.reduce((sum, b) => sum + (b.unit === "hours" ? b.balance : b.balance * 8), 0);

  const perfList = performanceReviews.filter((p) => p.employeeId === employeeId);
  const ratings = perfList.map((p) => p.managerRating).filter((r): r is number => typeof r === "number");
  const avgManagerRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 3;
  const performanceImproving =
    ratings.length >= 2 && ratings[ratings.length - 1] >= ratings[ratings.length - 2] ? 1 : ratings.length === 1 ? 1 : 0;

  const cases = hrCases.filter((c) => c.employeeId === employeeId && new Date(c.createdAt) <= asOf);
  const seriousCaseCount = cases.filter((c) => c.type === "investigation" || c.type === "termination").length;

  const requiredTrainingIds = new Set(trainings.filter((t) => t.type === "mandatory" || t.type === "compliance").map((t) => t.id));
  const completedRequired = employeeTrainings.filter(
    (et) => et.employeeId === employeeId && et.status === "completed" && requiredTrainingIds.has(et.trainingId)
  ).length;
  const requiredCount = requiredTrainingIds.size || 1;
  const trainingCompletedRatio = Math.min(1, completedRequired / requiredCount);

  const levelStr = employee.level.replace(/\D/g, "");
  const levelNumeric = levelStr ? parseInt(levelStr, 10) || 4 : 4;

  return {
    employeeId,
    tenureMonths,
    leaveBalanceHours,
    avgManagerRating,
    performanceImproving,
    caseCount: cases.length,
    seriousCaseCount,
    trainingCompletedRatio,
    levelNumeric,
  };
}
