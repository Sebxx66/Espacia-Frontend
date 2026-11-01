import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft, Bell, BellRing, CalendarDays, CalendarPlus, CalendarX, CheckCheck, CircleCheck, Clock, LayoutGrid,
  LayoutList, MapPin, Package, Search, Timer, Undo2, Users,
} from "lucide-react";
import AppShell, { type NavItem } from "../components/AppShell";
import StatusBadge from "../components/StatusBadge";
import {
  Button, Card, cx, EmptyState, ErrorState, Loading, Modal, ReservationBadge, SectionTitle, useAction, useUi,
} from "../components/ui";
import {
  cancelReservation, extendReservation, getMyReservations, getNotifications, getSpaces, markAllNotificationsRead,
  markNotificationRead, RULES, spaceImage, swapToFallback, type AppNotification, type Reservation, type Session, type SpaceStatus,
} from "../api";
import { canCancel, canExtend, durationHours, formatDate, formatDateLong, isActive, parseISODate, timeAgo } from "../lib/format";
import { useLoader } from "../lib/useLoader";

export type StudentTab = "catalog" | "reservations" | "notifications";

interface Props {
  session: Session;
  initialTab?: StudentTab;
  onSpaceClick: (id: string) => void;
  onBackToPanel?: () => void;
  onLogout: () => void;
}

const STATUS_FILTERS: { label: string; value: SpaceStatus | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: "Disponible", value: "available" },
  { label: "Ocupado ahora", value: "occupied" },
  { label: "Mantenimiento", value: "maintenance" },
  { label: "Inactivo", value: "inactive" },
];

const TITLES: Record<StudentTab, string> = {
  catalog: "Catálogo de espacios",
  reservations: "Mis reservas",
  notifications: "Notificaciones",
};

