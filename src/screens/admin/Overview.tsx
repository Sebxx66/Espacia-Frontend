import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, CalendarX, ChartColumn, ClipboardList, RefreshCw, TriangleAlert, Users } from "lucide-react";
import { Button, Card, ErrorState, Loading, ReservationBadge, Stat } from "../../components/ui";
import { getDashboard } from "../../api";
import { formatDate } from "../../lib/format";
import { useLoader } from "../../lib/useLoader";

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) =>
  active && payload?.length ? (
    <div className="bg-[#121828] border border-[#26324F] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-[#8A93AD] mb-0.5">{label}</p>
      {payload.map((p) => <p key={p.name} className="text-white">{p.name}: <b>{p.value}</b></p>)}
    </div>
  ) : null;

const axisTick = { fill: "#6C7693", fontSize: 11 };

export function Overview({ state }: { state: ReturnType<typeof useLoader<Awaited<ReturnType<typeof getDashboard>>>> }) {
  if (state.loading) return <Loading label="Calculando estadísticas..." />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? "Sin datos."} onRetry={() => state.reload()} />;
  const d = state.data;
  const weekTotal = d.byDay.reduce((s, x) => s + x.reservations, 0);
  const peak = d.byHour.reduce((best, x) => (x.reservations > best.reservations ? x : best), d.byHour[0]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end -mt-2">
        <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => state.reload(true)}>Actualizar</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        <Stat icon={<CalendarDays className="w-5 h-5" />} label="Reservas activas" value={d.activeReservations} />
        <Stat icon={<ClipboardList className="w-5 h-5" />} label="Reservas de hoy" value={d.reservationsToday} accent="#20C997" />
        <Stat icon={<ChartColumn className="w-5 h-5" />} label="Utilización hoy" value={`${d.utilizationToday}%`} hint={`${d.activeSpaces} espacios activos`} accent="#748FFC" />
        <Stat icon={<CalendarX className="w-5 h-5" />} label="Cancelaciones del mes" value={d.cancellationsMonth} accent="#FF6B6B" />
        <Stat icon={<Users className="w-5 h-5" />} label="Usuarios registrados" value={d.users} accent="#FCC419" />
        <Stat icon={<TriangleAlert className="w-5 h-5" />} label="Incidencias abiertas" value={d.openIncidents} accent="#FF922B" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-6">
          <h3 className="font-display font-600 text-white text-sm">Reservas por día</h3>
          <p className="text-[#6C7693] text-xs mb-4">Últimos 7 días · {weekTotal} en total</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.byDay} barSize={26}>
              <CartesianGrid vertical={false} stroke="#1E2A45" />
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="reservations" name="Reservas" radius={[6, 6, 0, 0]}>
                {d.byDay.map((_, i) => <Cell key={i} fill={i === d.byDay.length - 1 ? "#4C6EF5" : "#2A3760"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="font-display font-600 text-white text-sm">Demanda por franja horaria</h3>
          <p className="text-[#6C7693] text-xs mb-4">
            Último mes{peak && peak.reservations > 0 ? ` · Pico a las ${peak.hour}` : ""}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={d.byHour}>
              <defs>
                <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#20C997" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#20C997" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#1E2A45" />
              <XAxis dataKey="hour" tick={{ ...axisTick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="reservations" name="Reservas" stroke="#20C997" fill="url(#hourGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-6">
          <h3 className="font-display font-600 text-white text-sm mb-4">Espacios más reservados</h3>
          {d.topSpaces.length === 0 ? <p className="text-sm text-[#6C7693]">Aún no hay reservas para comparar.</p> : (
            <div className="space-y-4">
              {d.topSpaces.map((s, i) => (
                <div key={s.id}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs text-[#6C7693] w-4">{i + 1}</span>
                      <span className="text-white truncate">{s.name}</span>
                    </span>
                    <span className="text-[#A8B3CF] text-xs">{s.reservations} reserva{s.reservations !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-1.5 bg-[#1A2035] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#4C6EF5] to-[#20C997]" style={{ width: `${s.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="font-display font-600 text-white text-sm mb-3">Reservas recientes</h3>
          {d.recent.length === 0 ? <p className="text-sm text-[#6C7693]">Todavía no se han hecho reservas.</p> : (
            <div className="divide-y divide-[#1E2A45]">
              {d.recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{r.userName}</p>
                    <p className="text-xs text-[#6C7693] truncate">{r.code} · {r.spaceName} · {formatDate(r.date)} {r.start}</p>
                  </div>
                  <ReservationBadge reservation={r} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Espacios
// ---------------------------------------------------------------------------
