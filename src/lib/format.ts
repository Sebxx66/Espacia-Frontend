import { RULES, type Reservation, type ReservationStatus } from "../api";

// Fechas en formato YYYY-MM-DD usando la hora local (no UTC)
export function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const todayISO = () => toISODate(new Date());

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// "vie, 31 oct"
export function formatDate(iso: string) {
  const d = parseISODate(iso);
  const today = todayISO();
  const tomorrow = toISODate(new Date(Date.now() + 86_400_000));
  if (iso === today) return "Hoy";
  if (iso === tomorrow) return "Mañana";
  return capitalize(d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, ""));
}

// "viernes, 31 de octubre de 2026"
export function formatDateLong(iso: string) {
  return capitalize(parseISODate(iso).toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }));
}

export function formatNow(d = new Date()) {
  const date = d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${capitalize(date)} · ${time}`;
}

// "hace 5 min", "ayer"...
export function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86_400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 172_800) return "ayer";
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;
export const hourOf = (t: string) => Number(t.slice(0, 2));

export function reservationStart(r: Reservation) {
  const d = parseISODate(r.date);
  const [h, m] = r.start.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

export function durationHours(r: Pick<Reservation, "start" | "end">) {
  const [sh, sm] = r.start.split(":").map(Number);
  const [eh, em] = r.end.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

// Reserva que todavía ocupa un cupo del usuario
export function isActive(r: Reservation) {
  return (r.status === "CONFIRMADA" || r.status === "PENDIENTE" || r.status === "EN_USO") && !r.expired;
}

export function canCancel(r: Reservation) {
  return (r.status === "CONFIRMADA" || r.status === "PENDIENTE")
    && reservationStart(r).getTime() - Date.now() > RULES.cancelHoursBefore * 3_600_000;
}

export function canExtend(r: Reservation) {
  return (r.status === "CONFIRMADA" || r.status === "EN_USO") && !r.expired
    && hourOf(r.end) < RULES.closeHour && durationHours(r) < RULES.maxHours;
}

type Tone = "blue" | "green" | "amber" | "red" | "gray";

const STATUS_INFO: Record<ReservationStatus, { label: string; tone: Tone }> = {
  PENDIENTE: { label: "Pendiente", tone: "amber" },
  CONFIRMADA: { label: "Confirmada", tone: "blue" },
  EN_USO: { label: "En uso", tone: "green" },
  FINALIZADA: { label: "Finalizada", tone: "gray" },
  CANCELADA: { label: "Cancelada", tone: "red" },
  RECHAZADA: { label: "Anulada", tone: "red" },
  NO_ASISTIDA: { label: "No asistida", tone: "red" },
};

export function reservationStatusInfo(r: Pick<Reservation, "status" | "expired">): { label: string; tone: Tone } {
  if (r.expired && r.status === "EN_USO") return { label: "Sin devolver", tone: "red" };
  if (r.expired && (r.status === "CONFIRMADA" || r.status === "PENDIENTE")) return { label: "Expirada", tone: "gray" };
  return STATUS_INFO[r.status];
}

export const TONE_CLASSES: Record<Tone, string> = {
  blue: "bg-[#4C6EF5]/12 text-[#8EA4FF] border-[#4C6EF5]/25",
  green: "bg-emerald-400/10 text-emerald-300 border-emerald-400/25",
  amber: "bg-amber-400/10 text-amber-300 border-amber-400/25",
  red: "bg-rose-400/10 text-rose-300 border-rose-400/25",
  gray: "bg-white/5 text-[#8A93AD] border-white/10",
};
