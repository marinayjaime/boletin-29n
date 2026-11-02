import type { Metadata } from "next";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Privacidad" };

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Política de privacidad" title="Tus opiniones no salen de tu navegador" sub="Sin registro, sin analítica, sin perfiles." />
      <div className="mx-auto max-w-[760px] px-4 md:px-8">
      <div className="prose-civic text-ink-2">
        <h2 className="display mt-8 text-2xl text-ink">Qué no hacemos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>No pedimos registro ni datos personales.</li>
          <li>No usamos cookies de seguimiento, ni analítica, ni píxeles de terceros, ni publicidad.</li>
          <li>No creamos perfiles políticos ni compartimos información con partidos o anunciantes.</li>
          <li>No enviamos tus respuestas del test ni tus búsquedas a ningún servidor.</li>
        </ul>
        <h2 className="display mt-8 text-2xl text-ink">Qué se guarda en tu dispositivo</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-ink">Respuestas del test</strong>: en <code>sessionStorage</code> de la pestaña. Se borran al cerrarla o con el botón «Borrar mis
            respuestas».
          </li>
          <li>
            <strong className="text-ink">Tema claro u oscuro</strong>: en <code>localStorage</code>, solo si lo eliges.
          </li>
        </ul>
        <h2 className="display mt-8 text-2xl text-ink">Búsqueda y filtros</h2>
        <p>
          El buscador descarga un índice de documentos y busca en tu navegador. Los filtros del comparador, el Observatorio y las votaciones se reflejan en la URL
          para poder compartirla: si compartes un enlace, la otra persona verá esos filtros, no tus respuestas del test.
        </p>
        <h2 className="display mt-8 text-2xl text-ink">Servidor y alojamiento</h2>
        <p>
          Como cualquier web, el servidor que la aloja puede registrar datos técnicos de acceso (dirección IP, fecha, página solicitada) según la configuración del
          proveedor de alojamiento. La aplicación no añade ningún registro propio. Quien despliegue la plataforma debe identificar aquí al responsable del
          tratamiento y al proveedor de alojamiento.
        </p>
        <h2 className="display mt-8 text-2xl text-ink">Enlaces externos</h2>
        <p>Al abrir un documento original (BOE, Congreso, webs de partidos, Eurostat), sales de esta web y se aplica la política de ese sitio.</p>
        <p className="mt-8 text-sm">Esta política no constituye una certificación de cumplimiento normativo: no se ha realizado una auditoría externa.</p>
      </div>
    </div>
    </>
  );
}
