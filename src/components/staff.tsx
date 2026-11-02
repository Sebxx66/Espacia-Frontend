import { useState } from "react";
import { CircleCheck, LogIn, Plus, Undo2, UserX, Wrench } from "lucide-react";
import {
  checkInReservation, createIncident, finishReservation, getIncidents, getSpaces, noShowReservation, rejectReservation, resolveIncident,
  type Incident, type Reservation,
} from "../api";
import { formatDate, reservationStart, timeAgo, todayISO } from "../lib/format";
import { useLoader } from "../lib/useLoader";
import {
  Alert, Button, Card, cx, EmptyState, ErrorState, Field, Loading, Modal, Pill, ReservationBadge, SectionTitle, Select,
  Textarea, useAction, useUi,
} from "./ui";

// Acciones del personal sobre una reserva: validar llegada, finalizar/devolver y anular
export function ReservationActions({ r, onDone, compact }: { r: Reservation; onDone: () => void; compact?: boolean }) {
  const { confirm } = useUi();
  const { busy, run } = useAction();
  const isEquipment = r.spaceType === "EQUIPO_TECNOLOGICO";
  const isToday = r.date === todayISO();
  const size = compact ? "sm" : "sm";

  const checkIn = async () => {
    if (await run("in", () => checkInReservation(r.id), `Llegada de ${r.userName} validada.`)) onDone();
  };

  const finish = async () => {
    const ok = await confirm({
      title: isEquipment ? "Registrar devolución" : "Finalizar uso",
      message: isEquipment
        ? <>Confirma que <b className="text-white">{r.userName}</b> devolvió <b className="text-white">{r.spaceName}</b> en buen estado.</>
        : <>Se marcará como terminado el uso de <b className="text-white">{r.spaceName}</b> por {r.userName}.</>,
      confirmLabel: isEquipment ? "Registrar devolución" : "Finalizar",
    });
    if (ok && await run("fin", () => finishReservation(r.id), isEquipment ? "Devolución registrada." : "Uso finalizado.")) onDone();
  };

  const reject = async () => {
    const ok = await confirm({
      title: "Anular reserva",
      message: <>Se anulará la reserva {r.code} de <b className="text-white">{r.userName}</b> ({r.spaceName}, {formatDate(r.date).toLowerCase()} {r.start}–{r.end}). El usuario recibirá una notificación.</>,
      confirmLabel: "Anular reserva",
      danger: true,
    });
    if (ok && await run("rej", () => rejectReservation(r.id), "Reserva anulada.")) onDone();
  };

  const noShow = async () => {
    const ok = await confirm({
      title: "Marcar como no asistida",
      message: <>{r.userName} no llegó a su reserva {r.code} ({r.spaceName}, {r.start}–{r.end}). El espacio quedará libre y el usuario recibirá un aviso.</>,
      confirmLabel: "Marcar no asistida",
      danger: true,
    });
    if (ok && await run("rej", () => noShowReservation(r.id), "Reserva marcada como no asistida.")) onDone();
  };

  const pending = r.status === "CONFIRMADA" || r.status === "PENDIENTE";
  // "No se presentó" solo tiene sentido cuando la reserva ya empezó; antes es una anulación
  const started = reservationStart(r).getTime() <= Date.now();
  return (
    <div className="flex flex-wrap gap-2">
      {pending && isToday && !r.expired && (
        <Button size={size} icon={<LogIn className="w-3.5 h-3.5" />} loading={busy === "in"} onClick={checkIn}>Validar llegada</Button>
      )}
      {r.status === "EN_USO" && (
        <Button size={size} variant="success" icon={isEquipment ? <Undo2 className="w-3.5 h-3.5" /> : <CircleCheck className="w-3.5 h-3.5" />} loading={busy === "fin"} onClick={finish}>
          {isEquipment ? "Registrar devolución" : "Finalizar uso"}
        </Button>
      )}
      {pending && (
        <Button size={size} variant="danger" icon={<UserX className="w-3.5 h-3.5" />} loading={busy === "rej"} onClick={started ? noShow : reject}>
          {r.expired ? "Cerrar como no asistida" : started ? "No se presentó" : "Anular"}
        </Button>
      )}
    </div>
  );
}

