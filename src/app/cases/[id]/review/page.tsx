"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Layout } from "@/components/Layout";
import Link from "next/link";

interface AIRecommendation {
  recommendation: "recommend_termination" | "recommend_warning" | "insufficient_evidence";
  summary: string;
  evidence: string[];
  policyViolations: string[];
  mitigatingFactors: string[];
  similarCases?: { caseId: string; outcome: string; similarity: string }[];
  policyEvaluation?: {
    appliedClauseId: string;
    appliedClauseName: string;
    violated: boolean;
    inferredCorrectly?: boolean;
    semanticLayerSummary?: string;
  };
  semanticLayerSummary?: string;
}

interface Snapshot {
  snapshotDate: string;
  employee: { name: string; email: string; team: string; level: string };
  leave: { balances: { type: string; balance: number; unit: string }[]; records: unknown[] };
  performance: { cycle: string; finalDecision?: string; managerRating?: number }[];
  training: { training: { name: string }; status: string }[];
  cases: unknown[];
  policies: { name: string; body: string }[];
}

export default function TerminationReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [caseData, setCaseData] = useState<{ subject: string; employeeId: string; initialFinding?: string } | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [aiRec, setAiRec] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/cases/${id}`).then((r) => r.json()),
      fetch(`/api/cases/${id}/termination-review`).then((r) => r.json()),
    ])
      .then(([c, snap]) => {
        if (c?.error) {
          router.push("/cases");
          return;
        }
        setCaseData(c);
        setSnapshot(snap?.snapshotDate ? snap : null);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.push("/cases");
      });
  }, [id, router]);

  // Auto-invoke AI agent once snapshot is loaded (per workflow)
  useEffect(() => {
    if (loading || !snapshot || aiRec || aiLoading || !id) return;
    setAiLoading(true);
    fetch(`/api/cases/${id}/termination-review/analyze`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setAiRec(data);
      })
      .catch(() => setAiRec(null))
      .finally(() => setAiLoading(false));
  }, [loading, snapshot, aiRec, aiLoading, id]);

  const runAIAnalysis = () => {
    setAiLoading(true);
    fetch(`/api/cases/${id}/termination-review/analyze`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setAiRec(data);
      })
      .catch((e) => {
        console.error(e);
        setAiRec(null);
      })
      .finally(() => setAiLoading(false));
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-[var(--muted)]">Loading case and employee snapshot...</div>
      </Layout>
    );
  }

  const recColor =
    aiRec?.recommendation === "recommend_termination"
      ? "var(--danger)"
      : aiRec?.recommendation === "recommend_warning"
        ? "var(--warning)"
        : "var(--success)";

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/cases" className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
            ← Back to cases
          </Link>
        </div>

        <header className="border-b border-[var(--border)] pb-6">
          <h1 className="text-2xl font-bold tracking-tight">Termination review</h1>
          <p className="text-[var(--muted)] mt-1">{caseData?.subject}</p>
        </header>

        <section className="card p-6 border-2 border-[var(--accent)]/50">
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-2 flex flex-wrap items-center gap-2">
            AI policy analysis
            {!aiRec && (
              <button
                onClick={runAIAnalysis}
                disabled={aiLoading}
                className="btn-primary !py-1.5 text-sm disabled:opacity-50"
              >
                {aiLoading ? "Analyzing..." : "Run analysis"}
              </button>
            )}
          </h2>
          {aiRec ? (
            <div className="space-y-4">
              <div
                className="px-3 py-2 rounded font-medium"
                style={{ background: `${recColor}20`, color: recColor }}
              >
                Recommendation: {aiRec.recommendation.replace(/_/g, " ")}
              </div>
              <p className="whitespace-pre-wrap">{aiRec.summary}</p>
              {aiRec.evidence?.length > 0 && (
                <div>
                  <h3 className="font-medium mb-1">Evidence</h3>
                  <ul className="list-disc list-inside text-[var(--muted)]">
                    {aiRec.evidence.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiRec.policyViolations?.length > 0 && (
                <div>
                  <h3 className="font-medium mb-1">Policy violations</h3>
                  <ul className="list-disc list-inside text-[var(--danger)]">
                    {aiRec.policyViolations.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiRec.mitigatingFactors?.length > 0 && (
                <div>
                  <h3 className="font-medium mb-1">Mitigating factors</h3>
                  <ul className="list-disc list-inside text-[var(--muted)]">
                    {aiRec.mitigatingFactors.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiRec.similarCases && aiRec.similarCases.length > 0 && (
                <div>
                  <h3 className="font-medium mb-1">Similar past cases (Retrieval Augmentation Agent)</h3>
                  <ul className="space-y-1 text-sm text-[var(--muted)]">
                    {aiRec.similarCases.map((s, i) => (
                      <li key={i}>
                        {s.caseId}: {s.outcome} — {s.similarity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {aiRec.policyEvaluation && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <h3 className="font-medium mb-1">Policy Evaluation Agent</h3>
                  <p className="text-sm text-[var(--muted)]">
                    Applied clause: {aiRec.policyEvaluation.appliedClauseName} ({aiRec.policyEvaluation.appliedClauseId}). Violated: {aiRec.policyEvaluation.violated ? "Yes" : "No"}
                    {aiRec.policyEvaluation.inferredCorrectly !== undefined && ` · Inferred correctly: ${aiRec.policyEvaluation.inferredCorrectly}`}
                  </p>
                  {aiRec.semanticLayerSummary && (
                    <p className="text-xs text-[var(--muted)] mt-1">
                      Semantic layer: {aiRec.semanticLayerSummary}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[var(--muted)]">
              Click &quot;Run analysis&quot; to invoke the AI agent. It will review the
              termination policy against the case data and employee snapshot, and use
              past similar cases (RAG) to ground its recommendation.
            </p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">
            Employee data snapshot (as of {snapshot?.snapshotDate ?? "incident date"})
          </h2>
          {snapshot ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-[var(--muted)] mb-1">Employee</h3>
                <p>
                  {snapshot.employee.name} · {snapshot.employee.team} · {snapshot.employee.level}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-[var(--muted)] mb-1">Leave balance</h3>
                <ul className="space-y-1">
                  {snapshot.leave.balances.map((b) => (
                    <li key={b.type}>
                      {b.type}: {b.balance} {b.unit}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-[var(--muted)] mb-1">Performance</h3>
                <ul className="space-y-1">
                  {snapshot.performance.map((p) => (
                    <li key={p.cycle}>
                      {p.cycle}: {p.finalDecision ?? "—"} (rating: {p.managerRating ?? "—"})
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-[var(--muted)] mb-1">Training</h3>
                <ul className="space-y-1">
                  {snapshot.training.map((t, i) => (
                    <li key={i}>
                      {t.training?.name}: {t.status}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-[var(--muted)] mb-1">Prior cases</h3>
                <p>{snapshot.cases.length} prior case(s)</p>
              </div>
            </div>
          ) : (
            <p className="text-[var(--muted)]">Snapshot not available.</p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-2">Next steps</h2>
          <p className="text-[var(--muted)] text-sm">
            Review the AI recommendation and employee data above. Consider manager
            feedback, stakeholder input, and policy alignment. When ready, submit a
            formal termination in the system with the stated reason and rehire
            consequence.
          </p>
        </section>
      </div>
    </Layout>
  );
}
