import { useEffect, useState } from "react";
import { CalendarPlus, ClipboardList, LogIn, Monitor, Package, RefreshCw, Users, Wrench } from "lucide-react";
import AppShell, { type NavItem } from "../components/AppShell";
import StatusBadge from "../components/StatusBadge";
import { IncidentsPanel, ReservationActions, ReservationsTable } from "../components/staff";
import { Button, Card, EmptyState, ErrorState, Loading, Pill, ReservationBadge, SectionTitle } from "../components/ui";
import { getReservations, getSpaces, type Reservation, type Session, type Space } from "../api";
import { formatDate, todayISO } from "../lib/format";
import { useLoader } from "../lib/useLoader";
import { usePersistedState } from "../lib/persist";

interface Props {
  session: Session;
  onLogout: () => void;
  onOpenCatalog: () => void;
}

type Tab = "checkins" | "inuse" | "monitor" | "today" | "support";
const TABS: readonly Tab[] = ["checkins", "inuse", "monitor", "today", "support"];

const TITLES: Record<Tab, string> = {
  checkins: "Llegadas de hoy",
  inuse: "En uso y devoluciones",
  monitor: "Monitor de espacios",
  today: "Reservas del día",
  support: "Soporte técnico",
};

export default function FunctionalDashboard({ session, onLogout, onOpenCatalog }: Props) {
  const [tab, setTab] = usePersistedState<Tab>("staff-tab", "checkins", TABS);
  const today = useLoader(() => getReservations({ date: todayISO() }));
  const inUse = useLoader(() => getReservations({ status: "EN_USO" }));
  const spaces = useLoader(getSpaces);

  const refresh = () => {
    today.reload(true);
    inUse.reload(true);
    spaces.reload(true);
  };

  // Refresco automático cada minuto para ver llegadas y ocupación al día
  useEffect(() => {
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingArrivals = (today.data ?? [])
    .filter((r) => (r.status === "CONFIRMADA" || r.status === "PENDIENTE") && !r.expired)
    .sort((a, b) => a.start.localeCompare(b.start));
  const noShows = (today.data ?? []).filter((r) => (r.status === "CONFIRMADA" || r.status === "PENDIENTE") && r.expired);
  const active = (inUse.data ?? []).sort((a, b) => Number(b.expired) - Number(a.expired) || (a.date + a.end).localeCompare(b.date + b.end));

  const navItems: NavItem[] = [
    { id: "checkins", icon: <LogIn />, label: "Llegadas de hoy", badge: pendingArrivals.length },
    { id: "inuse", icon: <Package />, label: "En uso", badge: active.length },
    { id: "monitor", icon: <Monitor />, label: "Monitor de espacios" },
    { id: "today", icon: <ClipboardList />, label: "Reservas del día" },
    { id: "support", icon: <Wrench />, label: "Soporte técnico" },
    { id: "catalog", icon: <CalendarPlus />, label: "Reservar un espacio" },
  ];

  const select = (id: string) => {
    if (id === "catalog") return onOpenCatalog();
    setTab(id as Tab);
    refresh();
  };

  return (
    <AppShell
      session={session}
      items={navItems}
      active={tab}
      onSelect={select}
      onLogout={onLogout}
      title={TITLES[tab]}
      actions={<Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={refresh}>Actualizar</Button>}
    >
      {tab === "checkins" && (
        <div className="max-w-4xl space-y-8">
          {today.loading ? <Loading /> : today.error ? <ErrorState message={today.error} onRetry={() => today.reload()} /> : (
            <>
              <section>
                <SectionTitle title="Por llegar" subtitle="Valida la llegada cuando la persona se presente con su reserva" />
                {pendingArrivals.length === 0 ? (
                  <Card><EmptyState icon={<LogIn className="w-6 h-6" />} title="No hay llegadas pendientes" text="Las reservas confirmadas para hoy aparecerán aquí." /></Card>
                ) : (
                  <div className="space-y-3">
                    {pendingArrivals.map((r) => <ArrivalCard key={r.id} r={r} onDone={refresh} />)}
                  </div>
                )}
              </section>
              {noShows.length > 0 && (
                <section>
                  <SectionTitle title="Sin presentarse" subtitle="Su horario ya terminó y nunca se validó la llegada" />
                  <div className="space-y-3">
                    {noShows.map((r) => <ArrivalCard key={r.id} r={r} onDone={refresh} />)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {tab === "inuse" && (
        <div className="max-w-4xl">
          <SectionTitle title="Reservas en uso" subtitle="Registra la devolución de equipos o el fin de uso de los espacios" />
          {inUse.loading ? <Loading /> : inUse.error ? <ErrorState message={inUse.error} onRetry={() => inUse.reload()} /> : active.length === 0 ? (
            <Card><EmptyState icon={<Package className="w-6 h-6" />} title="Nada en uso ahora" text="Cuando valides una llegada, la reserva aparecerá aquí hasta que se finalice." /></Card>
          ) : (
            <div className="space-y-3">
              {active.map((r) => (
                <Card key={r.id} className={`p-5 ${r.expired ? "border-rose-400/30 bg-rose-500/[0.04]" : ""}`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#1A2035] text-[#8EA4FF] flex items-center justify-center flex-shrink-0">
                        {r.spaceType === "EQUIPO_TECNOLOGICO" ? <Package className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display font-600 text-white">{r.userName}</p>
                          {r.expired && <Pill tone="red">Vencido</Pill>}
                        </div>
                        <p className="text-sm text-[#C9D1E6]">{r.spaceName}</p>
                        <p className="text-xs text-[#6C7693] mt-0.5">{r.code} · {formatDate(r.date)} · hasta las {r.end}</p>
                      </div>
                    </div>
                    <ReservationActions r={r} onDone={refresh} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "monitor" && (
        spaces.loading ? <Loading /> : spaces.error ? <ErrorState message={spaces.error} onRetry={() => spaces.reload()} /> : (
          <SpaceMonitor spaces={spaces.data ?? []} reservations={today.data ?? []} />
        )
      )}

      {tab === "today" && (
        today.loading ? <Loading /> : today.error ? <ErrorState message={today.error} onRetry={() => today.reload()} /> : (today.data ?? []).length === 0 ? (
          <Card><EmptyState icon={<ClipboardList className="w-6 h-6" />} title="Sin reservas para hoy" /></Card>
        ) : (
          <ReservationsTable reservations={[...(today.data ?? [])].sort((a, b) => a.start.localeCompare(b.start))} onDone={refresh} showDate={false} />
        )
      )}

      {tab === "support" && <div className="max-w-4xl"><IncidentsPanel onChanged={refresh} /></div>}
    </AppShell>
  );
}

function ArrivalCard({ r, onDone }: { r: Reservation; onDone: () => void }) {
  const [h, m] = r.start.split(":").map(Number);
  const startsIn = Math.round((new Date().setHours(h, m, 0, 0) - Date.now()) / 60_000);
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 text-center flex-shrink-0">
            <p className="font-display font-700 text-white text-lg leading-none">{r.start}</p>
            <p className="text-[11px] text-[#6C7693] mt-1">{r.end}</p>
          </div>
          <div className="min-w-0 border-l border-[#1E2A45] pl-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display font-600 text-white">{r.userName}</p>
              {r.expired ? <ReservationBadge reservation={r} /> : startsIn > 0
                ? <Pill tone="gray">Empieza en {startsIn >= 60 ? `${Math.floor(startsIn / 60)} h ${startsIn % 60} min` : `${startsIn} min`}</Pill>
                : <Pill tone="amber">En su horario</Pill>}
            </div>
            <p className="text-sm text-[#C9D1E6]">{r.spaceName}</p>
            <p className="text-xs text-[#6C7693] mt-0.5">{r.code}{r.reason ? ` · ${r.reason}` : ""}</p>
          </div>
        </div>
        <ReservationActions r={r} onDone={onDone} />
      </div>
    </Card>
  );
}

// Estado de cada espacio en este momento y su próxima reserva del día
export function SpaceMonitor({ spaces, reservations }: { spaces: Space[]; reservations: Reservation[] }) {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const live = reservations.filter((r) => r.status === "CONFIRMADA" || r.status === "EN_USO" || r.status === "PENDIENTE");

  if (spaces.length === 0) return <Card><EmptyState icon={<Monitor className="w-6 h-6" />} title="No hay espacios registrados" /></Card>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {spaces.map((s) => {
        const current = live.find((r) => r.spaceId === s.id && r.start <= hhmm && r.end > hhmm);
        const next = live.filter((r) => r.spaceId === s.id && r.start > hhmm).sort((a, b) => a.start.localeCompare(b.start))[0];
        return (
          <Card key={s.id} className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="font-display font-600 text-white truncate">{s.name}</p>
                <p className="text-xs text-[#6C7693]">{s.category}{s.location ? ` · ${s.location}` : ""}</p>
              </div>
              <StatusBadge status={s.status} />
            </div>
            {current ? (
              <div className="text-sm">
                <p className="text-[#C9D1E6]">{current.userName}</p>
                <p className="text-xs text-[#6C7693]">
                  {current.status === "EN_USO" ? "En uso" : "Reservado (sin validar llegada)"} hasta las {current.end}
                </p>
              </div>
            ) : s.status === "maintenance" ? (
              <p className="text-xs text-amber-300">En mantenimiento: no admite reservas.</p>
            ) : s.status === "inactive" ? (
              <p className="text-xs text-[#6C7693]">Inactivo.</p>
            ) : (
              <p className="text-xs text-emerald-300">Libre ahora</p>
            )}
            {next && <p className="text-xs text-[#8A93AD] mt-3 pt-3 border-t border-[#1E2A45]">Próxima: {next.start}–{next.end} · {next.userName}</p>}
          </Card>
        );
      })}
    </div>
  );
}
