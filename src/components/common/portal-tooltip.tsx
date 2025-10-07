"use client";

import React, { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { calcTooltipPosition } from "@/lib/tooltip-utils";

type Props = {
  open: boolean;
  anchor: { x: number; y: number } | null; // usually anchor's bottom-left (client coords)
  text: string;
  onClose: () => void;
  maxWidth?: number;
};

export default function PortalTooltip({
  open,
  anchor,
  text,
  onClose,
  maxWidth = 320,
}: Props) {
  const rootEl = useMemo(() => {
    if (typeof document === "undefined") return null;
    let elem = document.getElementById(
      "global-portal-tooltip"
    ) as HTMLDivElement | null;
    if (!elem) {
      elem = document.createElement("div");
      elem.id = "global-portal-tooltip";
      document.body.appendChild(elem);
    }
    return elem;
  }, []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClickOutside = () => onClose();
    window.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onClickOutside, true);
    window.addEventListener("resize", onClickOutside);
    document.addEventListener("click", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onClickOutside, true);
      window.removeEventListener("resize", onClickOutside);
      document.removeEventListener("click", onClickOutside);
    };
  }, [open, onClose]);

  if (!rootEl || !open || !anchor) return null;

  const { x, y } = calcTooltipPosition(anchor.x, anchor.y, maxWidth, 200);

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: y + 8,
        left: x + 8,
        zIndex: 1000,
        maxWidth,
      }}
      className="bg-base-100 border border-base-300 shadow-lg p-3 rounded-md text-sm break-words"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start gap-2">
        <p className="leading-snug whitespace-pre-wrap">{text}</p>
      </div>
    </div>,
    rootEl
  );
}
