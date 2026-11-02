import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from "react";
import { CircleCheck, CircleX, Inbox, Info, LoaderCircle, RefreshCw, TriangleAlert, X } from "lucide-react";
import type { Reservation } from "../api";
import { reservationStatusInfo, TONE_CLASSES } from "../lib/format";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

// ---------------------------------------------------------------------------
// Botones y formularios
// ---------------------------------------------------------------------------

type Variant = "primary" | "secondary" | "danger" | "success" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[#4C6EF5] text-white hover:bg-[#5C7CFA] shadow-lg shadow-[#4C6EF5]/20",
  secondary: "bg-[#1A2035] text-[#C9D1E6] border border-[#26324F] hover:border-[#4C6EF5]/50 hover:text-white",
  danger: "bg-rose-500/10 text-rose-300 border border-rose-400/25 hover:bg-rose-500/20",
  success: "bg-[#20C997] text-[#06281D] hover:bg-[#2FD9A7] shadow-lg shadow-[#20C997]/20",
  ghost: "text-[#8A93AD] hover:text-white hover:bg-white/5",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-display font-600 transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4C6EF5]/60",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3.5 text-sm",
        VARIANTS[variant],
        className,
      )}
    >
      {loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

const fieldClasses =
  "w-full bg-[#0F1424] border border-[#222C47] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#59617A] " +
  "focus:outline-none focus:border-[#4C6EF5] focus:ring-2 focus:ring-[#4C6EF5]/25 transition-all disabled:opacity-60";

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-500 text-[#A8B3CF] mb-1.5">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="block text-xs text-rose-300 mt-1.5">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-[#6C7693] mt-1.5">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...rest} className={cx(fieldClasses, className)} />
);

export const Select = ({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...rest} className={cx(fieldClasses, "appearance-none cursor-pointer", className)} />
);

export const Textarea = ({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...rest} className={cx(fieldClasses, "resize-none", className)} />
);

export function Alert({ tone = "error", children }: { tone?: "error" | "info" | "success"; children: ReactNode }) {
  const styles = {
    error: "bg-rose-500/10 border-rose-400/25 text-rose-200",
    info: "bg-[#4C6EF5]/10 border-[#4C6EF5]/25 text-[#C5D0FF]",
    success: "bg-[#20C997]/10 border-[#20C997]/25 text-[#9FF0D2]",
  }[tone];
  const Icon = tone === "error" ? TriangleAlert : tone === "success" ? CircleCheck : Info;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("flex items-start gap-2.5 border rounded-xl px-3.5 py-3 text-xs leading-relaxed", styles)}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-px" />
      <div>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contenedores y estados
// ---------------------------------------------------------------------------

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cx("bg-[#121828] border border-[#1E2A45] rounded-2xl", className)}>{children}</div>
);

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h2 className="font-display font-700 text-white text-base">{title}</h2>
        {subtitle && <p className="text-[#6C7693] text-xs mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Loading({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="py-16 flex items-center justify-center gap-3 text-[#6C7693] text-sm">
      <LoaderCircle className="w-5 h-5 animate-spin text-[#4C6EF5]" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="py-14 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
        <TriangleAlert className="w-6 h-6 text-rose-300" />
      </div>
      <p className="text-rose-200 text-sm max-w-sm">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={onRetry}>Reintentar</Button>}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="py-14 flex flex-col items-center text-center gap-2">
      <div className="w-12 h-12 rounded-2xl bg-[#1A2035] flex items-center justify-center text-[#6C7693] mb-1">
        {icon ?? <Inbox className="w-6 h-6" />}
      </div>
      <p className="font-display font-600 text-white">{title}</p>
      {text && <p className="text-sm text-[#6C7693] max-w-sm">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Pill({ tone, children }: { tone: keyof typeof TONE_CLASSES; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-500 border whitespace-nowrap", TONE_CLASSES[tone])}>
      {children}
    </span>
  );
}

export function ReservationBadge({ reservation }: { reservation: Pick<Reservation, "status" | "expired"> }) {
  const info = reservationStatusInfo(reservation);
  return <Pill tone={info.tone}>{info.label}</Pill>;
}

export function Stat({ icon, label, value, hint, accent = "#4C6EF5" }: { icon: ReactNode; label: string; value: ReactNode; hint?: string; accent?: string }) {
  return (
    <Card className="p-5">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}1F`, color: accent }}>
        {icon}
      </div>
      <p className="font-display font-800 text-white text-2xl mt-4 leading-none">{value}</p>
      <p className="text-[#8A93AD] text-xs mt-1.5">{label}</p>
      {hint && <p className="text-[#59617A] text-[11px] mt-0.5">{hint}</p>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({ open, title, subtitle, onClose, children, footer, size = "md" }: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // onClose cambia en cada render del padre: se guarda en una ref para no reiniciar el foco
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Accesibilidad: Escape cierra, el foco entra al diálogo, Tab no se sale de él y al cerrar vuelve a donde estaba
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    const first = focusables().find((el) => el.tagName !== "BUTTON" || !el.closest("[data-modal-close]"));
    (first ?? dialogRef.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeRef.current();
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          "relative w-full bg-[#121828] border border-[#26324F] shadow-2xl animate-pop-in focus:outline-none",
          "rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[#1E2A45]">
          <div>
            <h3 id={titleId} className="font-display font-700 text-white text-lg">{title}</h3>
            {subtitle && <p className="text-[#6C7693] text-xs mt-0.5">{subtitle}</p>}
          </div>
          <button data-modal-close onClick={onClose} className="p-1.5 -mr-1.5 rounded-lg text-[#6C7693] hover:text-white hover:bg-white/5 transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-[#1E2A45] flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toasts y confirmaciones (disponibles en toda la app con useUi)
// ---------------------------------------------------------------------------

interface Toast {
  id: number;
  tone: "success" | "error" | "info";
  message: string;
}

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

interface UiContextValue {
  toast: (message: string, tone?: Toast["tone"]) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UiContext = createContext<UiContextValue | null>(null);

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi debe usarse dentro de UiProvider");
  return ctx;
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const nextId = useRef(1);

  const toast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3500);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const closeConfirm = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setConfirmState(null);
  };

  return (
    <UiContext.Provider value={{ toast, confirm }}>
      {children}

      <Modal
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        size="sm"
        onClose={() => closeConfirm(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => closeConfirm(false)}>Volver</Button>
            <Button variant={confirmState?.danger ? "danger" : "primary"} onClick={() => closeConfirm(true)}>
              {confirmState?.confirmLabel ?? "Confirmar"}
            </Button>
          </>
        }
      >
        <div className="text-sm text-[#A8B3CF] leading-relaxed">{confirmState?.message}</div>
      </Modal>

      <div className="fixed z-[60] bottom-4 right-4 left-4 sm:left-auto flex flex-col gap-2 sm:w-96 pointer-events-none" aria-live="polite">
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CircleCheck : t.tone === "error" ? CircleX : Info;
          return (
            <div
              key={t.id}
              className={cx(
                "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur animate-slide-up text-sm",
                t.tone === "success" && "bg-[#0F2A24]/95 border-[#20C997]/30 text-[#B7F5DE]",
                t.tone === "error" && "bg-[#2A1219]/95 border-rose-400/30 text-rose-100",
                t.tone === "info" && "bg-[#141C36]/95 border-[#4C6EF5]/30 text-[#D5DDFF]",
              )}
            >
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="flex-1 leading-snug">{t.message}</p>
              <button onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))} className="opacity-60 hover:opacity-100" aria-label="Cerrar">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </UiContext.Provider>
  );
}

// Ejecuta una acción mostrando un toast de éxito o de error
export function useAction() {
  const { toast } = useUi();
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(async (key: string, action: () => Promise<unknown>, success?: string) => {
    setBusy(key);
    try {
      await action();
      if (success) toast(success, "success");
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo completar la acción.", "error");
      return false;
    } finally {
      setBusy(null);
    }
  }, [toast]);
  return { busy, run };
}
