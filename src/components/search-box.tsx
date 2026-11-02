"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function SearchBox({ placeholder, initial = "", autoFocus = false, dark = false }: { placeholder: string; initial?: string; autoFocus?: boolean; dark?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/buscar?q=${encodeURIComponent(q.trim())}`);
      }}
      className={`flex items-center gap-2 rounded-full p-1.5 pl-4 ${dark ? "bg-white/10" : "bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] focus-within:shadow-[inset_0_0_0_2px_var(--ink)]"}`}
    >
      <Search size={20} className={dark ? "opacity-70" : "text-ink-3"} aria-hidden />
      <label htmlFor="q-main" className="sr-only">
        Busca en propuestas, programas y votaciones
      </label>
      <input
        id="q-main"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={`min-w-0 flex-1 bg-transparent py-2.5 text-base font-semibold focus:outline-none md:text-lg ${dark ? "text-white placeholder:text-white/50" : "placeholder:text-ink-3"}`}
        autoComplete="off"
      />
      <button type="submit" className="btn btn-brand min-h-[44px] px-4">
        Buscar
      </button>
    </form>
  );
}
