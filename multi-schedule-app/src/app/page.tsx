import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ヒーローセクション */}
      <section className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            複数日程調整アプリ
          </h1>
          <p className="text-xl md:text-2xl mb-8">
            グループのイベント日程を簡単に、素早く調整できます
          </p>
          <Link
            href="/create"
            className="btn btn-lg btn-primary bg-white text-blue-600 hover:bg-gray-100"
          >
            今すぐイベントを作成
          </Link>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            簡単3ステップで日程調整
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
              <div className="card-body items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="card-title text-xl">候補日程を作成</h3>
                <p>
                  イベントのタイトルと候補となる日程を入力するだけで、イベント調整用のページが生成されます。
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
              <div className="card-body items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="card-title text-xl">リンクを共有</h3>
                <p>
                  生成されたリンクをLINEやメールで参加者に共有。ログイン不要で誰でも簡単に回答できます。
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
              <div className="card-body items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h3 className="card-title text-xl">最適日程を決定</h3>
                <p>
                  全員の回答状況を一目で確認。最も多くの人が参加できる日程を選んで確定できます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* メリットセクション */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            面倒な日程調整がスムーズに
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <svg
                    className="w-6 h-6 text-green-500 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                  <span>
                    <strong className="text-lg">ログイン不要</strong> -
                    アカウント登録なしで即座に使えます。参加者も面倒な登録は一切不要です。
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-6 h-6 text-green-500 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                  <span>
                    <strong className="text-lg">リアルタイム集計</strong> -
                    参加者の回答状況がすぐに反映され、最も都合の良い日程が一目でわかります。
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-6 h-6 text-green-500 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                  <span>
                    <strong className="text-lg">カレンダー連携</strong> -
                    確定した日程はワンクリックでGoogleカレンダーや.icsファイルとして保存できます。
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-6 h-6 text-green-500 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                  <span>
                    <strong className="text-lg">無料で利用可能</strong> -
                    完全無料で、制限なくイベントを作成できます。
                  </span>
                </li>
              </ul>
            </div>
            <div className="relative h-64 md:h-80">
              <div className="absolute inset-0 bg-gray-200 rounded-lg shadow-inner overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <p className="text-center">スケジュール調整の画面イメージ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section className="py-16 bg-blue-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            さっそく日程調整を始めましょう
          </h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            チームの集まり、友人との食事会、オンラインミーティング…
            <br />
            あらゆる集まりの日程調整にご活用ください。
          </p>
          <Link href="/create" className="btn btn-lg btn-primary">
            無料でイベントを作成
          </Link>
        </div>
      </section>

      {/* よくある質問 */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">よくある質問</h2>

          <div className="max-w-3xl mx-auto">
            <div className="collapse collapse-plus bg-base-200 mb-4">
              <input type="checkbox" />
              <div className="collapse-title text-xl font-medium">
                アカウント登録は必要ですか？
              </div>
              <div className="collapse-content">
                <p>
                  いいえ、アカウント登録は不要です。イベント作成も回答も、すべてログインなしで行えます。
                </p>
              </div>
            </div>

            <div className="collapse collapse-plus bg-base-200 mb-4">
              <input type="checkbox" />
              <div className="collapse-title text-xl font-medium">
                最大何人まで参加できますか？
              </div>
              <div className="collapse-content">
                <p>
                  人数制限はありません。小規模なチームミーティングから大人数のイベントまで対応可能です。
                </p>
              </div>
            </div>

            <div className="collapse collapse-plus bg-base-200 mb-4">
              <input type="checkbox" />
              <div className="collapse-title text-xl font-medium">
                回答の締切日は設定できますか？
              </div>
              <div className="collapse-content">
                <p>
                  現在のバージョンでは締切日の自動設定機能はありませんが、イベント説明に回答期限を記載することで対応できます。
                </p>
              </div>
            </div>

            <div className="collapse collapse-plus bg-base-200">
              <input type="checkbox" />
              <div className="collapse-title text-xl font-medium">
                一度確定した日程は変更できますか？
              </div>
              <div className="collapse-content">
                <p>
                  現在は確定後の変更機能は提供していません。日程変更が必要な場合は、新しいイベントを作成することをおすすめします。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-4">© 2025 複数日程調整アプリ</p>
          <p className="text-sm text-gray-400">
            個人情報の取り扱いについては適切に配慮しています。
            <br />
            本サービスはプライバシーポリシーに基づいて運営しています。
          </p>
        </div>
      </footer>
    </div>
  );
}
