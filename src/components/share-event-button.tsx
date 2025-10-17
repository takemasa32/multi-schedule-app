"use client";
import { useState } from "react";
import toast from "react-hot-toast";

interface ShareEventButtonProps {
  url: string;
  title?: string;
  text?: string;
  className?: string;
  label?: string;
  ariaLabel?: string;
  /** クリップボード使用時にテキストも含めるかどうか（デフォルト: false、URLのみ） */
  includeTextInClipboard?: boolean;
}

export default function ShareEventButton({
  url,
  title,
  text,
  className = "",
  label = "イベントを共有",
  ariaLabel = "イベントURLを共有",
  includeTextInClipboard = false,
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
        // クリップボードAPI使用時、設定に応じてテキストを含める
        const clipboardText =
          includeTextInClipboard && text ? `${text}\n${url}` : url;
        await navigator.clipboard.writeText(clipboardText);
        toast.success("URLをコピーしました");
      } else {
        // fallback: input要素で選択コピー
        const clipboardText =
          includeTextInClipboard && text ? `${text}\n${url}` : url;
        const input = document.createElement("input");
        input.value = clipboardText;
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
      aria-label={ariaLabel}
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
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
        />
      </svg>
      {label}
    </button>
  );
}
