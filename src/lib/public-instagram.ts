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

type XdtMedia = {
  __typename?: string;
  id?: string;
  shortcode?: string;
  display_url?: string;
  thumbnail_src?: string;
  video_url?: string;
  is_video?: boolean;
  dimensions?: {
    width?: number;
    height?: number;
  };
  edge_sidecar_to_children?: {
    edges?: Array<{
      node?: XdtMedia;
    }>;
  };
  edge_media_to_caption?: {
    edges?: Array<{
      node?: {
        text?: string;
      };
    }>;
  };
  owner?: {
    username?: string;
  };
};

type XdtGraphqlResponse = {
  data?: {
    xdt_shortcode_media?: XdtMedia;
  };
};

const graphqlDocId = "8845758582119845";

export async function resolvePublicInstagram(
  sourceUrl: string,
  contentType: InstagramContentType,
): Promise<InstagramResolveResult> {
  try {
    return await resolvePublicGraphql(sourceUrl, contentType);
  } catch {
    // Fall back to public HTML metadata below.
  }

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
      "Esse post abre no Instagram, mas o Instagram nao expos URLs de download para acesso anonimo do servidor. Em modo seguro, links assim nao podem ser baixados sem uma sessao autorizada.",
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

async function resolvePublicGraphql(
  sourceUrl: string,
  contentType: InstagramContentType,
): Promise<InstagramResolveResult> {
  const shortcode = getShortcode(sourceUrl);
  if (!shortcode) {
    throw new Error("Nao encontrei o shortcode no link.");
  }

  const variables = {
    shortcode,
    child_comment_count: 3,
    fetch_comment_count: 40,
    parent_comment_count: 24,
    has_threaded_comments: true,
  };

  const endpoint = new URL("https://www.instagram.com/graphql/query/");
  endpoint.searchParams.set("doc_id", graphqlDocId);
  endpoint.searchParams.set("variables", JSON.stringify(variables));

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      Referer: sourceUrl,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
      "X-ASBD-ID": "198387",
      "X-IG-App-ID": "936619743392459",
      "X-IG-WWW-Claim": "0",
      "X-Requested-With": "XMLHttpRequest",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("A consulta publica do Instagram falhou.");
  }

  const payload = (await response.json()) as XdtGraphqlResponse;
  const root = payload.data?.xdt_shortcode_media;
  if (!root) {
    throw new Error("A consulta publica nao retornou midia.");
  }

  const nodes = root.edge_sidecar_to_children?.edges?.length
    ? root.edge_sidecar_to_children.edges
        .map((edge) => edge.node)
        .filter((node): node is XdtMedia => Boolean(node))
    : [root];

  const media = nodes
    .map((node, index) => mapGraphqlNodeToMedia(node, contentType, index))
    .filter((item): item is ResolvedInstagramMedia => Boolean(item));

  if (media.length === 0) {
    throw new Error("A consulta publica nao retornou URLs de midia.");
  }

  const username = root.owner?.username;
  const caption = root.edge_media_to_caption?.edges?.[0]?.node?.text;

  return {
    ok: true,
    sourceUrl,
    contentType,
    caption,
    provider: "instagram-public-graphql",
    media: media.map((item) => ({
      ...item,
      filename: username ? item.filename.replace("instagramlinker", username) : item.filename,
    })),
  };
}

function mapGraphqlNodeToMedia(
  node: XdtMedia,
  contentType: InstagramContentType,
  index: number,
): ResolvedInstagramMedia | null {
  const directUrl = node.video_url || node.display_url || node.thumbnail_src;
  if (!directUrl) return null;

  const type = node.video_url || node.is_video ? "video" : "image";
  const ext = getExtension(directUrl, type === "video" ? "mp4" : "jpg");
  const height = node.dimensions?.height;

  return {
    id: node.id ? `${node.id}-${index}` : `graphql-media-${index + 1}`,
    type,
    quality: height ? `${height}p` : "public",
    width: node.dimensions?.width,
    height,
    thumbnailUrl: node.display_url || node.thumbnail_src,
    downloadUrl: directUrl,
    sourceFormat: ext,
    filename: `instagramlinker-${contentType}-${index + 1}.${ext}`,
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

function getShortcode(sourceUrl: string) {
  const segments = new URL(sourceUrl).pathname.split("/").filter(Boolean);
  if (!["p", "reel", "reels", "tv"].includes(segments[0]?.toLowerCase())) {
    return undefined;
  }

  return segments[1];
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
