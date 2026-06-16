import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type {
  InstagramContentType,
  InstagramResolveResult,
  ResolvedInstagramMedia,
} from "@/lib/instagram";
import { assertPersonalCookiesAllowed, assertSafeCookiePath } from "@/lib/security";

type YtDlpFormat = {
  format_id?: string;
  url?: string;
  ext?: string;
  width?: number;
  height?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesize_approx?: number;
  format_note?: string;
  quality?: number;
  tbr?: number;
};

type YtDlpInfo = {
  id?: string;
  title?: string;
  description?: string;
  webpage_url?: string;
  extractor?: string;
  ext?: string;
  url?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  duration?: number;
  vcodec?: string;
  acodec?: string;
  formats?: YtDlpFormat[];
  entries?: YtDlpInfo[];
};

const maxBufferSize = 12 * 1024 * 1024;

export async function resolveWithYtDlp(
  sourceUrl: string,
  contentType: InstagramContentType,
): Promise<InstagramResolveResult> {
  const info = await runYtDlp(sourceUrl);
  const entries = flattenEntries(info);
  const media = entries
    .map((entry, index) => mapEntryToMedia(entry, contentType, index))
    .filter((item): item is ResolvedInstagramMedia => Boolean(item));

  if (media.length === 0) {
    throw new Error(
      "Nao encontrei uma URL de midia nesse link. Se o Instagram exigir login, configure YTDLP_COOKIES_PATH ou YTDLP_COOKIES_FROM_BROWSER.",
    );
  }

  return {
    ok: true,
    sourceUrl,
    contentType,
    caption: info.description || info.title,
    provider: "yt-dlp",
    media,
  };
}

function runYtDlp(sourceUrl: string) {
  const executable = getYtDlpExecutable();
  const args = [
    "--dump-single-json",
    "--no-warnings",
    "--prefer-free-formats",
    "--format",
    "bv*+ba/b",
    sourceUrl,
  ];

  if (process.env.YTDLP_COOKIES_PATH) {
    assertPersonalCookiesAllowed();
    assertSafeCookiePath(process.env.YTDLP_COOKIES_PATH);

    const cookiesPath = resolveCookiePath(process.env.YTDLP_COOKIES_PATH);
    if (!existsSync(cookiesPath)) {
      throw new Error(
        `Arquivo de cookies nao encontrado em ${cookiesPath}. Exporte os cookies do Instagram para esse caminho e tente de novo.`,
      );
    }

    args.splice(args.length - 1, 0, "--cookies", cookiesPath);
  }

  if (process.env.YTDLP_COOKIES_FROM_BROWSER) {
    assertPersonalCookiesAllowed();

    args.splice(
      args.length - 1,
      0,
      "--cookies-from-browser",
      process.env.YTDLP_COOKIES_FROM_BROWSER,
    );
  }

  return new Promise<YtDlpInfo>((resolve, reject) => {
    const child = spawn(executable, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > maxBufferSize) {
        child.kill();
        reject(new Error("A resposta do yt-dlp ficou grande demais."));
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", () => {
      reject(
        new Error(
          "yt-dlp nao foi encontrado no servidor. Verifique a instalacao do pacote yt-dlp-exec ou defina YTDLP_PATH.",
        ),
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(formatYtDlpError(stderr)));
        return;
      }

      try {
        resolve(JSON.parse(stdout) as YtDlpInfo);
      } catch {
        reject(new Error("O yt-dlp retornou JSON invalido."));
      }
    });
  });
}

function getYtDlpExecutable() {
  if (process.env.YTDLP_PATH && existsSync(process.env.YTDLP_PATH)) {
    return process.env.YTDLP_PATH;
  }

  const localBinary = resolve(
    process.cwd(),
    "node_modules",
    "yt-dlp-exec",
    "bin",
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp",
  );

  if (existsSync(localBinary)) return localBinary;

  return "yt-dlp";
}

function resolveCookiePath(cookiePath: string) {
  return isAbsolute(cookiePath) ? cookiePath : resolve(process.cwd(), cookiePath);
}

function flattenEntries(info: YtDlpInfo): YtDlpInfo[] {
  if (Array.isArray(info.entries) && info.entries.length > 0) {
    return info.entries.flatMap(flattenEntries);
  }

  return [info];
}

function mapEntryToMedia(
  entry: YtDlpInfo,
  contentType: InstagramContentType,
  index: number,
): ResolvedInstagramMedia | null {
  const bestFormat = chooseBestFormat(entry);
  const directUrl = bestFormat?.url || entry.url;
  if (!directUrl) return null;

  const ext = bestFormat?.ext || entry.ext || "mp4";
  const isVideo =
    Boolean(entry.duration) ||
    Boolean(bestFormat?.vcodec && bestFormat.vcodec !== "none") ||
    ["mp4", "mov", "webm", "m4v"].includes(ext);

  const width = bestFormat?.width || entry.width;
  const height = bestFormat?.height || entry.height;
  const quality = height ? `${height}p` : isVideo ? "best" : "original";

  return {
    id: entry.id ? `${entry.id}-${index}` : `media-${index + 1}`,
    type: isVideo ? "video" : "image",
    quality,
    width,
    height,
    thumbnailUrl: entry.thumbnail,
    downloadUrl: directUrl,
    sourceFormat: ext,
    filename: createFilename(contentType, index, ext),
  } satisfies ResolvedInstagramMedia;
}

function chooseBestFormat(entry: YtDlpInfo) {
  if (!Array.isArray(entry.formats) || entry.formats.length === 0) return null;

  const downloadable = entry.formats.filter((format) => Boolean(format.url));
  if (downloadable.length === 0) return null;

  return downloadable.sort((a, b) => scoreFormat(b) - scoreFormat(a))[0];
}

function scoreFormat(format: YtDlpFormat) {
  const hasVideo = format.vcodec && format.vcodec !== "none" ? 1 : 0;
  const hasAudio = format.acodec && format.acodec !== "none" ? 1 : 0;
  const dimensions = (format.width || 0) * (format.height || 0);
  const size = format.filesize || format.filesize_approx || 0;
  const bitrate = format.tbr || 0;

  return hasVideo * 1_000_000_000 + hasAudio * 100_000_000 + dimensions + size / 10 + bitrate;
}

function createFilename(contentType: InstagramContentType, index: number, ext: string) {
  const cleanExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "mp4";
  return `instagramlinker-${contentType}-${index + 1}.${cleanExt}`;
}

function formatYtDlpError(stderr: string) {
  const clean = stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" ");

  if (clean.toLowerCase().includes("login")) {
    return "O Instagram pediu login para esse link. Configure YTDLP_COOKIES_PATH ou YTDLP_COOKIES_FROM_BROWSER com uma sessao autorizada.";
  }

  return clean || "O yt-dlp nao conseguiu resolver esse link.";
}