export default function StudentDashboard({ session, initialTab, onSpaceClick, onBackToPanel, onLogout }: Props) {
  const [tab, setTab] = useState<StudentTab>(initialTab ?? "catalog");
  const [showBell, setShowBell] = useState(false);

  const reservations = useLoader(getMyReservations);
  const notifications = useLoader(getNotifications);

  const activeCount = (reservations.data ?? []).filter(isActive).length;
  const unread = (notifications.data ?? []).filter((n) => !n.read).length;

  const navItems: NavItem[] = [
    { id: "catalog", icon: <LayoutGrid />, label: "Catálogo" },
    { id: "reservations", icon: <CalendarDays />, label: "Mis reservas", badge: activeCount },
    { id: "notifications", icon: <Bell />, label: "Notificaciones", badge: unread },
    ...(onBackToPanel ? [{ id: "back", icon: <ArrowLeft />, label: "Volver a mi panel" }] : []),
  ];

  const selectTab = (id: string) => {
    if (id === "back") return onBackToPanel?.();
    setTab(id as StudentTab);
    if (id === "notifications") notifications.reload(true);
    if (id === "reservations") reservations.reload(true);
  };

  const readOne = async (n: AppNotification) => {
    if (n.read) return;
    notifications.setData((list) => list?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? list);
    try {
      await markNotificationRead(n.id);
    } catch {
      notifications.reload(true);
    }
  };

  const bell = (
    <div className="relative">
      <button
        onClick={() => setShowBell((s) => !s)}
        className="relative w-10 h-10 rounded-xl bg-[#121828] border border-[#1E2A45] flex items-center justify-center text-[#A8B3CF] hover:text-white hover:border-[#4C6EF5]/40 transition-all"
        aria-label={`Notificaciones (${unread} sin leer)`}
      >
        {unread > 0 ? <BellRing className="w-[18px] h-[18px]" /> : <Bell className="w-[18px] h-[18px]" />}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#4C6EF5] rounded-full text-[10px] font-600 text-white flex items-center justify-center">{unread}</span>
        )}
      </button>
      {showBell && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowBell(false)} />
          <div className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] bg-[#121828] border border-[#26324F] rounded-2xl shadow-2xl overflow-hidden animate-pop-in">
            <div className="px-4 py-3 border-b border-[#1E2A45] flex items-center justify-between">
              <p className="font-display font-600 text-white text-sm">Notificaciones</p>
              <span className="text-[11px] text-[#8EA4FF]">{unread} sin leer</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {(notifications.data ?? []).slice(0, 5).map((n) => (
                <NotificationRow key={n.id} n={n} compact onClick={() => readOne(n)} />
              ))}
              {(notifications.data ?? []).length === 0 && <p className="px-4 py-8 text-center text-xs text-[#6C7693]">Aún no tienes notificaciones.</p>}
            </div>
            <button
              onClick={() => { setShowBell(false); selectTab("notifications"); }}
              className="w-full px-4 py-3 border-t border-[#1E2A45] text-xs text-[#8EA4FF] hover:bg-white/5"
            >
              Ver todas
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <AppShell
      session={session}
      items={navItems}
      active={tab}
      onSelect={selectTab}
      onLogout={onLogout}
      title={TITLES[tab]}
      actions={bell}
    >
      {tab === "catalog" && <Catalog onSpaceClick={onSpaceClick} />}
      {tab === "reservations" && (
        <MyReservations
          state={reservations}
          onChanged={() => { reservations.reload(true); notifications.reload(true); }}
          onBrowse={() => setTab("catalog")}
        />
      )}
      {tab === "notifications" && (
        <Notifications state={notifications} onRead={readOne} />
      )}
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

function Catalog({ onSpaceClick }: { onSpaceClick: (id: string) => void }) {
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

function MyReservations({ state, onChanged, onBrowse }: {
  state: ReturnType<typeof useLoader<Reservation[]>>;
  onChanged: () => void;
  onBrowse: () => void;
}) {
  const { confirm } = useUi();
  const { busy, run } = useAction();
  const [detail, setDetail] = useState<Reservation | null>(null);
  const all = state.data ?? [];

  const active = all.filter(isActive).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const history = all.filter((r) => !isActive(r));

  const summary = useMemo(() => {
    const now = new Date();
    const month = all.filter((r) => {
      const d = parseISODate(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const used = month.filter((r) => r.status !== "CANCELADA" && r.status !== "RECHAZADA");
    return {
      total: used.length,
      hours: used.reduce((sum, r) => sum + durationHours(r), 0),
      cancelled: month.filter((r) => r.status === "CANCELADA" || r.status === "RECHAZADA").length,
      spaces: new Set(used.map((r) => r.spaceId)).size,
    };
  }, [all]);

  const cancel = async (r: Reservation) => {
    const ok = await confirm({
      title: "Cancelar reserva",
      message: <>¿Seguro que quieres cancelar tu reserva en <b className="text-white">{r.spaceName}</b> del {formatDate(r.date).toLowerCase()} de {r.start} a {r.end}? Esta acción no se puede deshacer.</>,
      confirmLabel: "Sí, cancelar",
      danger: true,
    });
    if (ok && await run(`cancel-${r.id}`, () => cancelReservation(r.id), "Reserva cancelada.")) {
      setDetail(null);
      onChanged();
    }
  };

  const extend = async (r: Reservation) => {
    const [h, m] = r.end.split(":").map(Number);
    const newEnd = `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const ok = await confirm({
      title: "Extender tiempo",
      message: <>Tu reserva en <b className="text-white">{r.spaceName}</b> pasará a terminar a las <b className="text-white">{newEnd}</b> si el espacio está libre.</>,
      confirmLabel: "Extender 1 hora",
    });
    if (ok && await run(`extend-${r.id}`, () => extendReservation(r.id), `Listo: tu reserva ahora termina a las ${newEnd}.`)) {
      setDetail(null);
      onChanged();
    }
  };

  if (state.loading) return <Loading label="Cargando tus reservas..." />;
  if (state.error) return <ErrorState message={state.error} onRetry={() => state.reload()} />;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-8">
        <section>
          <SectionTitle
            title="Activas y próximas"
            subtitle={`${active.length} de ${RULES.maxActive} reservas activas permitidas`}
            action={<Button size="sm" icon={<CalendarPlus className="w-4 h-4" />} onClick={onBrowse}>Nueva reserva</Button>}
          />
          {active.length === 0 ? (
            <Card>
              <EmptyState
                icon={<CalendarDays className="w-6 h-6" />}
                title="No tienes reservas activas"
                text="Busca un espacio en el catálogo y reserva tu horario."
                action={<Button size="sm" onClick={onBrowse}>Ir al catálogo</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {active.map((r) => (
                <ReservationCard key={r.id} r={r} onDetails={() => setDetail(r)}>
                  <Button size="sm" variant="secondary" onClick={() => setDetail(r)}>Ver detalles</Button>
                  {canExtend(r) && (
                    <Button size="sm" variant="secondary" icon={<Timer className="w-3.5 h-3.5" />} loading={busy === `extend-${r.id}`} onClick={() => extend(r)}>
                      Extender 1 h
                    </Button>
                  )}
                  {canCancel(r) && (
                    <Button size="sm" variant="danger" icon={<CalendarX className="w-3.5 h-3.5" />} loading={busy === `cancel-${r.id}`} onClick={() => cancel(r)}>
                      Cancelar
                    </Button>
                  )}
                </ReservationCard>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle title="Historial" subtitle="Reservas finalizadas, canceladas o expiradas" />
          {history.length === 0 ? (
            <p className="text-sm text-[#6C7693]">Aún no hay reservas en tu historial.</p>
          ) : (
            <Card className="divide-y divide-[#1E2A45]">
              {history.map((r) => (
                <button key={r.id} onClick={() => setDetail(r)} className="w-full text-left px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{r.spaceName}</p>
                    <p className="text-xs text-[#6C7693]">{formatDate(r.date)} · {r.start}–{r.end} · {r.code}</p>
                  </div>
                  <ReservationBadge reservation={r} />
                </button>
              ))}
            </Card>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="font-display font-600 text-white text-sm mb-4">Resumen del mes</h3>
          <div className="space-y-3">
            {[
              { label: "Reservas", value: summary.total, icon: <CalendarDays className="w-4 h-4" /> },
              { label: "Horas reservadas", value: `${summary.hours % 1 ? summary.hours.toFixed(1) : summary.hours} h`, icon: <Clock className="w-4 h-4" /> },
              { label: "Cancelaciones", value: summary.cancelled, icon: <CalendarX className="w-4 h-4" /> },
              { label: "Espacios distintos", value: summary.spaces, icon: <LayoutGrid className="w-4 h-4" /> },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-[#8A93AD] text-sm flex items-center gap-2.5">{s.icon}{s.label}</span>
                <span className="font-display text-white font-600">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-[#4C6EF5]/10 to-transparent">
          <p className="text-[#8EA4FF] text-xs font-500 mb-1">Reservas activas simultáneas</p>
          <div className="flex items-end gap-2">
            <span className="font-display font-700 text-white text-3xl">{active.length}</span>
            <span className="text-[#6C7693] text-sm mb-1">/ {RULES.maxActive}</span>
          </div>
          <div className="h-2 bg-[#1A2035] rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-[#4C6EF5] rounded-full transition-all" style={{ width: `${Math.min(100, (active.length / RULES.maxActive) * 100)}%` }} />
          </div>
          <ul className="mt-4 space-y-1.5 text-xs text-[#8A93AD]">
            <li>• Máximo {RULES.maxHours} horas por reserva</li>
            <li>• Por día: {RULES.maxEquipmentPerDay} equipo y {RULES.maxRoomsPerDay} salas o talleres</li>
            <li>• Cancela hasta {RULES.cancelHoursBefore} hora antes del inicio</li>
            <li>• Horario: {RULES.openHour}:00 a {RULES.closeHour}:00</li>
          </ul>
        </Card>
      </div>

      <Modal
        open={!!detail}
        title={detail?.spaceName ?? ""}
        subtitle={detail ? `Reserva ${detail.code}` : undefined}
        onClose={() => setDetail(null)}
        footer={detail && (
          <>
            {canCancel(detail) && <Button variant="danger" loading={busy === `cancel-${detail.id}`} onClick={() => cancel(detail)}>Cancelar reserva</Button>}
            {canExtend(detail) && <Button variant="secondary" loading={busy === `extend-${detail.id}`} onClick={() => extend(detail)}>Extender 1 h</Button>}
            <Button onClick={() => setDetail(null)}>Cerrar</Button>
          </>
        )}
      >
        {detail && (
          <dl className="space-y-3 text-sm">
            {[
              ["Estado", <ReservationBadge key="b" reservation={detail} />],
              ["Fecha", formatDateLong(detail.date)],
              ["Horario", `${detail.start} – ${detail.end} (${durationHours(detail)} h)`],
              ["Ubicación", detail.spaceLocation || "—"],
              ["Motivo", detail.reason || "—"],
              ["Creada", detail.createdAt ? new Date(detail.createdAt).toLocaleString("es-CO") : "—"],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between gap-6 border-b border-[#1E2A45] pb-3 last:border-0 last:pb-0">
                <dt className="text-[#6C7693]">{label}</dt>
                <dd className="text-white text-right">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  );
}

function ReservationCard({ r, children, onDetails }: { r: Reservation; children: ReactNode; onDetails: () => void }) {
  const isEquipment = r.spaceType === "EQUIPO_TECNOLOGICO";
  return (
    <Card className="p-5 hover:border-[#4C6EF5]/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <button onClick={onDetails} className="flex items-start gap-4 text-left min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#4C6EF5]/12 text-[#8EA4FF] flex items-center justify-center flex-shrink-0">
            {isEquipment ? <Package className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-[#6C7693]">{r.code}</p>
            <h3 className="font-display font-600 text-white text-base leading-tight truncate">{r.spaceName}</h3>
            <p className="text-sm text-[#A8B3CF] mt-1">{formatDate(r.date)} · {r.start}–{r.end}</p>
          </div>
        </button>
        <ReservationBadge reservation={r} />
      </div>
      <div className="flex flex-wrap gap-2 mt-4">{children}</div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Notificaciones
// ---------------------------------------------------------------------------

const NOTIF_ICON: Record<string, ReactNode> = {
  CONFIRMACION: <CircleCheck className="w-4 h-4 text-emerald-300" />,
  CANCELACION: <CalendarX className="w-4 h-4 text-rose-300" />,
  RECHAZADA: <CalendarX className="w-4 h-4 text-rose-300" />,
  CHECK_IN: <CheckCheck className="w-4 h-4 text-[#8EA4FF]" />,
  FINALIZADA: <Undo2 className="w-4 h-4 text-[#8A93AD]" />,
  EXTENSION: <Timer className="w-4 h-4 text-amber-300" />,
};

function NotificationRow({ n, compact, onClick }: { n: AppNotification; compact?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "w-full text-left flex items-start gap-3 transition-colors hover:bg-white/[0.04]",
        compact ? "px-4 py-3 border-b border-[#1E2A45] last:border-0" : "px-5 py-4",
        !n.read && "bg-[#4C6EF5]/[0.06]",
      )}
    >
      <span className={cx("rounded-xl flex items-center justify-center flex-shrink-0", compact ? "w-8 h-8 bg-[#1A2035]" : "w-10 h-10 bg-[#1A2035]")}>
        {NOTIF_ICON[n.type] ?? <Bell className="w-4 h-4 text-[#8A93AD]" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className={cx("block text-white leading-relaxed", compact ? "text-xs" : "text-sm")}>{n.message}</span>
        <span className="block text-[#6C7693] text-[11px] mt-1">{timeAgo(n.createdAt)}</span>
      </span>
      {!n.read && <span className="w-2 h-2 rounded-full bg-[#4C6EF5] flex-shrink-0 mt-2" aria-label="Sin leer" />}
    </button>
  );
}

function Notifications({ state, onRead }: {
  state: ReturnType<typeof useLoader<AppNotification[]>>;
  onRead: (n: AppNotification) => void;
}) {
  const { busy, run } = useAction();
  const list = state.data ?? [];
  const unread = list.filter((n) => !n.read).length;

  const readAll = async () => {
    if (await run("all", markAllNotificationsRead, "Todas las notificaciones quedaron como leídas.")) {
      state.setData((l) => l?.map((n) => ({ ...n, read: true })) ?? l);
    }
  };

  if (state.loading) return <Loading label="Cargando notificaciones..." />;
  if (state.error) return <ErrorState message={state.error} onRetry={() => state.reload()} />;

  return (
    <div className="max-w-3xl">
      <SectionTitle
        title="Centro de notificaciones"
        subtitle={unread ? `${unread} sin leer` : "Estás al día"}
        action={<Button size="sm" variant="secondary" icon={<CheckCheck className="w-4 h-4" />} disabled={!unread} loading={busy === "all"} onClick={readAll}>Marcar todo como leído</Button>}
      />
      {list.length === 0 ? (
        <Card><EmptyState icon={<Bell className="w-6 h-6" />} title="Sin notificaciones" text="Aquí verás las confirmaciones, cancelaciones y avisos de tus reservas." /></Card>
      ) : (
        <Card className="divide-y divide-[#1E2A45] overflow-hidden">
          {list.map((n) => <NotificationRow key={n.id} n={n} onClick={() => onRead(n)} />)}
        </Card>
      )}
    </div>
  );
}

