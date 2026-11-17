import { useState } from "react";
import { ArrowLeft, Bell, BellRing, CalendarDays, LayoutGrid } from "lucide-react";
import AppShell, { type NavItem } from "../components/AppShell";
import { getMyReservations, getNotifications, markNotificationRead, type AppNotification, type Session } from "../api";
import { isActive } from "../lib/format";
import { useLoader } from "../lib/useLoader";
import { usePersistedState } from "../lib/persist";
import { Catalog } from "./student/Catalog";
import { MyReservations } from "./student/MyReservations";
import { NotificationRow, Notifications } from "./student/Notifications";

export type StudentTab = "catalog" | "reservations" | "notifications";
const STUDENT_TABS: readonly StudentTab[] = ["catalog", "reservations", "notifications"];

interface Props {
  session: Session;
  initialTab?: StudentTab;
  onSpaceClick: (id: string) => void;
  onBackToPanel?: () => void;
  onLogout: () => void;
}


const TITLES: Record<StudentTab, string> = {
  catalog: "Catálogo de espacios",
  reservations: "Mis reservas",
  notifications: "Notificaciones",
};

export default function StudentDashboard({ session, initialTab, onSpaceClick, onBackToPanel, onLogout }: Props) {
  const [tab, setTab] = usePersistedState<StudentTab>("student-tab", initialTab ?? "catalog", STUDENT_TABS);
  const [showBell, setShowBell] = useState(false);

  const reservations = useLoader(getMyReservations);
  const notifications = useLoader(getNotifications);

  const activeCount = (reservations.data ?? []).filter(isActive).length;
  const unread = (notifications.data ?? []).filter((n) => !n.read).length;

  const navItems: NavItem[] = [
    { id: "catalog", icon: <LayoutGrid />, label: "Catálogo" },
    { id: "reservations", icon: <CalendarDays />, label: "Mis reservas", badge: activeCount },
    { id: "notifications", icon: <Bell />, label: "Notificaciones", badge: unread },
    ...(onBackToPanel ? [{ id: "back", icon: <ArrowLeft />, label: "Volver a mi panel" }] : []),
  ];

  const selectTab = (id: string) => {
    if (id === "back") return onBackToPanel?.();
    setTab(id as StudentTab);
    if (id === "notifications") notifications.reload(true);
    if (id === "reservations") reservations.reload(true);
  };

  const readOne = async (n: AppNotification) => {
    if (n.read) return;
    notifications.setData((list) => list?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? list);
    try {
      await markNotificationRead(n.id);
    } catch {
      notifications.reload(true);
    }
  };

  const bell = (
    <div className="relative">
      <button
        onClick={() => setShowBell((s) => !s)}
        aria-expanded={showBell}
        aria-haspopup="dialog"
        className="relative w-10 h-10 rounded-xl bg-[#121828] border border-[#1E2A45] flex items-center justify-center text-[#A8B3CF] hover:text-white hover:border-[#4C6EF5]/40 transition-all"
        aria-label={`Notificaciones (${unread} sin leer)`}
      >
        {unread > 0 ? <BellRing className="w-[18px] h-[18px]" /> : <Bell className="w-[18px] h-[18px]" />}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#4C6EF5] rounded-full text-[10px] font-600 text-white flex items-center justify-center">{unread}</span>
        )}
      </button>
      {showBell && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowBell(false)} />
          <div className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] bg-[#121828] border border-[#26324F] rounded-2xl shadow-2xl overflow-hidden animate-pop-in">
            <div className="px-4 py-3 border-b border-[#1E2A45] flex items-center justify-between">
              <p className="font-display font-600 text-white text-sm">Notificaciones</p>
              <span className="text-[11px] text-[#8EA4FF]">{unread} sin leer</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {(notifications.data ?? []).slice(0, 5).map((n) => (
                <NotificationRow key={n.id} n={n} compact onClick={() => readOne(n)} />
              ))}
              {(notifications.data ?? []).length === 0 && <p className="px-4 py-8 text-center text-xs text-[#6C7693]">Aún no tienes notificaciones.</p>}
            </div>
            <button
              onClick={() => { setShowBell(false); selectTab("notifications"); }}
              className="w-full px-4 py-3 border-t border-[#1E2A45] text-xs text-[#8EA4FF] hover:bg-white/5"
            >
              Ver todas
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <AppShell
      session={session}
      items={navItems}
      active={tab}
      onSelect={selectTab}
      onLogout={onLogout}
      title={TITLES[tab]}
      actions={bell}
    >
      {tab === "catalog" && <Catalog onSpaceClick={onSpaceClick} />}
      {tab === "reservations" && (
        <MyReservations
          state={reservations}
          onChanged={() => { reservations.reload(true); notifications.reload(true); }}
          onBrowse={() => setTab("catalog")}
        />
      )}
      {tab === "notifications" && (
        <Notifications state={notifications} onRead={readOne} />
      )}
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------
