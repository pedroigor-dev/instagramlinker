const { createWriteStream, existsSync, mkdirSync, chmodSync } = require("node:fs");
const { get } = require("node:https");
const { join } = require("node:path");

if (process.platform !== "linux") {
  process.exit(0);
}

const binDir = join(process.cwd(), "vendor", "bin");
const target = join(binDir, "yt-dlp_linux");
const downloadUrl =
  "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";

if (existsSync(target)) {
  process.exit(0);
}

mkdirSync(binDir, { recursive: true });

function download(url, destination, redirects = 0) {
  if (redirects > 5) {
    throw new Error("Too many redirects while downloading yt-dlp_linux");
  }

  get(url, (response) => {
    if (
      response.statusCode >= 300 &&
      response.statusCode < 400 &&
      response.headers.location
    ) {
      download(response.headers.location, destination, redirects + 1);
      return;
    }

    if (response.statusCode !== 200) {
      throw new Error(`Failed to download yt-dlp_linux: ${response.statusCode}`);
    }

    const file = createWriteStream(destination);
    response.pipe(file);
    file.on("finish", () => {
      file.close();
      chmodSync(destination, 0o755);
      console.log("Installed yt-dlp_linux standalone binary");
    });
  }).on("error", (error) => {
    throw error;
  });
}

download(downloadUrl, target);
