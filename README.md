# Espacia — Frontend

Aplicación web para reservar salas de estudio, equipos y talleres de la biblioteca.
React 19 · Vite · TypeScript · Tailwind CSS 4.

Necesita el backend de [Espacia-Backend](https://github.com/Sebxx66/Espacia-Backend) funcionando (por defecto en `http://localhost:8080`).

## Vista previa

| Inicio de sesión | Catálogo de espacios |
|---|---|
| ![Inicio de sesión](docs/screenshots/01-login.jpg) | ![Catálogo de espacios](docs/screenshots/02-catalogo.jpg) |

| Reservar un espacio | Mis reservas |
|---|---|
| ![Reservar un espacio](docs/screenshots/03-reserva.jpg) | ![Mis reservas](docs/screenshots/04-mis-reservas.jpg) |

| Panel del administrador | Gestión de reservas |
|---|---|
| ![Panel del administrador](docs/screenshots/05-admin-dashboard.jpg) | ![Gestión de reservas](docs/screenshots/06-admin-reservas.jpg) |

## Puesta en marcha

1. Levanta la base de datos y el backend (ver el README del backend).
2. Instala las dependencias y arranca el frontend:

   ```bash
   npm install
   npm run dev
   ```

3. Abre la URL que muestra Vite (por defecto `http://localhost:8443`).

Para usar otro backend, copia `.env.example` a `.env.local` y cambia `VITE_API_URL`.

### Primer ingreso

- **Estudiantes:** "Regístrate" en la pantalla de inicio (contraseña de al menos 8 caracteres). Recibirás un correo de bienvenida si el backend tiene el correo configurado.
- **Administrador:** usa la cuenta inicial que crea el backend (ver su README) y cambia la contraseña.
- **Funcionarios:** los crea el administrador desde **Usuarios → Nuevo usuario**.
- **Recuperar contraseña:** "¿Olvidaste tu contraseña?" envía un enlace al correo registrado.

Con `npm run dev`, la pantalla de inicio muestra atajos de **accesos de demostración** que rellenan las cuentas de ejemplo del backend. No aparecen en la versión compilada (`npm run build`).

## Qué puede hacer cada rol

**Estudiante**
- Catálogo con búsqueda, filtros por tipo y estado, y ocupación en tiempo real.
- Reservar eligiendo fecha y horario según la disponibilidad real, con límite de 1 equipo y 2 salas por día.
- Mis reservas: ver detalle, extender 1 hora, cancelar, historial y resumen del mes.
- Notificaciones de confirmaciones, cancelaciones, llegadas y devoluciones.

**Funcionario**
- Llegadas de hoy: validar la llegada o marcar a quien no se presentó.
- En uso: registrar devoluciones de equipos y el fin de uso de los espacios.
- Monitor de espacios, reservas del día y soporte técnico (incidencias y mantenimiento).

**Administrador**
- Dashboard con estadísticas reales.
- Gestión de espacios, reservas, usuarios (roles, suspensión, restablecer contraseña), incidencias y tipos de espacio.
- Exportación de las reservas filtradas a un archivo que abre Excel.

Los tres roles pueden cambiar su contraseña desde el menú lateral.

## Estructura

| Ruta | Contenido |
|---|---|
| `src/api.ts` | Cliente del backend: sesión JWT, llamadas y traducción de roles y estados |
| `src/App.tsx` | Navegación entre pantallas según el rol |
| `src/screens/` | Login y registro, panel de estudiante, detalle y reserva de un espacio, paneles de funcionario y administrador |
| `src/components/ui.tsx` | Botones, formularios, modales, toasts y estados de carga, error y vacío |
| `src/components/AppShell.tsx` | Menú lateral (cajón en celular), cabecera y cambio de contraseña |
| `src/components/staff.tsx` | Acciones sobre reservas e incidencias, compartidas por funcionario y administrador |
| `src/lib/` | Formato de fechas y estados, exportación a CSV y el hook `useLoader` |

## Scripts

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación para producción en `dist/` |
| `npx tsc --noEmit` | Verificación de tipos |

## Imágenes

Las fotos de los espacios se cargan desde Unsplash (licencia libre, uso comercial permitido). Si no hay conexión se muestran las ilustraciones de `public/spaces/`.
