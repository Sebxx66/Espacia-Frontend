import { useState } from "react";
import { BadgeCheck, MailCheck, KeyRound, Search, UserCog, UserPlus, Users } from "lucide-react";
import {
  Alert, Button, Card, cx, EmptyState, ErrorState, Field, Input, Loading, Modal, Pill, Select, useAction, useUi,
} from "../../components/ui";
import { getUsers, ROLE_LABEL, verifyUserEmail, updateUser, type AdminUser, type Role, type Session } from "../../api";
import { timeAgo } from "../../lib/format";
import { useLoader } from "../../lib/useLoader";
import { NewUserModal, ResetPasswordModal } from "./UserModals";

const ROLE_TONE: Record<Role, "blue" | "amber" | "gray"> = { admin: "amber", staff: "blue", student: "gray" };

export function UsersAdmin({ session }: { session: Session }) {
  const { confirm } = useUi();
  const { busy, run } = useAction();
  const state = useLoader(getUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [managing, setManaging] = useState<AdminUser | null>(null);

  const q = query.trim().toLowerCase();
  const list = (state.data ?? []).filter((u) => (!roleFilter || u.role === roleFilter) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  const counts = (r: Role) => (state.data ?? []).filter((u) => u.role === r).length;

  const toggleActive = async (u: AdminUser) => {
    const ok = await confirm({
      title: u.active ? "Suspender cuenta" : "Reactivar cuenta",
      message: u.active
        ? <><b className="text-white">{u.name}</b> no podrá iniciar sesión hasta que reactives su cuenta. Su sesión actual se cerrará.</>
        : <><b className="text-white">{u.name}</b> podrá volver a iniciar sesión.</>,
      confirmLabel: u.active ? "Suspender" : "Reactivar",
      danger: u.active,
    });
    if (ok && await run(`a${u.id}`, () => updateUser(u.id, { active: !u.active }), u.active ? "Cuenta suspendida." : "Cuenta reactivada.")) {
      setManaging(null);
      state.reload(true);
    }
  };

  const confirmEmail = async (u: AdminUser) => {
    const ok = await confirm({
      title: "Confirmar correo",
      message: <>Marca el correo de <b className="text-white">{u.name}</b> como confirmado sin esperar el enlace. Hazlo solo si verificaste que <b className="text-white">{u.email}</b> es de esa persona.</>,
      confirmLabel: "Confirmar correo",
    });
    if (ok && await run(`v${u.id}`, () => verifyUserEmail(u.id), "Correo confirmado. Ya puede iniciar sesión.")) {
      setManaging(null);
      state.reload(true);
    }
  };

  const changeRole = async (u: AdminUser, role: Role) => {
    if (role === u.role) return;
    const ok = await confirm({
      title: "Cambiar rol",
      message: <><b className="text-white">{u.name}</b> pasará de {ROLE_LABEL[u.role]} a <b className="text-white">{ROLE_LABEL[role]}</b>. El cambio aplica en su próximo inicio de sesión.</>,
      confirmLabel: "Cambiar rol",
    });
    if (ok && await run(`r${u.id}`, () => updateUser(u.id, { role }), `Ahora ${u.name} es ${ROLE_LABEL[role].toLowerCase()}.`)) {
      setManaging(null);
      state.reload(true);
    }
  };

  if (state.loading) return <Loading />;
  if (state.error) return <ErrorState message={state.error} onRetry={() => state.reload()} />;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5 max-w-xl">
        {(["student", "staff", "admin"] as Role[]).map((r) => (
          <button key={r} onClick={() => setRoleFilter(roleFilter === r ? "" : r)} aria-pressed={roleFilter === r} className={cx("text-left rounded-2xl border px-4 py-3 transition-all", roleFilter === r ? "border-[#4C6EF5]/50 bg-[#4C6EF5]/10" : "border-[#1E2A45] bg-[#121828] hover:border-[#4C6EF5]/30")}>
            <p className="font-display font-700 text-white text-xl">{counts(r)}</p>
            <p className="text-xs text-[#8A93AD]">{ROLE_LABEL[r]}{r === "admin" ? "es" : "s"}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#59617A]" />
          <Input className="pl-10" placeholder="Buscar por nombre o email..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="sm:ml-auto">
          <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => setCreating(true)}>Nuevo usuario</Button>
        </div>
      </div>

      {list.length === 0 ? <Card><EmptyState icon={<Users className="w-6 h-6" />} title="No hay usuarios con ese filtro" /></Card> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[#1E2A45]">
                {["Usuario", "Rol", "Reservas", "Estado", "Registro", ""].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-[11px] font-500 text-[#6C7693] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((u) => {
                const isMe = u.id === session.id;
                return (
                  <tr key={u.id} className="border-b border-[#1E2A45] last:border-0 hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4C6EF5] to-[#20C997] flex items-center justify-center text-white text-xs font-display font-700 flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm">{u.name}{isMe && <span className="text-[#6C7693]"> (tú)</span>}</p>
                          <p className="text-[#6C7693] text-xs truncate">{u.email}</p>
                          {u.institutional && (
                            <p className="inline-flex items-center gap-1 text-[11px] text-[#38D9A9] mt-0.5"><BadgeCheck className="w-3 h-3" /> Institucional</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4"><Pill tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Pill></td>
                    <td className="py-3 px-4 text-[#C9D1E6] text-sm">{u.reservations}</td>
                    <td className="py-3 px-4">
                      {!u.emailVerified && u.active
                        ? <Pill tone="amber">Sin confirmar correo</Pill>
                        : <Pill tone={u.active ? "green" : "red"}>{u.active ? "Activo" : "Suspendido"}</Pill>}
                    </td>
                    <td className="py-3 px-4 text-[#6C7693] text-xs">{timeAgo(u.createdAt) || "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="secondary" icon={<UserCog className="w-3.5 h-3.5" />} onClick={() => setManaging(u)}>Gestionar</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!managing} title={managing?.name ?? ""} subtitle={managing?.email} onClose={() => setManaging(null)}>
        {managing && (
          <div className="space-y-5">
            {managing.id === session.id ? (
              <Alert tone="info">Esta es tu cuenta. Puedes cambiar tu contraseña desde “Cambiar contraseña” en el menú lateral; tu rol y estado solo los puede cambiar otro administrador.</Alert>
            ) : (
              <>
                <Field label="Rol">
                  <Select value={managing.role} disabled={busy === `r${managing.id}`} onChange={(e) => changeRole(managing, e.target.value as Role)}>
                    {(["student", "staff", "admin"] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </Select>
                </Field>
                {!managing.emailVerified && (
                  <div className="space-y-3">
                    <Alert tone="info">Se registró pero aún no abre el enlace que le llegó al correo, así que no puede iniciar sesión. Si en 7 días no lo confirma, la cuenta se borra sola.</Alert>
                    <Button variant="secondary" className="w-full" icon={<MailCheck className="w-4 h-4" />} loading={busy === `v${managing.id}`} onClick={() => confirmEmail(managing)}>
                      Confirmar correo manualmente
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button variant="secondary" icon={<KeyRound className="w-4 h-4" />} onClick={() => { setResetting(managing); setManaging(null); }}>
                    Restablecer contraseña
                  </Button>
                  <Button variant={managing.active ? "danger" : "success"} loading={busy === `a${managing.id}`} onClick={() => toggleActive(managing)}>
                    {managing.active ? "Suspender cuenta" : "Reactivar cuenta"}
                  </Button>
                </div>
              </>
            )}
            <p className="text-xs text-[#6C7693]">{managing.reservations} reserva{managing.reservations !== 1 ? "s" : ""} registradas.</p>
          </div>
        )}
      </Modal>

      <NewUserModal open={creating} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); state.reload(true); }} />
      <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
    </div>
  );
}
