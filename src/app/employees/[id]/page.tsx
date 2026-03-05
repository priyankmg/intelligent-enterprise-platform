"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import type { EmployeeMaster, LeaveBalance, LeaveRecord, AccommodationCase, PerformanceReview, HRCase } from "@/data-layer/types";

interface LeaveData {
  balances: LeaveBalance[];
  records: LeaveRecord[];
}

interface TrainingItem {
  trainingId: string;
  training?: { name: string };
  status: string;
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [employee, setEmployee] = useState<EmployeeMaster | null>(null);
  const [leave, setLeave] = useState<LeaveData | null>(null);
  const [accommodations, setAccommodations] = useState<AccommodationCase[]>([]);
  const [performance, setPerformance] = useState<PerformanceReview[]>([]);
  const [cases, setCases] = useState<HRCase[]>([]);
  const [training, setTraining] = useState<TrainingItem[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/employees/${id}`).then((r) => r.json()),
      fetch(`/api/employees/${id}/leave`).then((r) => r.json()).catch(() => null),
      fetch(`/api/employees/${id}/accommodations`).then((r) => r.json()).catch(() => []),
      fetch(`/api/employees/${id}/performance`).then((r) => r.json()).catch(() => []),
      fetch(`/api/employees/${id}/cases`).then((r) => r.json()).catch(() => []),
      fetch(`/api/employees/${id}/training`).then((r) => r.json()).catch(() => []),
    ]).then(([emp, lv, acc, perf, cas, tr]) => {
      if (emp?.error) {
        router.push("/employees");
        return;
      }
      setEmployee(emp as EmployeeMaster);
      setLeave(lv as LeaveData | null);
      setAccommodations(Array.isArray(acc) ? (acc as AccommodationCase[]) : []);
      setPerformance(Array.isArray(perf) ? (perf as PerformanceReview[]) : []);
      setCases(Array.isArray(cas) ? (cas as HRCase[]) : []);
      setTraining(Array.isArray(tr) ? (tr as TrainingItem[]) : []);
    });
  }, [id, router]);

  if (!employee) {
    return (
      <Layout>
        <div className="text-[var(--muted)]">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/employees" className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
            ← Back to employees
          </Link>
        </div>
        <header className="border-b border-[var(--border)] pb-6">
          <h1 className="text-2xl font-bold tracking-tight">{employee.name}</h1>
          <p className="text-[var(--muted)] mt-0.5">{employee.email}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-[var(--text-secondary)]">
            <span>{employee.team}</span>
            <span>{employee.level}</span>
            <span>{employee.workLocation}</span>
            {employee.dateOfTermination && (
              <span className="text-[var(--danger)] font-medium">Terminated {employee.dateOfTermination}</span>
            )}
          </div>
        </header>

        {(employee.phone || employee.dateOfBirth || employee.nationality || employee.maritalStatus || employee.emergencyContact) && (
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Personal details</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {employee.phone && (
                <>
                  <dt className="text-sm text-[var(--muted)]">Phone</dt>
                  <dd className="text-[var(--text)]">{employee.phone}</dd>
                </>
              )}
              {employee.dateOfBirth && (
                <>
                  <dt className="text-sm text-[var(--muted)]">Date of birth</dt>
                  <dd className="text-[var(--text)]">{employee.dateOfBirth}</dd>
                </>
              )}
              {employee.nationality && (
                <>
                  <dt className="text-sm text-[var(--muted)]">Nationality</dt>
                  <dd className="text-[var(--text)]">{employee.nationality}</dd>
                </>
              )}
              {employee.maritalStatus && (
                <>
                  <dt className="text-sm text-[var(--muted)]">Marital status</dt>
                  <dd className="text-[var(--text)]">{employee.maritalStatus}</dd>
                </>
              )}
              {employee.emergencyContact && (
                <>
                  <dt className="text-sm text-[var(--muted)]">Emergency contact</dt>
                  <dd className="text-[var(--text)]">
                    {employee.emergencyContact}
                    {employee.emergencyContactPhone && (
                      <span className="block text-sm text-[var(--muted)] mt-0.5">{employee.emergencyContactPhone}</span>
                    )}
                  </dd>
                </>
              )}
            </dl>
          </section>
        )}

        {employee.address && (
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Address</h2>
            <address className="text-[var(--text-secondary)] not-italic text-sm leading-relaxed">
              <span className="block">{employee.address.line1}</span>
              {employee.address.line2 && <span className="block">{employee.address.line2}</span>}
              <span className="block">
                {employee.address.city}
                {employee.address.state && `, ${employee.address.state}`}
                {" "}
                {employee.address.postalCode}
              </span>
              <span className="block">{employee.address.country}</span>
            </address>
          </section>
        )}

        {leave && (
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Leave & attendance</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Balance ledger</h3>
                <ul className="space-y-1 text-[var(--text-secondary)]">
                  {leave.balances.map((b) => (
                    <li key={b.type}>
                      {b.type}: {b.balance} {b.unit}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Recent leave</h3>
                <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                  {leave.records.map((r) => (
                    <li key={r.startDate + r.endDate}>
                      {r.type} {r.startDate}–{r.endDate} ({r.status})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {accommodations.length > 0 && (
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Disability & accommodations</h2>
            <ul className="divide-y divide-[var(--border)]">
              {accommodations.map((a) => (
                <li key={a.id} className="flex justify-between py-3 first:pt-0">
                  <span className="text-[var(--text)]">{a.type}</span>
                  <span className="text-sm text-[var(--muted)]">{a.status} · {a.submittedAt.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {performance.length > 0 && (
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Performance & feedback</h2>
            <ul className="divide-y divide-[var(--border)]">
              {performance.map((p) => (
                <li key={p.id} className="py-3 first:pt-0 text-[var(--text-secondary)]">
                  Cycle {p.cycle}: {p.finalDecision ?? "—"} (rating: {p.managerRating ?? "—"})
                </li>
              ))}
            </ul>
          </section>
        )}

        {cases.length > 0 && (
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Cases & investigations</h2>
            <ul className="divide-y divide-[var(--border)]">
              {cases.map((c) => (
                <li key={c.id} className="flex justify-between py-3 first:pt-0">
                  <span className="text-[var(--text)]">{c.type}: {c.subject}</span>
                  <span className="text-sm text-[var(--muted)]">{c.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {training.length > 0 && (
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-4">Training</h2>
            <ul className="divide-y divide-[var(--border)]">
              {training.map((t) => (
                <li key={t.trainingId} className="flex justify-between py-3 first:pt-0">
                  <span className="text-[var(--text)]">{t.training?.name ?? t.trainingId}</span>
                  <span className="text-sm text-[var(--muted)]">{t.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  );
}
