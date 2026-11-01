# Historial de cambios

Cambios del frontend de Espacia, del más reciente al más antiguo. Cada entrada explica qué cambió y cómo está hecho.

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
