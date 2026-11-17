import { useState } from "react";
import { LayoutGrid, LayoutList, MapPin, Search, Users } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import { Card, cx, EmptyState, ErrorState, Loading } from "../../components/ui";
import { getSpaces, spaceImage, swapToFallback, type SpaceStatus } from "../../api";
import { useLoader } from "../../lib/useLoader";

const STATUS_FILTERS: { label: string; value: SpaceStatus | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: "Disponible", value: "available" },
  { label: "Ocupado ahora", value: "occupied" },
  { label: "Mantenimiento", value: "maintenance" },
  { label: "Inactivo", value: "inactive" },
];
export function Catalog({ onSpaceClick }: { onSpaceClick: (id: string) => void }) {
  const { data: spaces, loading, error, reload } = useLoader(getSpaces);
  const [category, setCategory] = useState("Todos");
  const [status, setStatus] = useState<SpaceStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const all = spaces ?? [];
  const categories = ["Todos", ...Array.from(new Set(all.map((s) => s.category)))];
  const q = query.trim().toLowerCase();
  const filtered = all.filter((s) =>
    (category === "Todos" || s.category === category)
    && (status === "all" || s.status === status)
    && (!q || s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q)
      || s.equipment.some((e) => e.toLowerCase().includes(q))),
  );
  const bookable = (st: SpaceStatus) => st === "available" || st === "occupied";

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Disponibles", value: all.filter((s) => s.status === "available").length, color: "text-emerald-300" },
          { label: "Ocupados ahora", value: all.filter((s) => s.status === "occupied").length, color: "text-rose-300" },
          { label: "Mantenimiento", value: all.filter((s) => s.status === "maintenance").length, color: "text-amber-300" },
          { label: "Total", value: all.length, color: "text-white" },
        ].map((c) => (
          <Card key={c.label} className="px-4 py-3">
            <p className={cx("font-display font-700 text-2xl", c.color)}>{loading ? "–" : c.value}</p>
            <p className="text-xs text-[#6C7693]">{c.label}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative lg:w-80 self-start w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#59617A]" />
          <input
            type="search"
            placeholder="Buscar por nombre, ubicación o equipo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#121828] border border-[#1E2A45] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#59617A] focus:outline-none focus:border-[#4C6EF5] focus:ring-2 focus:ring-[#4C6EF5]/20"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={cx(
                "px-3.5 py-2 rounded-xl text-xs font-500 transition-all whitespace-nowrap",
                category === c ? "bg-[#4C6EF5] text-white shadow-lg shadow-[#4C6EF5]/20" : "bg-[#121828] border border-[#1E2A45] text-[#8A93AD] hover:text-white",
              )}
            >
              {c}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-1 bg-[#121828] border border-[#1E2A45] rounded-xl p-1">
            <button onClick={() => setView("grid")} className={cx("p-1.5 rounded-lg", view === "grid" ? "text-white bg-[#1E2A45]" : "text-[#6C7693] hover:text-white")} aria-label="Vista cuadrícula">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setView("list")} className={cx("p-1.5 rounded-lg", view === "list" ? "text-white bg-[#1E2A45]" : "text-[#6C7693] hover:text-white")} aria-label="Vista lista">
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatus(s.value)}
            aria-pressed={status === s.value}
            className={cx(
              "px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap",
              status === s.value ? "bg-[#20C997]/15 text-[#5FE3B8] border border-[#20C997]/30" : "text-[#8A93AD] hover:text-white hover:bg-white/5 border border-transparent",
            )}
          >
            {s.label}
          </button>
        ))}
        <span className="text-[#6C7693] text-xs ml-auto pl-3 whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <Loading label="Cargando catálogo..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => reload()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6" />}
          title={all.length === 0 ? "Todavía no hay espacios" : "Sin resultados"}
          text={all.length === 0 ? "El administrador aún no ha registrado espacios." : "Prueba con otra búsqueda o quita los filtros."}
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {filtered.map((space) => (
            <button
              key={space.id}
              onClick={() => bookable(space.status) && onSpaceClick(space.id)}
              disabled={!bookable(space.status)}
              className="group text-left bg-[#121828] border border-[#1E2A45] rounded-2xl overflow-hidden hover:border-[#4C6EF5]/50 hover:shadow-xl hover:shadow-[#4C6EF5]/5 transition-all hover:-translate-y-0.5 disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:border-[#1E2A45]"
            >
              <div className="relative h-40 overflow-hidden bg-[#0E1322]">
                <img src={spaceImage(space, 600, 400)} onError={(e) => swapToFallback(e, space)} alt="" loading="lazy" className="w-full h-full object-cover opacity-75 group-hover:opacity-95 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121828] via-transparent to-transparent" />
                <div className="absolute top-3 right-3"><StatusBadge status={space.status} /></div>
              </div>
              <div className="p-4">
                <p className="text-[11px] text-[#8EA4FF] font-500 uppercase tracking-wider">{space.category}</p>
                <h3 className="font-display font-600 text-white text-base mt-0.5 leading-tight">{space.name}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-[#8A93AD]">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {space.capacity}</span>
                  {space.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {space.location}</span>}
                </div>
                {space.equipment.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {space.equipment.slice(0, 3).map((eq) => (
                      <span key={eq} className="text-[10px] bg-[#1A2035] border border-[#222C47] text-[#8A93AD] px-2 py-0.5 rounded-full">{eq}</span>
                    ))}
                    {space.equipment.length > 3 && <span className="text-[10px] text-[#6C7693] px-1 py-0.5">+{space.equipment.length - 3}</span>}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-[#1E2A45] text-xs font-display font-600">
                  {space.status === "available" && <span className="text-[#8EA4FF] group-hover:text-white">Reservar →</span>}
                  {space.status === "occupied" && <span className="text-rose-300">Ocupado hasta las {space.busyUntil} · Reservar otro horario →</span>}
                  {space.status === "maintenance" && <span className="text-amber-300">En mantenimiento</span>}
                  {space.status === "inactive" && <span className="text-[#6C7693]">No disponible</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[#1E2A45]">
                {["Espacio", "Categoría", "Ubicación", "Capacidad", "Estado", ""].map((h) => (
                  <th key={h} className="text-left py-3 px-5 text-[11px] font-500 text-[#6C7693] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((space) => (
                <tr
                  key={space.id}
                  className={cx("border-b border-[#1E2A45] last:border-0 transition-colors", bookable(space.status) ? "hover:bg-white/[0.03] cursor-pointer" : "opacity-55")}
                  onClick={() => bookable(space.status) && onSpaceClick(space.id)}
                >
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <img src={spaceImage(space, 80, 80)} onError={(e) => swapToFallback(e, space)} alt="" className="w-10 h-10 rounded-lg object-cover opacity-80" />
                      <span className="font-display font-600 text-white text-sm">{space.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-[#A8B3CF] text-xs">{space.category}</td>
                  <td className="py-3 px-5 text-[#A8B3CF] text-xs">{space.location || "—"}</td>
                  <td className="py-3 px-5 text-[#A8B3CF] text-xs">{space.capacity}</td>
                  <td className="py-3 px-5"><StatusBadge status={space.status} /></td>
                  <td className="py-3 px-5 text-xs text-[#8EA4FF]">{bookable(space.status) ? "Reservar →" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mis reservas
// ---------------------------------------------------------------------------
