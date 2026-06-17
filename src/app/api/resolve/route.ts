import {
  assertDownloadableContent,
  detectInstagramContentType,
  normalizeInstagramUrl,
  type InstagramResolveResult,
} from "@/lib/instagram";
import { resolveLocalInstagram } from "@/lib/local-resolver";
import { rateLimit } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ResolverPayload = {
  url: string;
};

const resolverEndpoint = process.env.INSTAGRAM_RESOLVER_ENDPOINT;
const resolverToken = process.env.INSTAGRAM_RESOLVER_TOKEN;

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = (await request.json()) as Partial<ResolverPayload>;
    if (!body.url) {
      return NextResponse.json(
        { ok: false, error: "Informe um link do Instagram." },
        { status: 400 },
      );
    }

    const sourceUrl = normalizeInstagramUrl(body.url);
    const contentType = detectInstagramContentType(sourceUrl);
    assertDownloadableContent(contentType);

    if (resolverEndpoint) {
      const resolved = await callExternalResolver(sourceUrl);
      return NextResponse.json({
        ...withAbsoluteExternalDownloadUrls(resolved),
        sourceUrl,
        contentType,
        provider: resolved.provider ?? "external-resolver",
      });
    }

    const resolved = await resolveLocalInstagram(sourceUrl, contentType);
    return NextResponse.json(withDownloadProxy(resolved));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel resolver esse link.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

function withDownloadProxy(resolved: InstagramResolveResult): InstagramResolveResult {
  return {
    ...resolved,
    media: resolved.media.map((media) => ({
      ...media,
      filename: media.type === "image" ? toJpgFilename(media.filename) : media.filename,
      downloadUrl: `/api/download?url=${encodeURIComponent(resolved.sourceUrl)}&mediaId=${encodeURIComponent(media.id)}&format=${media.type === "image" ? "jpg" : "original"}`,
      originalDownloadUrl: `/api/download?url=${encodeURIComponent(resolved.sourceUrl)}&mediaId=${encodeURIComponent(media.id)}&format=original`,
    })),
  };
}

function toJpgFilename(filename: string) {
  return filename.replace(/\.[a-z0-9]+$/i, ".jpg");
}

async function callExternalResolver(sourceUrl: string) {
  const response = await fetch(resolverEndpoint as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(resolverToken ? { Authorization: `Bearer ${resolverToken}` } : {}),
    },
    body: JSON.stringify({ url: sourceUrl, preferQuality: "highest" }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("O resolvedor externo nao conseguiu processar esse link.");
  }

  const payload = (await response.json()) as InstagramResolveResult;
  if (!payload.ok || !Array.isArray(payload.media)) {
    throw new Error("O resolvedor externo retornou uma resposta invalida.");
  }

  return payload;
}

function withAbsoluteExternalDownloadUrls(
  resolved: InstagramResolveResult,
): InstagramResolveResult {
  const endpoint = resolverEndpoint as string;
  const origin = new URL(endpoint).origin;

  return {
    ...resolved,
    media: resolved.media.map((media) => ({
      ...media,
      downloadUrl: toAbsoluteUrl(media.downloadUrl, origin),
      originalDownloadUrl: toAbsoluteUrl(media.originalDownloadUrl, origin),
    })),
  };
}

function toAbsoluteUrl(url: string | undefined, origin: string) {
  if (!url) return undefined;

  try {
    return new URL(url).toString();
  } catch {
    return new URL(url, origin).toString();
  }
}
