"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AssistantChat } from "@/components/AssistantChat";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const nav = [
    { href: "/", label: "Dashboard" },
    { href: "/employees", label: "Employees" },
    { href: "/cases", label: "Cases" },
    { href: "/policies", label: "Policies" },
    { href: "/tech-agents", label: "Tech agents" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-subtle)]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <Link
              href="/"
              className="text-lg font-semibold text-[var(--text)] hover:text-[var(--accent)] transition-colors shrink-0"
            >
              Intelligent Enterprise Platform
            </Link>
            <nav className="flex items-center gap-1">
              {nav.map(({ href, label }) => {
                const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`nav-link ${isActive ? "!text-[var(--accent)] !bg-[var(--surface)]" : ""}`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {children}
      </main>
      <AssistantChat />
    </div>
  );
}
