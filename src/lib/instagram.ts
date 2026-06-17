export type InstagramContentType = "post" | "reel" | "story" | "tv" | "profile";

export type ResolvedInstagramMedia = {
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

export type InstagramResolveResult = {
  ok: true;
  sourceUrl: string;
  contentType: InstagramContentType;
  caption?: string;
  provider: string;
  demo?: boolean;
  media: ResolvedInstagramMedia[];
};

const allowedHosts = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
]);

export function normalizeInstagramUrl(input: string) {
  const trimmed = input.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Cole uma URL valida do Instagram.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("O link precisa usar HTTP ou HTTPS.");
  }

  const host = parsed.hostname.toLowerCase();
  if (!allowedHosts.has(host)) {
    throw new Error("Use um link do Instagram, como /p/, /reel/ ou /stories/.");
  }

  parsed.hash = "";
  parsed.search = "";
  return parsed.toString();
}

export function detectInstagramContentType(url: string): InstagramContentType {
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  if (firstSegment === "p") return "post";
  if (firstSegment === "reel" || firstSegment === "reels") return "reel";
  if (firstSegment === "stories") return "story";
  if (firstSegment === "tv") return "tv";

  return "profile";
}

export function assertDownloadableContent(type: InstagramContentType) {
  if (type === "profile") {
    throw new Error("Envie o link direto de um post, Reel ou Story, nao do perfil.");
  }
}

export function getInstagramShortcode(url: string) {
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const type = segments[0]?.toLowerCase();

  if (!["p", "reel", "reels", "tv"].includes(type)) return undefined;

  return segments[1];
}

export function assertUsableShortcode(url: string) {
  const shortcode = getInstagramShortcode(url);
  if (!shortcode) return;

  if (!/^[A-Za-z0-9_-]+$/.test(shortcode)) {
    throw new Error("O codigo do post no link parece invalido.");
  }

  if (shortcode.length < 10) {
    throw new Error(
      "O link parece incompleto. Abra o post no Instagram e copie a URL completa.",
    );
  }
}

export function createDemoResult(
  sourceUrl: string,
  contentType: InstagramContentType,
): InstagramResolveResult {
  return {
    ok: true,
    sourceUrl,
    contentType,
    provider: "local-preview",
    demo: true,
    caption: "Preview local para desenvolvimento.",
    media: [
      {
        id: "demo-video-hd",
        type: "video",
        quality: "HD",
        width: 1080,
        height: 1920,
        filename: `instagramlinker-${contentType}-hd.mp4`,
      },
      {
        id: "demo-cover",
        type: "image",
        quality: "Cover",
        width: 1080,
        height: 1080,
        filename: `instagramlinker-${contentType}-cover.jpg`,
      },
    ],
  };
}
