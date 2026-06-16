import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

const storyWidth = 1080;
const storyHeight = 1920;
const storyDuration = 10;

export async function GET() {
  const ffmpegPath = getFfmpegPath();

  if (!ffmpegPath) {
    return NextResponse.json(
      { ok: false, error: "ffmpeg nao foi encontrado no projeto." },
      { status: 500 },
    );
  }

  const workdir = join(tmpdir(), `instagramlinker-story-${Date.now()}`);
  const backgroundPath = resolve(process.cwd(), "public", "background.mp4");
  const overlayPath = join(workdir, "overlay.png");
  const outputPath = join(workdir, "instagramlinker-story.mp4");

  try {
    await mkdir(workdir, { recursive: true });
    await writeFile(overlayPath, await createStoryOverlay());

    await runFfmpeg(ffmpegPath, [
      "-y",
      "-stream_loop",
      "-1",
      "-i",
      backgroundPath,
      "-i",
      overlayPath,
      "-t",
      String(storyDuration),
      "-filter_complex",
      `[0:v]scale=${storyWidth}:${storyHeight}:force_original_aspect_ratio=increase,crop=${storyWidth}:${storyHeight},setsar=1,format=rgba,colorchannelmixer=aa=0.92[bg];[bg][1:v]overlay=0:0:format=auto[v]`,
      "-map",
      "[v]",
      "-an",
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "16",
      "-maxrate",
      "8M",
      "-bufsize",
      "16M",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    const video = await readFile(outputPath);

    return new NextResponse(new Uint8Array(video), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": 'attachment; filename="instagramlinker-story.mp4"',
        "Content-Type": "video/mp4",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel gerar o story.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    await rm(workdir, { force: true, recursive: true }).catch(() => undefined);
  }
}

function getFfmpegPath() {
  const configuredPath = process.env.FFMPEG_PATH;
  if (configuredPath && existsSync(configuredPath)) return configuredPath;

  const localPath = resolve(
    process.cwd(),
    "node_modules",
    "ffmpeg-static",
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
  );

  return existsSync(localPath) ? localPath : null;
}

function runFfmpeg(executablePath: string, args: string[]) {
  return new Promise<void>((resolveRun, reject) => {
    const child = spawn(executablePath, args, {
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      reject(new Error(stderr.split(/\r?\n/).filter(Boolean).slice(-6).join(" ")));
    });
  });
}

async function createStoryOverlay() {
  const svg = `
    <svg width="${storyWidth}" height="${storyHeight}" viewBox="0 0 ${storyWidth} ${storyHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="card" x1="190" y1="540" x2="890" y2="1320" gradientUnits="userSpaceOnUse">
          <stop stop-color="#111827" stop-opacity="0.76"/>
          <stop offset="1" stop-color="#020617" stop-opacity="0.88"/>
        </linearGradient>
        <linearGradient id="accent" x1="240" y1="650" x2="840" y2="1160" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FF4D8D"/>
          <stop offset="0.52" stop-color="#FACC15"/>
          <stop offset="1" stop-color="#22D3EE"/>
        </linearGradient>
        <filter id="shadow" x="140" y="480" width="800" height="880" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="38" stdDeviation="40" flood-color="#000000" flood-opacity="0.46"/>
        </filter>
      </defs>

      <rect width="${storyWidth}" height="${storyHeight}" fill="black" fill-opacity="0.14"/>
      <rect x="173" y="538" width="734" height="798" rx="58" fill="url(#card)" stroke="white" stroke-opacity="0.20" stroke-width="2" filter="url(#shadow)"/>
      <rect x="213" y="578" width="654" height="654" rx="44" fill="white" fill-opacity="0.08" stroke="white" stroke-opacity="0.22" stroke-width="2"/>
      <circle cx="540" cy="846" r="170" fill="url(#accent)" opacity="0.24"/>
      <rect x="298" y="686" width="484" height="318" rx="34" fill="#0F172A" fill-opacity="0.78" stroke="white" stroke-opacity="0.18" stroke-width="2"/>
      <rect x="336" y="724" width="112" height="112" rx="24" fill="#BE185D"/>
      <text x="392" y="794" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="900" fill="white">IL</text>
      <text x="482" y="768" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" fill="white">InstagramLinker</text>
      <text x="482" y="815" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="500" fill="white" fill-opacity="0.74">download em HD</text>

      <text x="540" y="925" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="900" fill="white">Baixe suas fotos</text>
      <text x="540" y="995" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="900" fill="white">posts e stories</text>
      <text x="540" y="1064" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="500" fill="white" fill-opacity="0.78">cole o link e salve em alta qualidade</text>

      <rect x="315" y="1135" width="450" height="74" rx="26" fill="#BE185D"/>
      <text x="540" y="1184" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="900" fill="white">instagramlinker</text>

      <text x="540" y="1282" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="white" fill-opacity="0.82">@_pedroigorc</text>
      <text x="540" y="1716" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="white" fill-opacity="0.68">compartilhe com alguem que precisa disso</text>
    </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
