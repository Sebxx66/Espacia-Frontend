import { useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Building2, CalendarDays, Download, CalendarPlus, CalendarX, ChartColumn, ClipboardList, KeyRound, LayoutGrid, Pencil, Plus,
  RefreshCw, Search, Settings, ShieldCheck, Trash2, TriangleAlert, UserCog, UserPlus, Users, Wrench,
} from "lucide-react";
import AppShell, { type NavItem } from "../components/AppShell";
import StatusBadge from "../components/StatusBadge";
import { IncidentsPanel, ReservationsTable } from "../components/staff";
import {
  Alert, Button, Card, cx, EmptyState, ErrorState, Field, Input, Loading, Modal, Pill, ReservationBadge,
  Select, Stat, Textarea, useAction, useUi,
} from "../components/ui";
import {
  createSpace, createUser, deleteSpace, ESTADO_LABEL, getDashboard, getReservations, getSpaces, getUsers,
  resetUserPassword, ROLE_LABEL, RULES, TYPE_LABEL, typeLabel, updateSpace, updateUser,
  type AdminUser, type ReservationStatus, type Role, type Session, type Space, type SpaceEstado, type SpaceInput,
} from "../api";
import { exportReservationsCsv } from "../lib/export";
import RulesSettings from "../components/RulesSettings";
import { formatDate, timeAgo } from "../lib/format";
import { useLoader } from "../lib/useLoader";
import { usePersistedState } from "../lib/persist";

interface Props {
  session: Session;
  onLogout: () => void;
  onOpenCatalog: () => void;
}

type Tab = "overview" | "spaces" | "reservations" | "users" | "support" | "types" | "settings";
const TABS: readonly Tab[] = ["overview", "spaces", "reservations", "users", "support", "types", "settings"];

const TITLES: Record<Tab, string> = {
  overview: "Dashboard",
  spaces: "Espacios",
  reservations: "Reservas",
  users: "Usuarios",
  support: "Soporte técnico",
  types: "Tipos de espacio",
  settings: "Configuración",
};

export default function AdminDashboard({ session, onLogout, onOpenCatalog }: Props) {
  const [tab, setTab] = usePersistedState<Tab>("admin-tab", "overview", TABS);
  const [spaceForm, setSpaceForm] = useState<{ space?: Space; type?: string } | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const spaces = useLoader(getSpaces);
  const dashboard = useLoader(getDashboard);

  const navItems: NavItem[] = [
    { id: "overview", icon: <ChartColumn />, label: "Dashboard" },
    { id: "spaces", icon: <Building2 />, label: "Espacios" },
    { id: "reservations", icon: <CalendarDays />, label: "Reservas" },
    { id: "users", icon: <Users />, label: "Usuarios" },
    { id: "support", icon: <Wrench />, label: "Soporte técnico", badge: dashboard.data?.openIncidents },
    { id: "types", icon: <LayoutGrid />, label: "Tipos de espacio" },
    { id: "settings", icon: <Settings />, label: "Configuración" },
    { id: "catalog", icon: <CalendarPlus />, label: "Reservar un espacio" },
  ];

  const select = (id: string) => {
    if (id === "catalog") return onOpenCatalog();
    setTab(id as Tab);
    if (id === "overview") dashboard.reload(true);
    if (id === "spaces" || id === "types") spaces.reload(true);
  };

  const spacesChanged = () => {
    spaces.reload(true);
    dashboard.reload(true);
  };

  return (
    <AppShell
      session={session}
      items={navItems}
      active={tab}
      onSelect={select}
      onLogout={onLogout}
      title={TITLES[tab]}
      actions={(tab === "overview" || tab === "spaces" || tab === "types") && (
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setSpaceForm({})}>
          <span className="hidden sm:inline">Nuevo espacio</span>
        </Button>
      )}
    >
      {tab === "overview" && <Overview state={dashboard} />}
      {tab === "spaces" && (
        <SpacesAdmin
          state={spaces}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          onEdit={(space) => setSpaceForm({ space })}
          onChanged={spacesChanged}
        />
      )}
      {tab === "reservations" && <ReservationsAdmin />}
      {tab === "settings" && <RulesSettings />}
      {tab === "users" && <UsersAdmin session={session} />}
      {tab === "support" && <div className="max-w-4xl"><IncidentsPanel onChanged={spacesChanged} /></div>}
      {tab === "types" && (
        <TypesAdmin
          state={spaces}
          onShow={(type) => { setTypeFilter(type); setTab("spaces"); }}
          onAdd={(type) => setSpaceForm({ type })}
        />
      )}

      <SpaceFormModal
        open={!!spaceForm}
        space={spaceForm?.space}
        presetType={spaceForm?.type}
        existingTypes={Array.from(new Set((spaces.data ?? []).map((s) => s.type)))}
        onClose={() => setSpaceForm(null)}
        onSaved={() => { setSpaceForm(null); spacesChanged(); }}
      />
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) =>
  active && payload?.length ? (
    <div className="bg-[#121828] border border-[#26324F] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-[#8A93AD] mb-0.5">{label}</p>
      {payload.map((p) => <p key={p.name} className="text-white">{p.name}: <b>{p.value}</b></p>)}
    </div>
  ) : null;

