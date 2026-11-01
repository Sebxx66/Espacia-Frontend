import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { qrMatrix } from "../lib/qr";

// Tarjeta con un QR para abrir la app en el celular. Solo aparece cuando la app se abre en el
// propio PC (localhost) y el servidor de desarrollo informa la IP de la red Wi-Fi (/__lan-ip).
// Revisa la IP cada pocos segundos, así que el código cambia solo si el PC cambia de red.

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

export default function PhoneQr() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!LOCAL_HOSTS.includes(window.location.hostname)) return;
    let active = true;
    const check = async () => {
      try {
        const res = await fetch("/__lan-ip", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { ip?: string | null; port?: number };
        const port = data.port ?? Number(window.location.port || 80);
        if (active) setUrl(data.ip ? `http://${data.ip}:${port}` : null);
      } catch {
        if (active) setUrl(null);
      }
    };
    void check();
    const id = window.setInterval(check, 5000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  if (!url) return null;

  const matrix = qrMatrix(url);
  const quiet = 2;
  const side = matrix.length + quiet * 2;
  let path = "";
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }),
  );

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm p-3 pr-5">
      <div className="rounded-xl bg-white p-1.5 flex-shrink-0">
        <svg viewBox={`0 0 ${side} ${side}`} className="w-[88px] h-[88px] block" shapeRendering="crispEdges" role="img" aria-label={`Código QR para abrir ${url}`}>
          <rect width={side} height={side} fill="#fff" />
          <path d={path} fill="#0B0F1A" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-white font-display font-600 text-sm">
          <Smartphone className="w-4 h-4 text-[#8EA4FF]" /> Ábrelo en tu celular
        </p>
        <p className="text-[#8A93AD] text-xs mt-1 leading-snug">Escanea con la cámara, conectado al mismo Wi-Fi.</p>
        <p className="mt-1.5 font-mono text-[11px] text-[#8EA4FF] truncate">{url.replace("http://", "")}</p>
      </div>
    </div>
  );
}
