import { resolveWithInstagramApi } from "@/lib/instagram-api";
import type { InstagramContentType } from "@/lib/instagram";
import { resolveWithYtDlp } from "@/lib/yt-dlp";

export async function resolveLocalInstagram(
  sourceUrl: string,
  contentType: InstagramContentType,
) {
  if (process.env.YTDLP_COOKIES_PATH) {
    try {
      return await resolveWithInstagramApi(sourceUrl, contentType);
    } catch {
      return resolveWithYtDlp(sourceUrl, contentType);
    }
  }

  return resolveWithYtDlp(sourceUrl, contentType);
}
