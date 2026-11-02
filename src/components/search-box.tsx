"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox({ placeholder, initial = "", autoFocus = false }: { placeholder: string; initial?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/buscar?q=${encodeURIComponent(q.trim())}`);
      }}
      className="group flex items-stretch border-b-2 border-ink focus-within:border-accent"
    >
      <label htmlFor="q-main" className="sr-only">
        Pregunta o busca en los documentos
      </label>
      <input
        id="q-main"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent py-3 font-display text-lg placeholder:text-ink-3 focus:outline-none md:text-2xl"
        autoComplete="off"
      />
      <button type="submit" className="kicker shrink-0 px-2 text-ink hover:text-accent md:px-4">
        Buscar →
      </button>
    </form>
  );
}
