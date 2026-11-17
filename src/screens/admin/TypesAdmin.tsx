import { Plus } from "lucide-react";
import { Button, Card, ErrorState, Loading, Pill } from "../../components/ui";
import { typeLabel, type Space } from "../../api";
import { useLoader } from "../../lib/useLoader";
import { KNOWN_TYPES } from "./SpaceFormModal";

export function TypesAdmin({ state, onShow, onAdd }: {
  state: ReturnType<typeof useLoader<Space[]>>;
  onShow: (type: string) => void;
  onAdd: (type: string) => void;
}) {
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorState message={state.error} onRetry={() => state.reload()} />;
  const all = state.data ?? [];
  const types = Array.from(new Set([...KNOWN_TYPES, ...all.map((s) => s.type)]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {types.map((t) => {
        const ofType = all.filter((s) => s.type === t);
        return (
          <Card key={t} className="p-5 flex flex-col">
            <p className="font-display font-700 text-white text-lg">{typeLabel(t)}</p>
            <p className="text-xs text-[#6C7693] font-mono">{t}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Pill tone="blue">{ofType.length} en total</Pill>
              <Pill tone="green">{ofType.filter((s) => s.estado === "ACTIVO").length} activos</Pill>
              {ofType.some((s) => s.estado === "MANTENIMIENTO") && <Pill tone="amber">{ofType.filter((s) => s.estado === "MANTENIMIENTO").length} en mantenimiento</Pill>}
            </div>
            <div className="flex gap-2 mt-5 pt-4 border-t border-[#1E2A45]">
              <Button size="sm" variant="secondary" disabled={!ofType.length} onClick={() => onShow(t)}>Ver espacios</Button>
              <Button size="sm" variant="ghost" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => onAdd(t)}>Agregar</Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reservas
// ---------------------------------------------------------------------------
