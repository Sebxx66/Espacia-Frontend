// Cliente del backend de Espacia (Spring Boot). Aquí se traducen los roles y
// estados del backend a los que usa la interfaz, para que las pantallas no dependan
// de los nombres de la API.

// En desarrollo se usa /backend, que Vite reenvía al backend (ver vite.config.ts).
// Para una versión compilada (npm run build), define VITE_API_URL con la URL pública del backend.
const API_URL = (import.meta.env.VITE_API_URL ?? "/backend").replace(/\/$/, "");
const SESSION_KEY = "espacia.session";

// Reglas de reserva (las mismas que valida el backend)
export const RULES = {
  openHour: 8,
  closeHour: 20,
  maxHours: 4,
  maxActive: 3,
  maxEquipmentPerDay: 1,
  maxRoomsPerDay: 2,
  cancelHoursBefore: 1,
  daysAhead: 30,
  minPassword: 8,
};

export type Role = "student" | "admin" | "staff";
export type SpaceStatus = "available" | "occupied" | "maintenance" | "inactive";
export type SpaceEstado = "ACTIVO" | "INACTIVO" | "MANTENIMIENTO";
export type ReservationStatus = "PENDIENTE" | "CONFIRMADA" | "RECHAZADA" | "EN_USO" | "FINALIZADA" | "CANCELADA";

export interface Session {
  token: string;
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  capacity: number;
  estado: SpaceEstado;
  status: SpaceStatus;
  location: string;
  equipment: string[];
  busyUntil: string | null;
  image: string;
  // Ilustración local que se muestra si la foto no carga (sin internet)
  fallback: string;
}

export interface Slot {
  start: string;
  end: string;
}

export interface Reservation {
  id: number;
  code: string;
  spaceId: string;
  spaceName: string;
  spaceType: string;
  spaceLocation: string;
  userId: number;
  userName: string;
  userEmail: string;
  date: string;
  start: string;
  end: string;
  status: ReservationStatus;
  reason: string;
  expired: boolean;
  createdAt: string | null;
}

export interface AppNotification {
  id: number;
  message: string;
  type: string;
  read: boolean;
  createdAt: string | null;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  reservations: number;
  createdAt: string | null;
}

export interface Incident {
  id: number;
  spaceId: string;
  spaceName: string;
  spaceEstado: SpaceEstado;
  description: string;
  status: "ABIERTA" | "RESUELTA";
  reportedBy: string;
  createdAt: string | null;
  resolvedAt: string | null;
}

export interface Dashboard {
  activeReservations: number;
  reservationsToday: number;
  users: number;
  activeSpaces: number;
  totalSpaces: number;
  cancellationsMonth: number;
  openIncidents: number;
  utilizationToday: number;
  byDay: { label: string; date: string; reservations: number }[];
  byHour: { hour: string; reservations: number }[];
  topSpaces: { id: number; name: string; type: string; reservations: number; percent: number }[];
  recent: Reservation[];
}

