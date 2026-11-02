"use client";

import { useEffect, useRef } from "react";

/**
 * Panel lateral (escritorio) / hoja inferior (móvil) basado en <dialog> nativo:
 * gestiona foco, Escape y lectores de pantalla sin dependencias.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
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
      className="sheet m-0 ml-auto h-[100dvh] max-h-none w-full max-w-[640px] border-l border-rule bg-paper p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-[2px] max-md:mt-auto max-md:h-[88dvh] max-md:max-w-none max-md:rounded-t-xl max-md:border-l-0 max-md:border-t"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-rule px-5 py-3 md:px-8">
          <p className="kicker">{title}</p>
          <button type="button" onClick={onClose} className="kicker rounded-full border border-rule px-3 py-1.5 hover:border-ink">
            Cerrar <span aria-hidden>✕</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8">{children}</div>
      </div>
      <style>{`
        dialog.sheet[open]{animation:sheet-in .35s cubic-bezier(.2,.7,.2,1)}
        @media (max-width:767px){dialog.sheet[open]{animation:sheet-up .35s cubic-bezier(.2,.7,.2,1)}}
        @keyframes sheet-in{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}
        @keyframes sheet-up{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
      `}</style>
    </dialog>
  );
}
