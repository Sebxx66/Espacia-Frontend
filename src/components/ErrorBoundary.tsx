import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

// Si una pantalla falla por un error inesperado, se muestra este mensaje en lugar de una página en blanco
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error inesperado en la interfaz:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center px-5">
        <div role="alert" className="max-w-md w-full bg-[#121828] border border-[#26324F] rounded-2xl p-8 text-center">
          <h1 className="font-display font-700 text-white text-xl">Algo salió mal</h1>
          <p className="text-[#A8B3CF] text-sm mt-2 leading-relaxed">
            Ocurrió un error inesperado en esta pantalla. Tus reservas no se perdieron: recarga la página para continuar.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-display font-600 bg-[#4C6EF5] text-white hover:bg-[#5C7CFA]"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Recargar
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.clear();
                } catch {
                  // sin almacenamiento: no hay nada que limpiar
                }
                window.location.href = "/";
              }}
              className="px-4 py-2.5 rounded-xl text-sm font-display font-600 border border-[#26324F] text-[#C9D1E6] hover:text-white"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}
