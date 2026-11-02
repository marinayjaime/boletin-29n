/** Ruta a un fichero de /public respetando la subruta de despliegue (GitHub Pages). */
export const asset = (p: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${p}`;
