/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import siteConfig from "../../../lib/site-config";

export const runtime = "edge";
// タイトル等が変更できないため長期間キャッシュ
export const revalidate = 2592000; // 30日

/**
 * OG画像生成API（モダン・ブランド一貫デザイン）
 * type=home: トップページ用
 * type=event&title=...: イベント用
 * 日付は一切画像に含めない
 */
export async function GET(req: NextRequest) {
  const searchParams = (() => {
    const url = new URL(req.url);
    return url.searchParams;
  })();
  const type = searchParams.get("type");
  // 本番はsiteConfig.url、ローカル開発時のみreqからhostを取得
  let baseUrl = siteConfig.url.replace(/\/$/, "");
  let logoUrl = siteConfig.ogImage;
  if (process.env.NODE_ENV !== "production" && req.headers.get("host")) {
    const host = req.headers.get("host")!;
    const isLocal =
      host.startsWith("localhost") || host.startsWith("127.0.0.1");
    baseUrl = `${isLocal ? "http" : "https"}://${host}`;
  }
  if (!/^https?:\/\//.test(logoUrl)) {
    logoUrl = `${baseUrl}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
  }

  // サービスドメイン（末尾スラッシュ除去、https://は除去）
  const serviceDomain = siteConfig.url
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  // 共通スタイル
  const baseStyle = {
    width: "1200px",
    height: "630px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
    overflow: "hidden",
    fontFamily: '"Noto Sans JP", "Inter", "Segoe UI", Arial, sans-serif',
  };

  // グラデーション背景
  const gradientBg = {
    background:
      "linear-gradient(135deg, #6366f1 0%, #2563eb 60%, #38bdf8 100%)",
  };

  // 半透明の円形アクセント
  const circleAccent = (
    <div
      style={{
        position: "absolute",
        top: "-120px",
        right: "-120px",
        width: "340px",
        height: "340px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.10)",
        filter: "blur(2px)",
      }}
    />
  );
  if (type === "home") {
    return new ImageResponse(
      (
        <div style={{ ...baseStyle, ...gradientBg }}>
          {circleAccent}
          <img
            src={logoUrl}
            width={128}
            height={128}
            alt="DaySynthロゴ"
            style={{
              boxShadow: "0 8px 32px 0 rgba(0,0,0,0.18)",
              borderRadius: 32,
              marginBottom: 40,
              background: "#fff",
              padding: 2,
            }}
          />
          <h1
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-2px",
              margin: 0,
              textShadow: "0 4px 24px rgba(0,0,0,0.18)",
            }}
          >
            {siteConfig.name.full}
          </h1>
          <p
            style={{
              fontSize: 36,
              color: "rgba(255,255,255,0.92)",
              marginTop: 28,
              fontWeight: 500,
              textShadow: "0 2px 8px rgba(0,0,0,0.10)",
            }}
          >
            {siteConfig.name.tagline}
          </p>
          <div
            style={{
              position: "absolute",
              bottom: 36,
              right: 48,
              color: "rgba(255,255,255,0.7)",
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: "0.05em",
            }}
          >
            {serviceDomain}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, immutable, max-age=31536000",
        },
      }
    );
  }

  if (type === "event") {
    const title = searchParams.get("title") || "イベント";
    // タイトルの長さに応じてフォントサイズを調整（短文はより大きく）
    let fontSize = 54;
    if (title.length <= 12) fontSize = 72;
    else if (title.length <= 24) fontSize = 62;
    else if (title.length > 32) fontSize = 44;
    else if (title.length > 60) fontSize = 36;
    // サブテキスト（キャッチコピーや説明）
    const subText = siteConfig.name.tagline || "みんなの予定を簡単調整";
    // サービス特徴
    const features = [
      "ログイン不要",
      "無料",
      "スマホ・PC対応",
      "カレンダー連携",
      "シンプルUI",
    ];
    return new ImageResponse(
      (
        <div style={{ ...baseStyle, ...gradientBg }}>
          {/* 上部アクセントバー */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: 12,
              background: "#2563eb",
            }}
          />
          {circleAccent}
          <img
            src={logoUrl}
            width={96}
            height={96}
            alt="DaySynthロゴ"
            style={{
              boxShadow: "0 4px 16px 0 rgba(0,0,0,0.12)",
              borderRadius: 24,
              marginBottom: 18,
              background: "#fff",
              padding: 2,
            }}
          />
          {/* サブタイトル */}
          <div
            style={{
              fontSize: 26,
              color: "#e0e7ef",
              fontWeight: 500,
              marginBottom: 8,
              letterSpacing: "0.04em",
              textShadow: "0 1px 6px rgba(0,0,0,0.10)",
            }}
          >
            {subText}
          </div>
          <h2
            style={{
              fontSize,
              color: "#fff",
              fontWeight: 800,
              margin: 0,
              textAlign: "center",
              lineHeight: 1.2,
              textShadow: "0 2px 12px rgba(0,0,0,0.16)",
              maxWidth: 900,
              minHeight: 80,
              marginLeft: "auto",
              marginRight: "auto",
              padding: "0 32px",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </h2>
          {/* サービス特徴リスト */}
          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {features.map((f, i) => (
              <span
                key={i}
                style={{
                  background: "rgba(255,255,255,0.18)",
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: 600,
                  borderRadius: 16,
                  padding: "6px 22px",
                  letterSpacing: "0.03em",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: "1.5px solid rgba(255,255,255,0.22)",
                }}
              >
                {f}
              </span>
            ))}
          </div>
          {/* サービス名 */}
          <div
            style={{
              marginTop: 32,
              fontSize: 30,
              color: "rgba(255,255,255,0.92)",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textShadow: "0 2px 8px rgba(0,0,0,0.10)",
            }}
          >
            {siteConfig.name.full}
          </div>
          {/* フッター */}
          <div
            style={{
              position: "absolute",
              bottom: 36,
              right: 48,
              color: "rgba(255,255,255,0.7)",
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: "0.05em",
            }}
          >
            {serviceDomain}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, immutable, max-age=31536000",
        },
      }
    );
  }

  // デフォルト画像
  return new ImageResponse(
    (
      <div style={{ ...baseStyle, ...gradientBg }}>
        {circleAccent}
        <span
          style={{
            fontSize: 48,
            color: "#fff",
            fontWeight: 700,
            textShadow: "0 2px 8px rgba(0,0,0,0.10)",
          }}
        >
          {siteConfig.name.full}
        </span>
        <div
          style={{
            position: "absolute",
            bottom: 36,
            right: 48,
            color: "rgba(255,255,255,0.7)",
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: "0.05em",
          }}
        >
          {serviceDomain}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, immutable, max-age=31536000",
      },
    }
  );
}
