import { useState } from "react";
import { Alert, Button, Field, Input, Modal, Select, useUi } from "../../components/ui";
import { createUser, resetUserPassword, ROLE_LABEL, RULES, type AdminUser, type Role } from "../../api";

export function NewUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { toast } = useUi();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setName(""); setEmail(""); setPassword(""); setRole("staff"); setError(null);
    onClose();
  };

  const save = async () => {
    if (!name.trim()) return setError("El nombre es obligatorio.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Escribe un email válido.");
    if (password.length < RULES.minPassword) return setError(`La contraseña debe tener al menos ${RULES.minPassword} caracteres.`);
    setSaving(true);
    setError(null);
    try {
      await createUser({ name: name.trim(), email: email.trim(), password, role });
      toast(`Cuenta de ${ROLE_LABEL[role].toLowerCase()} creada para ${name.trim()}.`);
      setName(""); setEmail(""); setPassword(""); setRole("staff");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la cuenta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Nuevo usuario"
      subtitle="Crea cuentas de funcionarios, administradores o estudiantes"
      onClose={close}
      footer={<><Button variant="secondary" onClick={close}>Cancelar</Button><Button loading={saving} onClick={save}>Crear cuenta</Button></>}
    >
      <div className="space-y-4">
        <Field label="Nombre completo"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Contraseña temporal" hint={`Mínimo ${RULES.minPassword} caracteres, que no sea común ni incluya su nombre o correo. Compártela con la persona para que la cambie al ingresar.`}>
          <Input type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Rol">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {(["staff", "admin", "student"] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
        </Field>
        {error && <Alert>{error}</Alert>}
      </div>
    </Modal>
  );
}

export function ResetPasswordModal({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const { toast } = useUi();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setPassword(""); setError(null);
    onClose();
  };

  const save = async () => {
    if (!user) return;
    if (password.length < RULES.minPassword) return setError(`La contraseña debe tener al menos ${RULES.minPassword} caracteres.`);
    setSaving(true);
    setError(null);
    try {
      await resetUserPassword(user.id, password);
      toast(`Contraseña de ${user.name} restablecida.`);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo restablecer la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!user}
      title="Restablecer contraseña"
      subtitle={user ? `${user.name} · ${user.email}` : undefined}
      size="sm"
      onClose={close}
      footer={<><Button variant="secondary" onClick={close}>Cancelar</Button><Button loading={saving} onClick={save}>Guardar</Button></>}
    >
      <div className="space-y-4">
        <Field label="Nueva contraseña temporal" hint={`Mínimo ${RULES.minPassword} caracteres. Pídele a la persona que la cambie al ingresar.`}>
          <Input type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <Alert>{error}</Alert>}
      </div>
    </Modal>
  );
}
