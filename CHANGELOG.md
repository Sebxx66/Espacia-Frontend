# Historial de cambios

Cambios del frontend de Espacia, del más reciente al más antiguo. Cada entrada explica qué cambió y cómo está hecho.

## 1.14.0 — Compartir la app con un QR

- **Sección "Compartir app"** en el panel del administrador, pensada para exposiciones y reuniones: un código QR grande que abre Espacia, el botón **Pantalla completa** para proyectarlo (fondo oscuro, QR al 70 % de la altura y la dirección en grande; Escape para salir), **Copiar enlace** y **Descargar QR** (PNG de 1024 px para diapositivas o impresión). Incluye los pasos para que el público pruebe la app.
- El QR lleva a la dirección desde la que se abrió Espacia. Si se usa desde el propio PC (localhost), se puede elegir entre la página publicada (`VITE_SITE_URL`, por defecto `https://espacia.onrender.com`) y la dirección del PC en el Wi-Fi.
- Usa el mismo generador de QR propio de la pantalla de ingreso, sin librerías nuevas.

## 1.13.0 — Vista previa al compartir el enlace

- Al pegar el enlace de Espacia en WhatsApp, LinkedIn, Teams, Facebook o X aparece una tarjeta con imagen, título y descripción en vez del enlace solo. La imagen (`public/vista-previa.jpg`, 1200×630, 100 KB) muestra el logo, el mensaje principal y el catálogo en el computador y en el celular. Las etiquetas Open Graph y de tarjeta grande se agregan al compilar desde `vite.config.ts` (`vistaPrevia`); como las redes piden la dirección completa de la imagen, se arma con `VITE_SITE_URL` (por defecto `https://espacia.onrender.com`). También se agrega la dirección canónica del sitio.
- La integración continua revisa que la página compilada tenga la vista previa y la política de seguridad.

## 1.12.0 — Auditoría y política de seguridad

- **Pestaña Auditoría** en el panel del administrador: tabla con fecha, usuario (correo, rol e IP), acción y detalle de los cambios hechos desde el panel, del más reciente al más antiguo. Busca por usuario, acción o detalle (espera a que se deje de escribir) y carga de 50 en 50 con "Ver más". Cada acción tiene su etiqueta y color (por ejemplo, "Cuenta suspendida" en rojo).
- **Política de seguridad de contenido (CSP).** Al compilar (`npm run build`) se agrega al HTML una etiqueta que le dice al navegador de dónde puede cargar cada cosa: scripts solo del propio sitio, estilos y tipografías del sitio y de Google Fonts, imágenes del sitio y de Unsplash, y conexiones solo al sitio y al backend de `VITE_API_URL`. Si alguien lograra inyectar un script, el navegador no lo ejecutaría ni le dejaría enviar la sesión a otro servidor. Está en `vite.config.ts` (`politicaDeSeguridad`) y no afecta `npm run dev`.
- **Cabeceras del sitio en Render** (impedir que la página se muestre dentro de otra, HSTS, `nosniff`, `Referrer-Policy` y `Permissions-Policy`): el README explica cómo agregarlas en *Settings → Headers*; el `render.yaml` del backend ya las trae.

## 1.11.0 — Publicada en Render

