"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Layout } from "@/components/Layout";
import Link from "next/link";

interface CaseNote {
  id: string;
  authorName: string;
  type?: string;
  content: string;
  createdAt: string;
}

interface CaseDetail {
  id: string;
  employeeId: string;
  type: string;
  subject: string;
  status: string;
  incidentDate?: string;
  initialFinding?: string;
  caseNotes?: CaseNote[];
  parentCaseId?: string;
}

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);

  useEffect(() => {
    fetch(`/api/cases/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) router.push("/cases");
        else setCaseData(data);
      })
      .catch(() => router.push("/cases"));
  }, [id, router]);

  if (!caseData) {
    return (
      <Layout>
        <div className="text-[var(--muted)]">Loading...</div>
      </Layout>
    );
  }

  const isInvestigation = caseData.type === "investigation";
  const hasInitialFinding = !!caseData.initialFinding;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/cases" className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
            ← Back to cases
          </Link>
        </div>

        <header className="border-b border-[var(--border)] pb-6">
          <h1 className="text-2xl font-bold tracking-tight">{caseData.subject}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-[var(--muted)]">
            <span>{caseData.type}</span>
            <span>{caseData.status}</span>
            <span>Employee {caseData.employeeId}</span>
            {caseData.incidentDate && <span>Incident: {caseData.incidentDate}</span>}
          </div>
        </header>

        {caseData.initialFinding && (
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-2">Initial finding</h2>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap">
              {caseData.initialFinding}
            </p>
          </section>
        )}

        {caseData.caseNotes && caseData.caseNotes.length > 0 && (
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Case notes</h2>
            <ul className="space-y-4">
              {caseData.caseNotes.map((n) => (
                <li
                  key={n.id}
                  className="border-l-2 border-[var(--border)] pl-4 py-2"
                >
                  <div className="flex justify-between text-sm text-[var(--muted)] mb-1">
                    <span>{n.authorName}</span>
                    <span>{n.type ?? "note"}</span>
                    <span>{n.createdAt.slice(0, 16).replace("T", " ")}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{n.content}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isInvestigation && hasInitialFinding && (
          <section className="card p-6 border-[var(--accent)]/50">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-2">Termination review</h2>
            <p className="text-[var(--muted)] text-sm mb-4">
              Initial finding determined. Initiate a termination review to pull employee
              data from all systems and get AI policy analysis before deciding.
            </p>
            <Link href="/cases/case-term-review-1/review" className="btn-primary inline-block">
              Initiate termination review
            </Link>
          </section>
        )}

        <div>
          <Link
            href={`/employees/${caseData.employeeId}`}
            className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
          >
            View employee profile →
          </Link>
        </div>
      </div>
    </Layout>
  );
}
