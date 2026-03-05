import type { CareerSnapshot, CareerTrajectoryResult, CareerTrajectoryFactor } from "@/data-layer/types";
import { buildCareerSnapshot } from "@/services/career-snapshot-service";
import { growthSnapshots, terminationSnapshots } from "@/data-layer/career-snapshot-data";

const K = 5;
const SCALE = {
  tenureMonths: 120,
  leaveBalanceHours: 200,
  avgManagerRating: 5,
  caseCount: 5,
  seriousCaseCount: 3,
  levelNumeric: 6,
};

function normalize(s: CareerSnapshot): number[] {
  return [
    Math.min(1, s.tenureMonths / SCALE.tenureMonths),
    Math.min(1, s.leaveBalanceHours / SCALE.leaveBalanceHours),
    s.avgManagerRating / SCALE.avgManagerRating,
    s.performanceImproving,
    Math.min(1, s.caseCount / SCALE.caseCount),
    Math.min(1, s.seriousCaseCount / SCALE.seriousCaseCount),
    1 - s.trainingCompletedRatio,
    s.levelNumeric / SCALE.levelNumeric,
  ];
}

function manhattan(a: number[], b: number[]): number {
  return a.reduce((sum, x, i) => sum + Math.abs(x - b[i]), 0);
}

/**
 * Career trajectory classifier: k-NN over reference growth/termination snapshots.
 * Returns trend (growth | termination | neutral), confidence, summary, and factors.
 * The model uses only CareerSnapshot features (tenure, leave, ratings, cases, training, level).
 * It does not use any protected characteristics (age, gender, race, sexual orientation, etc.).
 */
export function runCareerTrajectoryAgent(employeeId: string): CareerTrajectoryResult | null {
  const snapshot = buildCareerSnapshot(employeeId);
  if (!snapshot) return null;

  const allRef = [...growthSnapshots, ...terminationSnapshots];
  const currentVec = normalize(snapshot);

  const withDistance = allRef.map((ref) => ({
    ref,
    dist: manhattan(currentVec, normalize(ref)),
  }));
  withDistance.sort((a, b) => a.dist - b.dist);

  const kNearest = withDistance.slice(0, K);
  const growthVotes = kNearest.filter((x) => x.ref.outcome === "growth").length;
  const termVotes = kNearest.filter((x) => x.ref.outcome === "termination").length;

  let trend: "growth" | "termination" | "neutral";
  let confidence: number;
  if (growthVotes > termVotes) {
    trend = "growth";
    confidence = growthVotes / K;
  } else if (termVotes > growthVotes) {
    trend = "termination";
    confidence = termVotes / K;
  } else {
    trend = "neutral";
    confidence = 0.5;
  }

  const factors: string[] = [];
  if (snapshot.avgManagerRating >= 4) factors.push("Strong performance ratings");
  else if (snapshot.avgManagerRating < 3) factors.push("Below-target performance ratings");
  if (snapshot.seriousCaseCount > 0) factors.push("Investigation or termination-related cases on record");
  if (snapshot.leaveBalanceHours < 24) factors.push("Low leave balance (potential burnout or attendance risk)");
  if (snapshot.trainingCompletedRatio >= 0.9) factors.push("Training compliance in good standing");
  else if (snapshot.trainingCompletedRatio < 0.6) factors.push("Incomplete mandatory training");
  if (snapshot.performanceImproving === 1 && snapshot.avgManagerRating >= 3.5) factors.push("Performance trend improving");
  if (snapshot.caseCount === 0 && trend === "growth") factors.push("No HR cases; clean record");

  const summary =
    trend === "growth"
      ? "This employee's profile is closest to past employees who grew in their career (promotion, high performance). Key strengths: " + (factors.filter((f) => f.includes("Strong") || f.includes("good") || f.includes("improving") || f.includes("clean")).join("; ") || "favorable metrics across performance, leave, and training.")
      : trend === "termination"
        ? "This employee's profile is closest to past employees who were terminated. Risk factors: " + (factors.filter((f) => f.includes("Below") || f.includes("Investigation") || f.includes("Low leave") || f.includes("Incomplete")).join("; ") || "performance, cases, or training concerns.")
        : "This employee's profile is mixed relative to growth and termination reference groups. Consider reviewing performance, cases, and training completion.";

  const factorItems: CareerTrajectoryFactor[] = [];
  if (snapshot.avgManagerRating >= 4) factorItems.push({ label: "Strong performance ratings", value: `${snapshot.avgManagerRating.toFixed(1)}/5 avg` });
  else if (snapshot.avgManagerRating < 3) factorItems.push({ label: "Below-target performance ratings", value: `${snapshot.avgManagerRating.toFixed(1)}/5 avg` });
  if (snapshot.seriousCaseCount > 0) factorItems.push({ label: "Investigation or termination-related cases on record", value: `${snapshot.seriousCaseCount} serious case(s)` });
  if (snapshot.leaveBalanceHours < 24) factorItems.push({ label: "Low leave balance (potential burnout or attendance risk)", value: `${Math.round(snapshot.leaveBalanceHours)} hours` });
  if (snapshot.trainingCompletedRatio >= 0.9) factorItems.push({ label: "Training compliance in good standing", value: `${Math.round(snapshot.trainingCompletedRatio * 100)}% completed` });
  else if (snapshot.trainingCompletedRatio < 0.6) factorItems.push({ label: "Incomplete mandatory training", value: `${Math.round(snapshot.trainingCompletedRatio * 100)}% completed` });
  if (snapshot.performanceImproving === 1 && snapshot.avgManagerRating >= 3.5) factorItems.push({ label: "Performance trend improving", value: "Latest rating ≥ previous" });
  if (snapshot.caseCount === 0 && trend === "growth") factorItems.push({ label: "No HR cases; clean record", value: "0 cases" });

  return {
    trend,
    confidence,
    summary,
    factors,
    factorItems,
    snapshot,
  };
}
