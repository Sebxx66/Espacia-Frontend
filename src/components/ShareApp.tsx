import { useEffect, useRef, useState } from "react";
import { Copy, Download, Maximize2, Smartphone, X } from "lucide-react";
import { qrMatrix } from "../lib/qr";
import { Button, Card, useUi } from "./ui";

// Sección del administrador para compartir la app en una exposición o reunión:
// un QR grande que abre Espacia, modo pantalla completa para proyectarlo, copiar el enlace y descargar el QR.

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const PUBLIC_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, "") || "https://espacia.onrender.com";

// Dirección que deben abrir los asistentes: la del sitio publicado o, si la app corre en el PC, la del PC en el Wi-Fi
function useShareUrl() {
  const local = LOCAL_HOSTS.includes(window.location.hostname);
  const [url, setUrl] = useState(local ? PUBLIC_URL : window.location.origin);
  const [lan, setLan] = useState<string | null>(null);

  useEffect(() => {
    if (!local) return;
    let active = true;
    fetch("/__lan-ip", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ip?: string | null; port?: number } | null) => {
        if (active && d?.ip) setLan(`http://${d.ip}:${d.port ?? window.location.port}`);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [local]);

  return { url, setUrl, lan, local };
}

function qrSvg(text: string, dark = "#0B0F1A") {
  const matrix = qrMatrix(text);
  const quiet = 3;
  const side = matrix.length + quiet * 2;
  let path = "";
  matrix.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }),
  );
  return { side, path, dark };
}

function QrImage({ text, className }: { text: string; className?: string }) {
  const { side, path, dark } = qrSvg(text);
  return (
    <svg viewBox={`0 0 ${side} ${side}`} className={className} shapeRendering="crispEdges" role="img" aria-label={`Código QR para abrir ${text}`}>
      <rect width={side} height={side} fill="#fff" />
      <path d={path} fill={dark} />
    </svg>
  );
}

// Descarga el QR como PNG de 1024 px (sirve para pegarlo en diapositivas o imprimirlo)
function downloadPng(text: string) {
  const { side, path, dark } = qrSvg(text);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" width="1024" height="1024" shape-rendering="crispEdges"><rect width="${side}" height="${side}" fill="#fff"/><path d="${path}" fill="${dark}"/></svg>`;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, 1024, 1024);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "espacia-qr.png";
    a.click();
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export default function ShareApp() {
  const { toast } = useUi();
  const { url, setUrl, lan, local } = useShareUrl();
  const [presenting, setPresenting] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const shown = url.replace(/^https?:\/\//, "");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Enlace copiado.");
    } catch {
      toast("No se pudo copiar. Selecciona el enlace y cópialo a mano.", "error");
    }
  };

  const present = () => {
    setPresenting(true);
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const stop = () => {
    setPresenting(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  };

  useEffect(() => {
    if (!presenting) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stop();
    const onFs = () => !document.fullscreenElement && setPresenting(false);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [presenting]);

  return (
    <div className="max-w-5xl">
      <div className="grid lg:grid-cols-[minmax(0,380px)_1fr] gap-6 items-start">
        <Card className="p-6 flex flex-col items-center text-center">
          <div className="rounded-2xl bg-white p-3 w-full max-w-[320px]">
            <QrImage text={url} className="w-full h-auto block" />
          </div>
          <p className="mt-4 font-mono text-[#8EA4FF] text-sm break-all">{shown}</p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2 w-full">
            <Button icon={<Maximize2 className="w-4 h-4" />} onClick={present}>Pantalla completa</Button>
            <Button variant="secondary" icon={<Copy className="w-4 h-4" />} onClick={copy}>Copiar enlace</Button>
            <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={() => downloadPng(url)}>Descargar QR</Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-display font-600 text-white text-lg">Para la exposición</h3>
            <ol className="mt-3 space-y-2 text-sm text-[#C9D1E6] list-decimal pl-5">
              <li>Proyecta el código con <b className="text-white">Pantalla completa</b> (Escape para salir).</li>
              <li>Las personas lo escanean con la cámara del celular y se abre Espacia.</li>
              <li>Crean su cuenta con su correo, abren el enlace que les llega y ya pueden reservar.</li>
            </ol>
            <p className="mt-3 text-xs text-[#6C7693]">
              Para que puedan reservar en vivo, revisa que haya espacios disponibles. Las cuentas que nunca confirmen el correo se borran solas a los 7 días.
            </p>
          </Card>

          {local && (
            <Card className="p-5">
              <h3 className="font-display font-600 text-white flex items-center gap-2"><Smartphone className="w-4 h-4 text-[#8EA4FF]" /> ¿Qué dirección compartir?</h3>
              <p className="mt-2 text-sm text-[#A8B3CF]">Estás usando Espacia desde este PC. Elige a dónde lleva el código:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant={url === PUBLIC_URL ? "primary" : "secondary"} onClick={() => setUrl(PUBLIC_URL)}>Página publicada</Button>
                {lan && (
                  <Button size="sm" variant={url === lan ? "primary" : "secondary"} onClick={() => setUrl(lan)}>Este PC (mismo Wi-Fi)</Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {presenting && (
        <div role="dialog" aria-modal="true" aria-label="Código QR en pantalla completa" className="fixed inset-0 z-[100] bg-[#0B0F1A] flex flex-col items-center justify-center p-6">
          <button
            ref={closeRef}
            onClick={stop}
            className="absolute top-5 right-5 p-2.5 rounded-xl text-[#A8B3CF] hover:text-white hover:bg-white/10"
            aria-label="Salir de pantalla completa"
          >
            <X className="w-6 h-6" />
          </button>
          <p className="font-display font-700 text-white text-3xl sm:text-5xl text-center">Prueba Espacia</p>
          <p className="mt-2 text-[#A8B3CF] text-base sm:text-xl text-center">Escanea con la cámara de tu celular</p>
          <div className="mt-6 rounded-3xl bg-white p-4 sm:p-6 w-[min(70vh,80vw)]">
            <QrImage text={url} className="w-full h-auto block" />
          </div>
          <p className="mt-6 font-mono text-[#8EA4FF] text-xl sm:text-3xl text-center break-all">{shown}</p>
        </div>
      )}
    </div>
  );
}
