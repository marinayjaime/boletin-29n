"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Crown, ExternalLink, Landmark, Map as MapIcon, MapPin, Minus, Plus, RotateCcw, Scale, Shield, Users } from "lucide-react";
import type { Minister, Organization } from "@/lib/data";
import type { Party } from "@/lib/schema";
import { partyVars } from "@/lib/party-theme";
import { asset } from "@/lib/asset";
import { Sheet } from "./sheet";
import { PartyAvatar } from "./ui";

const ICONS = { crown: Crown, landmark: Landmark, users: Users, map: MapIcon, briefcase: Briefcase, scale: Scale, shield: Shield, "map-pin": MapPin } as const;
// posiciones del mapa institucional (porcentaje del lienzo)
const LAYOUT: Record<string, { x: number; y: number }> = {
  corona: { x: 50, y: 10 },
  cortes: { x: 22, y: 42 },
  congreso: { x: 10, y: 80 },
  senado: { x: 34, y: 80 },
  gobierno: { x: 78, y: 42 },
  judicial: { x: 62, y: 80 },
  tc: { x: 88, y: 80 },
  ccaa: { x: 50, y: 52 },
};
const COLORS: Record<string, string> = { corona: "var(--c6)", cortes: "var(--c2)", congreso: "var(--c2)", senado: "var(--c2)", gobierno: "var(--c5)", judicial: "var(--c3)", tc: "var(--c3)", ccaa: "var(--c4)" };

function Avatar({ m, size = 64 }: { m: Minister; size?: number }) {
  return (
    <span className="inline-block shrink-0 overflow-hidden rounded-full bg-surface-2" style={{ width: size, height: size }}>
      {m.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset(m.photo)} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
      ) : null}
    </span>
  );
}

