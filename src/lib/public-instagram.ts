import type {
  InstagramContentType,
  InstagramResolveResult,
  ResolvedInstagramMedia,
} from "@/lib/instagram";

type PublicMeta = {
  image?: string;
  video?: string;
  title?: string;
  description?: string;
};

export async function resolvePublicInstagram(
  sourceUrl: string,
  contentType: InstagramContentType,
): Promise<InstagramResolveResult> {
  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Nao consegui abrir esse post publico do Instagram.");
  }

  const html = await response.text();
  const meta = extractPublicMeta(html);
  const media = mapMetaToMedia(meta, contentType);

  if (media.length === 0) {
    throw new Error(
      "Nao encontrei midia publica nesse link. Confira se a URL esta completa, se o post ainda existe e se o perfil e publico.",
    );
  }

  return {
    ok: true,
    sourceUrl,
    contentType,
    caption: meta.description || meta.title,
    provider: "instagram-public-meta",
    media,
  };
}

function extractPublicMeta(html: string): PublicMeta {
  return {
    image: getMetaContent(html, "og:image") || getMetaContent(html, "twitter:image"),
    video: getMetaContent(html, "og:video") || getMetaContent(html, "og:video:secure_url"),
    title: getMetaContent(html, "og:title"),
    description: getMetaContent(html, "og:description"),
  };
}

function getMetaContent(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }

  return undefined;
}

function mapMetaToMedia(meta: PublicMeta, contentType: InstagramContentType) {
  const media: ResolvedInstagramMedia[] = [];

  if (meta.video) {
    media.push({
      id: "public-video-1",
      type: "video",
      quality: "public",
      downloadUrl: meta.video,
      sourceFormat: getExtension(meta.video, "mp4"),
      filename: `instagramlinker-${contentType}-1.${getExtension(meta.video, "mp4")}`,
    });
  }

  if (meta.image) {
    media.push({
      id: "public-image-1",
      type: "image",
      quality: "public",
      thumbnailUrl: meta.image,
      downloadUrl: meta.image,
      sourceFormat: getExtension(meta.image, "jpg"),
      filename: `instagramlinker-${contentType}-${media.length + 1}.${getExtension(meta.image, "jpg")}`,
    });
  }

  return media;
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function getExtension(url: string, fallback: string) {
  try {
    const match = new URL(url).pathname.match(/\.([a-z0-9]+)$/i);
    return match?.[1]?.toLowerCase() || fallback;
  } catch {
    return fallback;
  }
}
