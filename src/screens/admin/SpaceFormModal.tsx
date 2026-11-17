import { useState } from "react";
import { Alert, Button, Field, Input, Modal, Select, Textarea, useUi } from "../../components/ui";
import {
  createSpace, ESTADO_LABEL, TYPE_LABEL, typeLabel, updateSpace, type Space, type SpaceEstado, type SpaceInput,
} from "../../api";

export const KNOWN_TYPES = Object.keys(TYPE_LABEL);

export function SpaceFormModal({ open, space, presetType, existingTypes, onClose, onSaved }: {
  open: boolean;
  space?: Space;
  presetType?: string;
  existingTypes: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useUi();
  const typeOptions = Array.from(new Set([...KNOWN_TYPES, ...existingTypes]));
  const initial = (): SpaceInput => space
    ? { nombre: space.name, descripcion: space.description, tipo: space.type, capacidad: space.capacity, estado: space.estado, ubicacion: space.location, equipamiento: space.equipment }
    : { nombre: "", descripcion: "", tipo: presetType ?? "SALA_ESTUDIO", capacidad: 1, estado: "ACTIVO", ubicacion: "", equipamiento: [] };

  const [form, setForm] = useState<SpaceInput>(initial);
  const [equipment, setEquipment] = useState("");
  const [customType, setCustomType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  // Reinicia el formulario cada vez que se abre para otro espacio
  const key = open ? `${space?.id ?? "new"}-${presetType ?? ""}` : null;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      const f = initial();
      setForm(f);
      setEquipment(f.equipamiento.join(", "));
      setCustomType("");
      setError(null);
    }
  }

  const set = <K extends keyof SpaceInput>(k: K, v: SpaceInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const tipo = form.tipo === "__other" ? customType.trim() : form.tipo;
    if (!form.nombre.trim()) return setError("El nombre es obligatorio.");
    if (!tipo) return setError("Indica el tipo de espacio.");
    if (!form.capacidad || form.capacidad < 1) return setError("La capacidad debe ser mayor a cero.");
    const input: SpaceInput = {
      ...form,
      tipo,
      equipamiento: equipment.split(",").map((e) => e.trim()).filter(Boolean),
    };
    setSaving(true);
    setError(null);
    try {
      if (space) await updateSpace(space.id, input);
      else await createSpace(input);
      toast(space ? "Espacio actualizado." : "Espacio creado.");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el espacio.");
    } finally {
      setSaving(false);
    }
  };

  const goesOffline = space?.estado === "ACTIVO" && form.estado !== "ACTIVO";

  return (
    <Modal
      open={open}
      title={space ? "Editar espacio" : "Nuevo espacio"}
      size="lg"
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={saving} onClick={save}>{space ? "Guardar cambios" : "Crear espacio"}</Button></>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="Nombre"><Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Sala de Estudio B2" /></Field>
        </div>
        <Field label="Tipo">
          <Select value={typeOptions.includes(form.tipo) ? form.tipo : "__other"} onChange={(e) => set("tipo", e.target.value)}>
            {typeOptions.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
            <option value="__other">Otro…</option>
          </Select>
        </Field>
        {form.tipo === "__other" ? (
          <Field label="Nombre del nuevo tipo"><Input value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Ej: Auditorio" /></Field>
        ) : (
          <Field label="Estado">
            <Select value={form.estado} onChange={(e) => set("estado", e.target.value as SpaceEstado)}>
              {(Object.keys(ESTADO_LABEL) as SpaceEstado[]).map((e) => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Capacidad (personas)"><Input type="number" min={1} value={form.capacidad} onChange={(e) => set("capacidad", Number(e.target.value))} /></Field>
        <Field label="Ubicación"><Input value={form.ubicacion} onChange={(e) => set("ubicacion", e.target.value)} placeholder="Ej: Planta 2" /></Field>
        {form.tipo === "__other" && (
          <Field label="Estado">
            <Select value={form.estado} onChange={(e) => set("estado", e.target.value as SpaceEstado)}>
              {(Object.keys(ESTADO_LABEL) as SpaceEstado[]).map((e) => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
            </Select>
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field label="Equipamiento" hint="Separado por comas. Ej: Proyector, Pizarra, WiFi">
            <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Descripción"><Textarea rows={3} value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} /></Field>
        </div>
      </div>
      {goesOffline && <div className="mt-4"><Alert tone="info">Al guardar, se anularán las reservas futuras de este espacio y se avisará a los usuarios.</Alert></div>}
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
    </Modal>
  );
}
