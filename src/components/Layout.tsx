"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { AssistantChat } from "@/components/AssistantChat";
import { FeedbackFooter } from "@/components/FeedbackFooter";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const nav = [
    { href: "/", label: "Dashboard" },
    { href: "/employees", label: "Employees" },
    { href: "/cases", label: "Cases" },
    { href: "/policies", label: "Policies" },
    { href: "/tech-agents", label: "Tech Agents" },
    { href: "/governance", label: "Governance Agents" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-subtle)]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-base sm:text-lg font-semibold text-[var(--text)] hover:text-[var(--accent)] transition-colors shrink-0"
            >
              Proteus — An Intelligent Enterprise Platform
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
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

            {/* Mobile hamburger button */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-[var(--surface-hover)] transition-colors shrink-0"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span className={`block w-5 h-0.5 bg-[var(--text)] transition-all duration-200 ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
              <span className={`block w-5 h-0.5 bg-[var(--text)] my-1 transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-5 h-0.5 bg-[var(--text)] transition-all duration-200 ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg-subtle)]">
            <nav className="flex flex-col px-4 py-2">
              {nav.map(({ href, label }) => {
                const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "text-[var(--accent)] bg-[var(--surface)]"
                        : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      <FeedbackFooter />

      {/* Site footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-subtle)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted)]">
            Built by{" "}
            <a
              href="https://www.linkedin.com/in/priyankmohan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
            >
              Priyank Mohan
            </a>
            {"  ·  "}
            <a
              href="https://www.linkedin.com/in/priyankmohan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              LinkedIn
            </a>
            {"  ·  "}
            <a
              href="https://github.com/priyankmg/intelligent-enterprise-platform"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              GitHub
            </a>
            {"  ·  "}
            <a
              href="https://medium.com/@mg.priyank/building-an-intelligent-enterprise-platform-0d0dde61ba2a"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              Read the Architecture Article
            </a>
          </p>
          <p className="text-xs text-[var(--muted)]">MIT License © 2026</p>
        </div>
      </footer>

      <AssistantChat />
    </div>
  );
}
