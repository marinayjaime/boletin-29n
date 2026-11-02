"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export const NAV = [
  { href: "/comparador", label: "Comparador" },
  { href: "/test", label: "Test a ciegas" },
  { href: "/observatorio", label: "Observatorio" },
  { href: "/votaciones", label: "Votaciones" },
  { href: "/promesas", label: "Promesas" },
  { href: "/partidos", label: "Partidos" },
  { href: "/fuentes", label: "Fuentes" },
];

function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme ?? null);
  }, []);
  const next = theme === "dark" ? "light" : theme === "light" ? null : "dark";
  const label = theme === "dark" ? "Tema oscuro" : theme === "light" ? "Tema claro" : "Tema del sistema";
  return (
    <button
      type="button"
      onClick={() => {
        if (next) document.documentElement.dataset.theme = next;
        else delete document.documentElement.dataset.theme;
        try {
          if (next) localStorage.setItem("theme", next);
          else localStorage.removeItem("theme");
        } catch {}
        setTheme(next);
      }}
      className="kicker flex h-9 items-center gap-2 rounded-full border border-rule px-3 hover:border-ink"
      aria-label={`${label}. Pulsa para cambiar.`}
      title={label}
    >
      <span aria-hidden className="inline-block h-3 w-3 rounded-full border border-ink" style={{ background: "linear-gradient(90deg, var(--ink) 50%, transparent 50%)" }} />
      <span className="hidden xl:inline">{theme === "dark" ? "Oscuro" : theme === "light" ? "Claro" : "Auto"}</span>
    </button>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-4 px-4 md:h-16 md:px-8">
        <Link href="/" className="group flex items-baseline gap-2" aria-label="Boletín 29N, inicio">
          <span className="display text-[1.35rem] font-semibold leading-none md:text-2xl">Boletín</span>
          <span className="font-mono text-xs tracking-wider text-accent">29·N</span>
        </Link>
        <nav aria-label="Principal" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname?.startsWith(n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative rounded px-3 py-2 text-[0.92rem] transition-colors hover:text-ink ${active ? "text-ink" : "text-ink-2"}`}
                  >
                    {n.label}
                    {active && <span className="absolute inset-x-3 -bottom-[13px] h-[2px] bg-accent" aria-hidden />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <Link href="/buscar" className="kicker flex h-9 items-center gap-2 rounded-full border border-rule px-3 hover:border-ink" aria-label="Buscar en documentos">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="hidden sm:inline">Buscar</span>
          </Link>
          <ThemeToggle />
          <button
            type="button"
            className="kicker flex h-9 items-center rounded-full border border-ink px-3 lg:hidden"
            aria-expanded={open}
            aria-controls="menu-movil"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Cerrar" : "Menú"}
          </button>
        </div>
      </div>
      {open && (
        <nav id="menu-movil" aria-label="Principal (móvil)" className="border-t border-rule bg-paper lg:hidden">
          <ul className="mx-auto grid max-w-[1320px] grid-cols-1 px-4 py-2">
            {NAV.map((n, i) => (
              <li key={n.href} className="rise" style={{ animationDelay: `${i * 30}ms` }}>
                <Link href={n.href} className="flex items-baseline justify-between border-b border-rule py-4 display text-2xl">
                  {n.label}
                  <span className="font-mono text-xs text-ink-3">0{i + 1}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/metodologia" className="block py-4 text-ink-2">
                Metodología · Privacidad · Glosario
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
