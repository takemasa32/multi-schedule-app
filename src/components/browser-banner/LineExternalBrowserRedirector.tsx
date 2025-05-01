"use client";
import { useEffect } from "react";

/**
 * LINEアプリ内ブラウザでアクセスされた場合、
 * openExternalBrowser=1 クエリを自動付与してリダイレクトする
 */
export default function LineExternalBrowserRedirector() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent.toLowerCase();
    const isLine = ua.includes("line");
    if (!isLine) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("openExternalBrowser") === "1") return;
    url.searchParams.set("openExternalBrowser", "1");
    window.location.replace(url.toString());
  }, []);
  return null;
}
