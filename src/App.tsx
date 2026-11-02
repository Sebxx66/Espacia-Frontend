import { useEffect, useState } from "react";
import LoginScreen from "./screens/LoginScreen";
import StudentDashboard, { type StudentTab } from "./screens/StudentDashboard";
import AdminDashboard from "./screens/AdminDashboard";
import SpaceDetail from "./screens/SpaceDetail";
import FunctionalDashboard from "./screens/FunctionalDashboard";
import { UiProvider } from "./components/ui";
import ErrorBoundary from "./components/ErrorBoundary";
import LegalScreen, { type LegalKey } from "./screens/LegalScreen";
import { clearSession, loadSession, setUnauthorizedHandler, type Role, type Session } from "./api";
import { clearPersisted, readPersisted, writePersisted } from "./lib/persist";

export type { Role };
export type Screen =
  | "login"
  | "student-home"
  | "space-detail"
  | "admin-dashboard"
  | "staff-dashboard";

export interface NavState {
  screen: Screen;
  spaceId?: string;
  tab?: StudentTab;
}

const HOME: Record<Role, Screen> = {
  student: "student-home",
  admin: "admin-dashboard",
  staff: "staff-dashboard",
};

// Pantallas a las que puede volver cada rol al recargar la página
const ALLOWED: Record<Role, Screen[]> = {
  student: ["student-home", "space-detail"],
  admin: ["admin-dashboard", "student-home", "space-detail"],
  staff: ["staff-dashboard", "student-home", "space-detail"],
};

const APP_TITLE = "Espacia · Reserva de espacios y recursos";

// /?doc=privacidad o /?doc=terminos abre el documento legal, con o sin sesión
function readLegalDoc(): LegalKey | null {
  const doc = new URLSearchParams(window.location.search).get("doc");
  return doc === "privacidad" || doc === "terminos" ? doc : null;
}

function restoreNav(session: Session | null): NavState {
  if (!session) return { screen: "login" };
  const saved = readPersisted<NavState>("screen");
  if (saved && ALLOWED[session.role].includes(saved.screen) && (saved.screen !== "space-detail" || saved.spaceId)) {
    return { screen: saved.screen, spaceId: saved.spaceId };
  }
  return { screen: HOME[session.role] };
}

export default function App() {
  return (
    <ErrorBoundary>
      <UiProvider>
        <Router />
      </UiProvider>
    </ErrorBoundary>
  );
}

function Router() {
  // Si hay un token guardado y vigente, se entra directo a la pantalla del rol
  const [session, setSession] = useState<Session | null>(() => loadSession());
  // Al recargar se vuelve a la última pantalla abierta (si la sesión sigue vigente)
  const [nav, setNav] = useState<NavState>(() => restoreNav(session));

  const navigate = (next: NavState) => {
    // La pestaña del panel la guarda cada panel; aquí basta con la pantalla y el espacio abierto
    if (next.tab) writePersisted("student-tab", next.tab);
    writePersisted("screen", { screen: next.screen, spaceId: next.spaceId });
    setNav(next);
    window.scrollTo(0, 0);
  };

  const logout = () => {
    clearSession();
    clearPersisted();
    setSession(null);
    navigate({ screen: "login" });
  };

  // Si el backend rechaza el token (expirado o inválido), volvemos al login
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, []);

  const [legalDoc, setLegalDoc] = useState<LegalKey | null>(readLegalDoc);
  useEffect(() => {
    const onChange = () => setLegalDoc(readLegalDoc());
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);

  if (legalDoc) {
    return (
      <LegalScreen
        doc={legalDoc}
        onBack={() => {
          window.history.replaceState({}, "", "/");
          document.title = APP_TITLE;
          setLegalDoc(null);
        }}
      />
    );
  }

  if (!session || nav.screen === "login") {
    return <LoginScreen onLogin={(s) => {
      clearPersisted();
      setSession(s);
      navigate({ screen: HOME[s.role] });
    }} />;
  }

  // Funcionarios y administradores también pueden reservar desde el catálogo
  if (nav.screen === "space-detail") {
    return (
      <SpaceDetail
        session={session}
        spaceId={nav.spaceId!}
        onBack={() => navigate({ screen: "student-home", tab: "catalog" })}
        onViewReservations={() => navigate({ screen: "student-home", tab: "reservations" })}
      />
    );
  }

  if (nav.screen === "student-home" || session.role === "student") {
    return (
      <StudentDashboard
        key={nav.tab ?? "catalog"}
        session={session}
        initialTab={nav.tab}
        onSpaceClick={(id) => navigate({ screen: "space-detail", spaceId: id })}
        onBackToPanel={session.role !== "student" ? () => navigate({ screen: HOME[session.role] }) : undefined}
        onLogout={logout}
      />
    );
  }

  if (session.role === "admin") {
    return <AdminDashboard session={session} onLogout={logout} onOpenCatalog={() => navigate({ screen: "student-home", tab: "catalog" })} />;
  }

  return <FunctionalDashboard session={session} onLogout={logout} onOpenCatalog={() => navigate({ screen: "student-home", tab: "catalog" })} />;
}
