import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, CalendarPlus, CalendarX, Clock, LayoutGrid, Package, Timer } from "lucide-react";
import {
  Button, Card, EmptyState, ErrorState, Loading, Modal, ReservationBadge, SectionTitle, useAction, useUi,
} from "../../components/ui";
import { cancelReservation, extendReservation, RULES, type Reservation } from "../../api";
import {
  canCancel, canExtend, cancelRuleText, dailyLimitText, durationHours, formatDate, formatDateLong, isActive, parseISODate, plural, scheduleText,
} from "../../lib/format";
import { useLoader } from "../../lib/useLoader";
import AddToCalendar from "../../components/AddToCalendar";

export function MyReservations({ state, onChanged, onBrowse }: {
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
    const used = month.filter((r) => r.status !== "CANCELADA" && r.status !== "RECHAZADA" && r.status !== "NO_ASISTIDA");
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
            <li>• Máximo {plural(RULES.maxHours, "hora", "horas")} por reserva</li>
            <li>• Por día: {dailyLimitText()}</li>
            <li>• {cancelRuleText()}</li>
            <li>• Si no llegas en {RULES.noShowMinutes} minutos, la reserva se libera</li>
            <li>• Horario: {scheduleText()}</li>
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
        {detail && isActive(detail) && <AddToCalendar r={detail} className="mt-5" />}
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