// Datos que el administrador envía al crear o editar un espacio
export interface SpaceInput {
  nombre: string;
  descripcion: string;
  tipo: string;
  capacidad: number;
  estado: SpaceEstado;
  ubicacion: string;
  equipamiento: string[];
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Mapeos backend → frontend
// ---------------------------------------------------------------------------

const ROLE_FROM_API: Record<string, Role> = {
  ROLE_ESTUDIANTE: "student",
  ROLE_FUNCIONARIO: "staff",
  ROLE_ADMIN: "admin",
};

export const ROLE_TO_API: Record<Role, string> = {
  student: "ROLE_ESTUDIANTE",
  staff: "ROLE_FUNCIONARIO",
  admin: "ROLE_ADMIN",
};

export const ROLE_LABEL: Record<Role, string> = {
  student: "Estudiante",
  staff: "Funcionario",
  admin: "Administrador",
};

export const ESTADO_LABEL: Record<SpaceEstado, string> = {
  ACTIVO: "Activo",
  MANTENIMIENTO: "Mantenimiento",
  INACTIVO: "Inactivo",
};

export const TYPE_LABEL: Record<string, string> = {
  SALA_ESTUDIO: "Sala de estudio",
  EQUIPO_TECNOLOGICO: "Equipo tecnológico",
  TALLER: "Taller",
};

// Fotos con licencia Unsplash (uso libre, también comercial, sin atribución obligatoria).
// Si no hay internet, se muestran las ilustraciones propias de public/spaces.
const U = "https://images.unsplash.com/";
const PHOTO = {
  estudio: U + "photo-1622653533660-a1538fe8424c",
  lectura: U + "photo-1741557337567-759a930dbb7d",
  conferencias: U + "photo-1511578314322-379afb476865",
  equipo: U + "photo-1758640920659-0bb864175983",
  taller: U + "photo-1758387933125-5ac945b4e2cd",
};
const DEFAULT_PHOTO = PHOTO.lectura;

const TYPE_FALLBACK: Record<string, string> = {
  SALA_ESTUDIO: "/spaces/sala-estudio.svg",
  EQUIPO_TECNOLOGICO: "/spaces/equipo.svg",
  TALLER: "/spaces/taller.svg",
};
const DEFAULT_FALLBACK = "/spaces/biblioteca.svg";

// Para las salas se elige la imagen según el nombre del espacio
function imageFor(type: string, name: string): { image: string; fallback: string } {
  const n = name.toLowerCase();
  if (type === "SALA_ESTUDIO") {
    if (n.includes("lectura")) return { image: PHOTO.lectura, fallback: "/spaces/sala-lectura.svg" };
    if (n.includes("conferencia")) return { image: PHOTO.conferencias, fallback: "/spaces/sala-conferencias.svg" };
    return { image: PHOTO.estudio, fallback: TYPE_FALLBACK.SALA_ESTUDIO };
  }
  if (type === "EQUIPO_TECNOLOGICO") return { image: PHOTO.equipo, fallback: TYPE_FALLBACK.EQUIPO_TECNOLOGICO };
  if (type === "TALLER") return { image: PHOTO.taller, fallback: TYPE_FALLBACK.TALLER };
  return { image: DEFAULT_PHOTO, fallback: DEFAULT_FALLBACK };
}

// "SALA_GRUPAL" → "Sala grupal" para tipos que no estén en TYPE_LABEL
export function typeLabel(type: string) {
  if (TYPE_LABEL[type]) return TYPE_LABEL[type];
  const text = type.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");

interface SpaceResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  capacidad: number | null;
  estado: string;
  ubicacion: string | null;
  equipamiento: string[] | null;
  ocupadoAhora: boolean;
  ocupadoHasta: string | null;
}

function toSpace(s: SpaceResponse): Space {
  const type = s.tipo.toUpperCase();
  const estado = (["ACTIVO", "MANTENIMIENTO", "INACTIVO"].includes(s.estado) ? s.estado : "INACTIVO") as SpaceEstado;
  const status: SpaceStatus =
    estado === "MANTENIMIENTO" ? "maintenance"
    : estado === "INACTIVO" ? "inactive"
    : s.ocupadoAhora ? "occupied"
    : "available";
  return {
    id: String(s.id),
    name: s.nombre,
    description: s.descripcion ?? "",
    type,
    category: typeLabel(type),
    capacity: s.capacidad ?? 0,
    estado,
    status,
    location: s.ubicacion ?? "",
    equipment: s.equipamiento ?? [],
    busyUntil: s.ocupadoAhora ? hhmm(s.ocupadoHasta) : null,
    ...imageFor(type, s.nombre),
  };
}

export function spaceImage(space: Pick<Space, "image">, width: number, height: number) {
  // Las imágenes locales no necesitan parámetros de recorte
  if (!space.image.startsWith("http")) return space.image;
  return `${space.image}?w=${width}&h=${height}&fit=crop&auto=format&q=70`;
}

// onError de <img>: cambia a la ilustración local si la foto no carga
export function swapToFallback(e: { currentTarget: HTMLImageElement }, space: Pick<Space, "fallback">) {
  const img = e.currentTarget;
  if (!img.src.endsWith(space.fallback)) img.src = space.fallback;
}

interface ReservationResponse {
  id: number;
  codigo: string;
  espacioId: number;
  espacioNombre: string;
  espacioTipo: string;
  espacioUbicacion: string | null;
  usuarioId: number;
  usuarioNombre: string;
  usuarioEmail: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: ReservationStatus;
  motivo: string | null;
  vencida: boolean;
  creadaEn: string | null;
}

function toReservation(r: ReservationResponse): Reservation {
  return {
    id: r.id,
    code: r.codigo,
    spaceId: String(r.espacioId),
    spaceName: r.espacioNombre,
    spaceType: r.espacioTipo,
    spaceLocation: r.espacioUbicacion ?? "",
    userId: r.usuarioId,
    userName: r.usuarioNombre,
    userEmail: r.usuarioEmail,
    date: r.fecha,
    start: hhmm(r.horaInicio),
    end: hhmm(r.horaFin),
    status: r.estado,
    reason: r.motivo ?? "",
    expired: r.vencida,
    createdAt: r.creadaEn,
  };
}

interface UserResponse {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  reservas: number | null;
  creadoEn: string | null;
}

function toUser(u: UserResponse): AdminUser {
  return {
    id: u.id,
    name: u.nombre,
    email: u.email,
    role: ROLE_FROM_API[u.rol] ?? "student",
    active: u.activo,
    reservations: u.reservas ?? 0,
    createdAt: u.creadoEn,
  };
}

interface IncidentResponse {
  id: number;
  espacioId: number;
  espacioNombre: string;
  espacioEstado: SpaceEstado;
  descripcion: string;
  estado: "ABIERTA" | "RESUELTA";
  reportadoPor: string;
  creadaEn: string | null;
  resueltaEn: string | null;
}

function toIncident(i: IncidentResponse): Incident {
  return {
    id: i.id,
    spaceId: String(i.espacioId),
    spaceName: i.espacioNombre,
    spaceEstado: i.espacioEstado,
    description: i.descripcion,
    status: i.estado,
    reportedBy: i.reportadoPor,
    createdAt: i.creadaEn,
    resolvedAt: i.resueltaEn,
  };
}

// ---------------------------------------------------------------------------
// Sesión (JWT guardado en localStorage)
// ---------------------------------------------------------------------------

let onUnauthorized: () => void = () => {};

// App registra aquí qué hacer cuando el token deja de ser válido
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

function tokenExpired(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (!session.token || typeof session.id !== "number" || tokenExpired(session.token)) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // sin almacenamiento disponible: no hay nada que borrar
  }
}

