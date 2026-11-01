import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarCheck, ChevronLeft, ChevronRight, CircleCheck, Clock, MapPin, Users } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import { Alert, Button, Card, cx, ErrorState, Field, Loading, Textarea } from "../components/ui";
import {
  createReservation, getAvailability, getSpace, RULES, spaceImage, swapToFallback,
  type Reservation, type Session, type Slot,
} from "../api";
import { formatDateLong, hourLabel, hourOf, parseISODate, toISODate, todayISO } from "../lib/format";
import { useLoader } from "../lib/useLoader";

interface Props {
  session: Session;
  spaceId: string;
  onBack: () => void;
  onViewReservations: () => void;
}

type Step = "date" | "time" | "confirm" | "success";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
// Bloques de una hora: 08:00 ... 19:00
const BLOCKS = Array.from({ length: RULES.closeHour - RULES.openHour }, (_, i) => RULES.openHour + i);

export default function SpaceDetail({ session, spaceId, onBack, onViewReservations }: Props) {
  const { data: space, loading, error, reload } = useLoader(() => getSpace(spaceId), [spaceId]);

  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + RULES.daysAhead);
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const [step, setStep] = useState<Step>("date");
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null); // último bloque incluido
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [created, setCreated] = useState<Reservation | null>(null);

  // Horarios ocupados del día elegido
  useEffect(() => {
    if (!date) return;
    setSlots(null);
    setSlotsError(null);
    getAvailability(spaceId, date)
      .then(setSlots)
      .catch((e) => setSlotsError(e instanceof Error ? e.message : "No se pudo cargar la disponibilidad."));
  }, [date, spaceId]);

  // Reloj que avanza cada 30 segundos: si la pantalla queda abierta, las horas que van
  // pasando se bloquean solas (el backend también rechaza reservas en horas ya pasadas)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const blockState = useMemo(() => {
    return (h: number): "free" | "busy" | "past" => {
      if (!date) return "free";
      const blockStart = parseISODate(date);
      blockStart.setHours(h, 0, 0, 0);
      if (blockStart <= now) return "past";
      const toMin = (t: string) => hourOf(t) * 60 + Number(t.slice(3, 5));
      const busy = (slots ?? []).some((s) => toMin(s.start) < (h + 1) * 60 && toMin(s.end) > h * 60);
      return busy ? "busy" : "free";
    };
  }, [date, slots, now]);

  // Si la hora elegida ya empezó mientras se elegía el horario, se descarta la selección
  // (en el paso de confirmación, el backend responde con un mensaje claro)
  useEffect(() => {
    if (step === "time" && start !== null && blockState(start) === "past") {
      setStart(null);
      setEnd(null);
    }
  }, [blockState, start, step]);

  const pickBlock = (h: number) => {
    if (blockState(h) !== "free") return;
    // Primer toque: inicio (1 hora). Segundo toque posterior: fin del bloque, si el rango es válido
    if (start !== null && end === start && h > start) {
      const range = BLOCKS.filter((b) => b >= start && b <= h);
      const valid = range.length <= RULES.maxHours && range.every((b) => blockState(b) === "free");
      if (valid) return setEnd(h);
    }
    setStart(h);
    setEnd(h);
  };

  const hours = start !== null && end !== null ? end - start + 1 : 0;
  const startLabel = start !== null ? hourLabel(start) : "";
  const endLabel = end !== null ? hourLabel(end + 1) : "";

  const confirm = async () => {
    if (!date || start === null || end === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      setCreated(await createReservation({ spaceId, date, start: startLabel, end: endLabel, reason }));
      setStep("success");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "No se pudo crear la reserva.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0B0F1A]"><Loading label="Cargando espacio..." /></div>;
  if (error || !space) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex flex-col items-center justify-center">
        <ErrorState message={error ?? "Este espacio no existe."} onRetry={() => reload()} />
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>Volver al catálogo</Button>
      </div>
    );
  }

  const bookable = space.estado === "ACTIVO";
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstWeekday = new Date(calYear, calMonth, 1).getDay();
  const canPrev = calYear > today.getFullYear() || calMonth > today.getMonth();
  const canNext = new Date(calYear, calMonth + 1, 1) <= lastDay;
  const moveMonth = (delta: number) => {
    const d = new Date(calYear, calMonth + delta, 1);
    setCalMonth(d.getMonth());
    setCalYear(d.getFullYear());
  };
  const stepKeys: Step[] = ["date", "time", "confirm"];
  const stepIdx = step === "success" ? 3 : stepKeys.indexOf(step);

  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      <div className="relative h-56 sm:h-72 overflow-hidden bg-[#0E1322]">
        <img src={spaceImage(space, 1600, 600)} onError={(e) => swapToFallback(e, space)} alt="" className="w-full h-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] via-[#0B0F1A]/40 to-transparent" />
        <button
          onClick={onBack}
          className="absolute top-5 left-4 sm:left-8 flex items-center gap-2 text-white/90 hover:text-white bg-black/30 backdrop-blur px-3.5 py-2 rounded-xl text-sm transition-all hover:bg-black/50"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al catálogo
        </button>
        <div className="absolute bottom-0 inset-x-0 px-4 sm:px-8 lg:px-10 pb-6">
          <div className="max-w-7xl mx-auto flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-[#8EA4FF] font-500 uppercase tracking-wider mb-1">{space.category}</p>
              <h1 className="font-display font-800 text-white text-3xl sm:text-4xl leading-tight">{space.name}</h1>
            </div>
            <StatusBadge status={space.status} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Información del espacio */}
          <div className="lg:col-span-4 space-y-5">
            <Card className="p-6">
              <p className="text-[#A8B3CF] text-sm leading-relaxed">{space.description || "Sin descripción."}</p>
              <div className="mt-5 pt-5 border-t border-[#1E2A45] grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2.5 text-[#A8B3CF]"><Users className="w-4 h-4 text-[#6C7693]" /> {space.capacity} persona{space.capacity !== 1 ? "s" : ""}</div>
                <div className="flex items-center gap-2.5 text-[#A8B3CF]"><Clock className="w-4 h-4 text-[#6C7693]" /> Máx. {RULES.maxHours} h</div>
                {space.location && <div className="col-span-2 flex items-center gap-2.5 text-[#A8B3CF]"><MapPin className="w-4 h-4 text-[#6C7693]" /> {space.location}</div>}
              </div>
            </Card>
            {space.equipment.length > 0 && (
              <Card className="p-6">
                <h3 className="font-display font-600 text-white text-sm mb-4">Equipamiento</h3>
                <ul className="space-y-2.5">
                  {space.equipment.map((eq) => (
                    <li key={eq} className="flex items-center gap-2.5 text-sm text-[#A8B3CF]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#20C997]" /> {eq}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Card className="p-6">
              <h3 className="font-display font-600 text-white text-sm mb-3">Normas de uso</h3>
              <ul className="space-y-2 text-xs text-[#8A93AD]">
                {[
                  `Horario de ${RULES.openHour}:00 a ${RULES.closeHour}:00`,
                  `Máximo ${RULES.maxHours} horas por reserva`,
                  `Máximo ${RULES.maxActive} reservas activas a la vez`,
                  `Cancelación hasta ${RULES.cancelHoursBefore} hora antes`,
                  `Reservas con hasta ${RULES.daysAhead} días de anticipación`,
                  "Presenta tu reserva al personal al llegar",
                ].map((rule) => <li key={rule} className="flex gap-2"><span className="text-[#4C6EF5]">—</span>{rule}</li>)}
              </ul>
            </Card>
          </div>

          {/* Asistente de reserva */}
          <div className="lg:col-span-8">
            <Card className="overflow-hidden">
              <div className="border-b border-[#1E2A45] px-2 sm:px-6 flex">
                {["Fecha", "Horario", "Confirmar"].map((label, i) => (
                  <div
                    key={label}
                    className={cx(
                      "flex-1 py-4 text-center text-xs font-500 border-b-2 transition-all",
                      i === stepIdx ? "border-[#4C6EF5] text-white" : i < stepIdx ? "border-[#20C997] text-[#5FE3B8]" : "border-transparent text-[#6C7693]",
                    )}
                  >
                    <span className={cx(
                      "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] mr-2",
                      i === stepIdx ? "bg-[#4C6EF5] text-white" : i < stepIdx ? "bg-[#20C997] text-[#06281D]" : "bg-[#1A2035] text-[#6C7693]",
                    )}>{i + 1}</span>
                    {label}
                  </div>
                ))}
              </div>

              <div className="p-5 sm:p-8">
                {!bookable ? (
                  <Alert tone="info">
                    Este espacio está {space.estado === "MANTENIMIENTO" ? "en mantenimiento" : "inactivo"} y no admite reservas por ahora.
                  </Alert>
                ) : step === "success" && created ? (
                  <div className="py-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#20C997]/15 flex items-center justify-center mx-auto mb-5">
                      <CircleCheck className="w-8 h-8 text-[#20C997]" />
                    </div>
                    <h2 className="font-display font-700 text-white text-2xl">¡Reserva confirmada!</h2>
                    <p className="text-[#A8B3CF] text-sm mt-2 mb-8">Preséntala al personal de la biblioteca al llegar.</p>
                    <div className="bg-[#0B0F1A] border border-[#1E2A45] rounded-2xl p-5 text-left max-w-md mx-auto space-y-3 text-sm">
                      {[
                        ["Código", created.code],
                        ["Espacio", created.spaceName],
                        ["Fecha", formatDateLong(created.date)],
                        ["Horario", `${created.start} – ${created.end}`],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 border-b border-[#1E2A45] pb-3 last:border-0 last:pb-0">
                          <span className="text-[#6C7693]">{label}</span>
                          <span className={cx("text-right", label === "Código" ? "text-[#8EA4FF] font-mono" : "text-white")}>{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center mt-8">
                      <Button variant="secondary" onClick={onBack}>Volver al catálogo</Button>
                      <Button icon={<CalendarCheck className="w-4 h-4" />} onClick={onViewReservations}>Ver mis reservas</Button>
                    </div>
                  </div>
                ) : step === "date" ? (
                  <div className="max-w-xl">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-display font-700 text-white text-lg">{MONTHS[calMonth]} {calYear}</h3>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" disabled={!canPrev} onClick={() => moveMonth(-1)} aria-label="Mes anterior"><ChevronLeft className="w-4 h-4" /></Button>
                        <Button variant="secondary" size="sm" disabled={!canNext} onClick={() => moveMonth(1)} aria-label="Mes siguiente"><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 mb-2">
                      {WEEKDAYS.map((d) => <div key={d} className="text-center text-[11px] text-[#6C7693] py-1">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = new Date(calYear, calMonth, i + 1);
                        const iso = toISODate(day);
                        const outOfRange = iso < todayISO() || day > lastDay;
                        const selected = date === iso;
                        return (
                          <button
                            key={iso}
                            disabled={outOfRange}
                            onClick={() => { setDate(iso); setStart(null); setEnd(null); }}
                            className={cx(
                              "aspect-square rounded-xl text-sm flex items-center justify-center transition-all",
                              selected ? "bg-[#4C6EF5] text-white font-600 shadow-lg shadow-[#4C6EF5]/30"
                                : outOfRange ? "text-[#2E3856] cursor-not-allowed"
                                : iso === todayISO() ? "ring-1 ring-[#4C6EF5] text-white hover:bg-[#4C6EF5]/20"
                                : "text-[#C9D1E6] hover:bg-[#1A2035]",
                            )}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-8 flex flex-wrap items-center gap-4">
                      <Button size="lg" disabled={!date} onClick={() => setStep("time")}>Elegir horario →</Button>
                      {date && <span className="text-sm text-[#A8B3CF]">{formatDateLong(date)}</span>}
                    </div>
                  </div>
                ) : step === "time" ? (
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-3 mb-1">
                      <Button variant="secondary" size="sm" onClick={() => setStep("date")} aria-label="Volver"><ArrowLeft className="w-4 h-4" /></Button>
                      <h3 className="font-display font-700 text-white text-lg">{date && formatDateLong(date)}</h3>
                    </div>
                    <p className="text-[#8A93AD] text-sm mb-5 sm:ml-12">Toca la hora de inicio y luego la última hora que necesitas (máximo {RULES.maxHours}).</p>

                    <div className="flex flex-wrap items-center gap-4 mb-5 text-xs text-[#8A93AD]">
                      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-[#4C6EF5]" /> Seleccionado</span>
                      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-[#1A2035] border border-[#26324F]" /> Libre</span>
                      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-rose-400/15 border border-rose-400/30" /> Reservado</span>
                    </div>

                    {slotsError ? (
                      <Alert>{slotsError}</Alert>
                    ) : slots === null ? (
                      <Loading label="Consultando disponibilidad..." />
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-5">
                        {BLOCKS.map((h) => {
                          const st = blockState(h);
                          const selected = start !== null && end !== null && h >= start && h <= end;
                          return (
                            <button
                              key={h}
                              disabled={st !== "free"}
                              onClick={() => pickBlock(h)}
                              className={cx(
                                "py-3 rounded-xl text-sm font-mono transition-all border",
                                selected ? "bg-[#4C6EF5] text-white border-[#4C6EF5] shadow-lg shadow-[#4C6EF5]/20"
                                  : st === "busy" ? "bg-rose-400/10 text-rose-300/60 border-rose-400/20 cursor-not-allowed line-through"
                                  : st === "past" ? "bg-transparent text-[#2E3856] border-[#1A2035] cursor-not-allowed"
                                  : "bg-[#1A2035] text-[#C9D1E6] border-[#26324F] hover:border-[#4C6EF5]/60 hover:text-white",
                              )}
                            >
                              {hourLabel(h)}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {hours > 0 && (
                      <div className="bg-[#4C6EF5]/10 border border-[#4C6EF5]/25 rounded-xl px-4 py-3 mb-5 text-sm text-white">
                        Bloque: <span className="font-mono text-[#8EA4FF]">{startLabel} → {endLabel}</span>
                        <span className="text-[#8A93AD] ml-2">({hours} hora{hours > 1 ? "s" : ""})</span>
                      </div>
                    )}
                    <Button size="lg" disabled={hours === 0} onClick={() => setStep("confirm")}>Revisar y confirmar →</Button>
                  </div>
                ) : (
                  <div className="max-w-xl">
                    <div className="flex items-center gap-3 mb-6">
                      <Button variant="secondary" size="sm" onClick={() => setStep("time")} aria-label="Volver"><ArrowLeft className="w-4 h-4" /></Button>
                      <h3 className="font-display font-700 text-white text-lg">Confirmar reserva</h3>
                    </div>
                    <div className="bg-[#0B0F1A] border border-[#1E2A45] rounded-2xl p-5 space-y-3 mb-5 text-sm">
                      {[
                        ["Espacio", space.name],
                        ["Fecha", date ? formatDateLong(date) : ""],
                        ["Horario", `${startLabel} – ${endLabel} (${hours} h)`],
                        ["Solicitante", session.name],
                        ["Correo", session.email],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 border-b border-[#1E2A45] pb-3 last:border-0 last:pb-0">
                          <span className="text-[#6C7693]">{label}</span>
                          <span className="text-white text-right">{value}</span>
                        </div>
                      ))}
                    </div>
                    <Field label="Motivo (opcional)" hint="Ej: estudio para parcial de cálculo, reunión de proyecto...">
                      <Textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                    </Field>
                    {saveError && <div className="mt-4"><Alert>{saveError}</Alert></div>}
                    <Button variant="success" size="lg" className="w-full mt-6" loading={saving} onClick={confirm}>
                      {saving ? "Reservando..." : "Confirmar reserva"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
