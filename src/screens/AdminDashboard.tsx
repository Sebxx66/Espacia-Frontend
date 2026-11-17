import { useState } from "react";
import {
  Building2, CalendarDays, CalendarPlus, ChartColumn, LayoutGrid, Plus, History, QrCode, Settings, Users, Wrench,
} from "lucide-react";
import AppShell, { type NavItem } from "../components/AppShell";
import { IncidentsPanel } from "../components/staff";
import { Button } from "../components/ui";
import { getDashboard, getSpaces, type Session, type Space } from "../api";
import RulesSettings from "../components/RulesSettings";
import AuditLog from "../components/AuditLog";
import ShareApp from "../components/ShareApp";
import { useLoader } from "../lib/useLoader";
import { usePersistedState } from "../lib/persist";
import { Overview } from "./admin/Overview";
import { ReservationsAdmin } from "./admin/ReservationsAdmin";
import { SpaceFormModal } from "./admin/SpaceFormModal";
import { SpacesAdmin } from "./admin/SpacesAdmin";
import { TypesAdmin } from "./admin/TypesAdmin";
import { UsersAdmin } from "./admin/UsersAdmin";

interface Props {
  session: Session;
  onLogout: () => void;
  onOpenCatalog: () => void;
}

type Tab = "overview" | "spaces" | "reservations" | "users" | "support" | "types" | "settings" | "audit" | "share";
const TABS: readonly Tab[] = ["overview", "spaces", "reservations", "users", "support", "types", "settings", "audit", "share"];

const TITLES: Record<Tab, string> = {
  overview: "Dashboard",
  spaces: "Espacios",
  reservations: "Reservas",
  users: "Usuarios",
  support: "Soporte técnico",
  types: "Tipos de espacio",
  settings: "Configuración",
  audit: "Registro de auditoría",
  share: "Compartir la aplicación",
};

export default function AdminDashboard({ session, onLogout, onOpenCatalog }: Props) {
  const [tab, setTab] = usePersistedState<Tab>("admin-tab", "overview", TABS);
  const [spaceForm, setSpaceForm] = useState<{ space?: Space; type?: string } | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const spaces = useLoader(getSpaces);
  const dashboard = useLoader(getDashboard);

  const navItems: NavItem[] = [
    { id: "overview", icon: <ChartColumn />, label: "Dashboard" },
    { id: "spaces", icon: <Building2 />, label: "Espacios" },
    { id: "reservations", icon: <CalendarDays />, label: "Reservas" },
    { id: "users", icon: <Users />, label: "Usuarios" },
    { id: "support", icon: <Wrench />, label: "Soporte técnico", badge: dashboard.data?.openIncidents },
    { id: "types", icon: <LayoutGrid />, label: "Tipos de espacio" },
    { id: "settings", icon: <Settings />, label: "Configuración" },
    { id: "audit", icon: <History />, label: "Auditoría" },
    { id: "share", icon: <QrCode />, label: "Compartir app" },
    { id: "catalog", icon: <CalendarPlus />, label: "Reservar un espacio" },
  ];

  const select = (id: string) => {
    if (id === "catalog") return onOpenCatalog();
    setTab(id as Tab);
    if (id === "overview") dashboard.reload(true);
    if (id === "spaces" || id === "types") spaces.reload(true);
  };

  const spacesChanged = () => {
    spaces.reload(true);
    dashboard.reload(true);
  };

  return (
    <AppShell
      session={session}
      items={navItems}
      active={tab}
      onSelect={select}
      onLogout={onLogout}
      title={TITLES[tab]}
      actions={(tab === "overview" || tab === "spaces" || tab === "types") && (
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setSpaceForm({})}>
          <span className="hidden sm:inline">Nuevo espacio</span>
        </Button>
      )}
    >
      {tab === "overview" && <Overview state={dashboard} />}
      {tab === "spaces" && (
        <SpacesAdmin
          state={spaces}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          onEdit={(space) => setSpaceForm({ space })}
          onChanged={spacesChanged}
        />
      )}
      {tab === "reservations" && <ReservationsAdmin />}
      {tab === "settings" && <RulesSettings />}
      {tab === "audit" && <AuditLog />}
      {tab === "share" && <ShareApp />}
      {tab === "users" && <UsersAdmin session={session} />}
      {tab === "support" && <div className="max-w-4xl"><IncidentsPanel onChanged={spacesChanged} /></div>}
      {tab === "types" && (
        <TypesAdmin
          state={spaces}
          onShow={(type) => { setTypeFilter(type); setTab("spaces"); }}
          onAdd={(type) => setSpaceForm({ type })}
        />
      )}

      <SpaceFormModal
        open={!!spaceForm}
        space={spaceForm?.space}
        presetType={spaceForm?.type}
        existingTypes={Array.from(new Set((spaces.data ?? []).map((s) => s.type)))}
        onClose={() => setSpaceForm(null)}
        onSaved={() => { setSpaceForm(null); spacesChanged(); }}
      />
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
