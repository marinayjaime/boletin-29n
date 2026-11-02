import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-24 md:px-8">
      <p className="kicker">Error 404</p>
      <h1 className="display mt-3 text-5xl">Esta página no existe</h1>
      <p className="mt-4 text-ink-2">Puede que el enlace sea antiguo o que la votación o ficha haya cambiado de identificador.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="rounded-full bg-ink px-5 py-2.5 text-paper">
          Ir a la portada
        </Link>
        <Link href="/buscar" className="rounded-full border border-ink px-5 py-2.5">
          Buscar
        </Link>
      </div>
    </div>
  );
}
