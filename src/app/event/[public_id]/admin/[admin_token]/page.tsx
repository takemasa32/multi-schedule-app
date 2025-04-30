import { createSupabaseClient } from "@/lib/supabase";
import AdminPasswordForm from "./password-form";
import { adminRedirect } from "../actions";
import siteConfig from "@/lib/site-config";
import { Metadata } from "next";

// 管理者ページのメタデータ設定
export const metadata: Metadata = {
  title: `管理者認証 | ${siteConfig.name.full}`,
  description: `イベント管理のための認証ページです。管理者トークンまたはパスワードでイベントの管理機能を利用できます。`,
  robots: {
    index: false,
    follow: false
  },
  openGraph: {
    title: `管理者認証 | ${siteConfig.name.full}`,
    description: `イベント管理のための認証ページです。管理者トークンまたはパスワードでイベントの管理機能を利用できます。`,
    url: `${siteConfig.url}`,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
      },
    ],
  }
};

// サーバーサイド用Supabaseクライアントの初期化
const supabaseAdmin = createSupabaseClient();

// この管理者ページは単なるリダイレクターとして機能し、
// admin_tokenをセッションに保存してからイベント詳細ページへリダイレクトします
export default async function EventAdminPage({
  params,
}: {
  params: Promise<{ public_id: string; admin_token: string }>;
}) {
  // paramsを非同期APIとして正しく取得
  const resolvedParams = await params;
  const publicId = resolvedParams.public_id;
  const adminToken = resolvedParams.admin_token;

  // イベントの情報を取得して、パスワードが設定されているか確認
  let hasPassword = false;

  try {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("admin_password_hash")
      .eq("public_token", publicId)
      .single();

    if (event && event.admin_password_hash) {
      hasPassword = true;
    }
  } catch (error) {
    console.error("イベント情報取得エラー:", error);
  }

  // この内容はクライアント側に表示される（管理者認証への案内）
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl font-bold">管理者認証</h1>

          {/* 管理者トークンによる認証 */}
          <div className="mb-6 border-b pb-6">
            <h2 className="font-semibold mb-2">管理者トークンによる認証</h2>
            <p className="py-2">
              管理者トークンを使用して認証します。このページを開いた後、続行するボタンを押してください。
            </p>

            <form action={adminRedirect.bind(null, adminToken, publicId)}>
              <button
                type="submit"
                className="btn btn-primary w-full mt-2"
                onClick={(e) => {
                  const target = e.currentTarget;
                  target.classList.add("loading");
                  const spinner = document.createElement("span");
                  spinner.className = "loading loading-spinner loading-sm mr-2";
                  target.prepend(spinner);
                  target.textContent = "認証中...";
                }}
              >
                トークンで認証して続行
              </button>
            </form>
          </div>

          {/* パスワード認証（パスワードが設定されている場合のみ表示） */}
          {hasPassword && (
            <div>
              <h2 className="font-semibold mb-2">パスワードによる認証</h2>
              <p className="py-2">
                管理者パスワードを知っている場合は、パスワードを入力して認証することもできます。
              </p>

              <AdminPasswordForm publicId={publicId} />
            </div>
          )}

          <p className="text-sm text-gray-500 mt-4">
            ※
            このページは管理者用の特別なリンクです。イベントの管理機能が有効になります。
          </p>
        </div>
      </div>
    </div>
  );
}
