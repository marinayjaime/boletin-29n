/** Navegación compartida entre cabecera (cliente) y pie (servidor). */
import {
  BarChart3,
  Building,
  Columns3,
  Compass,
  FileSearch,
  Grid3x3,
  Landmark,
  ListChecks,
  Network,
  PieChart,
  Search,
  Users,
  Link2,
} from "lucide-react";

export const PRIMARY = [
  { href: "/comparador", label: "Comparar", icon: Columns3 },
  { href: "/test", label: "Test", icon: ListChecks },
  { href: "/pactos", label: "Pactos", icon: PieChart },
  { href: "/observatorio", label: "Datos", icon: BarChart3 },
  { href: "/votaciones", label: "Congreso", icon: Landmark },
  { href: "/promesas", label: "Promesas", icon: Compass },
];
export const SECONDARY = [
  { href: "/puntos-en-comun", label: "Puntos en común", icon: Link2 },
  { href: "/quien-hace-que", label: "¿Quién hace qué?", icon: Network },
  { href: "/partidos", label: "Partidos", icon: Users },
  { href: "/fuentes", label: "Fuentes", icon: FileSearch },
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/glosario", label: "Glosario", icon: Grid3x3 },
  { href: "/metodologia", label: "Metodología", icon: Building },
];

