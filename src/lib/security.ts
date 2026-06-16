import { NextRequest, NextResponse } from "next/server";

const instagramMediaHosts = [
  "cdninstagram.com",
  "fbcdn.net",
  "cdninstagram.com.c.footprint.net",
];

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function assertPersonalCookiesAllowed() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_SERVER_COOKIES !== "true"
  ) {
    throw new Error(
      "Esse link exige login e nao pode ser baixado neste site. Tente um post publico ou um conteudo que nao dependa de sessao.",
    );
  }
}

export function assertSafeCookiePath(cookiePath: string) {
  const normalized = cookiePath.replaceAll("\\", "/").toLowerCase();
  if (normalized.includes("/public/") || normalized.startsWith("public/")) {
    throw new Error("O arquivo de cookies nao pode ficar dentro da pasta public.");
  }
}

export function assertAllowedMediaUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("URL de midia invalida.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("A URL de midia precisa usar HTTPS.");
  }

  const host = parsed.hostname.toLowerCase();
  const isAllowed = instagramMediaHosts.some(
    (allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`),
  );

  if (!isAllowed) {
    throw new Error("Host de midia nao permitido.");
  }
}

export function rateLimit(
  request: NextRequest,
  options: { limit: number; windowMs: number },
) {
  const key = getClientKey(request);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  bucket.count += 1;

  if (bucket.count <= options.limit) return null;

  const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
  return NextResponse.json(
    {
      ok: false,
      error: "Muitas requisicoes em pouco tempo. Tente novamente em instantes.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    },
  );
}

export function assertReasonableContentLength(
  response: Response,
  maxBytes: number,
  label: string,
) {
  const contentLength = response.headers.get("Content-Length");
  if (!contentLength) return;

  const bytes = Number(contentLength);
  if (Number.isFinite(bytes) && bytes > maxBytes) {
    throw new Error(`${label} excede o tamanho maximo permitido.`);
  }
}

function getClientKey(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}
