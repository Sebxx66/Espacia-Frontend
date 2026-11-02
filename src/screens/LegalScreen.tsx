import { useEffect, useMemo } from "react";
import { ArrowLeft, FileText, Printer, ShieldCheck } from "lucide-react";
import LogoMark from "../components/LogoMark";
import { cx } from "../components/ui";
import { LEGAL } from "../legal/config";
import { privacyPolicy, termsOfUse, type Block } from "../legal/content";

export type LegalKey = "privacidad" | "terminos";

// Página pública con la Política de privacidad o los Términos de uso (/?doc=privacidad o /?doc=terminos)
export default function LegalScreen({ doc, onBack }: { doc: LegalKey; onBack: () => void }) {
  const content = useMemo(() => (doc === "privacidad" ? privacyPolicy() : termsOfUse()), [doc]);

  useEffect(() => {
    document.title = `${content.title} · Espacia`;
    window.scrollTo(0, 0);
  }, [content.title]);

  const switchTo = (next: LegalKey) => {
    window.history.replaceState({}, "", `/?doc=${next}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-[#C9D1E6]">
      <header className="sticky top-0 z-10 bg-[#0B0F1A]/90 backdrop-blur border-b border-[#1E2A45] print:static print:border-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4C6EF5] to-[#6C8BFF] flex items-center justify-center">
              <LogoMark className="w-6 h-6" />
            </div>
            <span className="font-display font-700 text-white text-lg">Espacia</span>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs border border-[#26324F] text-[#A8B3CF] hover:text-white"
            >
              <Printer className="w-4 h-4" aria-hidden="true" /> Imprimir
            </button>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-600 bg-[#4C6EF5] text-white hover:bg-[#5C7CFA]"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver a Espacia
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 lg:py-14 grid lg:grid-cols-[240px_1fr] gap-10">
        <aside className="print:hidden">
          <nav aria-label="Documentos legales" className="flex lg:flex-col gap-2 mb-8">
            {([
              ["privacidad", "Política de privacidad", <ShieldCheck key="p" className="w-4 h-4" aria-hidden="true" />],
              ["terminos", "Términos de uso", <FileText key="t" className="w-4 h-4" aria-hidden="true" />],
            ] as const).map(([key, label, icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchTo(key)}
                aria-current={doc === key ? "page" : undefined}
                className={cx(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-all",
                  doc === key ? "bg-[#4C6EF5]/15 text-white font-500" : "text-[#8A93AD] hover:text-white hover:bg-white/5",
                )}
              >
                {icon} {label}
              </button>
            ))}
          </nav>
          <div className="hidden lg:block sticky top-24">
            <p className="text-[11px] uppercase tracking-wider text-[#6C7693] mb-3">En este documento</p>
            <ol className="space-y-2 text-xs">
              {content.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-[#8A93AD] hover:text-white transition-colors">{s.title}</a>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <article className="max-w-3xl">
          <p className="text-xs uppercase tracking-wider text-[#8EA4FF] font-600">Documento legal</p>
          <h1 className="font-display font-800 text-white text-3xl sm:text-4xl mt-2 leading-tight">{content.title}</h1>
          <p className="text-sm text-[#6C7693] mt-3">
            Versión {LEGAL.version} · Vigente desde el {LEGAL.effectiveDate} · {LEGAL.city}
          </p>
          <p className="mt-6 text-[15px] leading-relaxed text-[#C9D1E6]">{content.intro}</p>

          <div className="mt-10 space-y-10">
            {content.sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="font-display font-700 text-white text-xl">{s.title}</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed">
                  {s.blocks.map((b, i) => <BlockView key={i} block={b} />)}
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-14 pt-6 border-t border-[#1E2A45] text-xs text-[#6C7693]">
            Espacia · Plataforma de reserva de espacios y recursos de biblioteca.
          </footer>
        </article>
      </div>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  if (typeof block === "string") return <p>{block}</p>;
  return (
    <ul className="space-y-2 pl-1">
      {block.list.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#4C6EF5] flex-shrink-0" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
