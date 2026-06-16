import {
  assertDownloadableContent,
  detectInstagramContentType,
  normalizeInstagramUrl,
} from "@/lib/instagram";
import { resolveLocalInstagram } from "@/lib/local-resolver";
import {
  assertAllowedMediaUrl,
  assertReasonableContentLength,
  rateLimit,
} from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const url = request.nextUrl.searchParams.get("url");
    const mediaId = request.nextUrl.searchParams.get("mediaId");
    const format = request.nextUrl.searchParams.get("format") || "jpg";

    if (!url || !mediaId) {
      return NextResponse.json(
        { ok: false, error: "Informe a URL original e a midia desejada." },
        { status: 400 },
      );
    }

    const sourceUrl = normalizeInstagramUrl(url);
    const contentType = detectInstagramContentType(sourceUrl);
    assertDownloadableContent(contentType);

    const resolved = await resolveLocalInstagram(sourceUrl, contentType);
    const media = resolved.media.find((item) => item.id === mediaId);

    if (!media?.downloadUrl) {
      return NextResponse.json(
        { ok: false, error: "Midia nao encontrada para download." },
        { status: 404 },
      );
    }

    assertAllowedMediaUrl(media.downloadUrl);

    const upstream = await fetch(media.downloadUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { ok: false, error: "Nao consegui baixar a midia de origem." },
        { status: 502 },
      );
    }

    assertReasonableContentLength(
      upstream,
      media.type === "image" ? 30 * 1024 * 1024 : 250 * 1024 * 1024,
      "A midia",
    );

    if (media.type === "image" && format !== "original") {
      const input = Buffer.from(await upstream.arrayBuffer());
      const jpeg = await sharp(input)
        .jpeg({ quality: 95, mozjpeg: true })
        .toBuffer();

      return new NextResponse(new Uint8Array(jpeg), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `attachment; filename="${sanitizeFilename(toJpgFilename(media.filename))}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${sanitizeFilename(format === "original" ? media.filename : toJpgFilename(media.filename))}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel baixar essa midia.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-z0-9._-]/gi, "_");
}

function toJpgFilename(filename: string) {
  return filename.replace(/\.[a-z0-9]+$/i, ".jpg");
}
