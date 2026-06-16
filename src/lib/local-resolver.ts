import { resolveWithInstagramApi } from "@/lib/instagram-api";
import type { InstagramContentType } from "@/lib/instagram";
import { resolvePublicInstagram } from "@/lib/public-instagram";
import { resolveWithYtDlp } from "@/lib/yt-dlp";

export async function resolveLocalInstagram(
  sourceUrl: string,
  contentType: InstagramContentType,
) {
  if (process.env.YTDLP_COOKIES_PATH) {
    try {
      return await resolveWithInstagramApi(sourceUrl, contentType);
    } catch {
      return resolveWithFallbacks(sourceUrl, contentType);
    }
  }

  return resolveWithFallbacks(sourceUrl, contentType);
}

async function resolveWithFallbacks(
  sourceUrl: string,
  contentType: InstagramContentType,
) {
  try {
    return await resolveWithYtDlp(sourceUrl, contentType);
  } catch {
    return resolvePublicInstagram(sourceUrl, contentType);
  }
}
