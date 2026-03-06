"use client";

import { useEffect, useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import Link from "next/link";

interface SessionUser {
  name: string;
  email: string;
  roles: string[];
}

interface OrgSummary {
  presentToday?: { id: string; name: string }[];
  lowLeave?: { id: string; name: string }[];
  terminated?: { id: string; name: string }[];
}

const CASE_INV_2 = {
  id: "case-inv-2",
  subject: "Performance and quality of work concerns – missed deadlines and quality bar",
  employeeName: "Jordan Lee",
  status: "in_progress",
  type: "investigation",
};

const CASE_TERM_REVIEW_1 = {
  id: "case-term-review-1",
  subject: "Termination review: Policy violation – device/photography in restricted area",
  employeeName: "Alex Chen",
};

const CAREER_TRAJECTORY_EMPLOYEES = [
  { id: "emp-1", name: "Alex Chen", level: "L4", team: "Product" },
  { id: "emp-7", name: "Jamie Foster", level: "L4", team: "Engineering" },
];

const CASE_REVIEW_AGENTS = [
  "Semantic Layer Agent",
  "Policy Evaluation Agent",
  "Retrieval Augmentation Agent",
];

const TECH_AGENTS = [
  { label: "API Healing Agent", description: "Monitors and auto-repairs API contract failures" },
  { label: "Database Monitoring Agent", description: "Tracks schema changes and indexing performance" },
  { label: "Pipeline Healing Agent", description: "Updates reporting pipelines on schema change" },
];

const GOVERNANCE_AGENTS = [
  { label: "Action Classifier Agent", description: "Classifies every agent action by risk profile" },
  { label: "Scope Enforcer Agent", description: "Enforces least-privilege data and tool access" },
  { label: "Anomaly Detection Agent", description: "Flags unusual call frequency and output drift" },
  { label: "Policy Control Agent", description: "Propagates policy changes across all agents" },
  { label: "Bias Correction Agent", description: "Monitors for bias in trajectory and termination decisions" },
];

const EXAMPLE_PROMPTS = [
  "What is the status of case-term-review-1?",
  "Which employees have low leave balance?",
  "Simulate an ERP failure and heal it.",
];

function EmbeddedAssistantInput() {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const dispatch = (text: string) => {
    const msg = text.trim();
    if (!msg) return;
    window.dispatchEvent(new CustomEvent("open-assistant", { detail: { message: msg } }));
    setValue("");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              dispatch(value);
            }
          }}
          placeholder="Type a question and press Enter or Send…"
          rows={2}
          className="flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <button
          type="button"
          onClick={() => dispatch(value)}
          disabled={!value.trim()}
          className="btn-primary self-end shrink-0 disabled:opacity-40"
        >
          Send
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => dispatch(p)}
            className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:border-[var(--accent)]/60 hover:text-[var(--accent)] transition-colors text-left"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [org, setOrg] = useState<OrgSummary>({});

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then(setUser).catch(() => {});
    fetch("/api/dashboard/hr-summary?view=came_to_work_today")
      .then((r) => r.json()).then((list) => setOrg((v) => ({ ...v, presentToday: list }))).catch(() => {});
    fetch("/api/dashboard/hr-summary?view=low_leave_balance")
      .then((r) => r.json()).then((list) => setOrg((v) => ({ ...v, lowLeave: list }))).catch(() => {});
    fetch("/api/dashboard/hr-summary?view=terminated_last_month")
      .then((r) => r.json()).then((list) => setOrg((v) => ({ ...v, terminated: list }))).catch(() => {});
  }, []);

  return (
    <Layout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-[var(--muted)] mt-0.5">Intelligent Enterprise Platform</p>
          </div>
          {user && (
            <div className="text-sm text-[var(--muted)] bg-[var(--surface)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
              {user.name} · <span className="text-[var(--text-secondary)]">{user.roles.join(", ")}</span>
            </div>
          )}
        </div>

        {/* My Tasks */}
        <section>
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-3">My Tasks</h2>
          <div className="space-y-2">
            <Link
              href={`/cases/${CASE_INV_2.id}`}
              className="card p-4 flex flex-wrap items-start justify-between gap-3 hover:border-[var(--accent)]/50 transition-colors block"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-[var(--muted)]">{CASE_INV_2.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--warning)]/15 text-[var(--warning)] font-medium">
                    In progress
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-hover)] text-[var(--muted)]">
                    Investigation
                  </span>
                </div>
                <p className="font-medium text-[var(--text)] text-sm">{CASE_INV_2.subject}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">Employee: {CASE_INV_2.employeeName}</p>
              </div>
              <span className="text-xs text-[var(--accent)] font-medium shrink-0 self-center">View case →</span>
            </Link>
          </div>
        </section>

        {/* Organisation Summary */}
        <section>
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-3">Organisation Summary</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Link href="/employees?view=present_today" className="card p-5 block hover:border-[var(--accent)]/50 transition-colors">
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Present today</p>
              <p className="text-3xl font-bold text-[var(--accent)]">{org.presentToday?.length ?? "—"}</p>
              <span className="text-xs text-[var(--accent)] mt-2 inline-block font-medium">View list →</span>
            </Link>
            <Link href="/employees?view=low_leave" className="card p-5 block hover:border-[var(--warning)]/50 transition-colors">
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Low leave balance</p>
              <p className="text-3xl font-bold text-[var(--warning)]">{org.lowLeave?.length ?? "—"}</p>
              <span className="text-xs text-[var(--accent)] mt-2 inline-block font-medium">View list →</span>
            </Link>
            <Link href="/employees?view=terminated" className="card p-5 block hover:border-[var(--danger)]/50 transition-colors">
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Terminated (last month)</p>
              <p className="text-3xl font-bold text-[var(--danger)]">{org.terminated?.length ?? "—"}</p>
              <span className="text-xs text-[var(--accent)] mt-2 inline-block font-medium">View list →</span>
            </Link>
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-base font-semibold text-[var(--text-secondary)] mb-3">Quick Actions</h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">

            {/* AI Assistant — full-width embedded widget */}
            <div className="md:col-span-2 card p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-[var(--text)] mb-0.5">Ask the AI Assistant</h3>
                  <p className="text-xs text-[var(--muted)]">Ask anything about employees, cases, policies, or platform operations. Type below to start — the full assistant will open so you can continue the conversation.</p>
                </div>
                <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
              </div>
              <EmbeddedAssistantInput />
            </div>

            {/* Case Review */}
            <div className="card p-5 flex flex-col gap-4">
              <div>
                <h3 className="font-semibold text-[var(--text)] mb-1">AI Case Review</h3>
                <p className="text-xs text-[var(--muted)]">Multi-agent pipeline for termination investigation analysis.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {CASE_REVIEW_AGENTS.map((agent) => (
                  <span key={agent} className="text-xs px-2.5 py-1 rounded-full bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)]">
                    {agent}
                  </span>
                ))}
              </div>
              <div className="mt-auto pt-3 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted)] mb-2">Example case</p>
                <Link
                  href={`/cases/${CASE_TERM_REVIEW_1.id}/review`}
                  className="flex items-start justify-between gap-3 rounded-lg p-3 bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-[var(--muted)]">{CASE_TERM_REVIEW_1.id}</p>
                    <p className="text-sm font-medium text-[var(--text)] mt-0.5 leading-snug">{CASE_TERM_REVIEW_1.subject}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{CASE_TERM_REVIEW_1.employeeName}</p>
                  </div>
                  <span className="text-xs text-[var(--accent)] font-medium shrink-0 self-center">Run AI analysis →</span>
                </Link>
              </div>
            </div>

            {/* Career Trajectory Classifier */}
            <div className="card p-5 flex flex-col gap-4">
              <div>
                <h3 className="font-semibold text-[var(--text)] mb-1">Career Trajectory Classifier</h3>
                <p className="text-xs text-[var(--muted)]">k-NN model predicts growth or termination risk from job-relevant signals only. No protected characteristics used.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)]">
                  k-NN Classifier
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)]">
                  Performance · Leave · Cases · Training
                </span>
              </div>
              <div className="mt-auto pt-3 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted)] mb-2">Example employees</p>
                <div className="space-y-2">
                  {CAREER_TRAJECTORY_EMPLOYEES.map((emp) => (
                    <Link
                      key={emp.id}
                      href={`/employees/${emp.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg p-3 bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">{emp.name}</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">{emp.level} · {emp.team}</p>
                      </div>
                      <span className="text-xs text-[var(--accent)] font-medium shrink-0">View profile →</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Tech Plane Agents */}
            <div className="card p-5 flex flex-col gap-4">
              <div>
                <h3 className="font-semibold text-[var(--text)] mb-1">Tech Plane Agents</h3>
                <p className="text-xs text-[var(--muted)]">Self-healing infrastructure agents for API, database, and pipeline resilience.</p>
              </div>
              <ul className="space-y-2">
                {TECH_AGENTS.map((agent) => (
                  <li key={agent.label}>
                    <Link
                      href="/tech-agents"
                      className="flex items-start gap-2.5 rounded-lg p-2.5 hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)] mt-1.5" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">{agent.label}</p>
                        <p className="text-xs text-[var(--muted)]">{agent.description}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-3 border-t border-[var(--border)]">
                <Link href="/tech-agents" className="text-xs text-[var(--accent)] font-medium hover:text-[var(--accent-hover)]">
                  Go to Tech Agents →
                </Link>
              </div>
            </div>

            {/* Governance Agents */}
            <div className="card p-5 flex flex-col gap-4">
              <div>
                <h3 className="font-semibold text-[var(--text)] mb-1">Governance Agents</h3>
                <p className="text-xs text-[var(--muted)]">Five background agents enforce scope, action classification, anomaly detection, policy control, and bias correction.</p>
              </div>
              <ul className="space-y-2">
                {GOVERNANCE_AGENTS.map((agent) => (
                  <li key={agent.label}>
                    <Link
                      href="/governance"
                      className="flex items-start gap-2.5 rounded-lg p-2.5 hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success)] mt-1.5" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">{agent.label}</p>
                        <p className="text-xs text-[var(--muted)]">{agent.description}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-3 border-t border-[var(--border)]">
                <Link href="/governance" className="text-xs text-[var(--accent)] font-medium hover:text-[var(--accent-hover)]">
                  Go to Governance Agents →
                </Link>
              </div>
            </div>

          </div>
        </section>

      </div>
    </Layout>
  );
}
