"use client";

import { Info, ShieldCheck, X } from "lucide-react";
import { useState } from "react";

export function SafetyInfoButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-12 items-center gap-2 rounded-md border border-white/25 bg-white/12 px-4 text-sm font-black text-white backdrop-blur-md transition hover:border-white hover:bg-white hover:text-stone-950"
        aria-expanded={isOpen}
      >
        <Info className="h-5 w-5" />
        Isso da ban?
      </button>

      <div
        className={`absolute right-0 top-14 z-30 w-[min(88vw,520px)] origin-top-right overflow-hidden rounded-lg border border-white/18 bg-stone-950/92 shadow-2xl shadow-black/40 backdrop-blur-xl transition duration-300 sm:left-0 sm:right-auto sm:origin-top-left ${
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div className="max-h-[min(70vh,620px)] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
            <div className="flex gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#60e0d5]" />
              <div>
                <h3 className="text-base font-black text-white">
                  Depende do uso. Nao existe garantia de zero risco.
                </h3>
                <p className="mt-1 text-sm leading-6 text-white/68">
                  A ideia segura e baixar conteudo proprio, publico ou que voce
                  tem permissao para salvar. O app nao deve ser usado para burlar
                  privacidade, Close Friends, conta privada ou direitos autorais.
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => setIsOpen(false)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-5 text-sm leading-6 text-white/76">
            <p>
              Pelas regras do Instagram/Meta, o ponto central nao e simplesmente
              baixar ou nao baixar; e respeitar permissao, privacidade,
              propriedade intelectual e nao usar automacao abusiva. Se voce usa
              para guardar algo seu, publico ou autorizado, o risco e bem menor.
            </p>
            <p>
              Pode dar problema se voce usar cookies de uma conta pessoal num site
              publico, tentar acessar conteudo privado sem permissao, republicar
              conteudo de terceiros como se fosse seu, ou transformar isso em
              coleta automatizada em massa.
            </p>
            <div className="rounded-md bg-white/8 p-4 text-white/70">
              <p className="font-bold text-white">Como usar do jeito certo:</p>
              <p className="mt-2">
                baixe apenas conteudo proprio ou autorizado, nao exponha seus
                cookies, nao compartilhe midia privada, mantenha creditos quando
                necessario e remova qualquer conteudo se o dono pedir.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.14em] text-[#ffb4cc]">
              <a
                href="https://www.instagram.com/legal/terms/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-white"
              >
                Termos do Instagram
              </a>
              <a
                href="https://transparency.meta.com/policies/community-standards/intellectual-property/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-white"
              >
                Propriedade intelectual
              </a>
              <a
                href="https://developers.facebook.com/terms/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-white"
              >
                Termos da plataforma
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
