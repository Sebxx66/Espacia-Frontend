import { RULES, type Reservation } from "../api";

// Añadir una reserva al calendario: enlace de Google Calendar y archivo .ics
// (Apple Calendar, Outlook y la mayoría de calendarios del celular).

const ZONE = "America/Bogota";

// "2026-11-02" + "10:00" -> "20261102T100000"
const stamp = (date: string, time: string) => `${date.replace(/-/g, "")}T${time.slice(0, 5).replace(":", "")}00`;

const title = (r: Reservation) => `Reserva: ${r.spaceName}`;
const details = (r: Reservation) =>
  `Código ${r.code}. Presenta la reserva al llegar; si nadie valida tu llegada en ${RULES.noShowMinutes} minutos, el espacio se libera.`;

export function googleCalendarUrl(r: Reservation) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title(r),
    dates: `${stamp(r.date, r.start)}/${stamp(r.date, r.end)}`,
    ctz: ZONE,
    details: details(r),
    location: r.spaceLocation ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Texto de iCalendar: se escapan \ ; , y saltos de línea
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function downloadIcs(r: Reservation) {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Espacia//Reservas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    `TZID:${ZONE}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0500",
    "TZNAME:-05",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:espacia-${r.id}-${r.code}@espacia`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${ZONE}:${stamp(r.date, r.start)}`,
    `DTEND;TZID=${ZONE}:${stamp(r.date, r.end)}`,
    `SUMMARY:${esc(title(r))}`,
    `LOCATION:${esc(r.spaceLocation ?? "")}`,
    `DESCRIPTION:${esc(details(r))}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`Tu reserva en ${r.spaceName} empieza en 30 minutos`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reserva-${r.code}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