- Espacia está en línea en [espacia.onrender.com](https://espacia.onrender.com). El frontend se publica como Static Site de Render: `npm ci && npm run build`, carpeta `dist` y `VITE_API_URL` apuntando al backend. El README tiene la demo al inicio y la configuración del sitio. Sin cambios en el código de la aplicación. (La versión 1.10.0 fue solo del backend.)

## 1.9.0 — Contraseñas más seguras

- Los formularios de registro, cambio de contraseña y usuarios del administrador avisan que la contraseña no puede ser común ni incluir el nombre o el correo. El backend hace la revisión y su mensaje se muestra tal cual. (La versión 1.8.0 fue solo del backend: copias de seguridad.)

## 1.7.0 — Verificación del correo al registrarse

- **Registro con confirmación por correo.** Al crear la cuenta ya no se entra directamente: aparece la pantalla "Revisa tu correo" con el correo usado, un botón para reenviar el enlace (con espera de 60 segundos entre envíos) y otro para volver al inicio de sesión.
- **Página del enlace** (`/?verificar=TOKEN`). Revisa de una vez si el enlace sigue vigente; si lo está, saluda a la persona por su nombre y pide la contraseña que eligió al registrarse para activar la cuenta e iniciar sesión. Si venció, ofrece pedir uno nuevo. El enlace abre esta pantalla aunque haya otra sesión abierta en el navegador.
- **Inicio de sesión con la cuenta sin confirmar.** Si el backend responde `EMAIL_NO_VERIFICADO`, se muestra el aviso y un botón "Reenviar enlace de confirmación". `ApiError` ahora trae el `code` del backend.
- **El enlace abre donde te registraste.** El registro y el reenvío envían `window.location.origin`, así el enlace del correo funciona también desde el celular en la misma red.
- **Correos institucionales.** En el registro, un correo de un dominio institucional muestra la marca "Correo institucional". En **Configuración** hay una sección para editar los dominios. En **Usuarios**, las cuentas institucionales tienen su marca, las que no han confirmado el correo aparecen como "Sin confirmar correo" y el administrador puede confirmarlas a mano desde **Gestionar**.

## 1.6.0 — Reglas de reserva configurables

- **Pestaña Configuración en el panel del administrador** (`src/components/RulesSettings.tsx`). Permite cambiar el horario, la duración máxima, las reservas activas, los límites diarios de equipos y salas, las horas para cancelar, los minutos para liberar una no asistida y los días de anticipación. Valida los valores antes de guardar, muestra una vista previa de cómo lo verán los usuarios y permite volver a los valores por defecto.
- **La app usa siempre las reglas vigentes.** `loadRules()` las trae del backend (`GET /api/v1/rules`) antes de mostrar la primera pantalla y actualiza `RULES`. Los bloques de horario de la reserva, los textos de normas, la pantalla de inicio, el calendario y los Términos de uso salen de ahí. Si el backend no responde, se usan los valores por defecto.
- Textos con singular y plural según el valor (`plural`, `scheduleText`, `dailyLimitText` y `cancelRuleText` en `src/lib/format.ts`), por ejemplo "1 hora" o "2 horas".

## 1.5.0 — Privacidad y términos de uso

- **Política de tratamiento de datos personales y Términos de uso.** Nueva pantalla pública `LegalScreen` (`/?doc=privacidad` y `/?doc=terminos`) con índice, versión, fecha de vigencia y opción de imprimir. La política sigue la Ley 1581 de 2012 y el Decreto 1377 de 2013: responsable y encargado, datos que se recogen, finalidades, autorización, derechos del titular, plazos de consultas (10 días hábiles) y reclamos (15 días hábiles), seguridad, transferencias, conservación, almacenamiento en el navegador y menores de edad. Los términos recogen las reglas de reserva directamente de `RULES`, así que siempre coinciden con la aplicación.
- **Autorización al registrarse.** El formulario de registro tiene una casilla obligatoria para aceptar los términos y autorizar el tratamiento de datos; sin ella no se puede crear la cuenta. Se envía la versión de la política aceptada (`src/legal/config.ts`).
- **Enlaces** a ambos documentos en la pantalla de inicio de sesión y en el menú lateral.
- **Personalizable por institución** con `VITE_INSTITUTION_NAME`, `VITE_PRIVACY_EMAIL` y `VITE_LEGAL_CITY`.

## 1.4.0 — Calendario, no asistidas, accesibilidad y pantalla de error

- **Añadir al calendario.** En la confirmación de la reserva y en su detalle hay dos opciones: Google Calendar (enlace con fecha, hora, lugar y zona `America/Bogota`) y un archivo `.ics` para Apple Calendar, Outlook y el calendario del celular. `src/lib/calendar.ts` arma el archivo según el estándar iCalendar, con la zona horaria incluida y un aviso 30 minutos antes.
- **Reservas no asistidas.** Nuevo estado "No asistida" en la interfaz, los filtros del administrador y las notificaciones. El botón del personal ahora usa `PATCH /reservations/{id}/no-show` cuando la reserva ya empezó ("No se presentó" o "Cerrar como no asistida") y sigue anulando cuando aún no empieza. Las normas de uso avisan que la reserva se libera si no llegas en 30 minutos.
- **Pantalla de error amigable.** `ErrorBoundary` envuelve la aplicación: si una pantalla falla por un error inesperado, en vez de quedar en blanco muestra un mensaje con botones para recargar o volver al inicio.
- **Accesibilidad.**
  - `Modal` lleva el foco al diálogo, no deja salir con Tab, se cierra con Escape y devuelve el foco al elemento que lo abrió; el título queda enlazado con `aria-labelledby`.
  - Enlace "Saltar al contenido" en el menú lateral y foco visible en todos los controles.
  - `aria-pressed` en filtros y bloques de horario, y etiquetas descriptivas en los días del calendario y en las horas (ocupada o ya pasó).
  - Los errores de los formularios se anuncian a los lectores de pantalla y se respeta la preferencia de reducir animaciones.
- **Licencia.** Todos los derechos reservados (archivo `LICENSE`, `"license": "UNLICENSED"` en `package.json`).
- La versión pasa a `1.4.0` en `package.json`, alineada con este historial y con el backend.

## 1.3.0 — Recargar sin perder la pantalla

- **Recargar la página ya no devuelve a la pantalla principal.** La navegación era solo estado en memoria, así que al recargar (F5) se perdía. `src/lib/persist.ts` guarda en `sessionStorage` la pantalla abierta, el espacio que se está viendo y la pestaña de cada panel (estudiante, funcionario y administrador). Al recargar, `App.tsx` restaura esa pantalla si la sesión sigue vigente y el rol puede verla; al cerrar o iniciar sesión se borra.
- **Cambio de contraseña.** El backend ahora cierra las demás sesiones al cambiar la contraseña y devuelve un token nuevo; `changePassword` lo guarda para seguir conectado en este dispositivo.
- **"No se presentó" solo cuando corresponde.** El botón aparecía todo el día de la reserva, incluso horas antes de que empezara. Ahora antes de la hora de inicio dice "Anular", desde el inicio "No se presentó" y, si el horario ya terminó, "Cerrar como no asistida".

## 1.2.1 — Horas pasadas

- **Las horas que van pasando se bloquean solas.** La pantalla de reserva ya deshabilitaba las horas de hoy que habían empezado, pero calculaba la hora solo al cargar. Ahora `SpaceDetail.tsx` tiene un reloj que se actualiza cada 30 segundos: si la pantalla queda abierta, cada bloque se bloquea al llegar su hora, y si el bloque elegido empieza mientras se elige el horario, se descarta la selección. El backend también rechaza estas reservas.

## 1.2.0 — Acceso desde el celular

### Añadido

- **QR en la pantalla de inicio.** Una tarjeta "Ábrelo en tu celular" en el panel izquierdo muestra un código QR con la dirección de la app en la red local (por ejemplo `http://192.168.1.20:8443`).
  - `src/lib/qr.ts` es un generador de códigos QR propio y sin dependencias: modo byte, corrección de errores nivel M y versiones 1 a 5 (direcciones de hasta unos 80 caracteres). Calcula la corrección Reed-Solomon, coloca los patrones de posición, alineación y tiempo, y prueba las 8 máscaras para quedarse con la de menor penalización, como indica el estándar.
  - `src/components/PhoneQr.tsx` pide la IP cada 5 segundos y dibuja el código como un SVG, que se ve nítido a cualquier tamaño. Solo se muestra cuando la página se abre en `localhost`, y dentro del panel izquierdo, que solo existe en pantallas grandes.
- **Ruta de desarrollo `/__lan-ip`.** Un plugin de Vite (`lanIp` en `vite.config.ts`) responde con la IP del PC en la red local y el puerto del servidor. Recorre las tarjetas de red con `os.networkInterfaces()`, descarta las virtuales (WSL, Hyper-V, VirtualBox, VPN, etc.) y las direcciones automáticas `169.254.x.x`, y prefiere las redes domésticas `192.168.x.x`. Calcula la IP en cada consulta, así que el QR cambia solo si el PC cambia de red.

### Cambiado

- **Las llamadas al backend pasan por `/backend`.** Antes el navegador llamaba directo a `http://localhost:8080`, pero en un celular "localhost" es el propio celular, así que no podía conectarse. Ahora la app llama a `/backend` en su mismo origen y el servidor de desarrollo de Vite lo reenvía al backend (`server.proxy`). El proxy también fija el encabezado `Origin` a la dirección local del frontend, de modo que el backend no necesita conocer la IP del celular en su configuración de CORS.
  - `BACKEND_URL` (en `.env.local`) cambia el backend de destino.
  - `VITE_API_URL` sigue sirviendo para la versión compilada (`npm run build`), donde no hay servidor de desarrollo.

## 1.1.0 — Nuevo nombre: Espacia

- La aplicación se llama **Espacia** (antes BiblioSpace): título de la pestaña, menú lateral, pantalla de inicio, nombre del archivo exportado y documentación.
- **Logo nuevo.** Una "E" formada por franjas de horario; la franja ámbar representa un turno reservado. Está en `src/components/LogoMark.tsx` (SVG en línea, recortado a la letra para que se vea grande dentro del cuadro con degradado) y en `public/favicon.svg` (icono completo).
- Capturas de pantalla reales en `docs/screenshots/`, usadas en el README.
- La sesión se guarda en `localStorage` con la clave `espacia.session`.

## 1.0.0 — Versión inicial

- Catálogo con búsqueda, filtros y ocupación en tiempo real; reserva con calendario según la disponibilidad real; mis reservas con extensión, cancelación e historial; paneles de funcionario y administrador.
- **Fotos de los espacios.** Se cargan desde Unsplash (licencia libre), con parámetros de tamaño para que pesen poco. Si una foto falla, `onError` la cambia por la ilustración propia del tipo de espacio en `public/spaces/`.
- **Límite diario visible.** Las reglas que muestra la interfaz (`RULES` en `src/api.ts`) incluyen 1 equipo y 2 salas o talleres por día, las mismas que valida el backend.
- **Exportar a Excel.** `src/lib/export.ts` genera un CSV con BOM UTF-8, la línea `sep=;` y punto y coma como separador, para que Excel en español lo abra con tildes y columnas correctas. Las celdas que empiezan por `=`, `+`, `-` o `@` se escapan para evitar fórmulas inyectadas.
- **Accesos de demostración.** Botones que rellenan las cuentas de ejemplo, visibles solo con `npm run dev` (`import.meta.env.DEV`).
- Integración continua en GitHub Actions: verificación de tipos y compilación en cada push.
