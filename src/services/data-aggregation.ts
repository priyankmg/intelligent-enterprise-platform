import type { EmployeeSnapshot } from "@/data-layer/types";
import {
  employees,
  leaveBalances,
  leaveRecords,
  accommodationCases,
  performanceReviews,
  hrCases,
  trainings,
  employeeTrainings,
  policies,
} from "@/data-layer/mock-data";

/**
 * Data aggregation service: pulls a snapshot of employee data from all systems
 * as of a given date (incident date). Used when HR initiates termination review.
 */
export function getEmployeeSnapshot(
  employeeId: string,
  asOfDate: string
): EmployeeSnapshot | null {
  const employee = employees.find((e) => e.id === employeeId);
  if (!employee) return null;

  const asOf = new Date(asOfDate);

  const balances = leaveBalances[employeeId] ?? [];
  const records = leaveRecords.filter(
    (r) => r.employeeId === employeeId && new Date(r.requestedAt) <= asOf
  );

  const accommodations = accommodationCases.filter(
    (a) =>
      a.employeeId === employeeId && new Date(a.submittedAt) <= asOf
  );

  const performance = performanceReviews.filter(
    (p) => p.employeeId === employeeId
  );

  const cases = hrCases.filter(
    (c) => c.employeeId === employeeId && new Date(c.createdAt) <= asOf
  );

  const etList = employeeTrainings.filter((et) => et.employeeId === employeeId);
  const training = etList.map((et) => {
    const t = trainings.find((x) => x.id === et.trainingId);
    return { training: t!, status: et.status };
  }).filter((x) => x.training);

  const terminationPolicy = policies.filter(
    (p) => p.category === "termination" || p.category === "leave"
  );

  return {
    snapshotDate: asOfDate,
    employee,
    leave: { balances, records },
    attendance: [], // simplified - would come from attendance system
    accommodations,
    performance,
    cases,
    training,
    policies: terminationPolicy,
  };
}
