import type { SpaceStatus } from "../api";

interface Props {
  status: SpaceStatus;
}

const config = {
  available: { label: "Disponible", dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-950/70 border-emerald-400/30" },
  occupied: { label: "Ocupado", dot: "bg-rose-400", text: "text-rose-300", bg: "bg-rose-950/70 border-rose-400/30" },
  maintenance: { label: "Mantenimiento", dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-950/70 border-amber-400/30" },
  inactive: { label: "Inactivo", dot: "bg-slate-400", text: "text-slate-300", bg: "bg-slate-900/70 border-slate-400/30" },
};

export default function StatusBadge({ status }: Props) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-500 border backdrop-blur ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === "available" ? "animate-pulse" : ""}`} />
      {c.label}
    </span>
  );
}
