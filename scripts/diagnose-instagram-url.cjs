const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const inputUrl = process.argv[2];

if (!inputUrl) {
  console.error("Usage: node scripts/diagnose-instagram-url.cjs <instagram-url>");
  process.exit(1);
}

const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36";

main().catch((error) => {
  console.error("diagnostic_error:", error.message);
  process.exit(1);
});

async function main() {
  const normalized = normalizeInstagramUrl(inputUrl);
  const shortcode = getShortcode(normalized);

  console.log("url:", normalized);
  console.log("shortcode:", shortcode || "(none)");
  console.log("");

  await diagnosePublicHtml(normalized);
  console.log("");

  if (shortcode) {
    await diagnoseMediaInfo(shortcode, normalized);
    console.log("");
  }

  diagnoseYtDlp(normalized);
}

async function diagnosePublicHtml(url) {
  console.log("== public html ==");

  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": userAgent,
    },
  });

  console.log("status:", response.status, response.statusText);
  console.log("content-type:", response.headers.get("content-type"));

  const html = await response.text();
  console.log("html bytes:", Buffer.byteLength(html));
  console.log("login hints:", countMatches(html, /login|Log in|Entrar/gi));

  const image = getMetaContent(html, "og:image") || getMetaContent(html, "twitter:image");
  const video = getMetaContent(html, "og:video") || getMetaContent(html, "og:video:secure_url");
  const title = getMetaContent(html, "og:title");

  console.log("og:title:", title ? truncate(title, 120) : "(none)");
  console.log("og:image:", image ? truncate(image, 160) : "(none)");
  console.log("og:video:", video ? truncate(video, 160) : "(none)");
  console.log("image_versions2 token:", html.includes("image_versions2"));
  console.log("video_versions token:", html.includes("video_versions"));
  console.log("carousel_media token:", html.includes("carousel_media"));
}

async function diagnoseMediaInfo(shortcode, referer) {
  console.log("== anonymous media info api ==");

  const mediaId = shortcodeToMediaId(shortcode);
  console.log("media id:", mediaId);

  for (const baseUrl of [
    "https://www.instagram.com/api/v1/media",
    "https://i.instagram.com/api/v1/media",
  ]) {
    const url = `${baseUrl}/${mediaId}/info/`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json,text/html",
          Referer: referer,
          "User-Agent": userAgent,
          "X-IG-App-ID": "936619743392459",
        },
      });
      const body = await response.text();
      console.log(url);
      console.log("  status:", response.status, response.statusText);
      console.log("  content-type:", response.headers.get("content-type"));
      console.log("  bytes:", Buffer.byteLength(body));
      console.log("  image_versions2:", body.includes("image_versions2"));
      console.log("  video_versions:", body.includes("video_versions"));
      console.log("  carousel_media:", body.includes("carousel_media"));
      console.log("  login hints:", countMatches(body, /login|Log in|Entrar/gi));
    } catch (error) {
      console.log(url);
      console.log("  error:", error.message);
    }
  }
}

function diagnoseYtDlp(url) {
  console.log("== yt-dlp ==");

  const executable = getYtDlpExecutable();
  console.log("executable:", executable);

  const result = spawnSync(
    executable,
    ["--dump-single-json", "--no-warnings", url],
    {
      encoding: "utf8",
      maxBuffer: 24 * 1024 * 1024,
      windowsHide: true,
    },
  );

  console.log("status:", result.status);

  if (result.stderr?.trim()) {
    console.log("stderr:", truncate(result.stderr.trim(), 500));
  }

  if (result.status !== 0) return;

  try {
    const payload = JSON.parse(result.stdout);
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    const formats = Array.isArray(payload.formats) ? payload.formats : [];
    console.log("extractor:", payload.extractor || "(none)");
    console.log("type:", payload._type || "(single)");
    console.log("title:", payload.title || "(none)");
    console.log("entries:", entries.length);
    console.log("non-null entries:", entries.filter(Boolean).length);
    console.log("formats:", formats.length);
    console.log("direct url:", Boolean(payload.url));
  } catch (error) {
    console.log("json parse error:", error.message);
  }
}

function normalizeInstagramUrl(value) {
  const parsed = new URL(value.trim());
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString();
}

function getShortcode(url) {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  if (!["p", "reel", "reels", "tv"].includes(segments[0]?.toLowerCase())) {
    return undefined;
  }
  return segments[1];
}

function shortcodeToMediaId(shortcode) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let id = BigInt(0);
  for (const char of shortcode) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error("Invalid shortcode");
    id = id * BigInt(64) + BigInt(value);
  }
  return id.toString();
}

function getMetaContent(html, property) {
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

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function getYtDlpExecutable() {
  const windowsBinary = resolve(
    process.cwd(),
    "node_modules",
    "yt-dlp-exec",
    "bin",
    "yt-dlp.exe",
  );
  if (process.platform === "win32" && existsSync(windowsBinary)) return windowsBinary;
  return "yt-dlp";
}

function countMatches(value, pattern) {
  return value.match(pattern)?.length || 0;
}

function truncate(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}
