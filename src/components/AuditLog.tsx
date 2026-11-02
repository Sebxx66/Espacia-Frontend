import { useEffect, useState } from "react";
import { History, Search } from "lucide-react";
import { getAudit, type AuditEntry } from "../api";
import { Button, Card, EmptyState, ErrorState, Input, Loading, Pill } from "./ui";

// Registro de auditoría: quién hizo qué en el panel de administración (solo administradores)

const ACTIONS: Record<string, { label: string; tone: "blue" | "green" | "amber" | "red" | "gray" }> = {
  REGLAS_ACTUALIZADAS: { label: "Reglas", tone: "blue" },
  USUARIO_CREADO: { label: "Cuenta creada", tone: "green" },
  ROL_CAMBIADO: { label: "Rol cambiado", tone: "amber" },
  USUARIO_SUSPENDIDO: { label: "Cuenta suspendida", tone: "red" },
  USUARIO_REACTIVADO: { label: "Cuenta reactivada", tone: "green" },
  CONTRASENA_RESTABLECIDA: { label: "Contraseña restablecida", tone: "amber" },
  CORREO_CONFIRMADO: { label: "Correo confirmado", tone: "blue" },
  ESPACIO_CREADO: { label: "Espacio creado", tone: "green" },
  ESPACIO_EDITADO: { label: "Espacio editado", tone: "blue" },
  ESPACIO_ELIMINADO: { label: "Espacio eliminado", tone: "red" },
  RESERVA_ANULADA: { label: "Reserva anulada", tone: "red" },
  RESERVA_NO_ASISTIDA: { label: "No asistida", tone: "amber" },
  INCIDENCIA_REGISTRADA: { label: "Incidencia", tone: "amber" },
  INCIDENCIA_RESUELTA: { label: "Incidencia resuelta", tone: "green" },
};

const ROLE: Record<string, string> = { ROLE_ADMIN: "Administrador", ROLE_FUNCIONARIO: "Funcionario", ROLE_ESTUDIANTE: "Estudiante" };

const dateText = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function AuditLog() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  // Espera a que se deje de escribir antes de buscar
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(query), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let vigente = true;
    setLoading(true);
    setError(null);
    getAudit(search, page)
      .then((r) => {
        if (!vigente) return;
        setItems((prev) => (page === 0 ? r.items : [...prev, ...r.items]));
        setTotal(r.total);
        setHasMore(r.hasMore);
      })
      .catch((e) => vigente && setError(e instanceof Error ? e.message : "No se pudo cargar el registro."))
      .finally(() => vigente && setLoading(false));
    return () => {
      vigente = false;
    };
  }, [search, page, intento]);

  useEffect(() => setPage(0), [search]);

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#59617A]" />
          <Input
            className="pl-10"
            placeholder="Buscar por usuario, acción o detalle..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar en el registro de auditoría"
          />
        </div>
        <p className="text-xs text-[#6C7693] sm:ml-auto">
          {total} {total === 1 ? "registro" : "registros"}. Se anotan los cambios hechos desde el panel: reglas, usuarios, espacios, anulaciones e incidencias.
        </p>
      </div>

      {error ? <ErrorState message={error} onRetry={() => { setPage(0); setIntento((n) => n + 1); }} /> : items.length === 0 && loading ? <Loading /> : items.length === 0 ? (
        <Card><EmptyState icon={<History className="w-6 h-6" />} title={search ? "Sin resultados" : "Todavía no hay registros"} text={search ? "Prueba con otra búsqueda." : "Aquí aparecerán los cambios hechos desde el panel."} /></Card>
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-[#1E2A45]">
                  {["Fecha", "Usuario", "Acción", "Detalle"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-[11px] font-500 text-[#6C7693] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((a) => {
                  const info = ACTIONS[a.action] ?? { label: a.action, tone: "gray" as const };
                  return (
                    <tr key={a.id} className="border-b border-[#1E2A45] last:border-0 align-top">
                      <td className="py-3 px-4 text-xs text-[#A8B3CF] whitespace-nowrap">{dateText(a.date)}</td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-white">{a.userName}</p>
                        <p className="text-xs text-[#6C7693]">{a.userEmail ?? ""}{a.userRole ? ` · ${ROLE[a.userRole] ?? a.userRole}` : ""}</p>
                        {a.ip && <p className="text-[11px] text-[#59617A] font-mono">IP {a.ip}</p>}
                      </td>
                      <td className="py-3 px-4"><Pill tone={info.tone}>{info.label}</Pill></td>
                      <td className="py-3 px-4 text-sm text-[#C9D1E6]">{a.detail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button variant="secondary" loading={loading} onClick={() => setPage((p) => p + 1)}>Ver más</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
