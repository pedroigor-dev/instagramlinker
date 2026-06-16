import { DownloadPanel } from "@/components/download-panel";
import { StoryShareButton } from "@/components/story-share-button";
import { BadgeCheck, Clock3, ShieldCheck, Sparkles } from "lucide-react";

const highlights = [
  {
    icon: Sparkles,
    title: "Posts, Reels e Stories",
    text: "Cole um link publico do Instagram para resolver as midias disponiveis.",
  },
  {
    icon: BadgeCheck,
    title: "Qualidade original",
    text: "A API prioriza a maior resolucao retornada pelo provedor conectado.",
  },
  {
    icon: ShieldCheck,
    title: "Uso responsavel",
    text: "Pensado para conteudo publico, proprio ou baixado com permissao.",
  },
  {
    icon: Clock3,
    title: "Fluxo rapido",
    text: "Resolucao, pre-visualizacao e download ficam em uma unica tela.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <section className="relative min-h-screen overflow-hidden bg-stone-950">
        <video
          aria-hidden="true"
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
          loop
          muted
          playsInline
          preload="auto"
          src="/background.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/88 via-stone-950/58 to-stone-950/28" />
        <div className="absolute inset-0 bg-stone-950/20" />

        <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-10">
          <div className="flex flex-col justify-center gap-8">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-white text-lg font-black text-stone-950">
                IL
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#ff6b9f]">
                  InstagramLinker
                </p>
                <p className="text-sm text-white/75">Downloader web em HD</p>
              </div>
            </div>

            <div className="max-w-2xl">
              <h1 className="text-5xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
                Baixe midias do Instagram pelo link.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/82">
                Oi, meu nome e Pedro. Fiz isso para ajudar voce a baixar
                stories, posts e Reels quando quiser. Sinta-se livre para usar
                como quiser; quer me ajudar? Me siga no Insta ou compartilhe :)
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a
                  href="https://www.instagram.com/_pedroigorc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Seguir Pedro no Instagram"
                  title="Seguir no Instagram"
                  className="inline-grid h-12 w-12 place-items-center rounded-md bg-[#b3265c] text-white transition hover:bg-white hover:text-stone-950"
                >
                  <InstagramLogo className="h-6 w-6" />
                </a>
                <StoryShareButton />
              </div>
            </div>

            <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="flex gap-3 border-l-2 border-white/35 bg-white/12 px-4 py-3 backdrop-blur-md"
                >
                  <item.icon className="mt-1 h-5 w-5 shrink-0 text-[#60e0d5]" />
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-white/70">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DownloadPanel />
        </div>
      </section>
    </main>
  );
}

function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="17"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
        width="17"
        x="3.5"
        y="3.5"
      />
      <circle cx="12" cy="12" r="3.8" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.1" cy="6.9" fill="currentColor" r="1.2" />
    </svg>
  );
}
