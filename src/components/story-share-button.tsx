"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";

export function StoryShareButton() {
  const [isPreparing, setIsPreparing] = useState(false);

  async function handleShare() {
    setIsPreparing(true);

    try {
      const response = await fetch("/api/story");
      if (!response.ok) {
        throw new Error("Nao foi possivel gerar o story agora.");
      }

      const blob = await response.blob();
      const file = new File([blob], "instagramlinker-story.mp4", {
        type: "video/mp4",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: "Baixe posts, Reels e Stories em alta qualidade.",
          title: "InstagramLinker",
        });
        return;
      }

      downloadBlob(blob);
    } catch {
      window.location.href = "/api/story";
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={isPreparing}
      className="inline-flex h-12 items-center gap-2 rounded-md bg-white px-5 text-sm font-black text-stone-950 transition hover:bg-[#b3265c] hover:text-white disabled:cursor-wait disabled:opacity-75"
    >
      {isPreparing ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Send className="h-5 w-5" />
      )}
      {isPreparing ? "Preparando..." : "Compartilhar nos Stories"}
    </button>
  );
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "instagramlinker-story.mp4";
  anchor.click();
  URL.revokeObjectURL(url);
}
