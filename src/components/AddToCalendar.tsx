import { CalendarPlus, Download } from "lucide-react";
import type { Reservation } from "../api";
import { downloadIcs, googleCalendarUrl } from "../lib/calendar";
import { cx } from "./ui";

// Botones para guardar la reserva en el calendario personal
export default function AddToCalendar({ r, className }: { r: Reservation; className?: string }) {
  const base =
    "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-display font-600 border border-[#26324F] bg-[#1A2035] " +
    "text-[#C9D1E6] hover:text-white hover:border-[#4C6EF5]/60 transition-all";
  return (
    <div className={cx("flex flex-wrap items-center gap-2", className)} role="group" aria-label="Añadir la reserva a tu calendario">
      <a href={googleCalendarUrl(r)} target="_blank" rel="noopener noreferrer" className={base}>
        <CalendarPlus className="w-4 h-4" aria-hidden="true" /> Google Calendar
      </a>
      <button type="button" onClick={() => downloadIcs(r)} className={base}>
        <Download className="w-4 h-4" aria-hidden="true" /> Apple / Outlook (.ics)
      </button>
    </div>
  );
}
