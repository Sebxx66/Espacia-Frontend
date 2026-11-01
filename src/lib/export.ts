import { typeLabel, type Reservation } from "../api";
import { reservationStatusInfo } from "./format";

// Evita que Excel interprete como fórmula un texto que empiece por = + - @
function cell(value: string | number | null | undefined) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

// Descarga un CSV que Excel abre directamente (separador ";" y tildes correctas)
export function exportReservationsCsv(reservations: Reservation[]) {
  const header = ["Código", "Espacio", "Tipo", "Ubicación", "Usuario", "Correo", "Fecha", "Inicio", "Fin", "Estado", "Motivo"];
  const rows = reservations.map((r) => [
    r.code, r.spaceName, typeLabel(r.spaceType), r.spaceLocation, r.userName, r.userEmail,
    r.date, r.start.slice(0, 5), r.end.slice(0, 5), reservationStatusInfo(r).label, r.reason,
  ]);
  const lines = [header, ...rows].map((row) => row.map(cell).join(";"));
  const csv = "﻿" + "sep=;\r\n" + lines.join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `reservas-bibliospace-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
