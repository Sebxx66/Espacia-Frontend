import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { CalendarClock, Clock, Hourglass, RotateCcw, Save, UserX } from "lucide-react";
import { DEFAULT_RULES, getRules, saveRules, type RulesForm } from "../api";
import { plural } from "../lib/format";
import { Alert, Button, Card, ErrorState, Field, Input, Loading, Select, useUi } from "./ui";

// Configuración de las reglas de reserva (solo administradores). Se aplican de inmediato a las nuevas reservas.

type NumberKey = keyof RulesForm;

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

export default function RulesSettings() {
  const { toast } = useUi();
  const [form, setForm] = useState<RulesForm | null>(null);
  const [saved, setSaved] = useState<RulesForm | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoadError(null);
    getRules()
      .then(({ rules, updatedAt }) => {
        setForm(rules);
        setSaved(rules);
        setUpdatedAt(updatedAt);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "No se pudieron cargar las reglas."));
  };
  useEffect(load, []);

  const dirty = useMemo(() => !!form && !!saved && (Object.keys(form) as NumberKey[]).some((k) => form[k] !== saved[k]), [form, saved]);

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if (!form) return <Loading label="Cargando reglas..." />;

  const set = (key: NumberKey, value: number) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const num = (key: NumberKey, min: number, max: number) => ({
    type: "number",
    inputMode: "numeric" as const,
    min,
    max,
    value: Number.isNaN(form[key]) ? "" : form[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => set(key, e.target.value === "" ? Number.NaN : Number(e.target.value)),
  });

  const openHours = form.closeHour - form.openHour;

  const validate = (): string | null => {
    if ((Object.values(form) as number[]).some((v) => Number.isNaN(v))) return "Completa todos los campos.";
    if (form.closeHour <= form.openHour) return "La hora de cierre debe ser posterior a la hora de apertura.";
    if (form.maxHours > openHours) return `La duración máxima no puede superar las horas de apertura (${openHours} h).`;
    if (form.maxEquipmentPerDay === 0 && form.maxRoomsPerDay === 0) return "Debe permitirse reservar al menos un equipo o una sala por día.";
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) return setError(problem);
    setSaving(true);
    setError(null);
    try {
      const result = await saveRules(form);
      setForm(result.rules);
      setSaved(result.rules);
      setUpdatedAt(result.updatedAt);
      toast("Reglas actualizadas. Ya se aplican a las nuevas reservas.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar las reglas.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-700 text-white text-lg">Reglas de reserva</h2>
            <p className="text-sm text-[#8A93AD] mt-1 max-w-2xl">
              Ajústalas al reglamento de tu biblioteca. Los cambios se aplican de inmediato a las nuevas reservas y se
              muestran en toda la aplicación y en los Términos de uso. Las reservas ya hechas no cambian.
            </p>
            {updatedAt && (
              <p className="text-xs text-[#6C7693] mt-2">Última modificación: {new Date(updatedAt).toLocaleString("es-CO")}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <Button variant="secondary" icon={<RotateCcw className="w-4 h-4" />} onClick={() => { setForm({ ...DEFAULT_RULES }); setError(null); }}>
              Valores por defecto
            </Button>
            <Button icon={<Save className="w-4 h-4" />} loading={saving} disabled={!dirty} onClick={save}>
              Guardar cambios
            </Button>
          </div>
        </div>
        {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Section icon={<Clock className="w-4 h-4" />} title="Horario" text="Horas en que se puede reservar.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Apertura">
              <Select value={form.openHour} onChange={(e) => set("openHour", Number(e.target.value))}>
                {HOURS.slice(0, 23).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </Select>
            </Field>
            <Field label="Cierre">
              <Select value={form.closeHour} onChange={(e) => set("closeHour", Number(e.target.value))}>
                {HOURS.slice(1).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </Select>
            </Field>
          </div>
        </Section>

        <Section icon={<Hourglass className="w-4 h-4" />} title="Duración y reservas activas" text="Cuánto puede durar una reserva y cuántas puede tener cada persona.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Máximo de horas por reserva" hint="Entre 1 y 12">
              <Input {...num("maxHours", 1, 12)} />
            </Field>
            <Field label="Reservas activas a la vez" hint="Entre 1 y 20">
              <Input {...num("maxActive", 1, 20)} />
            </Field>
          </div>
        </Section>

        <Section icon={<CalendarClock className="w-4 h-4" />} title="Límites por día y anticipación" text="Por persona y por día, según el tipo de espacio. 0 desactiva ese tipo.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Equipos por día" hint="Entre 0 y 10">
              <Input {...num("maxEquipmentPerDay", 0, 10)} />
            </Field>
            <Field label="Salas o talleres por día" hint="Entre 0 y 10">
              <Input {...num("maxRoomsPerDay", 0, 10)} />
            </Field>
            <Field label="Días de anticipación" hint="Hasta cuántos días antes se puede reservar (1 a 365)">
              <Input {...num("daysAhead", 1, 365)} />
            </Field>
          </div>
        </Section>

        <Section icon={<UserX className="w-4 h-4" />} title="Cancelación y asistencia" text="Hasta cuándo se puede cancelar y cuándo se libera una reserva si nadie llega.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Horas antes para cancelar" hint="0 = hasta que empiece">
              <Input {...num("cancelHoursBefore", 0, 72)} />
            </Field>
            <Field label="Minutos para liberar" hint="Sin validar la llegada (5 a 240)">
              <Input {...num("noShowMinutes", 5, 240)} />
            </Field>
          </div>
        </Section>
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="font-display font-600 text-white text-sm">Así lo verán los usuarios</h3>
        <ul className="mt-3 grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm text-[#A8B3CF]">
          <li>• Horario: {hourLabel(form.openHour)} a {hourLabel(form.closeHour)}</li>
          <li>• Máximo {Number.isNaN(form.maxHours) ? "—" : plural(form.maxHours, "hora", "horas")} por reserva</li>
          <li>• Hasta {Number.isNaN(form.maxActive) ? "—" : plural(form.maxActive, "reserva activa", "reservas activas")}</li>
          <li>
            • Por día: {Number.isNaN(form.maxEquipmentPerDay) ? "—" : plural(form.maxEquipmentPerDay, "equipo", "equipos")} y{" "}
            {Number.isNaN(form.maxRoomsPerDay) ? "—" : plural(form.maxRoomsPerDay, "sala o taller", "salas o talleres")}
          </li>
          <li>
            • {form.cancelHoursBefore === 0 ? "Se puede cancelar hasta que empiece"
              : `Cancelación hasta ${Number.isNaN(form.cancelHoursBefore) ? "—" : plural(form.cancelHoursBefore, "hora", "horas")} antes`}
          </li>
          <li>• Se libera si nadie llega en {Number.isNaN(form.noShowMinutes) ? "—" : form.noShowMinutes} minutos</li>
          <li>• Reservas con hasta {Number.isNaN(form.daysAhead) ? "—" : plural(form.daysAhead, "día", "días")} de anticipación</li>
        </ul>
      </Card>
    </div>
  );
}

function Section({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[#4C6EF5]/12 text-[#8EA4FF] flex items-center justify-center flex-shrink-0">{icon}</div>
        <div>
          <h3 className="font-display font-600 text-white text-sm">{title}</h3>
          <p className="text-xs text-[#8A93AD] mt-0.5">{text}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}
