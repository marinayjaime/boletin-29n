import Link from "next/link";
import {
  Banknote,
  Briefcase,
  Building2,
  Euro,
  Flag,
  Globe2,
  GraduationCap,
  HeartPulse,
  Home,
  Leaf,
  Map as MapIcon,
  PiggyBank,
  Scale,
  Shield,
  ShieldCheck,
  Train,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { partyVars } from "@/lib/party-theme";
import { asset } from "@/lib/asset";

export const TOPIC_ICONS: Record<string, LucideIcon> = {
  economia: Banknote,
  fiscalidad: Euro,
  empleo: Briefcase,
  vivienda: Home,
  pensiones: PiggyBank,
  sanidad: HeartPulse,
  educacion: GraduationCap,
  familia: Users,
  inmigracion: Globe2,
  seguridad: ShieldCheck,
  justicia: Scale,
  igualdad: Flag,
  "medio-ambiente": Leaf,
  energia: Zap,
  transporte: Train,
  territorial: MapIcon,
  "ue-exterior": Building2,
  defensa: Shield,
};

export function TopicIcon({ id, size = 18, className }: { id: string; size?: number; className?: string }) {
  const I = TOPIC_ICONS[id] ?? Banknote;
  return <I size={size} className={className} aria-hidden strokeWidth={2.2} />;
}

type PartyLite = { id: string; shortName: string; monogram: string; representative?: { name: string; photo: string } };

/** Retrato del representante con anillo del color del partido; si no hay foto, monograma. */
export function PartyAvatar({ party, size = 56, ring = 3, label = true }: { party: PartyLite; size?: number; ring?: number; label?: boolean }) {
  const v = partyVars(party.id);
  const photo = party.representative?.photo;
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full"
      style={{ width: size, height: size, boxShadow: `0 0 0 ${ring}px ${v.primary}`, background: v.soft }}
      role={label ? "img" : undefined}
      aria-label={label ? `${party.representative?.name ?? party.shortName} (${party.shortName})` : undefined}
      aria-hidden={label ? undefined : true}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset(`/img/personas/${photo}.jpg`)} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
      ) : (
        <span className="num" style={{ color: v.strong, fontSize: size * 0.36 }}>
          {party.monogram}
        </span>
      )}
    </span>
  );
}

/** Píldora con el color del partido + nombre (nunca solo color). */
export function PartyPill({ party, solid = false, size = "md" }: { party: { id: string; shortName: string }; solid?: boolean; size?: "sm" | "md" }) {
  const v = partyVars(party.id);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}`}
      style={solid ? { background: v.primary, color: v.on } : { background: v.soft, color: v.strong }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: solid ? v.on : v.primary }} aria-hidden />
      {party.shortName}
    </span>
  );
}

export function PartyDot({ id, size = 10 }: { id: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: partyVars(id).primary }} aria-hidden />;
}

export function SectionTitle({ eyebrow, title, action, id }: { eyebrow?: string; title: string; action?: { href: string; label: string }; id?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 id={id} className="display text-[2.1rem] md:text-5xl">
          {title}
        </h2>
      </div>
      {action && (
        <Link href={action.href} className="btn btn-ghost">
          {action.label} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  sub,
  children,
  tone = "plain",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  children?: React.ReactNode;
  tone?: "plain" | "ink" | "brand";
}) {
  const cls = tone === "ink" ? "bg-ink text-bg" : tone === "brand" ? "bg-brand text-brand-ink" : "";
  return (
    <header className={`${cls} ${tone !== "plain" ? "mb-8" : ""}`}>
      <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-8 md:px-8 md:pb-12 md:pt-14">
        <p className={`eyebrow rise ${tone !== "plain" ? "!text-current opacity-70" : ""}`}>{eyebrow}</p>
        <h1 className="display rise mt-3 max-w-4xl text-[2.9rem] md:text-[5.2rem]" style={{ animationDelay: "60ms" }}>
          {title}
        </h1>
        {sub && (
          <p className={`rise mt-4 max-w-xl text-lg font-semibold ${tone !== "plain" ? "opacity-80" : "text-ink-2"}`} style={{ animationDelay: "120ms" }}>
            {sub}
          </p>
        )}
        {children}
      </div>
    </header>
  );
}

export const STATUS_STYLE = {
  cumplido: { color: "var(--yes)", label: "Cumplido", glyph: "✓" },
  cumplido_parcial: { color: "var(--partial)", label: "Parcial", glyph: "◐" },
  en_tramitacion: { color: "var(--pending)", label: "En tramitación", glyph: "…" },
  no_cumplido: { color: "var(--no)", label: "No cumplido", glyph: "✕" },
  no_verificable: { color: "var(--abs)", label: "No verificable", glyph: "?" },
} as const;

export function StatusBadge({ status, long }: { status: keyof typeof STATUS_STYLE; long?: string }) {
  const s = STATUS_STYLE[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ background: `color-mix(in oklab, ${s.color} 16%, transparent)`, color: s.color }}>
      <span className="grid h-4 w-4 place-items-center rounded-full text-[0.65rem] text-white" style={{ background: s.color }} aria-hidden>
        {s.glyph}
      </span>
      {long ?? s.label}
    </span>
  );
}

export function Disclosure({ summary, children, className = "" }: { summary: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <details className={`group rounded-2xl bg-surface-2 ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-bold">
        {summary}
        <span className="grid h-7 w-7 place-items-center rounded-full bg-surface text-sm transition-transform group-open:rotate-45" aria-hidden>
          +
        </span>
      </summary>
      <div className="px-4 pb-4 text-[0.95rem] text-ink-2">{children}</div>
    </details>
  );
}
