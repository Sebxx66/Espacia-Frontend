import { useState, type FormEvent } from "react";
import { ArrowLeft, CalendarCheck, Eye, EyeOff, LibraryBig, Lock, Mail, ShieldCheck, Timer, UserPlus } from "lucide-react";
import { forgotPassword, login, register, resetPassword, RULES, type Session } from "../api";
import { Alert, Button, Field, Input } from "../components/ui";

interface Props {
  onLogin: (session: Session) => void;
}

type Mode = "login" | "register" | "forgot" | "reset";

const DEMO_ACCOUNTS = [
  { label: "Estudiante", email: "estudiante@bibliospace.local", password: "Demo12345" },
  { label: "Funcionario", email: "funcionario@bibliospace.local", password: "Demo12345" },
  { label: "Administrador", email: "admin@bibliospace.local", password: "Admin12345" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ onLogin }: Props) {
  // El enlace del correo de recuperación trae el token en la dirección: /?reset=TOKEN
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get("reset") ?? "");
  const [mode, setMode] = useState<Mode>(resetToken ? "reset" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setSent(false);
    setPassword("");
    setRepeat("");
    // Al salir de la pantalla de contraseña nueva se quita el token de la dirección
    if (window.location.search.includes("reset=")) window.history.replaceState({}, "", window.location.pathname);
  };

  const validate = (): string | null => {
    if (mode === "register" && !name.trim()) return "Escribe tu nombre completo.";
    if (mode !== "reset" && !EMAIL_RE.test(email.trim())) return "Escribe un email válido.";
    if (mode === "forgot") return null;
    if (!password) return mode === "reset" ? "Escribe tu contraseña nueva." : "Escribe tu contraseña.";
    if (mode === "register" || mode === "reset") {
      if (password.length < RULES.minPassword) return `La contraseña debe tener al menos ${RULES.minPassword} caracteres.`;
      if (password !== repeat) return "Las contraseñas no coinciden.";
    }
    return null;
  };

  // El rol no se elige: lo devuelve el backend junto con el token
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);
    setLoading(true);
    setError(null);
    try {
      if (mode === "forgot") {
        await forgotPassword(email.trim());
        setSent(true);
        setLoading(false);
        return;
      }
      if (mode === "reset") {
        await resetPassword(resetToken, password);
        switchMode("login");
        setNotice("Contraseña actualizada. Ya puedes iniciar sesión con la nueva.");
        setLoading(false);
        return;
      }
      const session = mode === "register"
        ? await register(name.trim(), email.trim(), password)
        : await login(email.trim(), password);
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
      setLoading(false);
    }
  };

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((s) => !s)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6C7693] hover:text-white"
      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-[#0B0F1A]">
      {/* Panel informativo (escritorio) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 xl:w-3/5 bg-gradient-to-br from-[#0E1322] via-[#131D3A] to-[#0B1221] p-12 xl:p-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#4C6EF5]/15 rounded-full blur-3xl -translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-[#20C997]/10 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#4C6EF5] to-[#6C8BFF] flex items-center justify-center shadow-xl shadow-[#4C6EF5]/30">
            <LibraryBig className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-700 text-white text-xl tracking-tight">BiblioSpace</span>
        </div>

        <div className="relative z-10 space-y-10 max-w-xl">
          <div>
            <h1 className="font-display text-5xl xl:text-6xl font-800 text-white leading-[1.05] tracking-tight">
              Reserva tu espacio<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#748FFC] to-[#20C997]">sin filas.</span>
            </h1>
            <p className="mt-5 text-[#A8B3CF] text-lg leading-relaxed">
              Salas de estudio, equipos y talleres de la biblioteca, disponibles en tiempo real desde cualquier dispositivo.
            </p>
          </div>

          <ul className="space-y-4">
            {[
              { icon: <CalendarCheck className="w-5 h-5" />, title: "Disponibilidad real", text: "Ves qué horarios están libres antes de reservar." },
              { icon: <Timer className="w-5 h-5" />, title: "Reserva en segundos", text: `Bloques de hasta ${RULES.maxHours} horas, de ${RULES.openHour}:00 a ${RULES.closeHour}:00.` },
              { icon: <Mail className="w-5 h-5" />, title: "Avisos por correo", text: "Confirmación al reservar y un recordatorio antes de que empiece." },
              { icon: <ShieldCheck className="w-5 h-5" />, title: "Acceso por rol", text: "Estudiantes, funcionarios y administradores con su propio panel." },
            ].map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8EA4FF] flex-shrink-0">{f.icon}</div>
                <div>
                  <p className="text-white font-display font-600">{f.title}</p>
                  <p className="text-[#8A93AD] text-sm">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[#59617A] text-xs">Sistema de Gestión Bibliotecaria</p>
      </div>

      {/* Formulario */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4C6EF5] to-[#6C8BFF] flex items-center justify-center">
              <LibraryBig className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-700 text-white text-lg">BiblioSpace</span>
          </div>

          {(mode === "forgot" || mode === "reset") && (
            <button onClick={() => switchMode("login")} className="flex items-center gap-2 text-[#8A93AD] hover:text-white text-sm mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
          )}

          {mode === "forgot" && sent ? (
            <div>
              <h2 className="font-display text-3xl font-700 text-white mb-2">Revisa tu correo</h2>
              <p className="text-[#8A93AD] text-sm mb-6 leading-relaxed">
                Si <span className="text-white">{email.trim()}</span> está registrado, te enviamos un enlace para crear una contraseña nueva.
                Vence en 60 minutos y solo se puede usar una vez.
              </p>
              <Alert tone="info">
                ¿No llega nada? Revisa la carpeta de spam. Si el correo no aparece, el personal de la biblioteca también
                puede asignarte una contraseña temporal desde el panel de usuarios.
              </Alert>
              <Button className="w-full mt-6" size="lg" onClick={() => switchMode("login")}>Volver a iniciar sesión</Button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h2 className="font-display text-3xl font-700 text-white mb-2">
                {{ login: "Iniciar sesión", register: "Crear cuenta", forgot: "Recuperar acceso", reset: "Nueva contraseña" }[mode]}
              </h2>
              <p className="text-[#8A93AD] text-sm mb-8">
                {{
                  login: "Bienvenido/a de vuelta.",
                  register: "Regístrate para reservar espacios y equipos.",
                  forgot: "Escribe tu email y te enviaremos un enlace para crear una contraseña nueva.",
                  reset: "Elige la contraseña nueva para tu cuenta.",
                }[mode]}
              </p>

              {notice && <div className="mb-5"><Alert tone="success">{notice}</Alert></div>}

              <div className="space-y-4">
                {mode === "register" && (
                  <Field label="Nombre completo">
                    <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: María García" autoFocus />
                  </Field>
                )}
                {mode !== "reset" && (
                  <Field label="Email">
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#59617A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <Input
                        type="email"
                        autoComplete="email"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="usuario@universidad.edu"
                        autoFocus={mode === "login" || mode === "forgot"}
                      />
                    </div>
                  </Field>
                )}
                {mode !== "forgot" && (
                  <Field
                    label={mode === "reset" ? "Contraseña nueva" : "Contraseña"}
                    hint={mode === "register" || mode === "reset" ? `Mínimo ${RULES.minPassword} caracteres.` : undefined}
                  >
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#59617A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        className="pl-10 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoFocus={mode === "reset"}
                      />
                      {passwordToggle}
                    </div>
                    {(mode === "register" || mode === "reset") && password.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-[#1A2035] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${password.length >= RULES.minPassword ? "bg-[#20C997]" : "bg-amber-400"}`}
                            style={{ width: `${Math.min(100, (password.length / RULES.minPassword) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-[#6C7693] tabular-nums">{password.length}/{RULES.minPassword}</span>
                      </div>
                    )}
                  </Field>
                )}
                {(mode === "register" || mode === "reset") && (
                  <Field label="Confirmar contraseña">
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={repeat}
                      onChange={(e) => setRepeat(e.target.value)}
                      placeholder="••••••••"
                    />
                  </Field>
                )}
              </div>

              {mode === "login" && (
                <div className="flex justify-end mt-3">
                  <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-[#8EA4FF] hover:text-white transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              {error && <div className="mt-5"><Alert>{error}</Alert></div>}

              <Button
                type="submit"
                size="lg"
                className="w-full mt-6"
                loading={loading}
                icon={mode === "register" ? <UserPlus className="w-4 h-4" /> : undefined}
              >
                {loading
                  ? { login: "Verificando...", register: "Creando cuenta...", forgot: "Enviando...", reset: "Guardando..." }[mode]
                  : { login: "Ingresar", register: "Crear cuenta", forgot: "Enviar enlace", reset: "Cambiar contraseña" }[mode]}
              </Button>

              {/* Solo en modo desarrollo (npm run dev): atajos para la demostración */}
              {mode === "login" && import.meta.env.DEV && (
                <div className="mt-8 rounded-xl border border-dashed border-[#2A3555] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-[#6C7693] mb-2">Accesos de demostración</p>
                  <div className="flex flex-wrap gap-2">
                    {DEMO_ACCOUNTS.map((d) => (
                      <button
                        key={d.label}
                        type="button"
                        onClick={() => { setEmail(d.email); setPassword(d.password); setError(null); }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#C3CCE6] hover:bg-[#4C6EF5]/15 hover:text-white transition-colors"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(mode === "login" || mode === "register") && (
                <p className="text-center text-sm text-[#8A93AD] mt-8">
                  {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === "login" ? "register" : "login")}
                    className="text-[#8EA4FF] hover:text-white font-500 transition-colors"
                  >
                    {mode === "login" ? "Regístrate" : "Inicia sesión"}
                  </button>
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
