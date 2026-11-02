import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, BadgeCheck, CalendarCheck, Eye, EyeOff, Lock, Mail, MailCheck, RefreshCw, ShieldCheck, Timer, UserPlus } from "lucide-react";
import LogoMark from "../components/LogoMark";
import PhoneQr from "../components/PhoneQr";
import {
  ApiError, checkVerification, EMAIL_NOT_VERIFIED, forgotPassword, isInstitutionalEmail, login, register,
  resendVerification, resetPassword, RULES, verifyEmail, type Session,
} from "../api";
import { Alert, Button, Field, Input } from "../components/ui";
import { LEGAL } from "../legal/config";
import { plural, scheduleText } from "../lib/format";

interface Props {
  onLogin: (session: Session) => void;
}

type Mode = "login" | "register" | "forgot" | "reset" | "verify" | "resend";

// Segundos de espera entre un reenvío del enlace de confirmación y el siguiente
const RESEND_WAIT = 60;

const DEMO_ACCOUNTS = [
  { label: "Estudiante", email: "estudiante@bibliospace.local", password: "Demo12345" },
  { label: "Funcionario", email: "funcionario@bibliospace.local", password: "Demo12345" },
  { label: "Administrador", email: "admin@bibliospace.local", password: "Admin12345" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ onLogin }: Props) {
  // El enlace del correo de recuperación trae el token en la dirección: /?reset=TOKEN
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get("reset") ?? "");
  // El enlace del correo de confirmación trae el token así: /?verificar=TOKEN
  const [verifyToken] = useState(() => new URLSearchParams(window.location.search).get("verificar") ?? "");
  const [mode, setMode] = useState<Mode>(verifyToken ? "verify" : resetToken ? "reset" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // Correo al que se envió el enlace de confirmación (muestra la pantalla "Revisa tu correo")
  const [verificationSent, setVerificationSent] = useState<string | null>(null);
  // El login respondió que la cuenta aún no confirma su correo
  const [unverified, setUnverified] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [verifyInfo, setVerifyInfo] = useState<{ email: string; nombre: string } | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Al abrir el enlace se revisa de una vez si sigue vigente
  useEffect(() => {
    if (!verifyToken) return;
    checkVerification(verifyToken)
      .then(setVerifyInfo)
      .catch((e) => setVerifyError(e instanceof Error ? e.message : "El enlace no es válido o ya venció."));
  }, [verifyToken]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const resend = async (to: string) => {
    setResending(true);
    setError(null);
    try {
      await resendVerification(to);
      setUnverified(null);
      setVerificationSent(to);
      setCooldown(RESEND_WAIT);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el enlace.");
    } finally {
      setResending(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setSent(false);
    setVerificationSent(null);
    setUnverified(null);
    setPassword("");
    setRepeat("");
    // Al salir de la pantalla del enlace se quita el token de la dirección
    if (/[?&](reset|verificar)=/.test(window.location.search)) window.history.replaceState({}, "", window.location.pathname);
  };

  const validate = (): string | null => {
    if (mode === "register" && !name.trim()) return "Escribe tu nombre completo.";
    if (mode !== "reset" && mode !== "verify" && !EMAIL_RE.test(email.trim())) return "Escribe un email válido.";
    if (mode === "forgot" || mode === "resend") return null;
    if (!password) return mode === "reset" ? "Escribe tu contraseña nueva." : "Escribe tu contraseña.";
    if (mode === "register" || mode === "reset") {
      if (password.length < RULES.minPassword) return `La contraseña debe tener al menos ${RULES.minPassword} caracteres.`;
      if (password !== repeat) return "Las contraseñas no coinciden.";
    }
    if (mode === "register" && !accepted) {
      return "Para crear tu cuenta debes aceptar los Términos de uso y autorizar el tratamiento de tus datos personales.";
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
    setUnverified(null);
    try {
      if (mode === "resend") {
        await resend(email.trim());
        setLoading(false);
        return;
      }
      if (mode === "verify") {
        const session = await verifyEmail(verifyToken, password);
        window.history.replaceState({}, "", window.location.pathname);
        onLogin(session);
        return;
      }
      if (mode === "register") {
        await register(name.trim(), email.trim(), password, LEGAL.version);
        setPassword("");
        setRepeat("");
        setVerificationSent(email.trim());
        setCooldown(RESEND_WAIT);
        setLoading(false);
        return;
      }
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
      onLogin(await login(email.trim(), password));
    } catch (err) {
      if (err instanceof ApiError && err.code === EMAIL_NOT_VERIFIED) setUnverified(email.trim());
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
            <LogoMark className="w-7 h-7" />
          </div>
          <span className="font-display font-700 text-white text-xl tracking-tight">Espacia</span>
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
              { icon: <Timer className="w-5 h-5" />, title: "Reserva en segundos", text: `Bloques de hasta ${plural(RULES.maxHours, "hora", "horas")}, de ${scheduleText()}.` },
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

        <div className="relative z-10 flex items-end justify-between gap-6">
          <p className="text-[#59617A] text-xs">Sistema de Gestión Bibliotecaria</p>
          <PhoneQr />
        </div>
      </div>

      {/* Formulario */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4C6EF5] to-[#6C8BFF] flex items-center justify-center">
              <LogoMark className="w-6 h-6" />
            </div>
            <span className="font-display font-700 text-white text-lg">Espacia</span>
          </div>

          {(mode !== "login" && mode !== "register") && !verificationSent && (
            <button onClick={() => switchMode("login")} className="flex items-center gap-2 text-[#8A93AD] hover:text-white text-sm mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
          )}

          {verificationSent ? (
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#20C997]/12 text-[#38D9A9] flex items-center justify-center mb-5">
                <MailCheck className="w-6 h-6" />
              </div>
              <h2 className="font-display text-3xl font-700 text-white mb-2">Revisa tu correo</h2>
              <p className="text-[#8A93AD] text-sm mb-6 leading-relaxed">
                Te enviamos un enlace a <span className="text-white break-all">{verificationSent}</span> para confirmar que es tuyo.
                Ábrelo y escribe la contraseña que elegiste para activar tu cuenta. Vence en 24 horas.
              </p>
              <Alert tone="info">
                ¿No llega? Revisa la carpeta de spam o promociones. Si escribiste mal el correo, vuelve y regístrate de nuevo.
              </Alert>
              {error && <div className="mt-4"><Alert>{error}</Alert></div>}
              <Button
                variant="secondary"
                className="w-full mt-6"
                size="lg"
                icon={<RefreshCw className="w-4 h-4" />}
                loading={resending}
                disabled={cooldown > 0}
                onClick={() => resend(verificationSent)}
              >
                {cooldown > 0 ? `Reenviar enlace (${cooldown} s)` : "Reenviar enlace"}
              </Button>
              <Button className="w-full mt-3" size="lg" onClick={() => switchMode("login")}>Volver a iniciar sesión</Button>
            </div>
          ) : mode === "verify" && verifyError ? (
            <div>
              <h2 className="font-display text-3xl font-700 text-white mb-2">Enlace vencido</h2>
              <p className="text-[#8A93AD] text-sm mb-6 leading-relaxed">{verifyError}</p>
              <Button className="w-full" size="lg" onClick={() => switchMode("resend")}>Pedir un enlace nuevo</Button>
            </div>
          ) : mode === "forgot" && sent ? (
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
                {{ login: "Iniciar sesión", register: "Crear cuenta", forgot: "Recuperar acceso", reset: "Nueva contraseña", verify: "Confirma tu correo", resend: "Confirmar correo" }[mode]}
              </h2>
              <p className="text-[#8A93AD] text-sm mb-8">
                {{
                  login: "Bienvenido/a de vuelta.",
                  register: "Regístrate para reservar espacios y equipos.",
                  forgot: "Escribe tu email y te enviaremos un enlace para crear una contraseña nueva.",
                  reset: "Elige la contraseña nueva para tu cuenta.",
                  verify: verifyInfo
                    ? `Hola, ${verifyInfo.nombre}. Escribe la contraseña que elegiste al registrarte para activar ${verifyInfo.email}.`
                    : "Comprobando el enlace...",
                  resend: "Escribe el correo con el que te registraste y te enviaremos un enlace nuevo para activar tu cuenta.",
                }[mode]}
              </p>

              {notice && <div className="mb-5"><Alert tone="success">{notice}</Alert></div>}

              <div className="space-y-4">
                {mode === "register" && (
                  <Field label="Nombre completo">
                    <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: María García" autoFocus />
                  </Field>
                )}
                {mode !== "reset" && mode !== "verify" && (
                  <Field
                    label="Email"
                    hint={mode === "register" && isInstitutionalEmail(email) ? (
                      <span className="inline-flex items-center gap-1 text-[#38D9A9]"><BadgeCheck className="w-3.5 h-3.5" /> Correo institucional</span>
                    ) : undefined}
                  >
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#59617A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <Input
                        type="email"
                        autoComplete="email"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="usuario@universidad.edu"
                        autoFocus={mode === "login" || mode === "forgot" || mode === "resend"}
                      />
                    </div>
                  </Field>
                )}
                {mode !== "forgot" && mode !== "resend" && (
                  <Field
                    label={mode === "reset" ? "Contraseña nueva" : "Contraseña"}
                    hint={mode === "register" || mode === "reset" ? `Mínimo ${RULES.minPassword} caracteres.` : undefined}
                  >
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#59617A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "login" || mode === "verify" ? "current-password" : "new-password"}
                        className="pl-10 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoFocus={mode === "reset" || mode === "verify"}
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

              {mode === "register" && (
                <label className="flex items-start gap-3 mt-5 text-xs text-[#A8B3CF] leading-relaxed cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#4C6EF5] cursor-pointer"
                  />
                  <span>
                    Acepto los{" "}
                    <a href="/?doc=terminos" target="_blank" rel="noopener noreferrer" className="text-[#8EA4FF] hover:text-white hover:underline underline-offset-2">Términos de uso</a>{" "}
                    y autorizo el tratamiento de mis datos personales según la{" "}
                    <a href="/?doc=privacidad" target="_blank" rel="noopener noreferrer" className="text-[#8EA4FF] hover:text-white hover:underline underline-offset-2">Política de privacidad</a>.
                  </span>
                </label>
              )}

              {mode === "login" && (
                <div className="flex justify-end mt-3">
                  <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-[#8EA4FF] hover:text-white transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              {error && <div className="mt-5"><Alert>{error}</Alert></div>}
              {unverified && mode === "login" && (
                <Button
                  variant="secondary"
                  className="w-full mt-3"
                  icon={<RefreshCw className="w-4 h-4" />}
                  loading={resending}
                  onClick={() => resend(unverified)}
                >
                  Reenviar enlace de confirmación
                </Button>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full mt-6"
                loading={loading}
                disabled={mode === "verify" && !verifyInfo}
                icon={mode === "register" ? <UserPlus className="w-4 h-4" /> : undefined}
              >
                {loading
                  ? { login: "Verificando...", register: "Creando cuenta...", forgot: "Enviando...", reset: "Guardando...", verify: "Activando...", resend: "Enviando..." }[mode]
                  : { login: "Ingresar", register: "Crear cuenta", forgot: "Enviar enlace", reset: "Cambiar contraseña", verify: "Activar mi cuenta", resend: "Enviar enlace" }[mode]}
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

              <p className="text-center text-xs text-[#6C7693] mt-6">
                <a href="/?doc=privacidad" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Política de privacidad</a>
                <span className="mx-2" aria-hidden="true">·</span>
                <a href="/?doc=terminos" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Términos de uso</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