export function ReservationsTable({ reservations, onDone, showDate = true }: { reservations: Reservation[]; onDone: () => void; showDate?: boolean }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[760px]">
        <thead>
          <tr className="border-b border-[#1E2A45]">
            {["Código", "Usuario", "Espacio", showDate ? "Fecha y hora" : "Horario", "Estado", "Acciones"].map((h) => (
              <th key={h} className="text-left py-3 px-4 text-[11px] font-500 text-[#6C7693] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr key={r.id} className="border-b border-[#1E2A45] last:border-0 hover:bg-white/[0.02] align-top">
              <td className="py-3.5 px-4 text-[#8EA4FF] text-xs font-mono whitespace-nowrap">{r.code}</td>
              <td className="py-3.5 px-4">
                <p className="text-white text-sm">{r.userName}</p>
                <p className="text-[#6C7693] text-xs">{r.userEmail}</p>
              </td>
              <td className="py-3.5 px-4 text-[#C9D1E6] text-sm">{r.spaceName}</td>
              <td className="py-3.5 px-4 text-[#A8B3CF] text-xs whitespace-nowrap">
                {showDate && <span className="block text-white">{formatDate(r.date)}</span>}
                {r.start}–{r.end}
              </td>
              <td className="py-3.5 px-4"><ReservationBadge reservation={r} /></td>
              <td className="py-3.5 px-4"><ReservationActions r={r} onDone={onDone} compact /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// Soporte técnico: incidencias de los espacios (compartido por funcionario y administrador)
export function IncidentsPanel({ onChanged }: { onChanged?: () => void }) {
  const { confirm } = useUi();
  const { busy, run } = useAction();
  const incidents = useLoader(getIncidents);
  const [filter, setFilter] = useState<"ABIERTA" | "RESUELTA" | "all">("ABIERTA");
  const [creating, setCreating] = useState(false);

  const list = (incidents.data ?? []).filter((i) => filter === "all" || i.status === filter);
  const openCount = (incidents.data ?? []).filter((i) => i.status === "ABIERTA").length;

  const resolve = async (i: Incident) => {
    const reactivate = i.spaceEstado === "MANTENIMIENTO" && await confirm({
      title: "Resolver incidencia",
      message: <><b className="text-white">{i.spaceName}</b> está en mantenimiento. ¿Quieres volver a habilitarlo para reservas?</>,
      confirmLabel: "Sí, habilitar espacio",
    });
    if (await run(`r${i.id}`, () => resolveIncident(i.id, reactivate), reactivate ? "Incidencia resuelta y espacio habilitado." : "Incidencia resuelta.")) {
      incidents.reload(true);
      onChanged?.();
    }
  };

  return (
    <div>
      <SectionTitle
        title="Incidencias"
        subtitle={`${openCount} abierta${openCount !== 1 ? "s" : ""}`}
        action={<Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)}>Nueva incidencia</Button>}
      />
      <div className="flex gap-1.5 mb-4">
        {([["ABIERTA", "Abiertas"], ["RESUELTA", "Resueltas"], ["all", "Todas"]] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={cx("px-3 py-1.5 rounded-lg text-xs border", filter === value ? "bg-[#4C6EF5]/15 text-[#8EA4FF] border-[#4C6EF5]/30" : "text-[#8A93AD] border-transparent hover:text-white")}
          >
            {label}
          </button>
        ))}
      </div>

      {incidents.loading ? <Loading /> : incidents.error ? <ErrorState message={incidents.error} onRetry={() => incidents.reload()} /> : list.length === 0 ? (
        <Card>
          <EmptyState icon={<Wrench className="w-6 h-6" />} title={filter === "ABIERTA" ? "No hay incidencias abiertas" : "Sin incidencias"} text="Registra aquí daños o fallas en salas y equipos." />
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((i) => (
            <Card key={i.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display font-600 text-white">{i.spaceName}</p>
                    <Pill tone={i.status === "ABIERTA" ? "amber" : "green"}>{i.status === "ABIERTA" ? "Abierta" : "Resuelta"}</Pill>
                    {i.status === "ABIERTA" && i.spaceEstado === "MANTENIMIENTO" && <Pill tone="gray">Espacio en mantenimiento</Pill>}
                  </div>
                  <p className="text-sm text-[#C9D1E6] mt-2 leading-relaxed whitespace-pre-line">{i.description}</p>
                  <p className="text-xs text-[#6C7693] mt-2">
                    Reportada por {i.reportedBy} · {timeAgo(i.createdAt)}
                    {i.resolvedAt && ` · Resuelta ${timeAgo(i.resolvedAt)}`}
                  </p>
                </div>
                {i.status === "ABIERTA" && (
                  <Button size="sm" variant="success" icon={<CircleCheck className="w-3.5 h-3.5" />} loading={busy === `r${i.id}`} onClick={() => resolve(i)}>
                    Marcar resuelta
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewIncidentModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => { setCreating(false); incidents.reload(true); onChanged?.(); }}
      />
    </div>
  );
}

function NewIncidentModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { toast } = useUi();
  const spaces = useLoader(getSpaces, [open]);
  const [spaceId, setSpaceId] = useState("");
  const [description, setDescription] = useState("");
  const [maintenance, setMaintenance] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setSpaceId(""); setDescription(""); setMaintenance(true); setError(null);
    onClose();
  };

  const save = async () => {
    if (!spaceId) return setError("Selecciona el espacio afectado.");
    if (!description.trim()) return setError("Describe la incidencia.");
    setSaving(true);
    setError(null);
    try {
      await createIncident({ spaceId, description: description.trim(), maintenance });
      toast(maintenance ? "Incidencia registrada. El espacio quedó en mantenimiento." : "Incidencia registrada.");
      setSpaceId(""); setDescription(""); setMaintenance(true);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la incidencia.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Nueva incidencia"
      subtitle="Reporta un daño o falla en un espacio o equipo"
      onClose={close}
      footer={<><Button variant="secondary" onClick={close}>Cancelar</Button><Button loading={saving} onClick={save}>Registrar</Button></>}
    >
      <div className="space-y-4">
        <Field label="Espacio o equipo">
          <Select value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
            <option value="">{spaces.loading ? "Cargando..." : "Selecciona..."}</option>
            {(spaces.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Descripción">
          <Textarea rows={4} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: El proyector no enciende y la pantalla tiene una mancha." />
        </Field>
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#4C6EF5]" />
          <span className="text-sm text-[#C9D1E6]">
            Poner el espacio en mantenimiento
            <span className="block text-xs text-[#6C7693] mt-0.5">No se podrá reservar y se anularán sus reservas futuras (los usuarios reciben aviso).</span>
          </span>
        </label>
        {error && <Alert>{error}</Alert>}
      </div>
    </Modal>
  );
}