const axisTick = { fill: "#6C7693", fontSize: 11 };

function Overview({ state }: { state: ReturnType<typeof useLoader<Awaited<ReturnType<typeof getDashboard>>>> }) {
  if (state.loading) return <Loading label="Calculando estadísticas..." />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? "Sin datos."} onRetry={() => state.reload()} />;
  const d = state.data;
  const weekTotal = d.byDay.reduce((s, x) => s + x.reservations, 0);
  const peak = d.byHour.reduce((best, x) => (x.reservations > best.reservations ? x : best), d.byHour[0]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end -mt-2">
        <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => state.reload(true)}>Actualizar</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        <Stat icon={<CalendarDays className="w-5 h-5" />} label="Reservas activas" value={d.activeReservations} />
        <Stat icon={<ClipboardList className="w-5 h-5" />} label="Reservas de hoy" value={d.reservationsToday} accent="#20C997" />
        <Stat icon={<ChartColumn className="w-5 h-5" />} label="Utilización hoy" value={`${d.utilizationToday}%`} hint={`${d.activeSpaces} espacios activos`} accent="#748FFC" />
        <Stat icon={<CalendarX className="w-5 h-5" />} label="Cancelaciones del mes" value={d.cancellationsMonth} accent="#FF6B6B" />
        <Stat icon={<Users className="w-5 h-5" />} label="Usuarios registrados" value={d.users} accent="#FCC419" />
        <Stat icon={<TriangleAlert className="w-5 h-5" />} label="Incidencias abiertas" value={d.openIncidents} accent="#FF922B" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-6">
          <h3 className="font-display font-600 text-white text-sm">Reservas por día</h3>
          <p className="text-[#6C7693] text-xs mb-4">Últimos 7 días · {weekTotal} en total</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.byDay} barSize={26}>
              <CartesianGrid vertical={false} stroke="#1E2A45" />
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="reservations" name="Reservas" radius={[6, 6, 0, 0]}>
                {d.byDay.map((_, i) => <Cell key={i} fill={i === d.byDay.length - 1 ? "#4C6EF5" : "#2A3760"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="font-display font-600 text-white text-sm">Demanda por franja horaria</h3>
          <p className="text-[#6C7693] text-xs mb-4">
            Último mes{peak && peak.reservations > 0 ? ` · Pico a las ${peak.hour}` : ""}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={d.byHour}>
              <defs>
                <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#20C997" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#20C997" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#1E2A45" />
              <XAxis dataKey="hour" tick={{ ...axisTick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="reservations" name="Reservas" stroke="#20C997" fill="url(#hourGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-6">
          <h3 className="font-display font-600 text-white text-sm mb-4">Espacios más reservados</h3>
          {d.topSpaces.length === 0 ? <p className="text-sm text-[#6C7693]">Aún no hay reservas para comparar.</p> : (
            <div className="space-y-4">
              {d.topSpaces.map((s, i) => (
                <div key={s.id}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs text-[#6C7693] w-4">{i + 1}</span>
                      <span className="text-white truncate">{s.name}</span>
                    </span>
                    <span className="text-[#A8B3CF] text-xs">{s.reservations} reserva{s.reservations !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-1.5 bg-[#1A2035] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#4C6EF5] to-[#20C997]" style={{ width: `${s.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="font-display font-600 text-white text-sm mb-3">Reservas recientes</h3>
          {d.recent.length === 0 ? <p className="text-sm text-[#6C7693]">Todavía no se han hecho reservas.</p> : (
            <div className="divide-y divide-[#1E2A45]">
              {d.recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{r.userName}</p>
                    <p className="text-xs text-[#6C7693] truncate">{r.code} · {r.spaceName} · {formatDate(r.date)} {r.start}</p>
                  </div>
                  <ReservationBadge reservation={r} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Espacios
// ---------------------------------------------------------------------------

function SpacesAdmin({ state, typeFilter, setTypeFilter, onEdit, onChanged }: {
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

const KNOWN_TYPES = Object.keys(TYPE_LABEL);

function SpaceFormModal({ open, space, presetType, existingTypes, onClose, onSaved }: {
  open: boolean;
  space?: Space;
  presetType?: string;
  existingTypes: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useUi();
  const typeOptions = Array.from(new Set([...KNOWN_TYPES, ...existingTypes]));
  const initial = (): SpaceInput => space
    ? { nombre: space.name, descripcion: space.description, tipo: space.type, capacidad: space.capacity, estado: space.estado, ubicacion: space.location, equipamiento: space.equipment }
    : { nombre: "", descripcion: "", tipo: presetType ?? "SALA_ESTUDIO", capacidad: 1, estado: "ACTIVO", ubicacion: "", equipamiento: [] };

  const [form, setForm] = useState<SpaceInput>(initial);
  const [equipment, setEquipment] = useState("");
  const [customType, setCustomType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  // Reinicia el formulario cada vez que se abre para otro espacio
  const key = open ? `${space?.id ?? "new"}-${presetType ?? ""}` : null;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      const f = initial();
      setForm(f);
      setEquipment(f.equipamiento.join(", "));
      setCustomType("");
      setError(null);
    }
  }

  const set = <K extends keyof SpaceInput>(k: K, v: SpaceInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const tipo = form.tipo === "__other" ? customType.trim() : form.tipo;
    if (!form.nombre.trim()) return setError("El nombre es obligatorio.");
    if (!tipo) return setError("Indica el tipo de espacio.");
    if (!form.capacidad || form.capacidad < 1) return setError("La capacidad debe ser mayor a cero.");
    const input: SpaceInput = {
      ...form,
      tipo,
      equipamiento: equipment.split(",").map((e) => e.trim()).filter(Boolean),
    };
    setSaving(true);
    setError(null);
    try {
      if (space) await updateSpace(space.id, input);
      else await createSpace(input);
      toast(space ? "Espacio actualizado." : "Espacio creado.");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el espacio.");
    } finally {
      setSaving(false);
    }
  };

  const goesOffline = space?.estado === "ACTIVO" && form.estado !== "ACTIVO";

  return (
    <Modal
      open={open}
      title={space ? "Editar espacio" : "Nuevo espacio"}
      size="lg"
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={saving} onClick={save}>{space ? "Guardar cambios" : "Crear espacio"}</Button></>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="Nombre"><Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Sala de Estudio B2" /></Field>
        </div>
        <Field label="Tipo">
          <Select value={typeOptions.includes(form.tipo) ? form.tipo : "__other"} onChange={(e) => set("tipo", e.target.value)}>
            {typeOptions.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
            <option value="__other">Otro…</option>
          </Select>
        </Field>
        {form.tipo === "__other" ? (
          <Field label="Nombre del nuevo tipo"><Input value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Ej: Auditorio" /></Field>
        ) : (
          <Field label="Estado">
            <Select value={form.estado} onChange={(e) => set("estado", e.target.value as SpaceEstado)}>
              {(Object.keys(ESTADO_LABEL) as SpaceEstado[]).map((e) => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Capacidad (personas)"><Input type="number" min={1} value={form.capacidad} onChange={(e) => set("capacidad", Number(e.target.value))} /></Field>
        <Field label="Ubicación"><Input value={form.ubicacion} onChange={(e) => set("ubicacion", e.target.value)} placeholder="Ej: Planta 2" /></Field>
        {form.tipo === "__other" && (
          <Field label="Estado">
            <Select value={form.estado} onChange={(e) => set("estado", e.target.value as SpaceEstado)}>
              {(Object.keys(ESTADO_LABEL) as SpaceEstado[]).map((e) => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
            </Select>
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field label="Equipamiento" hint="Separado por comas. Ej: Proyector, Pizarra, WiFi">
            <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Descripción"><Textarea rows={3} value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} /></Field>
        </div>
      </div>
      {goesOffline && <div className="mt-4"><Alert tone="info">Al guardar, se anularán las reservas futuras de este espacio y se avisará a los usuarios.</Alert></div>}
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
    </Modal>
  );
}

function TypesAdmin({ state, onShow, onAdd }: {
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

const STATUS_OPTIONS: { value: ReservationStatus | ""; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "CONFIRMADA", label: "Confirmadas" },
  { value: "EN_USO", label: "En uso" },
  { value: "FINALIZADA", label: "Finalizadas" },
  { value: "CANCELADA", label: "Canceladas" },
  { value: "RECHAZADA", label: "Anuladas" },
  { value: "NO_ASISTIDA", label: "No asistidas" },
];

function ReservationsAdmin() {
  const [status, setStatus] = useState<ReservationStatus | "">("");
  const [date, setDate] = useState("");
  const [query, setQuery] = useState("");
  const state = useLoader(() => getReservations({ status, date }), [status, date]);
  const q = query.trim().toLowerCase();
  const list = (state.data ?? []).filter((r) => !q || [r.userName, r.userEmail, r.spaceName, r.code].some((x) => x.toLowerCase().includes(q)));

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-3 mb-5">
        <div className="relative lg:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#59617A]" />
          <Input className="pl-10" placeholder="Buscar por usuario, espacio o código..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select className="lg:w-52" value={status} onChange={(e) => setStatus(e.target.value as ReservationStatus | "")}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <div className="flex gap-2">
          <Input type="date" className="lg:w-44" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Filtrar por fecha" />
          {date && <Button variant="ghost" size="sm" onClick={() => setDate("")}>Quitar fecha</Button>}
        </div>
        <Button variant="secondary" size="sm" className="lg:ml-auto self-center" icon={<Download className="w-4 h-4" />} disabled={!list.length} onClick={() => exportReservationsCsv(list)}>
          Exportar a Excel
        </Button>
        <span className="text-xs text-[#6C7693] self-center">{list.length} reserva{list.length !== 1 ? "s" : ""}</span>
      </div>
      {state.loading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={() => state.reload()} /> : list.length === 0 ? (
        <Card><EmptyState icon={<CalendarDays className="w-6 h-6" />} title="No hay reservas con esos filtros" /></Card>
      ) : (
        <ReservationsTable reservations={list} onDone={() => state.reload(true)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

const ROLE_TONE: Record<Role, "blue" | "amber" | "gray"> = { admin: "amber", staff: "blue", student: "gray" };

function UsersAdmin({ session }: { session: Session }) {
  const { confirm } = useUi();
  const { busy, run } = useAction();
  const state = useLoader(getUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [managing, setManaging] = useState<AdminUser | null>(null);

  const q = query.trim().toLowerCase();
  const list = (state.data ?? []).filter((u) => (!roleFilter || u.role === roleFilter) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  const counts = (r: Role) => (state.data ?? []).filter((u) => u.role === r).length;

  const toggleActive = async (u: AdminUser) => {
    const ok = await confirm({
      title: u.active ? "Suspender cuenta" : "Reactivar cuenta",
      message: u.active
        ? <><b className="text-white">{u.name}</b> no podrá iniciar sesión hasta que reactives su cuenta. Su sesión actual se cerrará.</>
        : <><b className="text-white">{u.name}</b> podrá volver a iniciar sesión.</>,
      confirmLabel: u.active ? "Suspender" : "Reactivar",
      danger: u.active,
    });
    if (ok && await run(`a${u.id}`, () => updateUser(u.id, { active: !u.active }), u.active ? "Cuenta suspendida." : "Cuenta reactivada.")) {
      setManaging(null);
      state.reload(true);
    }
  };

  const changeRole = async (u: AdminUser, role: Role) => {
    if (role === u.role) return;
    const ok = await confirm({
      title: "Cambiar rol",
      message: <><b className="text-white">{u.name}</b> pasará de {ROLE_LABEL[u.role]} a <b className="text-white">{ROLE_LABEL[role]}</b>. El cambio aplica en su próximo inicio de sesión.</>,
      confirmLabel: "Cambiar rol",
    });
    if (ok && await run(`r${u.id}`, () => updateUser(u.id, { role }), `Ahora ${u.name} es ${ROLE_LABEL[role].toLowerCase()}.`)) {
      setManaging(null);
      state.reload(true);
    }
  };

  if (state.loading) return <Loading />;
  if (state.error) return <ErrorState message={state.error} onRetry={() => state.reload()} />;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5 max-w-xl">
        {(["student", "staff", "admin"] as Role[]).map((r) => (
          <button key={r} onClick={() => setRoleFilter(roleFilter === r ? "" : r)} aria-pressed={roleFilter === r} className={cx("text-left rounded-2xl border px-4 py-3 transition-all", roleFilter === r ? "border-[#4C6EF5]/50 bg-[#4C6EF5]/10" : "border-[#1E2A45] bg-[#121828] hover:border-[#4C6EF5]/30")}>
            <p className="font-display font-700 text-white text-xl">{counts(r)}</p>
            <p className="text-xs text-[#8A93AD]">{ROLE_LABEL[r]}{r === "admin" ? "es" : "s"}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#59617A]" />
          <Input className="pl-10" placeholder="Buscar por nombre o email..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="sm:ml-auto">
          <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => setCreating(true)}>Nuevo usuario</Button>
        </div>
      </div>

      {list.length === 0 ? <Card><EmptyState icon={<Users className="w-6 h-6" />} title="No hay usuarios con ese filtro" /></Card> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[#1E2A45]">
                {["Usuario", "Rol", "Reservas", "Estado", "Registro", ""].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-[11px] font-500 text-[#6C7693] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((u) => {
                const isMe = u.id === session.id;
                return (
                  <tr key={u.id} className="border-b border-[#1E2A45] last:border-0 hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4C6EF5] to-[#20C997] flex items-center justify-center text-white text-xs font-display font-700 flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm">{u.name}{isMe && <span className="text-[#6C7693]"> (tú)</span>}</p>
                          <p className="text-[#6C7693] text-xs truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4"><Pill tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Pill></td>
                    <td className="py-3 px-4 text-[#C9D1E6] text-sm">{u.reservations}</td>
                    <td className="py-3 px-4"><Pill tone={u.active ? "green" : "red"}>{u.active ? "Activo" : "Suspendido"}</Pill></td>
                    <td className="py-3 px-4 text-[#6C7693] text-xs">{timeAgo(u.createdAt) || "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="secondary" icon={<UserCog className="w-3.5 h-3.5" />} onClick={() => setManaging(u)}>Gestionar</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!managing} title={managing?.name ?? ""} subtitle={managing?.email} onClose={() => setManaging(null)}>
        {managing && (
          <div className="space-y-5">
            {managing.id === session.id ? (
              <Alert tone="info">Esta es tu cuenta. Puedes cambiar tu contraseña desde “Cambiar contraseña” en el menú lateral; tu rol y estado solo los puede cambiar otro administrador.</Alert>
            ) : (
              <>
                <Field label="Rol">
                  <Select value={managing.role} disabled={busy === `r${managing.id}`} onChange={(e) => changeRole(managing, e.target.value as Role)}>
                    {(["student", "staff", "admin"] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </Select>
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button variant="secondary" icon={<KeyRound className="w-4 h-4" />} onClick={() => { setResetting(managing); setManaging(null); }}>
                    Restablecer contraseña
                  </Button>
                  <Button variant={managing.active ? "danger" : "success"} loading={busy === `a${managing.id}`} onClick={() => toggleActive(managing)}>
                    {managing.active ? "Suspender cuenta" : "Reactivar cuenta"}
                  </Button>
                </div>
              </>
            )}
            <p className="text-xs text-[#6C7693]">{managing.reservations} reserva{managing.reservations !== 1 ? "s" : ""} registradas.</p>
          </div>
        )}
      </Modal>

      <NewUserModal open={creating} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); state.reload(true); }} />
      <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
    </div>
  );
}

function NewUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { toast } = useUi();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setName(""); setEmail(""); setPassword(""); setRole("staff"); setError(null);
    onClose();
  };

  const save = async () => {
    if (!name.trim()) return setError("El nombre es obligatorio.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Escribe un email válido.");
    if (password.length < RULES.minPassword) return setError(`La contraseña debe tener al menos ${RULES.minPassword} caracteres.`);
    setSaving(true);
    setError(null);
    try {
      await createUser({ name: name.trim(), email: email.trim(), password, role });
      toast(`Cuenta de ${ROLE_LABEL[role].toLowerCase()} creada para ${name.trim()}.`);
      setName(""); setEmail(""); setPassword(""); setRole("staff");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la cuenta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Nuevo usuario"
      subtitle="Crea cuentas de funcionarios, administradores o estudiantes"
      onClose={close}
      footer={<><Button variant="secondary" onClick={close}>Cancelar</Button><Button loading={saving} onClick={save}>Crear cuenta</Button></>}
    >
      <div className="space-y-4">
        <Field label="Nombre completo"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Contraseña temporal" hint={`Mínimo ${RULES.minPassword} caracteres. Compártela con la persona para que la cambie al ingresar.`}>
          <Input type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Rol">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {(["staff", "admin", "student"] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
        </Field>
        {error && <Alert>{error}</Alert>}
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const { toast } = useUi();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setPassword(""); setError(null);
    onClose();
  };

  const save = async () => {
    if (!user) return;
    if (password.length < RULES.minPassword) return setError(`La contraseña debe tener al menos ${RULES.minPassword} caracteres.`);
    setSaving(true);
    setError(null);
    try {
      await resetUserPassword(user.id, password);
      toast(`Contraseña de ${user.name} restablecida.`);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo restablecer la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!user}
      title="Restablecer contraseña"
      subtitle={user ? `${user.name} · ${user.email}` : undefined}
      size="sm"
      onClose={close}
      footer={<><Button variant="secondary" onClick={close}>Cancelar</Button><Button loading={saving} onClick={save}>Guardar</Button></>}
    >
      <div className="space-y-4">
        <Field label="Nueva contraseña temporal" hint={`Mínimo ${RULES.minPassword} caracteres. Pídele a la persona que la cambie al ingresar.`}>
          <Input type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <Alert>{error}</Alert>}
      </div>
    </Modal>
  );
}
