"use client";
import { useState } from "react";
import toast from "react-hot-toast";

interface ShareEventButtonProps {
  url: string;
  title?: string;
  text?: string;
  className?: string;
}

export default function ShareEventButton({
  url,
  title,
  text,
  className = "",
}: ShareEventButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          url,
          title: title || "イベント日程調整リンク",
          text: text || "このリンクから日程調整に参加できます。",
        });
        toast.success("リンクを共有しました");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("URLをコピーしました");
      } else {
        // fallback: input要素で選択コピー
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        toast.success("URLをコピーしました");
      }
    } catch {
      toast.error("共有に失敗しました");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      type="button"
      className={`btn btn-outline btn-sm flex items-center gap-2 ${className}`}
      onClick={handleShare}
      disabled={isSharing}
      aria-label="イベントURLを共有"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 8a3 3 0 11-6 0 3 3 0 016 0zm6 8a6 6 0 00-12 0v1a2 2 0 002 2h8a2 2 0 002-2v-1z"
        />
      </svg>
      共有
    </button>
  );
}
