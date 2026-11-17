import { useState } from "react";
import { CalendarDays, Download, Search } from "lucide-react";
import { ReservationsTable } from "../../components/staff";
import { Button, Card, EmptyState, ErrorState, Input, Loading, Select } from "../../components/ui";
import { getReservations, type ReservationStatus } from "../../api";
import { exportReservationsCsv } from "../../lib/export";
import { useLoader } from "../../lib/useLoader";

const STATUS_OPTIONS: { value: ReservationStatus | ""; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "CONFIRMADA", label: "Confirmadas" },
  { value: "EN_USO", label: "En uso" },
  { value: "FINALIZADA", label: "Finalizadas" },
  { value: "CANCELADA", label: "Canceladas" },
  { value: "RECHAZADA", label: "Anuladas" },
  { value: "NO_ASISTIDA", label: "No asistidas" },
];

export function ReservationsAdmin() {
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
