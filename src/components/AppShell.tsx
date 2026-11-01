import { useEffect, useState, type ReactNode } from "react";
import { KeyRound, LogOut, Menu, X } from "lucide-react";
import LogoMark from "./LogoMark";
import { changePassword, RULES, ROLE_LABEL, type Session } from "../api";
import { formatNow } from "../lib/format";
import { Alert, Button, cx, Field, Input, Modal, useUi } from "./ui";

export interface NavItem {
  id: string;
  icon: ReactNode;
  label: string;
  badge?: number;
}

interface Props {
  session: Session;
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
  onLogout: () => void;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

// Estructura común de los tres paneles: menú lateral (cajón en celular), cabecera y contenido
export default function AppShell({ session, items, active, onSelect, onLogout, title, actions, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const select = (id: string) => {
    onSelect(id);
    setMenuOpen(false);
  };

  const nav = (
    <>
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4C6EF5] to-[#6C8BFF] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#4C6EF5]/30">
          <LogoMark className="w-6 h-6" />
        </div>
        <div>
          <p className="font-display font-700 text-[15px] text-white leading-none">Espacia</p>
          <p className="text-[11px] text-[#6C7693] mt-1">{ROLE_LABEL[session.role]}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => select(item.id)}
            aria-current={active === item.id ? "page" : undefined}
            className={cx(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all",
              active === item.id
                ? "bg-[#4C6EF5]/15 text-white font-500 shadow-[inset_2px_0_0_#4C6EF5]"
                : "text-[#8A93AD] hover:text-white hover:bg-white/5",
            )}
          >
            <span className="flex items-center gap-3">
              <span className={cx("w-[18px] h-[18px] [&>svg]:w-[18px] [&>svg]:h-[18px]", active === item.id && "text-[#8EA4FF]")}>{item.icon}</span>
              {item.label}
            </span>
            {!!item.badge && (
              <span className="text-[10px] font-600 bg-[#4C6EF5] text-white min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="mt-6 pt-5 border-t border-[#1E2A45]">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4C6EF5] to-[#20C997] flex items-center justify-center text-white text-sm font-display font-700 flex-shrink-0">
            {session.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white font-500 leading-tight truncate">{session.name}</p>
            <p className="text-[11px] text-[#6C7693] truncate">{session.email}</p>
          </div>
        </div>
        <button
          onClick={() => { setPasswordOpen(true); setMenuOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#8A93AD] hover:text-white hover:bg-white/5 transition-all"
        >
          <KeyRound className="w-4 h-4" /> Cambiar contraseña
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#8A93AD] hover:text-rose-300 hover:bg-rose-400/5 transition-all"
        >
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex">
      {/* Menú lateral en escritorio */}
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-[#0E1322] border-r border-[#1E2A45] px-4 py-6 fixed top-0 left-0 z-20">
        {nav}
      </aside>

      {/* Cajón de navegación en celular y tablet */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMenuOpen(false)} />
          <aside className="absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-[#0E1322] border-r border-[#1E2A45] px-4 py-6 flex flex-col animate-slide-up">
            <button onClick={() => setMenuOpen(false)} className="absolute top-5 right-4 p-1.5 rounded-lg text-[#6C7693] hover:text-white" aria-label="Cerrar menú">
              <X className="w-5 h-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <main className="flex-1 lg:ml-64 min-w-0 flex flex-col">
        <header className="sticky top-0 z-10 bg-[#0B0F1A]/90 backdrop-blur border-b border-[#1E2A45] px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMenuOpen(true)} className="lg:hidden p-2 -ml-2 rounded-xl text-[#A8B3CF] hover:text-white hover:bg-white/5" aria-label="Abrir menú">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display font-700 text-white text-lg sm:text-xl leading-tight truncate">{title}</h1>
              <p className="text-[#6C7693] text-xs mt-0.5 hidden sm:block">{formatNow(now)}</p>
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </header>

        <div className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8">{children}</div>
      </main>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useUi();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setCurrent(""); setNext(""); setRepeat(""); setError(null);
    onClose();
  };

  const save = async () => {
    if (next.length < RULES.minPassword) return setError(`La nueva contraseña debe tener al menos ${RULES.minPassword} caracteres.`);
    if (next !== repeat) return setError("Las contraseñas nuevas no coinciden.");
    setSaving(true);
    setError(null);
    try {
      await changePassword(current, next);
      toast("Contraseña actualizada.");
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Cambiar contraseña"
      subtitle={`Mínimo ${RULES.minPassword} caracteres`}
      size="sm"
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label="Contraseña actual">
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="Nueva contraseña">
          <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Repite la nueva contraseña">
          <Input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </Field>
        {error && <Alert>{error}</Alert>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
