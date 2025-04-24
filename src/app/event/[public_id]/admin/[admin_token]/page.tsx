import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase";
import * as bcrypt from "bcryptjs";
import AdminPasswordForm from "./password-form";

// サーバーサイド用Supabaseクライアントの初期化
const supabaseAdmin = getSupabaseServerClient();

// CookieをセットするためのServer Action
async function setAdminTokenCookie(adminToken: string) {
  "use server";

  const cookiesStore = await cookies();
  cookiesStore.set("admin_token", adminToken, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7 * 4, // 28日間
    secure: process.env.NODE_ENV === "production",
  });

  return { success: true };
}

// サーバーアクション: トークンを使ったリダイレクト処理
async function adminRedirect(adminToken: string, publicId: string) {
  "use server";

  // Cookieにadmin_tokenを保存
  await setAdminTokenCookie(adminToken);

  // イベント詳細ページにリダイレクト
  redirect(`/event/${publicId}`);
}

// サーバーアクション: パスワード認証を行い、成功したらリダイレクト
export async function verifyAdminPassword(formData: FormData) {
  "use server";

  const publicId = formData.get("publicId") as string;
  const password = formData.get("password") as string;

  if (!publicId || !password) {
    return { success: false, error: "パスワードが入力されていません" };
  }

  try {
    // イベントとパスワードハッシュを取得
    const { data: event, error } = await supabaseAdmin
      .from("events")
      .select("id, admin_token, admin_password_hash")
      .eq("public_token", publicId)
      .single();

    if (error || !event) {
      console.error("イベント取得エラー:", error);
      return { success: false, error: "イベントが見つかりませんでした" };
    }

    if (!event.admin_password_hash) {
      return {
        success: false,
        error: "このイベントはパスワード認証が設定されていません",
      };
    }

    // パスワードを検証
    const isPasswordValid = await bcrypt.compare(
      password,
      event.admin_password_hash
    );

    if (!isPasswordValid) {
      return { success: false, error: "パスワードが正しくありません" };
    }

    // 認証成功: Cookieを設定してリダイレクト
    await setAdminTokenCookie(event.admin_token);

    // リダイレクトは直接行えないのでsuccessフラグを返す
    return { success: true, redirectTo: `/event/${publicId}` };
  } catch (error) {
    console.error("パスワード認証エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "認証処理中にエラーが発生しました",
    };
  }
}

// この管理者ページは単なるリダイレクターとして機能し、
// admin_tokenをセッションに保存してからイベント詳細ページへリダイレクトします
export default async function EventAdminPage({
  params,
}: {
  params: { public_id: string; admin_token: string };
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
              <button type="submit" className="btn btn-primary w-full mt-2">
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
