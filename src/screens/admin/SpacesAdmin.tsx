import { useState } from "react";
import { Building2, Pencil, Search, ShieldCheck, Trash2, Wrench } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import { Button, Card, EmptyState, ErrorState, Input, Loading, Select, useAction, useUi } from "../../components/ui";
import { deleteSpace, ESTADO_LABEL, typeLabel, updateSpace, type Space, type SpaceEstado, type SpaceInput } from "../../api";
import { useLoader } from "../../lib/useLoader";

export function SpacesAdmin({ state, typeFilter, setTypeFilter, onEdit, onChanged }: {
  state: ReturnType<typeof useLoader<Space[]>>;
  typeFilter: string;
  setTypeFilter: (t: string) => void;
  onEdit: (s: Space) => void;
  onChanged: () => void;
}) {
  const { confirm } = useUi();
  const { busy, run } = useAction();
  const [query, setQuery] = useState("");

  const all = state.data ?? [];
  const types = Array.from(new Set(all.map((s) => s.type)));
  const q = query.trim().toLowerCase();
  const list = all.filter((s) => (!typeFilter || s.type === typeFilter) && (!q || s.name.toLowerCase().includes(q)));

  const toInput = (s: Space, estado: SpaceEstado): SpaceInput => ({
    nombre: s.name, descripcion: s.description, tipo: s.type, capacidad: s.capacity, estado,
    ubicacion: s.location, equipamiento: s.equipment,
  });

  const changeEstado = async (s: Space, estado: SpaceEstado) => {
    if (estado !== "ACTIVO") {
      const ok = await confirm({
        title: estado === "MANTENIMIENTO" ? "Poner en mantenimiento" : "Desactivar espacio",
        message: <><b className="text-white">{s.name}</b> dejará de aceptar reservas y se anularán sus reservas futuras. Los usuarios afectados recibirán una notificación.</>,
        confirmLabel: "Continuar",
        danger: true,
      });
      if (!ok) return;
    }
    if (await run(`e${s.id}`, () => updateSpace(s.id, toInput(s, estado)), `${s.name}: ${ESTADO_LABEL[estado].toLowerCase()}.`)) onChanged();
  };

  const remove = async (s: Space) => {
    const ok = await confirm({
      title: "Eliminar espacio",
      message: <>¿Eliminar <b className="text-white">{s.name}</b>? Solo es posible si nunca tuvo reservas ni incidencias; en ese caso, márcalo como inactivo.</>,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (ok && await run(`d${s.id}`, () => deleteSpace(s.id), "Espacio eliminado.")) onChanged();
  };

  if (state.loading) return <Loading />;
  if (state.error) return <ErrorState message={state.error} onRetry={() => state.reload()} />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#59617A]" />
          <Input className="pl-10" placeholder="Buscar espacio..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select className="sm:w-56" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          {types.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
        </Select>
      </div>
      {list.length === 0 ? (
        <Card><EmptyState icon={<Building2 className="w-6 h-6" />} title="No hay espacios" text="Crea uno con el botón “Nuevo espacio”." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="border-b border-[#1E2A45]">
                {["Espacio", "Tipo", "Capacidad", "Ubicación", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-[11px] font-500 text-[#6C7693] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-b border-[#1E2A45] last:border-0 hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4">
                    <p className="text-white text-sm font-500">{s.name}</p>
                    {s.busyUntil && <p className="text-xs text-rose-300">Ocupado hasta las {s.busyUntil}</p>}
                  </td>
                  <td className="py-3.5 px-4 text-[#A8B3CF] text-xs">{s.category}</td>
                  <td className="py-3.5 px-4 text-[#A8B3CF] text-xs">{s.capacity}</td>
                  <td className="py-3.5 px-4 text-[#A8B3CF] text-xs">{s.location || "—"}</td>
                  <td className="py-3.5 px-4"><StatusBadge status={s.status} /></td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-1.5 whitespace-nowrap">
                      <Button size="sm" variant="secondary" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => onEdit(s)}>Editar</Button>
                      {s.estado === "ACTIVO" ? (
                        <Button size="sm" variant="secondary" icon={<Wrench className="w-3.5 h-3.5" />} loading={busy === `e${s.id}`} onClick={() => changeEstado(s, "MANTENIMIENTO")}>Mantenimiento</Button>
                      ) : (
                        <Button size="sm" variant="secondary" icon={<ShieldCheck className="w-3.5 h-3.5" />} loading={busy === `e${s.id}`} onClick={() => changeEstado(s, "ACTIVO")}>Activar</Button>
                      )}
                      <Button size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />} loading={busy === `d${s.id}`} onClick={() => remove(s)} aria-label={`Eliminar ${s.name}`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
