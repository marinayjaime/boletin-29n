"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Home, Menu, Moon, Search, Sun, SunMoon, X } from "lucide-react";
import { PRIMARY, SECONDARY } from "@/lib/nav";

function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);
  useEffect(() => setTheme(document.documentElement.dataset.theme ?? null), []);
  const next = theme === "dark" ? "light" : theme === "light" ? null : "dark";
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : SunMoon;
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
      className="grid h-11 w-11 place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--ink)]"
      aria-label={`Tema: ${theme === "dark" ? "oscuro" : theme === "light" ? "claro" : "del sistema"}. Pulsa para cambiar.`}
    >
      <Icon size={18} aria-hidden />
    </button>
  );
}

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2" aria-label="Boletín 29·N, inicio">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-brand transition-transform group-hover:-rotate-6">
        <span className="num text-lg">29</span>
      </span>
      <span className="display text-xl leading-none">
        Boletín<span className="text-ink-3">·N</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const isActive = (h: string) => pathname?.startsWith(h);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 md:px-8">
          <Logo />
          <nav aria-label="Principal" className="ml-6 hidden lg:block">
            <ul className="flex items-center gap-1 rounded-full bg-surface p-1 shadow-[inset_0_0_0_1.5px_var(--line)]">
              {PRIMARY.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={isActive(n.href) ? "page" : undefined}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition-colors ${isActive(n.href) ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2"}`}
                  >
                    <n.icon size={15} aria-hidden />
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/buscar" className="hidden h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-bold shadow-[inset_0_0_0_1.5px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--ink)] sm:flex" aria-label="Buscar en documentos">
              <Search size={16} aria-hidden /> Buscar
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMore((v) => !v)}
              aria-expanded={more}
              aria-controls="menu-mas"
              className="hidden h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-bg lg:flex"
            >
              {more ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden />} Más
            </button>
          </div>
        </div>
      </header>

      {/* panel «Más» */}
      <AnimatePresence>
        {more && (
          <motion.div
            id="menu-mas"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-3 bottom-[88px] z-[60] rounded-[28px] bg-surface p-3 shadow-[var(--shadow-lg)] lg:bottom-auto lg:left-auto lg:right-8 lg:top-[72px] lg:w-[380px]"
          >
            <nav aria-label="Más secciones">
              <ul className="grid grid-cols-2 gap-2">
                {[...PRIMARY.slice(4), ...SECONDARY].map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className={`flex h-full flex-col gap-2 rounded-2xl p-4 font-bold transition-colors ${isActive(n.href) ? "bg-ink text-bg" : "bg-surface-2 hover:bg-surface-3"}`}>
                      <n.icon size={20} aria-hidden />
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
      {more && <button aria-label="Cerrar menú" className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-[1px]" onClick={() => setMore(false)} />}

      {/* barra inferior móvil */}
      <nav aria-label="Principal (móvil)" className="fixed inset-x-0 bottom-0 z-[58] border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-1.5">
          {[{ href: "/", label: "Inicio", icon: Home }, ...PRIMARY.slice(0, 3)].map((n) => {
            const on = n.href === "/" ? pathname === "/" : isActive(n.href);
            return (
              <li key={n.href}>
                <Link href={n.href} aria-current={on ? "page" : undefined} className="flex flex-col items-center gap-0.5 py-1.5 text-[0.72rem] font-bold">
                  <span className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${on ? "bg-brand text-brand-ink" : "text-ink-2"}`}>
                    <n.icon size={20} aria-hidden />
                  </span>
                  <span className={on ? "text-ink" : "text-ink-3"}>{n.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="flex w-full flex-col items-center gap-0.5 py-1.5 text-[0.72rem] font-bold">
              <span className={`grid h-8 w-14 place-items-center rounded-full ${more ? "bg-ink text-bg" : "text-ink-2"}`}>{more ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}</span>
              <span className="text-ink-3">Más</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