export function WhoDoesWhat({ org, government, parties }: { org: Organization; government: { source: string; checkedAt: string; photoCredit: string; members: Minister[] }; parties: Party[] }) {
  const [tab, setTab] = useState<"instituciones" | "gobierno" | "partidos">("instituciones");
  const [inst, setInst] = useState<string | null>("gobierno");
  const [person, setPerson] = useState<Minister | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [partyId, setPartyId] = useState("pp");
  const [organ, setOrgan] = useState<string | null>(null);
  const [showMin, setShowMin] = useState(true);

  const imap = Object.fromEntries(org.institutions.map((i) => [i.id, i]));
  const selected = inst ? imap[inst] : null;
  const rels = org.relations;
  const pres = government.members.find((m) => /^Presidente del Gobierno/.test(m.role))!;
  const vps = government.members.filter((m) => /^Vicepresident/.test(m.role));
  const ministers = government.members.filter((m) => m !== pres && !vps.includes(m));
  const porg = org.parties[partyId];
  const partyList = useMemo(() => parties, [parties]);

  return (
    <div>
      <div role="tablist" className="inline-flex flex-wrap rounded-[28px] bg-surface p-1.5 shadow-[inset_0_0_0_1.5px_var(--line)]">
        {(
          [
            ["instituciones", "Instituciones"],
            ["gobierno", "Gobierno"],
            ["partidos", "Partidos"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-5 py-3 font-extrabold ${tab === k ? "bg-ink text-bg" : "text-ink-2"}`}>
            {l}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "instituciones" && (
          <motion.div key="i" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            {/* escritorio: mapa de nodos con zoom y desplazamiento */}
            <div className="card relative hidden overflow-hidden lg:block">
              <div className="absolute right-3 top-3 z-10 flex gap-1">
                <button type="button" className="chip !min-h-[36px]" onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))} aria-label="Ampliar">
                  <Plus size={16} aria-hidden />
                </button>
                <button type="button" className="chip !min-h-[36px]" onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))} aria-label="Reducir">
                  <Minus size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  className="chip !min-h-[36px]"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  aria-label="Restablecer vista"
                >
                  <RotateCcw size={16} aria-hidden />
                </button>
              </div>
              <div
                className="grid-bg h-[500px] cursor-grab touch-none active:cursor-grabbing"
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
                }}
                onPointerMove={(e) => drag.current && setPan({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y })}
                onPointerUp={() => (drag.current = null)}
                onPointerLeave={() => (drag.current = null)}
                onWheel={(e) => setZoom((z) => Math.max(0.7, Math.min(1.8, z - e.deltaY * 0.001)))}
              >
                <div className="relative h-full w-full transition-transform duration-200" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                    {rels.map((r, k) => {
                      const a = LAYOUT[r.from];
                      const b = LAYOUT[r.to];
                      const on = inst && (r.from === inst || r.to === inst);
                      return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? "var(--ink)" : "var(--line)"} strokeWidth={on ? 0.6 : 0.35} vectorEffect="non-scaling-stroke" style={{ strokeWidth: on ? 3 : 1.5 }} />;
                    })}
                    {["congreso", "senado"].map((c) => (
                      <line key={c} x1={LAYOUT.cortes.x} y1={LAYOUT.cortes.y} x2={LAYOUT[c].x} y2={LAYOUT[c].y} stroke="var(--ink-3)" strokeDasharray="1 1" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.5 }} />
                    ))}
                  </svg>
                  {org.institutions.map((i) => {
                    const Icon = ICONS[i.icon as keyof typeof ICONS] ?? Landmark;
                    const on = inst === i.id;
                    const linked = inst && rels.some((r) => (r.from === inst && r.to === i.id) || (r.to === inst && r.from === i.id));
                    return (
                      <motion.button
                        key={i.id}
                        type="button"
                        onClick={() => setInst(i.id)}
                        animate={{ scale: on ? 1.08 : 1, opacity: !inst || on || linked ? 1 : 0.45 }}
                        className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl px-3 py-2.5 font-extrabold shadow-[var(--shadow)]"
                        style={{ left: `${LAYOUT[i.id].x}%`, top: `${LAYOUT[i.id].y}%`, background: on ? COLORS[i.id] : "var(--surface)", color: on ? "#fff" : "var(--ink)" }}
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-xl text-white" style={{ background: COLORS[i.id] }}>
                          <Icon size={17} aria-hidden />
                        </span>
                        {i.short}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              <p className="absolute bottom-3 left-4 text-xs font-bold text-ink-3">Arrastra para moverte · rueda para ampliar · pulsa una institución</p>
            </div>

            {/* móvil: lista vertical */}
            <ul className="space-y-2 lg:hidden">
              {org.institutions.map((i) => {
                const Icon = ICONS[i.icon as keyof typeof ICONS] ?? Landmark;
                return (
                  <li key={i.id}>
                    <button type="button" onClick={() => setInst(i.id)} aria-pressed={inst === i.id} className="card flex w-full items-center gap-3 p-4 text-left" style={inst === i.id ? { boxShadow: `inset 0 0 0 3px ${COLORS[i.id]}` } : undefined}>
                      <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: COLORS[i.id] }}>
                        <Icon size={20} aria-hidden />
                      </span>
                      <span>
                        <span className="block font-extrabold">{i.name}</span>
                        <span className="block text-sm font-semibold text-ink-3">{i.role}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <AnimatePresence mode="wait">
              {selected && (
                <motion.aside key={selected.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="card self-start p-6 lg:sticky lg:top-24">
                  <span className="tag !text-white" style={{ background: COLORS[selected.id] }}>
                    {selected.role}
                  </span>
                  <h2 className="display mt-3 text-4xl">{selected.name}</h2>
                  {selected.holder && (
                    <p className="mt-2 font-bold">
                      Titular: <span className="text-ink-2">{selected.holder}</span>
                    </p>
                  )}
                  <ul className="mt-4 space-y-2">
                    {selected.what.map((w) => (
                      <li key={w} className="flex gap-2 font-semibold">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[selected.id] }} aria-hidden />
                        {w}
                      </li>
                    ))}
                  </ul>
                  <p className="eyebrow mt-6">Relaciones</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {rels
                      .filter((r) => r.from === selected.id || r.to === selected.id)
                      .map((r, k) => (
                        <li key={k} className="rounded-xl bg-surface-2 p-3">
                          <span className="font-extrabold">
                            {imap[r.from].short} → {imap[r.to].short}
                          </span>
                          <span className="block font-semibold text-ink-2">{r.label}</span>
                          <span className="text-xs font-bold text-ink-3">Constitución, {r.articles}</span>
                        </li>
                      ))}
                  </ul>
                  <a href={org.constitutionUrl} target="_blank" rel="noreferrer" className="btn btn-ghost mt-5 text-sm">
                    <ExternalLink size={16} aria-hidden /> Constitución · {selected.articles}
                  </a>
                </motion.aside>
              )}
            </AnimatePresence>
            <p className="text-sm font-semibold text-ink-3 lg:col-span-2">No es una cadena de mando: son poderes con funciones propias que se controlan entre sí. Desde la disolución de las Cortes (6 de octubre de 2026), sus funciones las ejercen las Diputaciones Permanentes.</p>
          </motion.div>
        )}

        {tab === "gobierno" && (
          <motion.div key="g" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
            <div className="flex flex-col items-center">
              <button type="button" onClick={() => setPerson(pres)} className="card lift flex flex-col items-center p-5 text-center" style={{ boxShadow: "inset 0 6px 0 var(--ink), var(--shadow)" }}>
                <Avatar m={pres} size={104} />
                <p className="mt-3 text-lg font-extrabold">{pres.name}</p>
                <p className="text-sm font-bold text-ink-3">{pres.role}</p>
              </button>
              <span className="h-8 w-0.5 bg-line" aria-hidden />
              <div className="grid w-full gap-3 md:grid-cols-3">
                {vps.map((m) => (
                  <button key={m.id} type="button" onClick={() => setPerson(m)} className="card lift flex items-center gap-3 p-4 text-left">
                    <Avatar m={m} size={64} />
                    <span>
                      <span className="block font-extrabold">{m.name}</span>
                      <span className="block text-sm font-semibold text-ink-2">{m.role}</span>
                    </span>
                  </button>
                ))}
              </div>
              <span className="h-8 w-0.5 bg-line" aria-hidden />
              <button type="button" onClick={() => setShowMin((v) => !v)} aria-expanded={showMin} className="btn btn-primary">
                {showMin ? <Minus size={16} aria-hidden /> : <Plus size={16} aria-hidden />} {ministers.length} ministerios
              </button>
              <AnimatePresence>
                {showMin && (
                  <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 grid w-full gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
                    {ministers.map((m, k) => (
                      <motion.li key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.02 }}>
                        <button type="button" onClick={() => setPerson(m)} className="card lift flex h-full w-full items-center gap-3 p-3 text-left">
                          <Avatar m={m} size={52} />
                          <span className="min-w-0">
                            <span className="block font-extrabold leading-tight">{m.name}</span>
                            <span className="block text-sm font-semibold leading-snug text-ink-2">{m.role.replace(/^Ministr[oa] (de |del |para )?/, "")}</span>
                          </span>
                        </button>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
            <p className="mt-6 text-sm font-semibold text-ink-3">
              Fuente:{" "}
              <a href={government.source} className="link" target="_blank" rel="noreferrer">
                La Moncloa, composición del Gobierno
              </a>{" "}
              (consultada el 2 de noviembre de 2026). Fotografías: {government.photoCredit}.
            </p>
          </motion.div>
        )}

        {tab === "partidos" && (
          <motion.div key="p" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
            <div className="lane -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
              {partyList.map((p) => {
                const v = partyVars(p.id);
                const on = p.id === partyId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setPartyId(p.id);
                      setOrgan(null);
                    }}
                    className="flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 font-extrabold"
                    style={on ? { background: v.primary, color: v.on } : { background: "var(--surface)", boxShadow: "inset 0 0 0 1.5px var(--line)" }}
                  >
                    <PartyAvatar party={p} size={32} ring={0} label={false} /> {p.shortName}
                  </button>
                );
              })}
            </div>
            {porg.note && <p className="mt-4 rounded-2xl bg-brand-soft p-4 font-semibold">{porg.note}</p>}
            {porg.organs.length > 0 ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <ol className="space-y-3">
                  {porg.organs.map((o) => {
                    const v = partyVars(partyId);
                    const on = organ === o.id;
                    return (
                      <li key={o.id} style={{ marginLeft: porg.organs.some((x) => x.children?.includes(o.id)) ? 28 : 0 }}>
                        <button type="button" onClick={() => setOrgan(on ? null : o.id)} aria-expanded={on} className="card flex w-full items-center gap-3 p-4 text-left" style={{ boxShadow: on ? `inset 0 0 0 3px ${v.primary}` : `inset 5px 0 0 ${v.primary}, var(--shadow)` }}>
                          <span className="tag">{o.kind}</span>
                          <span className="flex-1 font-extrabold">{o.name}</span>
                          <span className="text-xs font-bold text-ink-3">{o.article}</span>
                        </button>
                        <AnimatePresence>
                          {on && (
                            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-4 pt-2 font-semibold text-ink-2">
                              {o.what}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ol>
                <div className="card self-start p-5">
                  <p className="eyebrow">Documento</p>
                  <p className="mt-2 font-extrabold">{porg.doc.title}</p>
                  {porg.doc.note && <p className="mt-2 text-sm font-semibold text-ink-2">{porg.doc.note}</p>}
                  {porg.doc.sha256 && <p className="mt-2 break-all font-mono text-[0.7rem] text-ink-3">SHA-256 {porg.doc.sha256}</p>}
                  <a href={porg.doc.url} target="_blank" rel="noreferrer" className="btn btn-primary mt-4 text-sm">
                    <ExternalLink size={16} aria-hidden /> Abrir estatutos
                  </a>
                  <p className="mt-3 text-xs font-semibold text-ink-3">Se muestran los órganos de ámbito estatal. Las personas que los ocupan no se incluyen hasta verificarlas.</p>
                </div>
              </div>
            ) : (
              <div className="hatch mt-6 rounded-[24px] p-8 text-center shadow-[inset_0_0_0_1.5px_var(--line)]">
                <p className="display text-3xl">Estructura pendiente de documentar</p>
                <a href={porg.doc.url} target="_blank" rel="noreferrer" className="btn btn-ghost mt-4">
                  {porg.doc.title}
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={!!person} onClose={() => setPerson(null)} title="Miembro del Gobierno">
        {person && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar m={person} size={112} />
              <div>
                <h2 className="display text-3xl">{person.name}</h2>
                <p className="mt-1 font-bold text-ink-2">{person.role}</p>
              </div>
            </div>
            {person.sinceContext && (
              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="eyebrow">En el cargo desde</p>
                <p className="num mt-1 text-3xl">{person.since}</p>
                <p className="mt-1 text-sm font-semibold text-ink-3">Según su biografía oficial: «{person.sinceContext.replace(/^.*?(Vicepresident|Ministr|Presidente)/, "$1")}»</p>
              </div>
            )}
            <a href={person.profileUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
              <ExternalLink size={16} aria-hidden /> Biografía oficial en La Moncloa
            </a>
            <p className="text-xs font-semibold text-ink-3">Fotografía: La Moncloa. Gobierno en ejercicio tras la convocatoria electoral; sigue en plenitud de funciones hasta las elecciones.</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
