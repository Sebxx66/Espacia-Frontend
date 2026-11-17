import { type ReactNode } from "react";
import { Bell, CalendarX, CheckCheck, CircleCheck, Timer, Undo2, UserX } from "lucide-react";
import { Button, Card, cx, EmptyState, ErrorState, Loading, SectionTitle, useAction } from "../../components/ui";
import { markAllNotificationsRead, type AppNotification } from "../../api";
import { timeAgo } from "../../lib/format";
import { useLoader } from "../../lib/useLoader";

const NOTIF_ICON: Record<string, ReactNode> = {
  CONFIRMACION: <CircleCheck className="w-4 h-4 text-emerald-300" />,
  CANCELACION: <CalendarX className="w-4 h-4 text-rose-300" />,
  RECHAZADA: <CalendarX className="w-4 h-4 text-rose-300" />,
  NO_ASISTIDA: <UserX className="w-4 h-4 text-rose-300" />,
  CHECK_IN: <CheckCheck className="w-4 h-4 text-[#8EA4FF]" />,
  FINALIZADA: <Undo2 className="w-4 h-4 text-[#8A93AD]" />,
  EXTENSION: <Timer className="w-4 h-4 text-amber-300" />,
};

export function NotificationRow({ n, compact, onClick }: { n: AppNotification; compact?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "w-full text-left flex items-start gap-3 transition-colors hover:bg-white/[0.04]",
        compact ? "px-4 py-3 border-b border-[#1E2A45] last:border-0" : "px-5 py-4",
        !n.read && "bg-[#4C6EF5]/[0.06]",
      )}
    >
      <span className={cx("rounded-xl flex items-center justify-center flex-shrink-0", compact ? "w-8 h-8 bg-[#1A2035]" : "w-10 h-10 bg-[#1A2035]")}>
        {NOTIF_ICON[n.type] ?? <Bell className="w-4 h-4 text-[#8A93AD]" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className={cx("block text-white leading-relaxed", compact ? "text-xs" : "text-sm")}>{n.message}</span>
        <span className="block text-[#6C7693] text-[11px] mt-1">{timeAgo(n.createdAt)}</span>
      </span>
      {!n.read && <span className="w-2 h-2 rounded-full bg-[#4C6EF5] flex-shrink-0 mt-2" aria-label="Sin leer" />}
    </button>
  );
}

export function Notifications({ state, onRead }: {
  state: ReturnType<typeof useLoader<AppNotification[]>>;
  onRead: (n: AppNotification) => void;
}) {
  const { busy, run } = useAction();
  const list = state.data ?? [];
  const unread = list.filter((n) => !n.read).length;

  const readAll = async () => {
    if (await run("all", markAllNotificationsRead, "Todas las notificaciones quedaron como leídas.")) {
      state.setData((l) => l?.map((n) => ({ ...n, read: true })) ?? l);
    }
  };

  if (state.loading) return <Loading label="Cargando notificaciones..." />;
  if (state.error) return <ErrorState message={state.error} onRetry={() => state.reload()} />;

  return (
    <div className="max-w-3xl">
      <SectionTitle
        title="Centro de notificaciones"
        subtitle={unread ? `${unread} sin leer` : "Estás al día"}
        action={<Button size="sm" variant="secondary" icon={<CheckCheck className="w-4 h-4" />} disabled={!unread} loading={busy === "all"} onClick={readAll}>Marcar todo como leído</Button>}
      />
      {list.length === 0 ? (
        <Card><EmptyState icon={<Bell className="w-6 h-6" />} title="Sin notificaciones" text="Aquí verás las confirmaciones, cancelaciones y avisos de tus reservas." /></Card>
      ) : (
        <Card className="divide-y divide-[#1E2A45] overflow-hidden">
          {list.map((n) => <NotificationRow key={n.id} n={n} onClick={() => onRead(n)} />)}
        </Card>
      )}
    </div>
  );
}
