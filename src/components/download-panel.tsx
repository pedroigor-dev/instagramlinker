"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Download,
  ImageIcon,
  Loader2,
  PlayCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type ResolvedMedia = {
  id: string;
  type: "image" | "video";
  quality: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  downloadUrl?: string;
  originalDownloadUrl?: string;
  sourceFormat?: string;
  filename: string;
};

type ResolveResponse = {
  ok: boolean;
  sourceUrl?: string;
  contentType?: string;
  caption?: string;
  provider?: string;
  demo?: boolean;
  media?: ResolvedMedia[];
  error?: string;
};

const exampleUrl = "https://www.instagram.com/reel/C0Example/";

export function DownloadPanel() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => url.trim().length > 8 && !isLoading, [url, isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const payload = (await response.json()) as ResolveResponse;
      setResult(payload);
    } catch {
      setResult({
        ok: false,
        error: "Nao foi possivel conversar com a API local agora.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch {
      setResult({
        ok: false,
        error: "Permita acesso a area de transferencia ou cole o link manualmente.",
      });
    }
  }

  return (
    <section className="w-full rounded-lg border border-stone-200 bg-white p-4 shadow-[0_24px_80px_rgba(28,25,23,0.12)] sm:p-6 lg:p-7">
      <div className="flex items-start justify-between gap-5 border-b border-stone-200 pb-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#167d7f]">
            Resolver link
          </p>
          <h2 className="mt-2 text-2xl font-black text-stone-950">
            Cole o link e baixe
          </h2>
        </div>
        <div className="hidden items-center gap-2 rounded-md bg-[#e9f6f2] px-3 py-2 text-sm font-semibold text-[#126463] sm:flex">
          <ShieldCheck className="h-4 w-4" />
          Publico/autorizado
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-semibold text-stone-800" htmlFor="instagram-url">
          Link do Instagram
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="instagram-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.instagram.com/p/..."
            className="min-h-12 flex-1 rounded-md border border-stone-300 bg-stone-50 px-4 text-base text-stone-950 outline-none transition focus:border-[#b3265c] focus:bg-white focus:ring-4 focus:ring-[#b3265c]/10"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={pasteFromClipboard}
              aria-label="Colar link"
              title="Colar link"
              className="grid h-12 w-12 place-items-center rounded-md border border-stone-300 text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
            >
              <Clipboard className="h-5 w-5" />
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-12 min-w-36 items-center justify-center gap-2 rounded-md bg-stone-950 px-5 text-sm font-bold text-white transition hover:bg-[#b3265c] disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              Analisar
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setUrl(exampleUrl)}
          className="text-sm font-semibold text-[#b3265c] transition hover:text-stone-950"
        >
          Usar link de exemplo
        </button>
      </form>

      <ResultView result={result} isLoading={isLoading} />
    </section>
  );
}

function ResultView({
  result,
  isLoading,
}: {
  result: ResolveResponse | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="mt-7 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6">
        <div className="flex items-center gap-3 text-stone-700">
          <Loader2 className="h-5 w-5 animate-spin text-[#167d7f]" />
          <span className="font-semibold">Buscando a melhor midia disponivel...</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mt-7 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-6 text-stone-600">
        A busca aparece aqui. O servidor vai tentar encontrar a melhor midia
        disponivel para posts, Reels e Stories publicos.
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="mt-7 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-5 text-red-900">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm font-semibold leading-6">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="mt-7 space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-[#cfe9df] bg-[#f0fbf7] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#167d7f]" />
          <div>
            <p className="font-bold text-stone-950">
              {result.media?.length ?? 0} arquivo(s) encontrado(s)
            </p>
            <p className="text-sm text-stone-600">
              Fonte: {result.provider}
              {result.demo ? " - modo demo" : ""}
            </p>
          </div>
        </div>
        <span className="rounded-md bg-white px-3 py-2 text-sm font-bold text-[#167d7f]">
          {result.contentType}
        </span>
      </div>

      {result.demo ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Este resultado veio de um provedor de preview. Defina
          <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-xs">
            INSTAGRAM_RESOLVER_ENDPOINT
          </code>
          se quiser trocar o motor local por um servico externo.
        </div>
      ) : null}

      <div className="grid gap-3">
        {result.media?.map((media) => (
          <article
            key={media.id}
            className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-[96px_1fr_auto] sm:items-center"
          >
            <div className="grid aspect-square place-items-center rounded-md bg-stone-100 text-stone-500">
              {media.type === "video" ? (
                <PlayCircle className="h-9 w-9" />
              ) : (
                <ImageIcon className="h-9 w-9" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-bold text-stone-950">{media.filename}</h3>
              <p className="mt-1 text-sm text-stone-600">
                {media.type.toUpperCase()} - {media.quality}
                {media.width && media.height ? ` - ${media.width}x${media.height}` : ""}
                {media.sourceFormat ? ` - origem ${media.sourceFormat.toUpperCase()}` : ""}
              </p>
            </div>
            {media.downloadUrl ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={media.downloadUrl}
                  download={media.filename}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#b3265c] px-4 text-sm font-bold text-white transition hover:bg-stone-950"
                >
                  <Download className="h-4 w-4" />
                  {media.type === "video" ? media.sourceFormat?.toUpperCase() || "MP4" : "JPG"}
                </a>
                {media.type === "image" && media.originalDownloadUrl ? (
                  <a
                    href={media.originalDownloadUrl}
                    download
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800 transition hover:border-stone-950"
                  >
                    <Download className="h-4 w-4" />
                    Original
                  </a>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-stone-200 px-4 text-sm font-bold text-stone-500"
              >
                <Download className="h-4 w-4" />
                Indisponivel
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
