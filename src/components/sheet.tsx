"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Panel lateral (escritorio) / hoja inferior (móvil) sobre <dialog> nativo:
 * gestiona foco, Escape y lectores de pantalla.
 */
export function Sheet({ open, onClose, title, children, accent }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; accent?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="sheet m-0 ml-auto h-[100dvh] max-h-none w-full max-w-[620px] bg-bg p-0 text-ink backdrop:bg-black/50 backdrop:backdrop-blur-sm max-md:mt-auto max-md:h-[90dvh] max-md:max-w-none max-md:rounded-t-[28px] md:rounded-l-[28px]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 md:px-7" style={{ boxShadow: accent ? `inset 0 6px 0 ${accent}` : undefined }}>
          <span className="mx-auto h-1.5 w-12 rounded-full bg-surface-3 md:hidden" aria-hidden />
          <p className="eyebrow hidden md:block">{title}</p>
          <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--ink)]" aria-label="Cerrar">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-10 pt-2 md:px-7">{children}</div>
      </div>
      <style>{`
        dialog.sheet[open]{animation:sheet-in .35s cubic-bezier(.2,.8,.2,1)}
        @media (max-width:767px){dialog.sheet[open]{animation:sheet-up .38s cubic-bezier(.2,.8,.2,1)}}
        @keyframes sheet-in{from{transform:translateX(60px);opacity:0}to{transform:none;opacity:1}}
        @keyframes sheet-up{from{transform:translateY(80px);opacity:0}to{transform:none;opacity:1}}
      `}</style>
    </dialog>
  );
}