function saveSession(session: Session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // la sesión sigue en memoria aunque no se pueda guardar
  }
}

// ---------------------------------------------------------------------------
// Peticiones
// ---------------------------------------------------------------------------

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const token = auth ? loadSession()?.token : undefined;
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. Verifica que el backend esté encendido.");
  }

  // El backend responde {"message": "..."} en todos sus errores
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = (data as { message?: string } | null)?.message;
    if (res.status === 401 && token) {
      clearSession();
      onUnauthorized();
      throw new ApiError(401, message ?? "Tu sesión expiró. Vuelve a iniciar sesión.");
    }
    throw new ApiError(res.status, message ?? `Error ${res.status} del servidor.`);
  }
  return data as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

// --- Autenticación ---------------------------------------------------------

interface AuthResponse {
  token: string;
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

function startSession(data: AuthResponse): Session {
  const role = ROLE_FROM_API[data.rol];
  if (!role) throw new ApiError(0, `Rol desconocido: ${data.rol}`);
  const session: Session = { token: data.token, id: data.id, name: data.nombre, email: data.email, role };
  saveSession(session);
  return session;
}

export async function login(email: string, password: string): Promise<Session> {
  return startSession(await request<AuthResponse>("/api/v1/auth/login", json("POST", { email, password }), false));
}

export async function register(name: string, email: string, password: string): Promise<Session> {
  return startSession(await request<AuthResponse>(
    "/api/v1/auth/register",
    json("POST", { nombre: name, email, password }),
    false,
  ));
}

// Pide el correo con el enlace para elegir una contraseña nueva (el backend responde igual exista o no la cuenta)
export function forgotPassword(email: string) {
  return request<void>("/api/v1/auth/forgot-password", json("POST", { email }), false);
}

// Guarda la contraseña nueva usando el token del enlace del correo
export function resetPassword(token: string, password: string) {
  return request<void>("/api/v1/auth/reset-password", json("POST", { token, password }), false);
}

// El backend cierra las demás sesiones del usuario y devuelve un token nuevo para este dispositivo
export async function changePassword(current: string, next: string) {
  const res = await request<{ token?: string } | null>("/api/v1/auth/password", json("PATCH", { actual: current, nueva: next }));
  const session = loadSession();
  if (res?.token && session) saveSession({ ...session, token: res.token });
}

// --- Espacios --------------------------------------------------------------

export async function getSpaces(): Promise<Space[]> {
  return (await request<SpaceResponse[]>("/api/v1/spaces")).map(toSpace);
}

export async function getSpace(id: string): Promise<Space> {
  return toSpace(await request<SpaceResponse>(`/api/v1/spaces/${encodeURIComponent(id)}`));
}

export async function getAvailability(id: string, date: string): Promise<Slot[]> {
  const data = await request<{ horaInicio: string; horaFin: string }[]>(
    `/api/v1/spaces/${encodeURIComponent(id)}/availability?fecha=${date}`,
  );
  return data.map((s) => ({ start: hhmm(s.horaInicio), end: hhmm(s.horaFin) }));
}

export async function createSpace(input: SpaceInput): Promise<Space> {
  return toSpace(await request<SpaceResponse>("/api/v1/spaces", json("POST", input)));
}

export async function updateSpace(id: string, input: SpaceInput): Promise<Space> {
  return toSpace(await request<SpaceResponse>(`/api/v1/spaces/${id}`, json("PUT", input)));
}

export function deleteSpace(id: string) {
  return request<void>(`/api/v1/spaces/${id}`, { method: "DELETE" });
}

// --- Reservas --------------------------------------------------------------

export async function createReservation(input: {
  spaceId: string;
  date: string;
  start: string;
  end: string;
  reason: string;
}): Promise<Reservation> {
  return toReservation(await request<ReservationResponse>("/api/v1/reservations", json("POST", {
    espacioId: Number(input.spaceId),
    fecha: input.date,
    horaInicio: input.start,
    horaFin: input.end,
    motivo: input.reason,
  })));
}

export async function getMyReservations(): Promise<Reservation[]> {
  return (await request<ReservationResponse[]>("/api/v1/reservations/me")).map(toReservation);
}

async function patchReservation(id: number, action: string): Promise<Reservation> {
  return toReservation(await request<ReservationResponse>(`/api/v1/reservations/${id}/${action}`, { method: "PATCH" }));
}

export const cancelReservation = (id: number) => patchReservation(id, "cancel");
export const extendReservation = (id: number) => patchReservation(id, "extend");
export const checkInReservation = (id: number) => patchReservation(id, "check-in");
export const finishReservation = (id: number) => patchReservation(id, "finish");
export const rejectReservation = (id: number) => patchReservation(id, "reject");

export async function getReservations(filters: { status?: ReservationStatus | ""; date?: string } = {}): Promise<Reservation[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("estado", filters.status);
  if (filters.date) params.set("fecha", filters.date);
  const query = params.toString();
  return (await request<ReservationResponse[]>(`/api/v1/reservations${query ? `?${query}` : ""}`)).map(toReservation);
}

// --- Notificaciones --------------------------------------------------------

export async function getNotifications(): Promise<AppNotification[]> {
  const data = await request<{ id: number; mensaje: string; tipo: string; leida: boolean; creadaEn: string | null }[]>(
    "/api/v1/notifications/me",
  );
  return data.map((n) => ({ id: n.id, message: n.mensaje, type: n.tipo, read: n.leida, createdAt: n.creadaEn }));
}

export function markNotificationRead(id: number) {
  return request<void>(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return request<void>("/api/v1/notifications/read-all", { method: "PATCH" });
}

// --- Usuarios (administrador) ---------------------------------------------

export async function getUsers(): Promise<AdminUser[]> {
  return (await request<UserResponse[]>("/api/v1/users")).map(toUser);
}

export async function createUser(input: { name: string; email: string; password: string; role: Role }): Promise<AdminUser> {
  return toUser(await request<UserResponse>("/api/v1/users", json("POST", {
    nombre: input.name,
    email: input.email,
    password: input.password,
    rol: ROLE_TO_API[input.role],
  })));
}

export async function updateUser(id: number, changes: { role?: Role; active?: boolean }): Promise<AdminUser> {
  return toUser(await request<UserResponse>(`/api/v1/users/${id}`, json("PATCH", {
    rol: changes.role ? ROLE_TO_API[changes.role] : undefined,
    activo: changes.active,
  })));
}

export function resetUserPassword(id: number, password: string) {
  return request<void>(`/api/v1/users/${id}/password`, json("PATCH", { password }));
}

// --- Incidencias (funcionario y administrador) ----------------------------

export async function getIncidents(): Promise<Incident[]> {
  return (await request<IncidentResponse[]>("/api/v1/incidents")).map(toIncident);
}

export async function createIncident(input: { spaceId: string; description: string; maintenance: boolean }): Promise<Incident> {
  return toIncident(await request<IncidentResponse>("/api/v1/incidents", json("POST", {
    espacioId: Number(input.spaceId),
    descripcion: input.description,
    ponerEnMantenimiento: input.maintenance,
  })));
}

export async function resolveIncident(id: number, reactivate: boolean): Promise<Incident> {
  return toIncident(await request<IncidentResponse>(
    `/api/v1/incidents/${id}/resolve?reactivarEspacio=${reactivate}`,
    { method: "PATCH" },
  ));
}

// --- Dashboard (administrador) --------------------------------------------

export async function getDashboard(): Promise<Dashboard> {
  const d = await request<{
    reservasActivas: number;
    reservasHoy: number;
    usuariosRegistrados: number;
    espaciosActivos: number;
    espaciosTotales: number;
    cancelacionesMes: number;
    incidenciasAbiertas: number;
    utilizacionHoy: number;
    reservasPorDia: { etiqueta: string; fecha: string; reservas: number }[];
    reservasPorHora: { hora: string; reservas: number }[];
    topEspacios: { id: number; nombre: string; tipo: string; reservas: number; porcentaje: number }[];
    recientes: ReservationResponse[];
  }>("/api/v1/admin/dashboard");
  return {
    activeReservations: d.reservasActivas,
    reservationsToday: d.reservasHoy,
    users: d.usuariosRegistrados,
    activeSpaces: d.espaciosActivos,
    totalSpaces: d.espaciosTotales,
    cancellationsMonth: d.cancelacionesMes,
    openIncidents: d.incidenciasAbiertas,
    utilizationToday: d.utilizacionHoy,
    byDay: d.reservasPorDia.map((x) => ({ label: x.etiqueta, date: x.fecha, reservations: x.reservas })),
    byHour: d.reservasPorHora.map((x) => ({ hour: x.hora, reservations: x.reservas })),
    topSpaces: d.topEspacios.map((x) => ({ id: x.id, name: x.nombre, type: x.tipo, reservations: x.reservas, percent: x.porcentaje })),
    recent: d.recientes.map(toReservation),
  };
}
