import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import os from 'node:os'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Lee PORT y BACKEND_URL del entorno o de .env / .env.local
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const port = parseInt(env.PORT || '8443')
  // Backend de Spring Boot al que el servidor de desarrollo reenvía las llamadas de /backend
  const backendUrl = env.BACKEND_URL || 'http://localhost:8080'

  return {
    plugins: [react(), tailwindcss(), lanIp()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port,
      strictPort: true,
      // El navegador llama a /backend (mismo origen que la página) y Vite lo reenvía al backend.
      // Así la app funciona igual en el PC y en un celular de la misma red, sin tocar CORS.
      proxy: {
        '/backend': {
          target: backendUrl,
          changeOrigin: true,
          headers: { Origin: `http://localhost:${port}` },
          rewrite: (p: string) => p.replace(/^\/backend/, ''),
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port,
    },
  }
})

/**
 * Informa la IP del PC en la red local en /__lan-ip para que la pantalla de inicio dibuje
 * un QR que abre la app en el celular. Se calcula en cada consulta, así que si el PC cambia
 * de red el QR se actualiza solo. Solo existe con `npm run dev`.
 */
function lanIp(): Plugin {
  const skip = /vethernet|virtualbox|vmware|wsl|hyper-v|loopback|docker|tailscale|zerotier|bluetooth/i
  const rank = (ip: string) =>
    ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3
  const current = (): string | null => {
    const found: string[] = []
    for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
      if (skip.test(name)) continue
      for (const a of addrs ?? []) {
        const v4 = String(a.family) === 'IPv4' || String(a.family) === '4'
        if (v4 && !a.internal && !a.address.startsWith('169.254.')) found.push(a.address)
      }
    }
    found.sort((x, y) => rank(x) - rank(y))
    return found[0] ?? null
  }
  return {
    name: 'espacia-lan-ip',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__lan-ip', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify({ ip: current(), port: server.config.server.port }))
      })
    },
  }
}
