import Link from "next/link";
import Image from "next/image";
import Card from "@/components/layout/Card";
import SectionDivider from "@/components/layout/SectionDivider";

export default function LandingPage() {
  return (
    <>
      {/* ヒーローセクション */}
      <section className="bg-gradient-to-b from-base-200 to-base-100 py-16 -mt-6 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="md:w-1/2">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-slideIn">
                複数の日程から
                <br />
                <span className="text-primary">最適な予定</span>を見つけよう
              </h1>
              <p
                className="text-lg mb-8 text-base-content/70 animate-fadeIn"
                style={{ animationDelay: "0.2s" }}
              >
                バンド練習、ゲーム開催、チーム会議...複数の候補日から全員参加できる日を簡単に調整。
                参加者はログイン不要、リンクを共有するだけで簡単に回答できます。
              </p>
              <div
                className="flex flex-wrap gap-4"
                style={{ animationDelay: "0.4s" }}
              >
                <Link
                  href="/create"
                  className="btn btn-primary btn-lg btn-animated animate-fadeIn"
                >
                  今すぐイベントを作成
                </Link>
                <a
                  href="#features"
                  className="btn btn-outline btn-lg animate-fadeIn"
                  style={{ animationDelay: "0.5s" }}
                >
                  詳しく見る
                </a>
              </div>
            </div>
            <div className="md:w-1/2">
              <div
                className="relative h-64 md:h-96 w-full animate-fadeIn"
                style={{ animationDelay: "0.3s" }}
              >
                <Image
                  src="/calendar.svg"
                  alt="カレンダーイラスト"
                  fill
                  className="object-contain"
                  priority
                />
                {/* SVG画像がない場合のフォールバック */}
                <div className="absolute inset-0 flex items-center justify-center text-primary text-9xl opacity-20">
                  📅
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section id="features" className="py-16 px-4 bg-base-100">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">主な機能</h2>
          <p className="text-center text-base-content/70 mb-12 max-w-2xl mx-auto">
            シンプルな操作で、複数人の予定を効率よく調整。最適な日程を素早く見つけることができます。
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover-scale transition-all" isHighlighted={false}>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-3xl">🗓️</span>
                </div>
              </div>
              <h3 className="font-bold text-xl text-center mb-2">
                複数日程の提案
              </h3>
              <p className="text-center text-base-content/80">
                候補日をいくつでも提示でき、参加者の都合に合わせて柔軟に調整できます。
              </p>
            </Card>

            <Card className="hover-scale transition-all" isHighlighted={false}>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-3xl">👥</span>
                </div>
              </div>
              <h3 className="font-bold text-xl text-center mb-2">
                ログイン不要
              </h3>
              <p className="text-center text-base-content/80">
                参加者はアカウント登録不要。リンクを共有するだけで誰でも簡単に回答できます。
              </p>
            </Card>

            <Card className="hover-scale transition-all" isHighlighted={false}>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-3xl">📊</span>
                </div>
              </div>
              <h3 className="font-bold text-xl text-center mb-2">
                視覚的な集計表示
              </h3>
              <p className="text-center text-base-content/80">
                参加者の回答をリアルタイムで集計。最適な日程が一目でわかります。
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 使い方セクション */}
      <section className="py-16 px-4 bg-base-200">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">
            簡単3ステップで日程調整
          </h2>
          <p className="text-center text-base-content/70 mb-12 max-w-2xl mx-auto">
            ユーザーフレンドリーなプロセスで、誰でも簡単に使い始められます。
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card bg-base-100 shadow-md hover-scale transition-all">
              <div className="card-body">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                </div>
                <h3 className="card-title justify-center mb-2">イベント作成</h3>
                <p className="text-center text-base-content/80">
                  タイトルと候補日程を入力するだけ。複数の候補日を自由に設定できます。
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md hover-scale transition-all">
              <div className="card-body">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                </div>
                <h3 className="card-title justify-center mb-2">リンクを共有</h3>
                <p className="text-center text-base-content/80">
                  生成されたリンクをLINEやメールで参加者に送るだけ。簡単に共有できます。
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md hover-scale transition-all">
              <div className="card-body">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                </div>
                <h3 className="card-title justify-center mb-2">日程を確定</h3>
                <p className="text-center text-base-content/80">
                  参加者の都合を確認して最適な日程を選び、カレンダーに簡単登録できます。
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              href="/create"
              className="btn btn-primary btn-lg btn-animated"
            >
              イベントを作成してみる
            </Link>
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section className="py-16 px-4 bg-gradient-to-b from-primary/10 to-base-100">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">今すぐ日程調整を簡単に</h2>
          <p className="text-lg mb-8 text-base-content/80">
            面倒な日程調整をスマートに。みんなの予定を一度に確認して、最適な日程を見つけましょう。
            登録不要で今すぐ使えます。
          </p>
          <Link href="/create" className="btn btn-primary btn-lg btn-animated">
            無料でイベントを作成
          </Link>
        </div>
      </section>
    </>
  );
}
