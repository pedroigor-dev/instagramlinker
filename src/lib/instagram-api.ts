import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type {
  InstagramContentType,
  InstagramResolveResult,
  ResolvedInstagramMedia,
} from "@/lib/instagram";
import { assertPersonalCookiesAllowed, assertSafeCookiePath } from "@/lib/security";

type InstagramCandidate = {
  url: string;
  width?: number;
  height?: number;
};

type InstagramMediaItem = {
  id?: string;
  code?: string;
  media_type?: number;
  image_versions2?: {
    candidates?: InstagramCandidate[];
  };
  video_versions?: InstagramCandidate[];
  carousel_media?: InstagramMediaItem[];
  caption?: {
    text?: string;
  };
};

type InstagramInfoResponse = {
  items?: InstagramMediaItem[];
};

const shortcodeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export async function resolveWithInstagramApi(
  sourceUrl: string,
  contentType: InstagramContentType,
): Promise<InstagramResolveResult> {
  const shortcode = getShortcode(sourceUrl);
  if (!shortcode) {
    throw new Error("Nao encontrei o shortcode do post no link.");
  }

  const cookieHeader = getCookieHeader();
  const mediaId = shortcodeToMediaId(shortcode);
  const response = await fetch(`https://www.instagram.com/api/v1/media/${mediaId}/info/`, {
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader,
      Referer: sourceUrl,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
      "X-IG-App-ID": "936619743392459",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("A API autenticada do Instagram nao retornou esse post.");
  }

  const payload = (await response.json()) as InstagramInfoResponse;
  const root = payload.items?.[0];
  if (!root) {
    throw new Error("A API autenticada do Instagram nao encontrou midias nesse post.");
  }

  const items = root.carousel_media?.length ? root.carousel_media : [root];
  const media = items
    .map((item, index) => mapApiItemToMedia(item, contentType, index))
    .filter((item): item is ResolvedInstagramMedia => Boolean(item));

  if (media.length === 0) {
    throw new Error("A API autenticada do Instagram nao retornou URLs de imagem ou video.");
  }

  return {
    ok: true,
    sourceUrl,
    contentType,
    caption: root.caption?.text,
    provider: "instagram-api",
    media,
  };
}

function mapApiItemToMedia(
  item: InstagramMediaItem,
  contentType: InstagramContentType,
  index: number,
): ResolvedInstagramMedia | null {
  const video = chooseBestCandidate(item.video_versions);
  const image = chooseBestCandidate(item.image_versions2?.candidates);
  const selected = video || image;

  if (!selected?.url) return null;

  const type = video ? "video" : "image";
  const ext = getExtension(selected.url, type);
  const height = selected.height;

  return {
    id: item.id ? `${item.id}-${index}` : `api-media-${index + 1}`,
    type,
    quality: height ? `${height}p` : "original",
    width: selected.width,
    height,
    thumbnailUrl: image?.url,
    downloadUrl: selected.url,
    sourceFormat: ext,
    filename: `instagramlinker-${contentType}-${index + 1}.${ext}`,
  };
}

function chooseBestCandidate(candidates?: InstagramCandidate[]) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  return candidates
    .filter((candidate) => Boolean(candidate.url))
    .sort((a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0))[0];
}

function getShortcode(sourceUrl: string) {
  const segments = new URL(sourceUrl).pathname.split("/").filter(Boolean);
  return segments[1];
}

function shortcodeToMediaId(shortcode: string) {
  let id = BigInt(0);
  for (const character of shortcode) {
    const value = shortcodeAlphabet.indexOf(character);
    if (value === -1) {
      throw new Error("Shortcode do Instagram invalido.");
    }
    id = id * BigInt(64) + BigInt(value);
  }
  return id.toString();
}

function getCookieHeader() {
  assertPersonalCookiesAllowed();

  const cookiePath = process.env.YTDLP_COOKIES_PATH;
  if (!cookiePath) {
    throw new Error("Configure YTDLP_COOKIES_PATH para usar a API autenticada.");
  }

  assertSafeCookiePath(cookiePath);

  const absolutePath = isAbsolute(cookiePath) ? cookiePath : resolve(process.cwd(), cookiePath);
  const lines = readFileSync(absolutePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const cookies = lines
    .map((line) => line.split("\t"))
    .filter((parts) => parts.length >= 7)
    .map((parts) => `${parts[5]}=${parts[6]}`);

  if (cookies.length === 0) {
    throw new Error("O arquivo de cookies nao contem cookies validos.");
  }

  return cookies.join("; ");
}

function getExtension(url: string, type: "image" | "video") {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    if (match?.[1]) return match[1].toLowerCase();
  } catch {
    return type === "video" ? "mp4" : "jpg";
  }

  return type === "video" ? "mp4" : "jpg";
}
